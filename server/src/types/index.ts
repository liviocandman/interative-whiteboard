// server/src/types/index.ts
export interface Room {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  isPublic: boolean;
  hasPassword: boolean;
  passwordHash?: string;
  maxUsers: number;
  currentUsers: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: {
    id: string;
    name: string;
    avatar?: string;
  };
  settings: RoomSettings;
  lastActivity: Date;
  isActive: boolean;
}

export interface RoomSettings {
  allowDrawing: boolean;
  allowChat: boolean;
  allowExport: boolean;
  requireApproval: boolean;
  backgroundColor: string;
  canvasSize: 'small' | 'medium' | 'large' | 'custom';
  customWidth?: number;
  customHeight?: number;
  enableGrid: boolean;
  enableRulers: boolean;
  autoSave: boolean;
  historyLimit: number;
}

export interface CreateRoomRequest {
  name: string;
  description: string;
  isPublic: boolean;
  password?: string;
  maxUsers: number;
  tags: string[];
  settings: RoomSettings;
}

export interface JoinRoomRequest {
  password?: string;
}

export interface RoomStats {
  totalRooms: number;
  publicRooms: number;
  privateRooms: number;
  activeUsers: number;
  popularTags: Array<{ tag: string; count: number }>;
}

export interface RoomFilter {
  search?: string;
  tags?: string[];
  isPublic?: boolean;
  isActive?: boolean;
  createdBy?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'created' | 'updated' | 'users';
  sortOrder?: 'asc' | 'desc';
}

export type Tool = 'pen' | 'eraser' | 'bucket';

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  from: Point;
  to: Point;
  color: string;
  lineWidth: number;
  tool: Tool;
  timestamp?: number;
}

export interface CanvasState {
  snapshot: string | null;
  strokes: Stroke[];
}

export interface Session {
  socketId: string;
  roomId?: string;
  lastActivity: number;
  userAgent?: string;
  ip?: string;
}

export interface RoomInfo {
  id: string;
  userCount: number;
  createdAt: number;
  lastActivity: number;
}

export interface ServerConfig {
  port: number;
  redisUrl: string;
  corsOrigin: string;
  sessionTTL: number;
  cleanupDelay: number;
  rateLimitWindow: number;
  rateLimitMax: number;
}

export interface ErrorResponse {
  event: string;
  message: string;
  code?: string;
  timestamp: number;
}

// Socket.IO event interfaces
export interface ServerToClientEvents {
  drawing: (stroke: Stroke) => void;
  initialState: (state: CanvasState) => void;
  clearBoard: () => void;
  removedDueToInactivity: () => void;
  error: (error: ErrorResponse) => void;
  userJoined: (userCount: number) => void;
  userLeft: (userCount: number) => void;
}

export interface ClientToServerEvents {
  joinRoom: (roomId: string, ack?: (error?: string) => void) => void;
  drawing: (stroke: Stroke) => void;
  saveState: (snapshot: string, ack?: (error?: string) => void) => void;
  leaveRoom: (ack?: (error?: string) => void) => void;
  resetBoard: (ack?: (error?: string) => void) => void;
  ping: () => void;
}

export interface InterServerEvents {
  roomUserCountChanged: (roomId: string, count: number) => void;
  roomCleanup: (roomId: string) => void;
}

export interface SocketData {
  sessionId: string;
  roomId?: string;
  joinedAt?: number;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  isPublic: boolean;
  hasPassword: boolean;
  passwordHash?: string;
  maxUsers: number;
  currentUsers: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: {
    id: string;
    name: string;
    avatar?: string;
  };
  settings: RoomSettings;
  lastActivity: Date;
  isActive: boolean;
}

export interface RoomSettings {
  allowDrawing: boolean;
  allowChat: boolean;
  allowExport: boolean;
  requireApproval: boolean;
  backgroundColor: string;
  canvasSize: 'small' | 'medium' | 'large' | 'custom';
  customWidth?: number;
  customHeight?: number;
  enableGrid: boolean;
  enableRulers: boolean;
  autoSave: boolean;
  historyLimit: number;
}

export interface CreateRoomRequest {
  name: string;
  description: string;
  isPublic: boolean;
  password?: string;
  maxUsers: number;
  tags: string[];
  settings: RoomSettings;
}

export interface JoinRoomRequest {
  password?: string;
}

export interface RoomStats {
  totalRooms: number;
  publicRooms: number;
  privateRooms: number;
  activeUsers: number;
  popularTags: Array<{ tag: string; count: number }>;
}

export interface RoomFilter {
  search?: string;
  tags?: string[];
  isPublic?: boolean;
  isActive?: boolean;
  createdBy?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'created' | 'updated' | 'users';
  sortOrder?: 'asc' | 'desc';
}


// Redis key patterns
export const REDIS_KEYS = {
  ROOM_META: (roomId: string) => `room:${roomId}:meta`,
  ROOM_USERS: (roomId: string) => `room:${roomId}:users`,
  ROOM_STATE: (roomId: string) => `room:${roomId}:state`,
  ROOM_STROKES: (roomId: string) => `room:${roomId}:strokes`,
  ROOM_CHANNEL: (roomId: string) => `room:${roomId}`,
  SESSION_DATA: (socketId: string) => `session:${socketId}:data`,
  SESSION_ROOM: (socketId: string) => `session:${socketId}:room`,
  SESSION_ACTIVITY: (socketId: string) => `session:${socketId}:activity`,
  USER_LAST_ACTIVE: (socketId: string) => `user:lastActive:${socketId}`,
} as const;

export const REDIS_PATTERNS = {
  ROOM_CHANNELS: 'room:*',
  SESSION_EXPIRY: '__keyevent@0__:expired',
} as const;

// Configuration constants
export const CONFIG = {
  DEFAULT_TTL_SECONDS: 3600,
  SESSION_TTL_SECONDS: 300,
  CLEANUP_DELAY_MS: 5 * 60 * 1000,
  THROTTLE_MS: 16, // ~60fps
  MAX_STROKE_HISTORY: 10000,
  MAX_ROOM_ID_LENGTH: 100,
  MAX_LINE_WIDTH: 100,
  RATE_LIMIT_WINDOW_MS: 60000,
  RATE_LIMIT_MAX_REQUESTS: 100,
} as const;