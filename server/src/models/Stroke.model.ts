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

    // Validate optional points array for magic pen
    if (stroke.points !== undefined) {
      if (!Array.isArray(stroke.points)) {
        return null;
      }
      // Validate each point in the array
      if (!stroke.points.every((p: any) => this.isValidPoint(p))) {
        return null;
      }
    }

    // Validate optional shapeType
    if (stroke.shapeType !== undefined) {
      const validShapeTypes = ['circle', 'rectangle', 'square', 'triangle'];
      if (!validShapeTypes.includes(stroke.shapeType)) {
        return null;
      }
    }

    return {
      from: stroke.from,
      to: stroke.to,
      color: stroke.color,
      lineWidth: stroke.lineWidth,
      tool: stroke.tool,
      timestamp,
      userId: stroke.userId,
      ...(stroke.points && { points: stroke.points }),
      ...(stroke.shapeType && { shapeType: stroke.shapeType }),
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
    return tool === 'pen' || tool === 'eraser' || tool === 'bucket' || tool === 'magicpen';
  }

  static serialize(stroke: Stroke): string {
    const serialized = JSON.stringify(stroke);
    if (stroke.tool === 'magicpen') {
      console.log('[StrokeModel] Serializing magic pen stroke:', {
        hasPoints: !!stroke.points,
        pointsLength: stroke.points?.length,
        shapeType: stroke.shapeType
      });
    }
    return serialized;
  }

  static deserialize(data: string): Stroke | null {
    try {
      const parsed = JSON.parse(data);
      const validated = this.validate(parsed);
      if (validated && validated.tool === 'magicpen') {
        console.log('[StrokeModel] Deserialized magic pen stroke:', {
          hasPoints: !!validated.points,
          pointsLength: validated.points?.length,
          shapeType: validated.shapeType
        });
      }
      return validated;
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
