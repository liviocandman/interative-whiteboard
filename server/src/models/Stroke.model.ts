import { CONFIG } from '../types';
import type { Stroke, Point, Tool } from '../types';

export class StrokeModel {
  static validate(stroke: any): Stroke | null {
    if (!stroke || typeof stroke !== 'object') {
      return null;
    }

    // Validate points
    if (!this.isValidPoint(stroke.from) || !this.isValidPoint(stroke.to)) {
      return null;
    }

    // Validate color (hex format)
    if (!stroke.color || typeof stroke.color !== 'string' || !this.isValidColor(stroke.color)) {
      return null;
    }

    // Validate line width
    if (typeof stroke.lineWidth !== 'number' || stroke.lineWidth <= 0 || stroke.lineWidth > CONFIG.MAX_LINE_WIDTH) {
      return null;
    }

    // Validate tool
    if (!this.isValidTool(stroke.tool)) {
      return null;
    }

    // Validate or set timestamp
    const timestamp = stroke.timestamp || Date.now();

    return {
      from: stroke.from,
      to: stroke.to,
      color: stroke.color,
      lineWidth: stroke.lineWidth,
      tool: stroke.tool,
      timestamp,
      userId: stroke.userId,
    };
  }

  static isValidPoint(point: any): point is Point {
    return (
      point &&
      typeof point === 'object' &&
      typeof point.x === 'number' &&
      typeof point.y === 'number' &&
      isFinite(point.x) &&
      isFinite(point.y)
    );
  }

  static isValidColor(color: string): boolean {
    // Allow hex colors
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    // Allow rgb/rgba
    const rgbRegex = /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/;

    return hexColorRegex.test(color) || rgbRegex.test(color);
  }

  static isValidTool(tool: any): tool is Tool {
    return tool === 'pen' || tool === 'eraser' || tool === 'bucket';
  }

  static serialize(stroke: Stroke): string {
    return JSON.stringify(stroke);
  }

  static deserialize(data: string): Stroke | null {
    try {
      const parsed = JSON.parse(data);
      return this.validate(parsed);
    } catch {
      return null;
    }
  }

  static addUserId(stroke: Stroke, userId: string): Stroke {
    return {
      ...stroke,
      userId,
    };
  }

  static createFromPoints(from: Point, to: Point, color: string, lineWidth: number, tool: Tool, userId?: string): Stroke {
    return {
      from,
      to,
      color,
      lineWidth,
      tool,
      timestamp: Date.now(),
      userId,
    };
  }
}
