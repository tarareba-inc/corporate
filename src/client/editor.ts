import type { EditEvent } from "../shared/events";
import {
  MAX_OFFSET,
  MAX_ROTATION,
  MAX_SCALE,
  MAX_TEXT_LENGTH,
  MIN_SCALE,
} from "../shared/events";
import type { ElementState, WorldState } from "../shared/state";
import { initialElementState } from "../shared/state";
import { renderTarget, transformCss } from "./dom";

type Deps = {
  elements: Map<string, HTMLElement>;
  defaults: Map<string, string>;
  getState: () => WorldState;
  send: (ev: EditEvent) => void;
};

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export class Editor {
  private enabled = false;
  private selectedId: string | null = null;
  private rotateHandle: HTMLElement;
  private scaleHandle: HTMLElement;

  constructor(private deps: Deps) {
    this.rotateHandle = this.createHandle("↻");
    this.scaleHandle = this.createHandle("⤡");
    document.addEventListener("pointerdown", this.onPointerDown, true);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.deselect();
    });
    for (const [id, el] of deps.elements) {
      el.addEventListener("dblclick", () => this.startTextEdit(id));
    }
    this.setupHandleDrag(this.rotateHandle, "rotate");
    this.setupHandleDrag(this.scaleHandle, "scale");
    window.addEventListener("scroll", () => this.positionHandles(), {
      passive: true,
    });
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
    this.deselect();
  }

  private createHandle(label: string): HTMLElement {
    const h = document.createElement("div");
    h.className = "editor-handle";
    h.textContent = label;
    h.hidden = true;
    document.body.append(h);
    return h;
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
    e.preventDefault();
    if (this.selectedId !== id) {
      this.select(id);
      return;
    }
    this.startMoveDrag(e, id, target);
  };

  private select(id: string): void {
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
    this.rotateHandle.style.left = `${r.left + r.width / 2 - 15}px`;
    this.rotateHandle.style.top = `${r.top - 46}px`;
    this.scaleHandle.style.left = `${r.right + 8}px`;
    this.scaleHandle.style.top = `${r.bottom + 8}px`;
  }

  private startMoveDrag(e: PointerEvent, id: string, el: HTMLElement): void {
    const start = this.elState(id);
    const startX = e.clientX;
    const startY = e.clientY;
    const temp = { ...start };
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // 合成イベントなど、アクティブでないpointerIdのキャプチャ失敗は無視できる
    }

    const onMove = (ev: PointerEvent) => {
      temp.x = clamp(start.x + ev.clientX - startX, -MAX_OFFSET, MAX_OFFSET);
      temp.y = clamp(start.y + ev.clientY - startY, -MAX_OFFSET, MAX_OFFSET);
      el.style.transform = transformCss(temp);
      this.positionHandles();
    };
    const onUp = () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
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
        el.style.transform = transformCss(temp);
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
    const el = this.deps.elements.get(id)!;
    this.select(id);
    try {
      el.contentEditable = "plaintext-only";
    } catch {
      el.contentEditable = "true";
    }
    el.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
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
    if (text !== current) {
      this.deps.send({ type: "setText", target: id, text });
    }
  }
}
