// server/src/utils/validation.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  validateRoomId,
  validatePoint,
  validateTool,
  validateColor,
  validateLineWidth,
  validateStroke,
  sanitizeRoomId,
  validateSocketId,
  validateSnapshot,
  RateLimiter
} from './validation';

describe('validateRoomId', () => {
  it('accepts valid alphanumeric IDs', () => {
    expect(validateRoomId('room123')).toBe(true);
    expect(validateRoomId('my-room')).toBe(true);
    expect(validateRoomId('room_name')).toBe(true);
    expect(validateRoomId('Room-123_test')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(validateRoomId('')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(validateRoomId(123)).toBe(false);
    expect(validateRoomId(null)).toBe(false);
    expect(validateRoomId(undefined)).toBe(false);
    expect(validateRoomId({})).toBe(false);
  });

  it('rejects special characters', () => {
    expect(validateRoomId('room@123')).toBe(false);
    expect(validateRoomId('room#name')).toBe(false);
    expect(validateRoomId('room name')).toBe(false);
    expect(validateRoomId('room/path')).toBe(false);
  });

  it('rejects IDs > 100 chars', () => {
    const longId = 'a'.repeat(101);
    expect(validateRoomId(longId)).toBe(false);

    const validLongId = 'a'.repeat(100);
    expect(validateRoomId(validLongId)).toBe(true);
  });
});

describe('validatePoint', () => {
  it('accepts valid {x, y} objects', () => {
    expect(validatePoint({ x: 0, y: 0 })).toBe(true);
    expect(validatePoint({ x: 100, y: 200 })).toBe(true);
    expect(validatePoint({ x: -50, y: -100 })).toBe(true);
    expect(validatePoint({ x: 0.5, y: 0.5 })).toBe(true);
  });

  it('rejects NaN values', () => {
    expect(validatePoint({ x: NaN, y: 0 })).toBe(false);
    expect(validatePoint({ x: 0, y: NaN })).toBe(false);
    expect(validatePoint({ x: NaN, y: NaN })).toBe(false);
  });

  it('rejects non-finite values', () => {
    expect(validatePoint({ x: Infinity, y: 0 })).toBe(false);
    expect(validatePoint({ x: 0, y: -Infinity })).toBe(false);
  });

  it('rejects invalid objects', () => {
    expect(validatePoint(null)).toBe(false);
    expect(validatePoint(undefined)).toBe(false);
    expect(validatePoint({})).toBe(false);
    expect(validatePoint({ x: 0 })).toBe(false);
    expect(validatePoint({ y: 0 })).toBe(false);
    expect(validatePoint({ x: 'a', y: 0 })).toBe(false);
  });
});

describe('validateTool', () => {
  it('accepts valid tools', () => {
    expect(validateTool('pen')).toBe(true);
    expect(validateTool('eraser')).toBe(true);
    expect(validateTool('bucket')).toBe(true);
  });

  it('rejects invalid tools', () => {
    expect(validateTool('brush')).toBe(false);
    expect(validateTool('')).toBe(false);
    expect(validateTool(123)).toBe(false);
    expect(validateTool(null)).toBe(false);
  });
});

describe('validateColor', () => {
  it('accepts valid 6-digit hex colors', () => {
    expect(validateColor('#000000')).toBe(true);
    expect(validateColor('#FFFFFF')).toBe(true);
    expect(validateColor('#ff5733')).toBe(true);
    expect(validateColor('#ABC123')).toBe(true);
  });

  it('accepts valid 3-digit hex colors', () => {
    expect(validateColor('#FFF')).toBe(true);
    expect(validateColor('#000')).toBe(true);
    expect(validateColor('#abc')).toBe(true);
  });

  it('accepts RGB and RGBA formats', () => {
    expect(validateColor('rgb(255, 0, 0)')).toBe(true);
    expect(validateColor('rgba(255, 0, 0, 1)')).toBe(true);
  });

  it('rejects invalid hex', () => {
    expect(validateColor('FF0000')).toBe(false);  // Missing #
    expect(validateColor('#GGGGGG')).toBe(false); // Invalid chars
    expect(validateColor('#12345')).toBe(false);  // Wrong length
    expect(validateColor('')).toBe(false);
    expect(validateColor(null)).toBe(false);
  });
});

describe('validateLineWidth', () => {
  it('accepts valid line widths', () => {
    expect(validateLineWidth(1)).toBe(true);
    expect(validateLineWidth(50)).toBe(true);
    expect(validateLineWidth(100)).toBe(true);
    expect(validateLineWidth(0.5)).toBe(true);
  });

  it('rejects invalid line widths', () => {
    expect(validateLineWidth(0)).toBe(false);
    expect(validateLineWidth(-1)).toBe(false);
    expect(validateLineWidth(101)).toBe(false);
    expect(validateLineWidth(NaN)).toBe(false);
    expect(validateLineWidth(Infinity)).toBe(false);
    expect(validateLineWidth('5')).toBe(false);
    expect(validateLineWidth(null)).toBe(false);
  });
});

describe('validateStroke', () => {
  const validStroke = {
    from: { x: 0, y: 0 },
    to: { x: 100, y: 100 },
    color: '#FF0000',
    lineWidth: 5,
    tool: 'pen'
  };

  it('returns validated stroke for valid input', () => {
    const result = validateStroke(validStroke);
    expect(result).not.toBeNull();
    expect(result?.from).toEqual(validStroke.from);
    expect(result?.to).toEqual(validStroke.to);
    expect(result?.color).toBe(validStroke.color);
    expect(result?.lineWidth).toBe(validStroke.lineWidth);
    expect(result?.tool).toBe(validStroke.tool);
    expect(result?.timestamp).toBeTypeOf('number');
  });

  it('preserves existing timestamp', () => {
    const strokeWithTimestamp = { ...validStroke, timestamp: 12345 };
    const result = validateStroke(strokeWithTimestamp);
    expect(result?.timestamp).toBe(12345);
  });

  it('returns null for invalid from point', () => {
    const invalid = { ...validStroke, from: { x: NaN, y: 0 } };
    expect(validateStroke(invalid)).toBeNull();
  });

  it('returns null for invalid to point', () => {
    const invalid = { ...validStroke, to: null };
    expect(validateStroke(invalid)).toBeNull();
  });

  it('returns null for invalid color', () => {
    const invalid = { ...validStroke, color: 'red' };
    expect(validateStroke(invalid)).toBeNull();
  });

  it('returns null for invalid lineWidth', () => {
    const invalid = { ...validStroke, lineWidth: 0 };
    expect(validateStroke(invalid)).toBeNull();
  });

  it('returns null for invalid tool', () => {
    const invalid = { ...validStroke, tool: 'brush' };
    expect(validateStroke(invalid)).toBeNull();
  });

  it('returns null for non-object input', () => {
    expect(validateStroke(null)).toBeNull();
    expect(validateStroke(undefined)).toBeNull();
    expect(validateStroke('stroke')).toBeNull();
  });
});

describe('sanitizeRoomId', () => {
  it('removes special characters', () => {
    expect(sanitizeRoomId('room@123')).toBe('room123');
    expect(sanitizeRoomId('room name')).toBe('roomname');
    expect(sanitizeRoomId('room#$%test')).toBe('roomtest');
  });

  it('keeps valid characters', () => {
    expect(sanitizeRoomId('valid-room_123')).toBe('valid-room_123');
  });

  it('truncates to 100 characters', () => {
    const longId = 'a'.repeat(150);
    expect(sanitizeRoomId(longId).length).toBe(100);
  });
});

describe('validateSocketId', () => {
  it('accepts valid socket IDs', () => {
    expect(validateSocketId('abc123')).toBe(true);
    expect(validateSocketId('socket-id-123')).toBe(true);
  });

  it('rejects invalid socket IDs', () => {
    expect(validateSocketId('')).toBe(false);
    expect(validateSocketId(123)).toBe(false);
    expect(validateSocketId(null)).toBe(false);
  });
});

describe('validateSnapshot', () => {
  it('accepts valid data URLs', () => {
    expect(validateSnapshot('data:image/png;base64,abc123')).toBe(true);
    expect(validateSnapshot('data:image/jpeg;base64,xyz789')).toBe(true);
  });

  it('rejects invalid snapshots', () => {
    expect(validateSnapshot('http://example.com/image.png')).toBe(false);
    expect(validateSnapshot('data:text/plain;base64,abc')).toBe(false);
    expect(validateSnapshot('')).toBe(false);
    expect(validateSnapshot(null)).toBe(false);
  });
});

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    limiter = new RateLimiter(60000, 3); // 1 min window, max 3 attempts
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests under limit', () => {
    expect(limiter.isAllowed('user1')).toBe(true);
    expect(limiter.isAllowed('user1')).toBe(true);
    expect(limiter.isAllowed('user1')).toBe(true);
  });

  it('blocks requests over limit', () => {
    limiter.isAllowed('user1');
    limiter.isAllowed('user1');
    limiter.isAllowed('user1');
    expect(limiter.isAllowed('user1')).toBe(false);
  });

  it('tracks users separately', () => {
    limiter.isAllowed('user1');
    limiter.isAllowed('user1');
    limiter.isAllowed('user1');

    // user2 should still be allowed
    expect(limiter.isAllowed('user2')).toBe(true);
  });

  it('resets after window passes', () => {
    limiter.isAllowed('user1');
    limiter.isAllowed('user1');
    limiter.isAllowed('user1');
    expect(limiter.isAllowed('user1')).toBe(false);

    // Advance time past the window
    vi.advanceTimersByTime(60001);

    expect(limiter.isAllowed('user1')).toBe(true);
  });

  it('reset() clears attempts for user', () => {
    limiter.isAllowed('user1');
    limiter.isAllowed('user1');
    limiter.isAllowed('user1');
    expect(limiter.isAllowed('user1')).toBe(false);

    limiter.reset('user1');
    expect(limiter.isAllowed('user1')).toBe(true);
  });

  it('cleanup() removes old entries', () => {
    limiter.isAllowed('user1');

    vi.advanceTimersByTime(60001);
    limiter.cleanup();

    // After cleanup, should allow max attempts again
    expect(limiter.isAllowed('user1')).toBe(true);
    expect(limiter.isAllowed('user1')).toBe(true);
    expect(limiter.isAllowed('user1')).toBe(true);
  });
});
