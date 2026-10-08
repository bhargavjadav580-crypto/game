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

  const emitWithTimeout = (
    eventName: string,
    payload?: any,
    timeoutMs = 7000
  ): Promise<AckResponse> => {
    if (!socket.connected) {
      socket.connect();
    }
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve({ ok: false, error: 'Connection timeout. Please check your internet connection.' });
      }, timeoutMs);

      const ack = (res: AckResponse) => {
        clearTimeout(timer);
        resolve(res);
      };

      if (payload !== undefined) {
        socket.emit(eventName as any, payload, ack);
      } else {
        socket.emit(eventName as any, ack);
      }
    });
  };

  const createRoom = useCallback((params: string | CreateRoomParams): Promise<AckResponse> => {
    const payload = typeof params === 'string' ? { name: params } : params;
    return emitWithTimeout('room:create', payload);
  }, []);

  const joinRoom = useCallback((code: string, name: string): Promise<AckResponse> => {
    return emitWithTimeout('room:join', { code, name });
  }, []);

  const rejoinRoom = useCallback((code: string, sessionToken: string): Promise<AckResponse> => {
    return emitWithTimeout('room:rejoin', { code, sessionToken });
  }, []);

  const leaveRoom = useCallback((): Promise<AckResponse> => {
    versionRef.current = 0;
    setSnapshot(null);
    return emitWithTimeout('room:leave');
  }, []);

  const startGame = useCallback((): Promise<AckResponse> => {
    return emitWithTimeout('game:start');
  }, []);

  const submitAnswer = useCallback((questionId: string, optionIndex: number): Promise<AckResponse> => {
    return emitWithTimeout('answer:submit', { questionId, optionIndex });
  }, []);

  const requestRematch = useCallback((): Promise<AckResponse> => {
    return emitWithTimeout('game:rematch');
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
