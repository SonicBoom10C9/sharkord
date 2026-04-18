import http from 'http';
import { logger } from '../logger';
import { getRequestPathname, sendJsonError } from './helpers';

const SYNDICATION_URL = 'https://cdn.syndication.twimg.com';
const TWEET_ID = /^[0-9]+$/;
const FETCH_TIMEOUT_MS = 10_000;

/**
 * Same token generation as react-tweet's fetchTweet.
 * Required by the syndication API.
 */
function getToken(id: string): string {
  return ((Number(id) / 1e15) * Math.PI)
    .toString(6 ** 2)
    .replace(/(0+|\.)/g, '');
}

/** Twitter CDN hostnames whose URLs should be rewritten to go through our media proxy. */
const PROXY_HOSTS = new Set([
  'pbs.twimg.com',
  'video.twimg.com',
  'abs.twimg.com',
  'ton.twimg.com'
]);

/**
 * Wraps a Twitter CDN URL with our media proxy if it matches an allowed host.
 * Returns the original string if it's not a proxiable URL.
 */
function proxyUrl(value: string): string {
  try {
    const url = new URL(value);

    if (PROXY_HOSTS.has(url.hostname)) {
      return `/media-proxy?url=${encodeURIComponent(value)}`;
    }
  } catch {
    // not a URL
  }

  return value;
}

/**
 * Selectively rewrites Twitter CDN URLs in the tweet data so the client
 * fetches media through our /media-proxy endpoint instead of connecting to
 * Twitter directly. This fixes CORS 403s and protects user privacy.
 *
 * We intentionally skip `media_url_https` because react-tweet's `getMediaUrl`
 * utility calls `new URL()` on it — rewriting to a relative proxy URL would
 * throw. Instead, images are proxied client-side via a custom `MediaImg`
 * component override.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rewriteMediaUrls(tweet: any): any {
  if (!tweet || typeof tweet !== 'object') return tweet;

  // user avatar — used directly as <img src>, safe to rewrite
  if (tweet.user?.profile_image_url_https) {
    tweet.user.profile_image_url_https = proxyUrl(
      tweet.user.profile_image_url_https
    );
  }

  // media: rewrite video variant URLs but NOT media_url_https
  if (Array.isArray(tweet.mediaDetails)) {
    for (const media of tweet.mediaDetails) {
      if (Array.isArray(media?.video_info?.variants)) {
        for (const variant of media.video_info.variants) {
          if (typeof variant.url === 'string') {
            variant.url = proxyUrl(variant.url);
          }
        }
      }
    }
  }

  // recurse into quoted tweet
  if (tweet.quoted_tweet) {
    rewriteMediaUrls(tweet.quoted_tweet);
  }

  return tweet;
}

/** Tracking query parameters to strip from URLs in tweet entities. */
const TRACKING_PARAMS = new Set([
  'ref_src',
  'ref_url',
  's',
  'twclid',
  'fbclid'
]);

/**
 * Strips known tracking query parameters from URLs found in tweet entity data.
 * Only operates on string values that parse as URLs.
 */
function stripTrackingParams(obj: unknown): unknown {
  if (typeof obj === 'string') {
    try {
      const url = new URL(obj);
      let changed = false;

      for (const param of TRACKING_PARAMS) {
        if (url.searchParams.has(param)) {
          url.searchParams.delete(param);
          changed = true;
        }
      }

      return changed ? url.toString() : obj;
    } catch {
      return obj;
    }
  }

  if (Array.isArray(obj)) {
    return obj.map(stripTrackingParams);
  }

  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      result[key] = stripTrackingParams(value);
    }

    return result;
  }

  return obj;
}

/** In-memory cache for tweet data. Cleared every 2 hours (matches metadata cache). */
const tweetCache = new Map<string, { data: unknown; fetchedAt: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 2;

setInterval(() => tweetCache.clear(), CACHE_TTL_MS);

const tweetHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  const pathname = getRequestPathname(req);

  if (!pathname) {
    return sendJsonError(res, 400, 'Bad request');
  }

  // extract tweet ID from /tweet/<id>
  const segments = pathname.split('/').filter(Boolean);
  const tweetId = segments[1];

  if (!tweetId || !TWEET_ID.test(tweetId) || tweetId.length > 40) {
    return sendJsonError(res, 400, 'Invalid tweet ID');
  }

  // check cache
  const cached = tweetCache.get(tweetId);

  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, max-age=300'
    });
    res.end(JSON.stringify({ data: cached.data }));
    return;
  }

  try {
    const url = new URL(`${SYNDICATION_URL}/tweet-result`);
    url.searchParams.set('id', tweetId);
    url.searchParams.set('lang', 'en');
    url.searchParams.set(
      'features',
      [
        'tfw_timeline_list:',
        'tfw_follower_count_sunset:true',
        'tfw_tweet_edit_backend:on',
        'tfw_refsrc_session:on',
        'tfw_fosnr_soft_interventions_enabled:on',
        'tfw_show_birdwatch_pivots_enabled:on',
        'tfw_show_business_verified_badge:on',
        'tfw_duplicate_scribes_to_settings:on',
        'tfw_use_profile_image_shape_enabled:on',
        'tfw_show_blue_verified_badge:on',
        'tfw_legacy_timeline_sunset:true',
        'tfw_show_gov_verified_badge:on',
        'tfw_show_business_affiliate_badge:on',
        'tfw_tweet_edit_frontend:on'
      ].join(';')
    );
    url.searchParams.set('token', getToken(tweetId));

    const upstream = await fetch(url.toString(), {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    });

    const isJson = upstream.headers
      .get('content-type')
      ?.includes('application/json');

    if (!isJson) {
      return sendJsonError(res, 502, 'Unexpected upstream response');
    }

    const data = (await upstream.json()) as Record<string, unknown>;

    if (!upstream.ok) {
      return sendJsonError(
        res,
        upstream.status,
        typeof data?.error === 'string' ? data.error : 'Failed to fetch tweet'
      );
    }

    // tweet deleted / tombstoned / empty
    if (
      data?.__typename === 'TweetTombstone' ||
      (data && Object.keys(data).length === 0)
    ) {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=60'
      });
      res.end(JSON.stringify({ data: null }));
      return;
    }

    // privacy: strip tracking params, then rewrite CDN URLs through our proxy
    const cleaned = stripTrackingParams(data);
    const proxied = rewriteMediaUrls(cleaned);

    tweetCache.set(tweetId, { data: proxied, fetchedAt: Date.now() });

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, max-age=300'
    });
    res.end(JSON.stringify({ data: proxied }));
  } catch (error) {
    logger.error('Tweet proxy error for %s: %s', tweetId, error);

    if (!res.headersSent) {
      sendJsonError(res, 502, 'Failed to fetch tweet');
    }
  }
};

export { tweetHandler };
