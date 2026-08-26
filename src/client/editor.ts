import type { EditEvent } from "../shared/events";
import {
  MAX_OFFSET,
  MAX_ROTATION,
  MAX_SCALE,
  MAX_TEXT_LENGTH,
  MIN_SCALE,
  textRuleHint,
} from "../shared/events";
import type { ElementState, WorldState } from "../shared/state";
import { initialElementState } from "../shared/state";
import { clampHandlePosition, clampedOffset } from "./clamp";
import {
  layoutRect,
  renderTarget,
  transformCss,
  viewportHeight,
  viewportWidth,
} from "./dom";

type Deps = {
  elements: Map<string, HTMLElement>;
  defaults: Map<string, string>;
  getState: () => WorldState;
  send: (ev: EditEvent) => void;
};

const DRAG_THRESHOLD_PX = 4;
const HANDLE_SIZE = 30;
const HANDLE_MARGIN = 8;
const DOUBLE_TAP_MS = 350;
const HINT_MS = 4000;

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

function isTouchLike(e: PointerEvent): boolean {
  return e.pointerType === "touch" || e.pointerType === "pen";
}

// Safariはcompositionendをkeydownより先に発火するのでisComposingが立たない
function isImeKey(e: KeyboardEvent): boolean {
  return e.isComposing || e.keyCode === 229;
}

export class Editor {
  private enabled = false;
  private selectedId: string | null = null;
  private rotateHandle: HTMLElement;
  private scaleHandle: HTMLElement;
  private lastTapId: string | null = null;
  private lastTapAt = 0;
  private hint: HTMLElement | null = null;
  private hintTimer: ReturnType<typeof setTimeout> | undefined;
  private onReposition = () => this.positionHandles();
  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && !isImeKey(e)) this.deselect();
  };

  constructor(private deps: Deps) {
    this.rotateHandle = this.createHandle("↻");
    this.scaleHandle = this.createHandle("⤡");
    document.addEventListener("pointerdown", this.onPointerDown, true);
    document.addEventListener("keydown", this.onKeyDown);
    for (const [id, el] of deps.elements) {
      el.addEventListener("dblclick", () => this.startTextEdit(id));
    }
    this.setupHandleDrag(this.rotateHandle, "rotate");
    this.setupHandleDrag(this.scaleHandle, "scale");
    window.addEventListener("scroll", this.onReposition, { passive: true });
    window.addEventListener("resize", this.onReposition);
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
    this.deselect();
  }

  destroy(): void {
    this.disable();
    this.hideHint();
    document.removeEventListener("pointerdown", this.onPointerDown, true);
    document.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("scroll", this.onReposition);
    window.removeEventListener("resize", this.onReposition);
    this.rotateHandle.remove();
    this.scaleHandle.remove();
  }

  private createHandle(label: string): HTMLElement {
    const h = document.createElement("div");
    h.className = "editor-handle";
    h.textContent = label;
    h.hidden = true;
    document.body.append(h);
    return h;
  }

  private showHint(el: HTMLElement, message: string): void {
    this.hideHint();
    const hint = document.createElement("div");
    hint.className = "editor-hint";
    hint.textContent = message;
    const r = el.getBoundingClientRect();
    hint.style.left = `${r.left}px`;
    hint.style.top = `${r.bottom + 8}px`;
    document.body.append(hint);
    this.hint = hint;
    this.hintTimer = setTimeout(() => this.hideHint(), HINT_MS);
  }

  private hideHint(): void {
    clearTimeout(this.hintTimer);
    this.hint?.remove();
    this.hint = null;
  }

  private elState(id: string): ElementState {
    return this.deps.getState().get(id) ?? initialElementState();
  }

  private onPointerDown = (e: PointerEvent) => {
    if (!this.enabled) return;
    const target = (e.target as HTMLElement).closest?.("[data-id]");
    if (!(target instanceof HTMLElement)) {
      const other = e.target as HTMLElement;
      if (!other.closest?.(".editor-handle, #scrubber")) this.deselect();
      return;
    }
    if (target.isContentEditable) return;
    const id = target.dataset.id!;

    if (isTouchLike(e)) {
      if (this.selectedId !== id) {
        this.select(id);
        this.registerTap(id);
        return;
      }
      this.startMoveDrag(e, id, target, () => {
        if (this.registerTap(id)) this.startTextEdit(id);
      });
      return;
    }

    if (this.selectedId !== id) this.select(id);
    this.startMoveDrag(e, id, target);
  };

  private registerTap(id: string): boolean {
    const now = Date.now();
    const isDoubleTap =
      this.lastTapId === id && now - this.lastTapAt < DOUBLE_TAP_MS;
    this.lastTapId = id;
    this.lastTapAt = isDoubleTap ? 0 : now;
    return isDoubleTap;
  }

  private select(id: string): void {
    if (this.selectedId === id) return;
    this.deselect();
    this.selectedId = id;
    const el = this.deps.elements.get(id)!;
    el.classList.add("is-selected");
    el.style.touchAction = "none";
    this.rotateHandle.hidden = false;
    this.scaleHandle.hidden = false;
    this.positionHandles();
  }

  private deselect(): void {
    if (!this.selectedId) return;
    const el = this.deps.elements.get(this.selectedId);
    const id = this.selectedId;
    this.selectedId = null;
    this.rotateHandle.hidden = true;
    this.scaleHandle.hidden = true;
    if (el) {
      el.classList.remove("is-selected");
      el.style.touchAction = "";
      if (el.isContentEditable) this.commitTextEdit(id, el);
    }
  }

  private positionHandles(): void {
    if (!this.selectedId) return;
    const el = this.deps.elements.get(this.selectedId)!;
    const r = el.getBoundingClientRect();
    this.placeHandle(this.rotateHandle, {
      left: r.left + r.width / 2 - HANDLE_SIZE / 2,
      top: r.top - HANDLE_SIZE - HANDLE_MARGIN * 2,
    });
    this.placeHandle(this.scaleHandle, {
      left: r.right + HANDLE_MARGIN,
      top: r.bottom + HANDLE_MARGIN,
    });
  }

  private placeHandle(
    handle: HTMLElement,
    pos: { left: number; top: number },
  ): void {
    const p = clampHandlePosition(
      pos,
      HANDLE_SIZE,
      { width: viewportWidth(), height: viewportHeight() },
      HANDLE_MARGIN,
    );
    handle.style.left = `${p.left}px`;
    handle.style.top = `${p.top}px`;
  }

  private startMoveDrag(
    e: PointerEvent,
    id: string,
    el: HTMLElement,
    onTap?: () => void,
  ): void {
    const rect = layoutRect(el);
    const raw = this.elState(id);
    const start = { ...raw, ...clampedOffset(rect, raw, viewportWidth()) };
    const startX = e.clientX;
    const startY = e.clientY;
    const temp = { ...start };
    let dragging = false;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // 合成イベントなど、アクティブでないpointerIdのキャプチャ失敗は無視できる
    }

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!dragging) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
        dragging = true;
        document.body.classList.add("is-dragging");
      }
      temp.x = clamp(start.x + dx, -MAX_OFFSET, MAX_OFFSET);
      temp.y = clamp(start.y + dy, -MAX_OFFSET, MAX_OFFSET);
      const off = clampedOffset(rect, temp, viewportWidth());
      temp.x = off.x;
      temp.y = off.y;
      el.style.transform = transformCss(temp);
      this.positionHandles();
    };
    const onUp = () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      if (!dragging) {
        onTap?.();
        return;
      }
      document.body.classList.remove("is-dragging");
      if (temp.x !== start.x || temp.y !== start.y) {
        this.deps.send({ type: "move", target: id, x: temp.x, y: temp.y });
      }
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
  }

  private setupHandleDrag(handle: HTMLElement, mode: "rotate" | "scale"): void {
    handle.addEventListener("pointerdown", (e) => {
      if (!this.enabled || !this.selectedId) return;
      e.preventDefault();
      e.stopPropagation();
      const id = this.selectedId;
      const el = this.deps.elements.get(id)!;
      const rect = layoutRect(el);
      const start = this.elState(id);
      const temp = { ...start };
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
      const startDist = Math.hypot(e.clientX - cx, e.clientY - cy) || 1;
      try {
        handle.setPointerCapture(e.pointerId);
      } catch {
        // 合成イベントなど、アクティブでないpointerIdのキャプチャ失敗は無視できる
      }

      const onMove = (ev: PointerEvent) => {
        if (mode === "rotate") {
          const angle = Math.atan2(ev.clientY - cy, ev.clientX - cx);
          temp.rotation = clamp(
            Math.round(start.rotation + ((angle - startAngle) * 180) / Math.PI),
            -MAX_ROTATION,
            MAX_ROTATION,
          );
        } else {
          const dist = Math.hypot(ev.clientX - cx, ev.clientY - cy);
          temp.scale = clamp(
            Number((start.scale * (dist / startDist)).toFixed(2)),
            MIN_SCALE,
            MAX_SCALE,
          );
        }
        el.style.transform = transformCss({
          ...temp,
          ...clampedOffset(rect, temp, viewportWidth()),
        });
        this.positionHandles();
      };
      const onUp = () => {
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onUp);
        handle.removeEventListener("pointercancel", onUp);
        if (temp.rotation !== start.rotation || temp.scale !== start.scale) {
          this.deps.send({
            type: "transform",
            target: id,
            scale: temp.scale,
            rotation: temp.rotation,
          });
        }
      };
      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", onUp);
      handle.addEventListener("pointercancel", onUp);
    });
  }

  private startTextEdit(id: string): void {
    if (!this.enabled) return;
    this.hideHint();
    const el = this.deps.elements.get(id)!;
    this.select(id);
    try {
      el.contentEditable = "plaintext-only";
    } catch {
      el.contentEditable = "true";
    }
    el.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && !isImeKey(e)) {
        e.preventDefault();
        el.blur();
      }
    };
    el.addEventListener("keydown", onKey);
    el.addEventListener(
      "blur",
      () => {
        el.removeEventListener("keydown", onKey);
        this.commitTextEdit(id, el);
      },
      { once: true },
    );
  }

  private commitTextEdit(id: string, el: HTMLElement): void {
    if (!el.isContentEditable) return;
    el.contentEditable = "false";
    const raw = el.textContent ?? "";
    const text = [...raw].slice(0, MAX_TEXT_LENGTH).join("");
    const current =
      this.deps.getState().get(id)?.text ?? this.deps.defaults.get(id) ?? "";
    renderTarget(el, this.deps.getState().get(id), this.deps.defaults.get(id) ?? "");
    if (text === current) return;
    const hint = textRuleHint(id, text);
    if (hint) {
      this.showHint(el, hint);
      return;
    }
    this.deps.send({ type: "setText", target: id, text });
  }
}
