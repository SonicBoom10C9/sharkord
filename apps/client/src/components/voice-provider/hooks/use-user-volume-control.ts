import { useCallback, useMemo } from 'react';
import { useVolumeControl } from '../volume-control-context';

export const useUserVolumeControl = (userId: number) => {
  const { getUserVolumeKey, getVolume, setVolume, toggleMute } =
    useVolumeControl();

  const volumeKey = getUserVolumeKey(userId);
  const volume = getVolume(volumeKey);
  const isMuted = volume === 0;

  const handleSetVolume = useCallback(
    (val: number) => {
      setVolume(volumeKey, val);
    },
    [setVolume, volumeKey]
  );

  const handleToggleMute = useCallback(() => {
    toggleMute(volumeKey);
  }, [toggleMute, volumeKey]);

  return useMemo(
    () => ({
      volumeKey,
      volume,
      isMuted,
      setVolume: handleSetVolume,
      toggleMute: handleToggleMute
    }),
    [volumeKey, volume, isMuted, handleSetVolume, handleToggleMute]
  );
};
