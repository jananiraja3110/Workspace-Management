import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, { transports: ['websocket', 'polling'], autoConnect: false });
  }
  return socket;
}

export function useSocket(userId, onNotification) {
  const cbRef = useRef(onNotification);
  cbRef.current = onNotification;

  useEffect(() => {
    if (!userId) return;
    const s = getSocket();
    if (!s.connected) s.connect();
    s.emit('register', userId);

    const handler = (data) => cbRef.current?.(data);
    s.on('notification', handler);

    return () => {
      s.off('notification', handler);
    };
  }, [userId]);
}
