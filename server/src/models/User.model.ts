import type { User, Point } from '../types';

export class UserModel {
  static createUser(socketId: string, name: string, color: string, roomId?: string): User {
    return {
      id: socketId,
      name: this.sanitizeName(name),
      color: this.validateColor(color),
      cursor: { x: 0, y: 0 },
      isDrawing: false,
      lastSeen: new Date(),
      isOnline: true,
      roomId,
    };
  }

  static sanitizeName(name: string): string {
    // Remove HTML tags and limit length
    const sanitized = name.replace(/<[^>]*>/g, '').trim();
    return sanitized.substring(0, 50) || 'Anonymous';
  }

  static validateColor(color: string): string {
    // Validate hex color format
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (hexColorRegex.test(color)) {
      return color;
    }
    // Return default color if invalid
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  }

  static updateCursor(user: User, position: Point): User {
    return {
      ...user,
      cursor: position,
      lastSeen: new Date(),
    };
  }

  static updateDrawingState(user: User, isDrawing: boolean): User {
    return {
      ...user,
      isDrawing,
      lastSeen: new Date(),
    };
  }

  static setRoom(user: User, roomId: string | undefined): User {
    return {
      ...user,
      roomId,
      lastSeen: new Date(),
    };
  }

  static markOffline(user: User): User {
    return {
      ...user,
      isOnline: false,
      lastSeen: new Date(),
    };
  }

  static markOnline(user: User): User {
    return {
      ...user,
      isOnline: true,
      lastSeen: new Date(),
    };
  }

  static serialize(user: User): string {
    return JSON.stringify({
      ...user,
      lastSeen: user.lastSeen.toISOString(),
    });
  }

  static deserialize(data: string): User | null {
    try {
      const parsed = JSON.parse(data);
      return {
        ...parsed,
        lastSeen: new Date(parsed.lastSeen),
      };
    } catch {
      return null;
    }
  }

  static toPublic(user: User): Omit<User, 'lastSeen'> {
    const { lastSeen, ...publicUser } = user;
    return publicUser;
  }
}
