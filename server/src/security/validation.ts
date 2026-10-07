import { GAME_CONSTANTS, ROOM_CODE_CHARS } from '../../../shared/src/config.js';

const NAME_PATTERN = /^[\p{L}\p{N} _-]+$/u;

export function validateName(name: unknown): { valid: boolean; sanitized: string; error?: string } {
  if (typeof name !== 'string') {
    return { valid: false, sanitized: '', error: 'Name must be a string' };
  }

  // Trim and collapse whitespace
  const sanitized = name.trim().replace(/\s+/g, ' ');

  if (sanitized.length < GAME_CONSTANTS.NAME_MIN_LENGTH) {
    return { valid: false, sanitized, error: `Name must be at least ${GAME_CONSTANTS.NAME_MIN_LENGTH} characters` };
  }

  if (sanitized.length > GAME_CONSTANTS.NAME_MAX_LENGTH) {
    return { valid: false, sanitized, error: `Name must be at most ${GAME_CONSTANTS.NAME_MAX_LENGTH} characters` };
  }

  if (!NAME_PATTERN.test(sanitized)) {
    return { valid: false, sanitized, error: 'Name can only contain letters, numbers, spaces, underscores, and hyphens' };
  }

  return { valid: true, sanitized };
}

export function validateRoomCode(code: unknown): { valid: boolean; sanitized: string; error?: string } {
  if (typeof code !== 'string') {
    return { valid: false, sanitized: '', error: 'Room code must be a string' };
  }

  const sanitized = code.trim().toUpperCase();

  if (sanitized.length !== GAME_CONSTANTS.ROOM_CODE_LENGTH) {
    return { valid: false, sanitized, error: `Room code must be ${GAME_CONSTANTS.ROOM_CODE_LENGTH} characters` };
  }

  for (const char of sanitized) {
    if (!ROOM_CODE_CHARS.includes(char)) {
      return { valid: false, sanitized, error: 'Room code contains invalid characters' };
    }
  }

  return { valid: true, sanitized };
}

export function validateOptionIndex(index: unknown): { valid: boolean; value: number; error?: string } {
  if (typeof index !== 'number' || !Number.isInteger(index)) {
    return { valid: false, value: -1, error: 'Option index must be an integer' };
  }

  if (index < 0 || index >= GAME_CONSTANTS.OPTIONS_PER_QUESTION) {
    return { valid: false, value: index, error: `Option index must be between 0 and ${GAME_CONSTANTS.OPTIONS_PER_QUESTION - 1}` };
  }

  return { valid: true, value: index };
}

export function validateQuestionId(id: unknown): { valid: boolean; value: string; error?: string } {
  if (typeof id !== 'string' || id.length === 0 || id.length > 50) {
    return { valid: false, value: '', error: 'Invalid question ID' };
  }
  return { valid: true, value: id };
}
