import type { EditEvent, StoredEvent } from "../shared/events";
import { validateEvent } from "../shared/events";

export type EventRow = {
  id: number;
  ts: number;
  type: string;
  target: string;
  payload: string;
};

export function eventPayload(ev: EditEvent): Record<string, unknown> {
  switch (ev.type) {
    case "setText":
      return { text: ev.text };
    case "move":
      return { x: ev.x, y: ev.y };
    case "transform":
      return { scale: ev.scale, rotation: ev.rotation };
  }
}

export function rowToStoredEvent(row: EventRow): StoredEvent | null {
  let payload: unknown;
  try {
    payload = JSON.parse(row.payload);
  } catch {
    return null;
  }
  if (typeof payload !== "object" || payload === null) return null;
  const ev = validateEvent({ ...payload, type: row.type, target: row.target });
  if (!ev) return null;
  return { ...ev, id: row.id, ts: row.ts };
}

export async function insertEvent(
  db: D1Database,
  ev: EditEvent,
  ipHash: string,
  ts: number,
): Promise<StoredEvent> {
  const row = await db
    .prepare(
      "INSERT INTO events (ts, ip_hash, type, target, payload) VALUES (?, ?, ?, ?, ?) RETURNING id",
    )
    .bind(ts, ipHash, ev.type, ev.target, JSON.stringify(eventPayload(ev)))
    .first<{ id: number }>();
  return { ...ev, id: row!.id, ts };
}
