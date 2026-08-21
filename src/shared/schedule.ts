export const REPLAY_MAX_MS = 6000;
export const REPLAY_PER_EVENT_MS = 450;

export function replaySchedule(
  count: number,
  maxMs = REPLAY_MAX_MS,
  perEventMs = REPLAY_PER_EVENT_MS,
): number[] {
  if (count <= 0) return [];
  if (count === 1) return [0];
  if ((count - 1) * perEventMs <= maxMs) {
    return Array.from({ length: count }, (_, i) => i * perEventMs);
  }
  return Array.from({ length: count }, (_, i) =>
    Math.round(maxMs * (i / (count - 1)) ** 3),
  );
}
