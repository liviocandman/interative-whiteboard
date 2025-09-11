import { pubClient } from "../config/redis";

export interface Stroke {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  lineWidth: number;
}

const STROKES_KEY = (roomId: string) => `room:${roomId}:strokes`;

/** Publica no canal e armazena na lista Redis */
export async function publishStroke(roomId: string, stroke: Stroke, socketId?: string | null, origin?: string): Promise<void> {
  const payload = JSON.stringify({ stroke, origin });

  await pubClient.rPush(STROKES_KEY(roomId), JSON.stringify(stroke));

  await pubClient.publish(`room:${roomId}`, payload);
}

/** Retorna todos os strokes gravados na sala */
export async function getRoomStrokes(roomId: string): Promise<Stroke[]> {
  const items = await pubClient.lRange(STROKES_KEY(roomId), 0, -1);
  return items.map((json) => JSON.parse(json));
}

export async function deleteRoomStrokes(roomId: string) {
  await pubClient.del(STROKES_KEY(roomId));
}