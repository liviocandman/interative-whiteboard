// server/src/utils/validation.ts
import type { Stroke, Point, Tool } from '../types';

export function validateRoomId(roomId: unknown): roomId is string {
  return typeof roomId === 'string' && 
         roomId.length > 0 && 
         roomId.length <= 100 &&
         /^[a-zA-Z0-9-_]+$/.test(roomId);
}

export function validatePoint(point: unknown): point is Point {
  return typeof point === 'object' &&
         point !== null &&
         typeof (point as any).x === 'number' &&
         typeof (point as any).y === 'number' &&
         !isNaN((point as any).x) &&
         !isNaN((point as any).y) &&
         isFinite((point as any).x) &&
         isFinite((point as any).y);
}

export function validateTool(tool: unknown): tool is Tool {
  return typeof tool === 'string' &&
         ['pen', 'eraser', 'bucket'].includes(tool);
}

export function validateColor(color: unknown): color is string {
  if (typeof color !== 'string') return false;
  
  // Validate hex color format
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexRegex.test(color);
}

export function validateLineWidth(lineWidth: unknown): lineWidth is number {
  return typeof lineWidth === 'number' &&
         !isNaN(lineWidth) &&
         isFinite(lineWidth) &&
         lineWidth > 0 &&
         lineWidth <= 100;
}

export function validateStroke(stroke: unknown): Stroke | null {
  if (typeof stroke !== 'object' || stroke === null) {
    return null;
  }

  const s = stroke as Record<string, unknown>;

  // Validate required fields
  if (!validatePoint(s.from) || 
      !validatePoint(s.to) ||
      !validateColor(s.color) ||
      !validateLineWidth(s.lineWidth) ||
      !validateTool(s.tool)) {
    return null;
  }

  // Optional timestamp validation
  if (s.timestamp !== undefined && 
      (typeof s.timestamp !== 'number' || !isFinite(s.timestamp))) {
    return null;
  }

  return {
    from: s.from,
    to: s.to,
    color: s.color,
    lineWidth: s.lineWidth,
    tool: s.tool,
    timestamp: s.timestamp || Date.now(),
  };
}

export function sanitizeRoomId(roomId: string): string {
  return roomId
    .replace(/[^a-zA-Z0-9-_]/g, '')
    .substring(0, 100);
}

export function validateSocketId(socketId: unknown): socketId is string {
  return typeof socketId === 'string' && socketId.length > 0;
}

// Validate canvas snapshot data
export function validateSnapshot(snapshot: unknown): snapshot is string {
  if (typeof snapshot !== 'string') return false;
  
  // Basic data URL validation for canvas
  return snapshot.startsWith('data:image/') && snapshot.includes('base64,');
}

// Rate limiting validation
export class RateLimiter {
  private attempts = new Map<string, number[]>();
  private readonly windowMs: number;
  private readonly maxAttempts: number;

  constructor(windowMs: number = 60000, maxAttempts: number = 100) {
    this.windowMs = windowMs;
    this.maxAttempts = maxAttempts;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get or create attempts array for this identifier
    let attempts = this.attempts.get(identifier) || [];
    
    // Filter out old attempts
    attempts = attempts.filter(timestamp => timestamp > windowStart);
    
    // Check if under limit
    if (attempts.length >= this.maxAttempts) {
      return false;
    }
    
    // Add current attempt
    attempts.push(now);
    this.attempts.set(identifier, attempts);
    
    return true;
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }

  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    for (const [identifier, attempts] of this.attempts.entries()) {
      const validAttempts = attempts.filter(timestamp => timestamp > windowStart);
      
      if (validAttempts.length === 0) {
        this.attempts.delete(identifier);
      } else {
        this.attempts.set(identifier, validAttempts);
      }
    }
  }
}