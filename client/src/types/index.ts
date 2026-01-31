// shared/types/index.ts
export type Tool = 'pen' | 'magicpen' | 'bucket' | 'eraser' | 'hand' | 'text' | 'select';

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

// Zoom and Pan configuration
export interface ViewConfig {
  zoom: number;         // 1.0 = 100%, 0.5 = 50%, 2.0 = 200%
  offset: Point;        // Pan offset in screen pixels
}

export const DEFAULT_VIEW: ViewConfig = {
  zoom: 1,
  offset: { x: 0, y: 0 },
};

export const VIEW_LIMITS = {
  MIN_ZOOM: 0.25,
  MAX_ZOOM: 4,
};

export interface Stroke {
  from: Point;
  to: Point;
  color: string;
  lineWidth: number;
  tool: Tool;
  timestamp?: number;
  // Unique ID per drawing gesture (pointerdown to pointerup) for undo grouping
  strokeId?: string;
  // User ID who made the stroke
  userId?: string;
  // For magic pen and shape tools - complete path rendering
  points?: Point[];
  shapeType?: 'circle' | 'rectangle' | 'square' | 'triangle';
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