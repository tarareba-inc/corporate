import "./styles.css";
import type { StoredEvent } from "../shared/events";
import { applyEvent, foldEvents } from "../shared/state";
import type { WorldState } from "../shared/state";
import { captureDefaults, collectElements, renderTarget, renderWorld } from "./dom";
import { runReplay } from "./replay";
import { connectWorld } from "./ws";

export type Phase = "replay" | "live" | "scrub";

async function boot(): Promise<void> {
  const elements = collectElements();
  const defaults = captureDefaults(elements);
  const events: StoredEvent[] = [];
  let state: WorldState = new Map();
  let phase: Phase = "replay";
  const pendingLive: StoredEvent[] = [];
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  const hud = document.getElementById("replay-hud")!;
  const hudCount = document.getElementById("replay-count")!;

  const applyStored = (ev: StoredEvent, animate: boolean) => {
    applyEvent(state, ev);
    const el = elements.get(ev.target);
    if (!el) return;
    if (animate && !reducedMotion) {
      el.classList.add("is-animating");
      setTimeout(() => el.classList.remove("is-animating"), 700);
    }
    renderTarget(el, state.get(ev.target), defaults.get(ev.target) ?? "");
  };

  let onEventsGrown = () => {};

  const { send } = connectWorld((m) => {
    if (m.kind === "event") {
      if (phase === "replay") {
        pendingLive.push(m.event);
        return;
      }
      if (events.some((e) => e.id === m.event.id)) return;
      events.push(m.event);
      if (phase === "live") {
        applyStored(m.event, true);
      } else {
        applyEvent(state, m.event);
      }
      onEventsGrown();
    } else if (m.kind === "rejected" && m.target) {
      const el = elements.get(m.target);
      if (el) {
        renderTarget(el, state.get(m.target), defaults.get(m.target) ?? "");
      }
    }
  });
  void send;

  const history: StoredEvent[] = await fetch("/api/events").then((r) =>
    r.json(),
  );
  events.push(...history);

  if (history.length > 0) {
    hud.hidden = false;
    hudCount.textContent = `${history.length}回書き換えられた世界`;
    if (!reducedMotion) await new Promise((r) => setTimeout(r, 600));
  }

  const { done, skip } = runReplay(
    history,
    (ev) => applyStored(ev, true),
    (applied) => {
      hudCount.textContent = `${applied} / ${history.length}`;
    },
  );
  const onSkip = () => skip();
  document.addEventListener("pointerdown", onSkip);
  if (reducedMotion) skip();
  await done;
  document.removeEventListener("pointerdown", onSkip);
  hud.hidden = true;

  phase = "live";
  for (const ev of pendingLive) {
    if (!events.some((e) => e.id === ev.id)) {
      events.push(ev);
      applyStored(ev, false);
    }
  }
  pendingLive.length = 0;

  state = foldEvents(events);
  renderWorld(elements, defaults, state);
}

boot();
