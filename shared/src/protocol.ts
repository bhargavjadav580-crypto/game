// Client -> Server events
export interface ClientToServerEvents {
  'room:create': (data: { name: string }, ack: (res: import('./types').AckResponse) => void) => void;
  'room:join': (data: { code: string; name: string }, ack: (res: import('./types').AckResponse) => void) => void;
  'room:rejoin': (data: { code: string; sessionToken: string }, ack: (res: import('./types').AckResponse) => void) => void;
  'room:leave': (ack: (res: import('./types').AckResponse) => void) => void;
  'game:start': (ack: (res: import('./types').AckResponse) => void) => void;
  'answer:submit': (data: { questionId: string; optionIndex: number }, ack: (res: import('./types').AckResponse) => void) => void;
  'game:rematch': (ack: (res: import('./types').AckResponse) => void) => void;
}

// Server -> Client events
export interface ServerToClientEvents {
  'room:state': (snapshot: import('./types').RoomSnapshot) => void;
  'toast': (message: import('./types').ToastMessage) => void;
}

// Inter-server events (unused for now)
export interface InterServerEvents {}

// Socket data
export interface SocketData {
  playerId: string;
  roomCode: string;
  sessionToken: string;
}
