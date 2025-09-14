import { pubClient as redis } from "../config/redis";
export interface Stroke {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  lineWidth: number;
  tool?: string;
}

const STROKES_KEY = (roomId: string) => `room:${roomId}:strokes`;
const CHANNEL = (roomId: string) => `room:${roomId}`;

export async function saveAndBroadcastStroke(
  roomId: string,
  stroke: Stroke,
  origin?: string | null
): Promise<{ pushedLength: number | null; publishCount: number | null }> {
  if (!roomId) throw new Error("saveAndBroadcastStroke: roomId inválido");
  if (!stroke) throw new Error("saveAndBroadcastStroke: stroke inválido");

  const key = STROKES_KEY(roomId);
  const channel = CHANNEL(roomId);
  const payload = JSON.stringify({ stroke, origin: origin ?? null });

  let pushedLength: number | null = null;
  let publishCount: number | null = null;

  try {
    pushedLength = await redis.rPush(key, JSON.stringify(stroke));

    publishCount = await redis.publish(channel, payload);
    
    return { pushedLength, publishCount };
  } catch (err) {
    console.error(`[strokeService] erro saveAndBroadcastStroke room=${roomId}:`, err);
    throw err;
  }
}

export async function fetchRoomStrokes(roomId: string): Promise<Stroke[]> {
  if (!roomId) return [];
  const key = STROKES_KEY(roomId);
  try {
    const items = await redis.lRange(key, 0, -1);
    return items
      .map((s) => {
        try {
          return JSON.parse(s) as Stroke;
        } catch {
          return null;
        }
      })
      .filter(Boolean) as Stroke[];
  } catch (err) {
    console.error(`[strokeService] erro fetchRoomStrokes room=${roomId}:`, err);
    return [];
  }
}

export async function clearRoomStrokes(roomId: string): Promise<number> {
  if (!roomId) return 0;
  const key = STROKES_KEY(roomId);
  try {
    const res = await redis.del(key);
    console.debug(`[strokeService] clearRoomStrokes room=${roomId} deleted=${res}`);
    return Number(res ?? 0);
  } catch (err) {
    console.error(`[strokeService] erro clearRoomStrokes room=${roomId}:`, err);
    throw err;
  }
}
