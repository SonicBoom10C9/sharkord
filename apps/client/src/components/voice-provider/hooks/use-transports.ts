import {
  type AppData,
  type Consumer,
  type Transport
} from 'mediasoup-client/types';
import { useRef } from 'react';

const useTransports = () => {
  const producerTransport = useRef<Transport<AppData> | undefined>(undefined);
  const consumerTransport = useRef<Transport<AppData> | undefined>(undefined);
  const consumers = useRef<{
    [userId: number]: {
      [kind: string]: Consumer<AppData>;
    };
  }>({});
};

export { useTransports };
