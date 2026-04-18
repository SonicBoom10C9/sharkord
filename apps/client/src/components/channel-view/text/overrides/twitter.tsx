import { memo, type ComponentProps } from 'react';
import { Tweet } from 'react-tweet';

type TTwitterOverrideProps = {
  tweetId: string;
};

/**
 * Custom MediaImg component that routes images through our server-side
 * media proxy. This prevents the client from connecting directly to
 * Twitter's CDN (fixes CORS 403s and protects user privacy).
 */
const ProxiedMediaImg = (
  props: ComponentProps<'img'> & { src: string; alt: string }
) => {
  const { src, ...rest } = props;
  const proxiedSrc = src.startsWith('/media-proxy')
    ? src
    : `/media-proxy?url=${encodeURIComponent(src)}`;

  return <img {...rest} src={proxiedSrc} referrerPolicy="no-referrer" />;
};

const TwitterOverride = memo(({ tweetId }: TTwitterOverrideProps) => {
  return (
    <div className="max-w-100">
      <Tweet
        id={tweetId}
        apiUrl={`/tweet/${tweetId}`}
        components={{
          MediaImg: ProxiedMediaImg
        }}
      />
    </div>
  );
});

export { TwitterOverride };
