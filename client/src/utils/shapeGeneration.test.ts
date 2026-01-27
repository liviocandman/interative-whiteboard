// client/src/utils/shapeGeneration.test.ts
import { describe, it, expect } from 'vitest';
import {
  generateCirclePoints,
  generateRectanglePoints,
  generateSquarePoints,
  generateTrianglePoints
} from './shapeGeneration';
import type { Point } from '../types';

// Helper to calculate distance between two points
const distance = (p1: Point, p2: Point): number => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

describe('generateCirclePoints', () => {
  const center = { x: 100, y: 100 };
  const radius = 50;

  it('generates correct number of points', () => {
    const points = generateCirclePoints(center, radius, 60);
    expect(points.length).toBe(61); // 60 + 1 to close the circle
  });

  it('generates custom number of points', () => {
    const points = generateCirclePoints(center, radius, 30);
    expect(points.length).toBe(31);
  });

  it('points are equidistant from center', () => {
    const points = generateCirclePoints(center, radius, 60);

    // Check several points are at the correct radius
    for (let i = 0; i < points.length - 1; i += 10) {
      const dist = distance(points[i], center);
      expect(dist).toBeCloseTo(radius, 5);
    }
  });

  it('forms closed loop (first point equals last)', () => {
    const points = generateCirclePoints(center, radius, 60);
    const first = points[0];
    const last = points[points.length - 1];

    expect(first.x).toBeCloseTo(last.x, 5);
    expect(first.y).toBeCloseTo(last.y, 5);
  });

  it('handles zero radius', () => {
    const points = generateCirclePoints(center, 0, 10);

    // All points should be at center
    points.forEach(p => {
      expect(p.x).toBeCloseTo(center.x, 5);
      expect(p.y).toBeCloseTo(center.y, 5);
    });
  });

  it('handles different centers', () => {
    const differentCenter = { x: 200, y: 300 };
    const points = generateCirclePoints(differentCenter, 25, 20);

    // Check first point distance from center
    const dist = distance(points[0], differentCenter);
    expect(dist).toBeCloseTo(25, 5);
  });
});

describe('generateRectanglePoints', () => {
  const box = { x: 10, y: 20, width: 100, height: 50 };

  it('returns 5 points (closed rectangle)', () => {
    const points = generateRectanglePoints(box);
    expect(points.length).toBe(5);
  });

  it('corners match bounding box', () => {
    const points = generateRectanglePoints(box);

    // Top-left
    expect(points[0]).toEqual({ x: 10, y: 20 });
    // Top-right
    expect(points[1]).toEqual({ x: 110, y: 20 });
    // Bottom-right
    expect(points[2]).toEqual({ x: 110, y: 70 });
    // Bottom-left
    expect(points[3]).toEqual({ x: 10, y: 70 });
    // Close path (same as first)
    expect(points[4]).toEqual({ x: 10, y: 20 });
  });

  it('handles zero dimensions', () => {
    const zeroBox = { x: 50, y: 50, width: 0, height: 0 };
    const points = generateRectanglePoints(zeroBox);

    // All points should be at the same location
    expect(points[0]).toEqual({ x: 50, y: 50 });
    expect(points[1]).toEqual({ x: 50, y: 50 });
  });

  it('handles negative position', () => {
    const negBox = { x: -50, y: -30, width: 100, height: 60 };
    const points = generateRectanglePoints(negBox);

    expect(points[0]).toEqual({ x: -50, y: -30 });
    expect(points[2]).toEqual({ x: 50, y: 30 });
  });
});

describe('generateSquarePoints', () => {
  it('creates equal width/height from landscape box', () => {
    const box = { x: 0, y: 0, width: 100, height: 60 };
    const points = generateSquarePoints(box);

    // Should use smaller dimension (60)
    const width = points[1].x - points[0].x;
    const height = points[3].y - points[0].y;

    expect(width).toBeCloseTo(60, 5);
    expect(height).toBeCloseTo(60, 5);
  });

  it('creates equal width/height from portrait box', () => {
    const box = { x: 0, y: 0, width: 60, height: 100 };
    const points = generateSquarePoints(box);

    const width = points[1].x - points[0].x;
    const height = points[3].y - points[0].y;

    expect(width).toBeCloseTo(60, 5);
    expect(height).toBeCloseTo(60, 5);
  });

  it('centers within bounding box', () => {
    const box = { x: 0, y: 0, width: 100, height: 60 };
    const points = generateSquarePoints(box);

    // Square should be centered, so offset should be (100-60)/2 = 20
    expect(points[0].x).toBeCloseTo(20, 5);
    expect(points[0].y).toBeCloseTo(0, 5);
  });

  it('returns 5 points (closed square)', () => {
    const box = { x: 0, y: 0, width: 50, height: 50 };
    const points = generateSquarePoints(box);

    expect(points.length).toBe(5);
    expect(points[0]).toEqual(points[4]); // Closed path
  });

  it('handles equal width/height box', () => {
    const box = { x: 10, y: 10, width: 80, height: 80 };
    const points = generateSquarePoints(box);

    // No offset needed, should match box exactly
    expect(points[0]).toEqual({ x: 10, y: 10 });
    expect(points[2]).toEqual({ x: 90, y: 90 });
  });
});

describe('generateTrianglePoints', () => {
  const box = { x: 0, y: 0, width: 100, height: 100 };

  it('returns 4 points (closed triangle)', () => {
    const hull = [
      { x: 50, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 }
    ];
    const points = generateTrianglePoints(hull, box);

    expect(points.length).toBe(4);
  });

  it('first and last point are the same (closed path)', () => {
    const hull = [
      { x: 50, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 }
    ];
    const points = generateTrianglePoints(hull, box);

    expect(points[0]).toEqual(points[3]);
  });

  it('falls back for insufficient hull points (< 3)', () => {
    const smallHull = [{ x: 50, y: 50 }];
    const points = generateTrianglePoints(smallHull, box);

    // Should still return 4 points (fallback equilateral)
    expect(points.length).toBe(4);
    expect(points[0]).toEqual(points[3]); // Closed
  });

  it('uses fallback for empty hull', () => {
    const emptyHull: Point[] = [];
    const points = generateTrianglePoints(emptyHull, box);

    expect(points.length).toBe(4);
  });

  it('creates triangle from valid hull', () => {
    const hull = [
      { x: 50, y: 10 },   // Top
      { x: 10, y: 90 },   // Bottom-left
      { x: 90, y: 90 },   // Bottom-right
      { x: 70, y: 50 }    // Interior point (should be ignored)
    ];
    const points = generateTrianglePoints(hull, box);

    // Should identify 3 extreme points
    expect(points.length).toBe(4);
  });

  it('uses fallback when points are too close together', () => {
    const tooCloseHull = [
      { x: 50, y: 50 },
      { x: 51, y: 50 },
      { x: 50, y: 51 }
    ];
    const points = generateTrianglePoints(tooCloseHull, box);

    // Should use fallback equilateral triangle
    expect(points.length).toBe(4);

    // Fallback triangle should be reasonably sized
    const side1 = distance(points[0], points[1]);
    expect(side1).toBeGreaterThan(20);
  });
});
