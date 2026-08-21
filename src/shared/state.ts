import type { EditEvent } from "./events";

export type ElementState = {
  text: string | null;
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

export type WorldState = Map<string, ElementState>;

export function initialElementState(): ElementState {
  return { text: null, x: 0, y: 0, scale: 1, rotation: 0 };
}

export function applyEvent(state: WorldState, ev: EditEvent): void {
  const el = state.get(ev.target) ?? initialElementState();
  switch (ev.type) {
    case "setText":
      el.text = ev.text;
      break;
    case "move":
      el.x = ev.x;
      el.y = ev.y;
      break;
    case "transform":
      el.scale = ev.scale;
      el.rotation = ev.rotation;
      break;
  }
  state.set(ev.target, el);
}

export function foldEvents(events: EditEvent[]): WorldState {
  const state: WorldState = new Map();
  for (const ev of events) applyEvent(state, ev);
  return state;
}
