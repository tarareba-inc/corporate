import type { ElementState, WorldState } from "../shared/state";
import type { LayoutRect } from "./clamp";
import { clampedOffset } from "./clamp";

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

export function viewportWidth(): number {
  return document.documentElement.clientWidth || window.innerWidth;
}

export function viewportHeight(): number {
  return document.documentElement.clientHeight || window.innerHeight;
}

export function layoutRect(el: HTMLElement): LayoutRect {
  let left = 0;
  let top = 0;
  let node: HTMLElement | null = el;
  while (node) {
    left += node.offsetLeft;
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { left, top, width: el.offsetWidth, height: el.offsetHeight };
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
  if (!s) {
    el.style.transform = "";
    return;
  }
  const off = clampedOffset(layoutRect(el), s, viewportWidth());
  el.style.transform = transformCss({ ...s, ...off });
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
