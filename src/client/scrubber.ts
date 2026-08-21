import type { StoredEvent } from "../shared/events";
import { foldEvents } from "../shared/state";
import type { WorldState } from "../shared/state";
import { renderWorld } from "./dom";

type Deps = {
  events: StoredEvent[];
  elements: Map<string, HTMLElement>;
  defaults: Map<string, string>;
  getLiveState: () => WorldState;
  onScrubStart: () => void;
  onScrubEnd: () => void;
};

export function setupScrubber(deps: Deps): { onEventsGrown: () => void } {
  const box = document.getElementById("scrubber")!;
  const range = document.getElementById("scrubber-range") as HTMLInputElement;
  const liveButton = document.getElementById("scrubber-live")!;
  let scrubbing = false;

  const sync = () => {
    range.max = String(deps.events.length);
    if (!scrubbing) range.value = range.max;
    box.hidden = deps.events.length === 0;
  };
  sync();

  range.addEventListener("input", () => {
    if (!scrubbing) {
      scrubbing = true;
      deps.onScrubStart();
    }
    const k = Number(range.value);
    renderWorld(
      deps.elements,
      deps.defaults,
      foldEvents(deps.events.slice(0, k)),
    );
  });

  liveButton.addEventListener("click", () => {
    if (!scrubbing) return;
    scrubbing = false;
    sync();
    renderWorld(deps.elements, deps.defaults, deps.getLiveState());
    deps.onScrubEnd();
  });

  return { onEventsGrown: sync };
}
