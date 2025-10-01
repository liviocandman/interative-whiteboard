export interface Room {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  hasPassword: boolean;
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

export interface CreateRoomData {
  name: string;
  description: string;
  isPublic: boolean;
  password?: string;
  maxUsers: number;
  tags: string[];
  settings: RoomSettings;
}

export interface JoinRoomData {
  roomId: string;
  password?: string;
}

export interface RoomFilter {
  search: string;
  tags: string[];
  isPublicOnly: boolean;
  sortBy: 'name' | 'created' | 'users' | 'updated';
  sortOrder: 'asc' | 'desc';
}

export interface RoomStats {
  totalRooms: number;
  publicRooms: number;
  privateRooms: number;
  activeUsers: number;
  popularTags: Array<{ tag: string; count: number }>;
}