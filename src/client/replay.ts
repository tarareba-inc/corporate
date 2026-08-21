import type { StoredEvent } from "../shared/events";
import { replaySchedule } from "../shared/schedule";

export function runReplay(
  events: StoredEvent[],
  apply: (ev: StoredEvent) => void,
  onProgress: (applied: number) => void,
): { done: Promise<void>; skip: () => void } {
  const times = replaySchedule(events.length);
  const timers: ReturnType<typeof setTimeout>[] = [];
  let applied = 0;
  let finish!: () => void;
  const done = new Promise<void>((resolve) => {
    finish = resolve;
  });

  const applyNext = () => {
    apply(events[applied]!);
    applied++;
    onProgress(applied);
    if (applied === events.length) finish();
  };

  if (events.length === 0) {
    finish();
  } else {
    for (let i = 0; i < events.length; i++) {
      timers.push(setTimeout(applyNext, times[i]!));
    }
  }

  const skip = () => {
    for (const t of timers) clearTimeout(t);
    timers.length = 0;
    while (applied < events.length) applyNext();
  };

  return { done, skip };
}
