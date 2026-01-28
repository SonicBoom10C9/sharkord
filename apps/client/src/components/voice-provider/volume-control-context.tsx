import { useVoice } from '@/features/server/voice/hooks';
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useRef,
  useState
} from 'react';

type VolumeKey = `user-${number}` | `external-${number}`;

type TVolumeControlContext = {
  volumes: Record<VolumeKey, number>;
  getVolume: (key: VolumeKey) => number;
  setVolume: (key: VolumeKey, volume: number) => void;
  toggleMute: (key: VolumeKey) => void;
  getUserVolumeKey: (userId: number) => VolumeKey;
  getExternalVolumeKey: (streamId: number) => VolumeKey;
};

const VolumeControlContext = createContext<TVolumeControlContext | null>(null);

type TVolumeControlProviderProps = {
  children: React.ReactNode;
};

const VolumeControlProvider = memo(
  ({ children }: TVolumeControlProviderProps) => {
    const { getOrCreateRefs } = useVoice();
    const [volumes, setVolumes] = useState<Record<VolumeKey, number>>({});
    const previousVolumesRef = useRef<Record<VolumeKey, number>>({});

    const getVolume = useCallback(
      (key: VolumeKey): number => {
        return volumes[key] ?? 100;
      },
      [volumes]
    );

    const applyVolumeToElement = useCallback(
      (key: VolumeKey, volume: number) => {
        const isExternal = key.startsWith('external-');
        const id = parseInt(key.split('-')[1] || '0', 10);
        const refs = getOrCreateRefs(id);
        const audioElement = isExternal
          ? refs.externalAudioRef.current
          : refs.audioRef.current;

        if (audioElement) {
          audioElement.volume = volume / 100;
        }
      },
      [getOrCreateRefs]
    );

    const setVolume = useCallback(
      (key: VolumeKey, volume: number) => {
        setVolumes((prev) => ({
          ...prev,
          [key]: volume
        }));

        if (volume > 0) {
          previousVolumesRef.current[key] = volume;
        }

        applyVolumeToElement(key, volume);
      },
      [applyVolumeToElement]
    );

    const toggleMute = useCallback(
      (key: VolumeKey) => {
        const currentVolume = volumes[key] ?? 100;
        const isMuted = currentVolume === 0;
        const newVolume = isMuted
          ? (previousVolumesRef.current[key] ?? 100)
          : 0;

        if (!isMuted) {
          previousVolumesRef.current[key] = currentVolume;
        }

        setVolumes((prev) => ({
          ...prev,
          [key]: newVolume
        }));

        applyVolumeToElement(key, newVolume);
      },
      [volumes, applyVolumeToElement]
    );

    const getUserVolumeKey = useCallback((userId: number): VolumeKey => {
      return `user-${userId}`;
    }, []);

    const getExternalVolumeKey = useCallback((streamId: number): VolumeKey => {
      return `external-${streamId}`;
    }, []);

    return (
      <VolumeControlContext.Provider
        value={{
          volumes,
          getVolume,
          setVolume,
          toggleMute,
          getUserVolumeKey,
          getExternalVolumeKey
        }}
      >
        {children}
      </VolumeControlContext.Provider>
    );
  }
);

const useVolumeControl = () => {
  const context = useContext(VolumeControlContext);

  if (!context) {
    throw new Error(
      'useVolumeControl must be used within VolumeControlProvider'
    );
  }

  return context;
};

export { useVolumeControl, VolumeControlContext, VolumeControlProvider };
export type { TVolumeControlContext, VolumeKey };
