import crypto from 'node:crypto';
import { ROOM_CODE_CHARS, GAME_CONSTANTS } from '../../../shared/src/config.js';
import type { RoomStore } from './RoomStore.js';

/**
 * Generate a unique room code using crypto.randomInt for security.
 * Retries if code already exists (up to 10 attempts).
 */
export function generateRoomCode(store: RoomStore): string {
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = '';
    for (let i = 0; i < GAME_CONSTANTS.ROOM_CODE_LENGTH; i++) {
      const idx = crypto.randomInt(ROOM_CODE_CHARS.length);
      code += ROOM_CODE_CHARS[idx];
    }
    if (!store.getRoom(code)) {
      return code;
    }
  }
  throw new Error('Failed to generate unique room code after 10 attempts');
}
