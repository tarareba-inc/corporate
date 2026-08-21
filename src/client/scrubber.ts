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

export function setupScrubber(deps: Deps): {
  onEventsGrown: () => void;
  destroy: () => void;
} {
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

  const returnToLive = () => {
    if (!scrubbing) return;
    scrubbing = false;
    document.body.classList.remove("is-scrubbing");
    sync();
    renderWorld(deps.elements, deps.defaults, deps.getLiveState());
    deps.onScrubEnd();
  };

  range.addEventListener("input", () => {
    const k = Number(range.value);
    if (k >= deps.events.length) {
      returnToLive();
      return;
    }
    if (!scrubbing) {
      scrubbing = true;
      document.body.classList.add("is-scrubbing");
      deps.onScrubStart();
    }
    renderWorld(
      deps.elements,
      deps.defaults,
      foldEvents(deps.events.slice(0, k)),
    );
  });

  const onPointerDown = (e: Event) => {
    if (!scrubbing) return;
    const target = e.target as HTMLElement;
    if (target.closest?.("#scrubber")) return;
    returnToLive();
  };
  document.addEventListener("pointerdown", onPointerDown, true);

  liveButton.addEventListener("click", returnToLive);

  return {
    onEventsGrown: sync,
    destroy: () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.body.classList.remove("is-scrubbing");
    },
  };
}
