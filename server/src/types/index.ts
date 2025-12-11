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
  createdBy: UserInfo;
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

export interface UserInfo {
  id: string;
  name: string;
  avatar?: string;
}

export interface User {
  id: string;
  name: string;
  color: string;
  cursor: Point;
  isDrawing: boolean;
  lastSeen: Date;
  isOnline: boolean;
  roomId?: string;
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
  timestamp: number;
  userId?: string;
}

export interface CanvasState {
  snapshot: string | null;
  strokes: Stroke[];
}

// API Request/Response types
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
  roomId: string;
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
  isPublicOnly?: boolean;
  sortBy?: 'name' | 'created' | 'updated' | 'users';
  sortOrder?: 'asc' | 'desc';
}

// Socket.IO Events
export interface ServerToClientEvents {
  // Drawing events
  drawing: (stroke: Stroke) => void;
  initialState: (state: CanvasState) => void;
  clearBoard: () => void;

  // User events
  userJoined: (user: User) => void;
  userLeft: (userId: string) => void;
  cursorMove: (data: { userId: string; position: Point }) => void;
  drawingState: (data: { userId: string; isDrawing: boolean }) => void;
  roomUsers: (users: User[]) => void;

  // Error events
  error: (error: ErrorResponse) => void;
}

export interface ClientToServerEvents {
  // Room events
  joinRoom: (roomId: string, callback?: (error?: string) => void) => void;
  leaveRoom: (callback?: (error?: string) => void) => void;

  // Drawing events
  drawing: (stroke: Stroke) => void;
  saveState: (snapshot: string, callback?: (error?: string) => void) => void;
  resetBoard: (callback?: (error?: string) => void) => void;

  // User events
  userSetup: (data: { name: string; color: string }) => void;
  cursorMove: (position: Point) => void;
  drawingState: (isDrawing: boolean) => void;
}

export interface ErrorResponse {
  event: string;
  message: string;
  code?: string;
  timestamp: number;
}

// Redis Keys
export const REDIS_KEYS = {
  ROOM_DATA: (roomId: string) => `room:${roomId}:data`,
  ROOM_USERS: (roomId: string) => `room:${roomId}:users`,
  ROOM_STATE: (roomId: string) => `room:${roomId}:state`,
  ROOM_STROKES: (roomId: string) => `room:${roomId}:strokes`,
  ROOM_CHANNEL: (roomId: string) => `room:${roomId}`,
  USER_DATA: (userId: string) => `user:${userId}:data`,
  SESSION_DATA: (socketId: string) => `session:${socketId}`,
  ALL_ROOMS: 'rooms:all',
} as const;

// Constants
export const CONFIG = {
  DEFAULT_TTL_SECONDS: 3600,
  SESSION_TTL_SECONDS: 300,
  CLEANUP_DELAY_MS: 5 * 60 * 1000,
  MAX_ROOMS_PER_PAGE: 50,
  MAX_ROOM_NAME_LENGTH: 50,
  MAX_DESCRIPTION_LENGTH: 200,
  MAX_TAGS: 5,
  MAX_LINE_WIDTH: 100,
  BCRYPT_ROUNDS: 10,
} as const;