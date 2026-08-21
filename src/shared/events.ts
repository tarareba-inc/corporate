export const ELEMENT_IDS = [
  "hero-name",
  "hero-mission",
  "hero-lead",
  "about-title",
  "seal",
  "about-name-label",
  "about-name-value",
  "about-rep-label",
  "about-rep-value",
  "about-founded-label",
  "about-founded-value",
  "about-location-label",
  "about-location-value",
  "about-business-label",
  "about-business-value",
  "services-title",
  "services-body",
  "contact-title",
  "contact-lead",
  "contact-email",
  "footer-copyright",
] as const;

export type ElementId = (typeof ELEMENT_IDS)[number];

export const MAX_TEXT_LENGTH = 120;
export const MAX_OFFSET = 4000;
export const MIN_SCALE = 0.2;
export const MAX_SCALE = 8;
export const MAX_ROTATION = 3600;

export type SetTextEvent = { type: "setText"; target: string; text: string };
export type MoveEvent = { type: "move"; target: string; x: number; y: number };
export type TransformEvent = {
  type: "transform";
  target: string;
  scale: number;
  rotation: number;
};
export type EditEvent = SetTextEvent | MoveEvent | TransformEvent;
export type StoredEvent = EditEvent & { id: number; ts: number };

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function hasForbiddenControlChar(text: string): boolean {
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if ((code < 32 && code !== 10) || code === 127) return true;
  }
  return false;
}

export function validateEvent(raw: unknown): EditEvent | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.target !== "string") return null;
  if (!(ELEMENT_IDS as readonly string[]).includes(o.target)) return null;
  switch (o.type) {
    case "setText": {
      if (typeof o.text !== "string") return null;
      if ([...o.text].length > MAX_TEXT_LENGTH) return null;
      if (hasForbiddenControlChar(o.text)) return null;
      return { type: "setText", target: o.target, text: o.text };
    }
    case "move": {
      if (!isFiniteNumber(o.x) || !isFiniteNumber(o.y)) return null;
      if (Math.abs(o.x) > MAX_OFFSET || Math.abs(o.y) > MAX_OFFSET) return null;
      return { type: "move", target: o.target, x: o.x, y: o.y };
    }
    case "transform": {
      if (!isFiniteNumber(o.scale) || !isFiniteNumber(o.rotation)) return null;
      if (o.scale < MIN_SCALE || o.scale > MAX_SCALE) return null;
      if (Math.abs(o.rotation) > MAX_ROTATION) return null;
      return {
        type: "transform",
        target: o.target,
        scale: o.scale,
        rotation: o.rotation,
      };
    }
    default:
      return null;
  }
}
