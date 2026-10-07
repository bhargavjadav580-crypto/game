import type { Room, RoomStore } from './RoomStore.js';

export class InMemoryRoomStore implements RoomStore {
  private rooms = new Map<string, Room>();

  createRoom(code: string): Room {
    const room: Room = {
      code,
      phase: 'WAITING',
      version: 0,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      players: new Map(),
      questions: [],
      questionIndex: -1,
      questionStartedAt: 0,
      phaseEndsAt: 0,
      usedQuestionIds: new Set(),
      phaseTimer: null,
    };
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  deleteRoom(code: string): void {
    const room = this.rooms.get(code);
    if (room?.phaseTimer) {
      clearTimeout(room.phaseTimer);
    }
    this.rooms.delete(code);
  }

  listRooms(): Map<string, Room> {
    return this.rooms;
  }

  roomCount(): number {
    return this.rooms.size;
  }
}
