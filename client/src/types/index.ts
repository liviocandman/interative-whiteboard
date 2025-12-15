// shared/types/index.ts
export type Tool = 'pen' | 'magicpen' | 'bucket' | 'eraser' | 'text' | 'select';

export interface ToolConfig {
  id: Tool;
  name: string;
  icon: string;
  description: string;
  cursor: string;
  category: 'drawing' | 'shapes' | 'utility';
}

export interface ToolbarSettings {
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
}

export interface User {
  id: string;
  name: string;
  color: string;
  cursor: Point;
  isDrawing: boolean;
  lastSeen: Date;
  isOnline: boolean;
}

export interface UserState {
  currentUser: User | null;
  otherUsers: Map<string, User>;
  isSettingUp: boolean;
}

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

export interface DrawingState {
  tool: Tool;
  color: string;
  lineWidth: number;
  isDrawing: boolean;
}

export interface RoomState {
  roomId: string;
  userCount: number;
  isConnected: boolean;
}

export interface CanvasState {
  snapshot: string | null;
  strokes: Stroke[];
}

// Socket Events
export interface SocketEvents {
  // Client -> Server
  joinRoom: (roomId: string, ack?: (error?: string) => void) => void;
  drawing: (stroke: Stroke) => void;
  saveState: (snapshot: string, ack?: (error?: string) => void) => void;
  leaveRoom: (ack?: (error?: string) => void) => void;
  resetBoard: (ack?: (error?: string) => void) => void;

  // Server -> Client
  publishDrawing: (stroke: Stroke) => void;
  initialState: (state: CanvasState) => void;
  clearBoard: () => void;
  removedDueToInactivity: () => void;
  error: (error: { event: string; message: string }) => void;
}

// Config
export interface WhiteboardConfig {
  throttleMs: number;
  maxHistory: number;
  inactivityTimeoutMs: number;
  cleanupDelayMs: number;
}

export interface RedisConfig {
  ttlSeconds: number;
  keyPrefix: string;
  pubSubPattern: string;
}