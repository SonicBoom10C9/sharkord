import http from 'http';
import { logger } from '../logger';
import { sendJsonError } from './helpers';

/**
 * Allowlisted domains for the media proxy.
 * Only Twitter/X CDN domains are permitted to prevent open-relay abuse.
 */
const ALLOWED_DOMAINS = new Set([
  'pbs.twimg.com',
  'video.twimg.com',
  'abs.twimg.com',
  'ton.twimg.com'
]);

const PROXY_TIMEOUT_MS = 15_000;

const mediaProxyHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  const reqUrl = new URL(req.url ?? '', 'http://localhost');
  const targetUrl = reqUrl.searchParams.get('url');

  if (!targetUrl) {
    return sendJsonError(res, 400, 'Missing url parameter');
  }

  let parsed: URL;

  try {
    parsed = new URL(targetUrl);
  } catch {
    return sendJsonError(res, 400, 'Invalid url');
  }

  if (parsed.protocol !== 'https:') {
    return sendJsonError(res, 400, 'Only HTTPS urls allowed');
  }

  if (!ALLOWED_DOMAINS.has(parsed.hostname)) {
    return sendJsonError(res, 403, 'Domain not allowed');
  }

  try {
    let finalUrl = targetUrl;
    let redirects = 0;
    const MAX_REDIRECTS = 5;
    let upstream: Response;

    // manually follow redirects, re-validating each hop against the allowlist
    while (true) {
      upstream = await fetch(finalUrl, {
        signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
        headers: {
          Accept: '*/*',
          'User-Agent':
            'Mozilla/5.0 (compatible; Sharkord/1.0; +https://github.com/sharkord/sharkord)'
        },
        redirect: 'manual'
      });

      if (
        upstream.status >= 300 &&
        upstream.status < 400 &&
        upstream.headers.get('location')
      ) {
        redirects++;

        if (redirects > MAX_REDIRECTS) {
          return sendJsonError(res, 502, 'Too many redirects');
        }

        const location = new URL(upstream.headers.get('location')!, finalUrl);

        if (location.protocol !== 'https:') {
          return sendJsonError(res, 403, 'Redirect to non-HTTPS rejected');
        }

        if (!ALLOWED_DOMAINS.has(location.hostname)) {
          return sendJsonError(res, 403, 'Redirect to disallowed domain');
        }

        finalUrl = location.toString();
        continue;
      }

      break;
    }

    if (!upstream.ok) {
      res.writeHead(upstream.status);
      res.end();
      return;
    }

    const headers: Record<string, string> = {
      'Cache-Control': 'public, max-age=86400, immutable',
      'X-Content-Type-Options': 'nosniff',
      // prevent the browser from ever sending a referrer back to twitter
      'Referrer-Policy': 'no-referrer'
    };

    const contentType = upstream.headers.get('content-type');
    if (contentType) headers['Content-Type'] = contentType;

    const contentLength = upstream.headers.get('content-length');
    if (contentLength) headers['Content-Length'] = contentLength;

    res.writeHead(200, headers);

    if (!upstream.body) {
      res.end();
      return;
    }

    // pipe the readable stream to the response
    for await (const chunk of upstream.body) {
      res.write(chunk);
    }

    res.end();
  } catch (error) {
    logger.error('Media proxy error for %s: %s', targetUrl, error);

    if (!res.headersSent) {
      sendJsonError(res, 502, 'Failed to fetch media');
    }
  }
};

export { mediaProxyHandler };
