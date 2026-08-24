import type { StoredEvent } from "../shared/events";
import { foldEvents } from "../shared/state";
import type { WorldState } from "../shared/state";
import { renderWorld } from "./dom";

const TAP_SLOP_PX = 10;

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
    if (!scrubbing) {
      if (k >= deps.events.length) return;
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

  range.addEventListener("change", () => {
    if (Number(range.value) >= deps.events.length) returnToLive();
  });

  let tapStart: { x: number; y: number } | null = null;
  const cancelTap = () => {
    tapStart = null;
  };
  const isTap = (e: PointerEvent) =>
    Math.hypot(e.clientX - tapStart!.x, e.clientY - tapStart!.y) <=
    TAP_SLOP_PX;

  const onPointerDown = (e: PointerEvent) => {
    tapStart = null;
    if (!scrubbing || !e.isPrimary) return;
    const target = e.target as HTMLElement;
    if (target.closest?.("#scrubber")) return;
    tapStart = { x: e.clientX, y: e.clientY };
  };

  const onPointerMove = (e: PointerEvent) => {
    if (tapStart && !isTap(e)) tapStart = null;
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!tapStart) return;
    const tapped = isTap(e);
    tapStart = null;
    if (tapped) returnToLive();
  };

  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("pointermove", onPointerMove, true);
  document.addEventListener("pointerup", onPointerUp, true);
  document.addEventListener("pointercancel", cancelTap, true);
  window.addEventListener("scroll", cancelTap, { passive: true });

  liveButton.addEventListener("click", returnToLive);

  return {
    onEventsGrown: sync,
    destroy: () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("pointermove", onPointerMove, true);
      document.removeEventListener("pointerup", onPointerUp, true);
      document.removeEventListener("pointercancel", cancelTap, true);
      window.removeEventListener("scroll", cancelTap);
      document.body.classList.remove("is-scrubbing");
    },
  };
}
