import type { ElementState, WorldState } from "../shared/state";

export function collectElements(): Map<string, HTMLElement> {
  const map = new Map<string, HTMLElement>();
  for (const el of document.querySelectorAll<HTMLElement>("[data-id]")) {
    map.set(el.dataset.id!, el);
  }
  return map;
}

export function captureDefaults(
  elements: Map<string, HTMLElement>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const [id, el] of elements) map.set(id, el.textContent ?? "");
  return map;
}

export function transformCss(s: ElementState): string {
  if (s.x === 0 && s.y === 0 && s.scale === 1 && s.rotation === 0) return "";
  return `translate(${s.x}px, ${s.y}px) rotate(${s.rotation}deg) scale(${s.scale})`;
}

export function renderTarget(
  el: HTMLElement,
  s: ElementState | undefined,
  defaultText: string,
): void {
  const text = s?.text ?? defaultText;
  if (el.textContent !== text) el.textContent = text;
  el.style.transform = s ? transformCss(s) : "";
}

export function renderWorld(
  elements: Map<string, HTMLElement>,
  defaults: Map<string, string>,
  state: WorldState,
): void {
  for (const [id, el] of elements) {
    renderTarget(el, state.get(id), defaults.get(id) ?? "");
  }
}
