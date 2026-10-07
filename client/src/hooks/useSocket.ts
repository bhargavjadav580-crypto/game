import { useState, useEffect, useCallback, useRef } from 'react';
import socket from '../services/socket';
import type { RoomSnapshot, AckResponse, Difficulty, QuizLanguage } from '@shared/types';

export interface CreateRoomParams {
  name: string;
  category?: string;
  difficulty?: Difficulty;
  questionCount?: number;
  questionTimeSec?: number;
  language?: QuizLanguage;
}

export function useSocket() {
  const [connected, setConnected] = useState(socket.connected);
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [toast, setToast] = useState<{ code: string; message: string } | null>(null);
  const versionRef = useRef(0);

  useEffect(() => {
    // Connect on mount
    if (!socket.connected) {
      socket.connect();
    }

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onState = (snap: RoomSnapshot) => {
      // Ignore stale snapshots
      if (snap.version <= versionRef.current) return;
      versionRef.current = snap.version;
      setSnapshot(snap);
    };

    const onToast = (msg: { code: string; message: string }) => {
      setToast(msg);
      // Auto-clear toast after 4 seconds
      setTimeout(() => setToast(null), 4000);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room:state', onState);
    socket.on('toast', onToast);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room:state', onState);
      socket.off('toast', onToast);
    };
  }, []);

  const createRoom = useCallback((params: string | CreateRoomParams): Promise<AckResponse> => {
    const payload = typeof params === 'string' ? { name: params } : params;
    return new Promise((resolve) => {
      socket.emit('room:create', payload, (res) => resolve(res));
    });
  }, []);

  const joinRoom = useCallback((code: string, name: string): Promise<AckResponse> => {
    return new Promise((resolve) => {
      socket.emit('room:join', { code, name }, (res) => resolve(res));
    });
  }, []);

  const rejoinRoom = useCallback((code: string, sessionToken: string): Promise<AckResponse> => {
    return new Promise((resolve) => {
      socket.emit('room:rejoin', { code, sessionToken }, (res) => resolve(res));
    });
  }, []);

  const leaveRoom = useCallback((): Promise<AckResponse> => {
    return new Promise((resolve) => {
      socket.emit('room:leave', (res) => {
        versionRef.current = 0;
        setSnapshot(null);
        resolve(res);
      });
    });
  }, []);

  const startGame = useCallback((): Promise<AckResponse> => {
    return new Promise((resolve) => {
      socket.emit('game:start', (res) => resolve(res));
    });
  }, []);

  const submitAnswer = useCallback((questionId: string, optionIndex: number): Promise<AckResponse> => {
    return new Promise((resolve) => {
      socket.emit('answer:submit', { questionId, optionIndex }, (res) => resolve(res));
    });
  }, []);

  const requestRematch = useCallback((): Promise<AckResponse> => {
    return new Promise((resolve) => {
      socket.emit('game:rematch', (res) => resolve(res));
    });
  }, []);

  const resetState = useCallback(() => {
    versionRef.current = 0;
    setSnapshot(null);
  }, []);

  return {
    connected,
    snapshot,
    toast,
    createRoom,
    joinRoom,
    rejoinRoom,
    leaveRoom,
    startGame,
    submitAnswer,
    requestRematch,
    resetState,
  };
}
