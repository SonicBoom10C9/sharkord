import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { getTRPCClient, type AppRouter } from '@/lib/trpc';
import type { RtpCapabilities, StreamKind } from '@sharkord/shared';
import type { TRPCClient } from '@trpc/client';
import { useEffect } from 'react';

type Client = TRPCClient<AppRouter>;

type TEvents = {
  consume: (
    remoteUserId: number,
    kind: StreamKind,
    routerRtpCapabilities: RtpCapabilities
  ) => Promise<void>;
  removeRemoteStream: (userId: number, kind: StreamKind) => void;
  clearRemoteStreamsForUser: (userId: number) => void;
  rtpCapabilities: RtpCapabilities;
};

const useVoiceEvents = ({
  consume,
  removeRemoteStream,
  clearRemoteStreamsForUser,
  rtpCapabilities
}: TEvents) => {
  const currentVoiceChannelId = useCurrentVoiceChannelId();

  useEffect(() => {
    const trpc = getTRPCClient();

    const onVoiceNewProducerSub = trpc.voice.onNewProducer.subscribe(
      undefined,
      {
        onData: ({ remoteUserId, kind, channelId }) => {
          if (currentVoiceChannelId !== channelId) return;

          consume(remoteUserId, kind, rtpCapabilities);
        },
        onError: (err) => {
          console.error('onVoiceNewProducer subscription error:', err);
        }
      }
    );

    const onVoiceProducerClosedSub = trpc.voice.onProducerClosed.subscribe(
      undefined,
      {
        onData: ({ channelId, remoteUserId, kind }) => {
          if (currentVoiceChannelId !== channelId) return;

          removeRemoteStream(remoteUserId, kind);
        },
        onError: (err) => {
          console.error('onVoiceProducerClosed subscription error:', err);
        }
      }
    );

    const onVoiceUserLeaveSub = trpc.voice.onLeave.subscribe(undefined, {
      onData: ({ channelId, userId }) => {
        if (currentVoiceChannelId !== channelId) return;

        clearRemoteStreamsForUser(userId);
      },
      onError: (err) => {
        console.error('onVoiceUserLeave subscription error:', err);
      }
    });

    return () => {
      onVoiceNewProducerSub.unsubscribe();
      onVoiceProducerClosedSub.unsubscribe();
      onVoiceUserLeaveSub.unsubscribe();
    };
  }, [
    currentVoiceChannelId,
    consume,
    removeRemoteStream,
    clearRemoteStreamsForUser,
    rtpCapabilities
  ]);
};

export { useVoiceEvents };
