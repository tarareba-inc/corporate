// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { EditEvent } from "../shared/events";
import type { WorldState } from "../shared/state";
import { Editor } from "./editor";

function pev(
  type: string,
  x: number,
  y: number,
  pointerType = "mouse",
): Event {
  const e = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
  });
  Object.defineProperty(e, "pointerType", { value: pointerType });
  Object.defineProperty(e, "pointerId", { value: 1 });
  return e;
}

let editor: Editor;
let sent: EditEvent[];
let el: HTMLElement;

function setup(): void {
  document.body.innerHTML = `<p><span data-id="hero-mission">世界を書き換える。</span></p>`;
  el = document.querySelector<HTMLElement>("[data-id]")!;
  sent = [];
  const state: WorldState = new Map();
  editor = new Editor({
    elements: new Map([["hero-mission", el]]),
    defaults: new Map([["hero-mission", "世界を書き換える。"]]),
    getState: () => state,
    send: (ev) => sent.push(ev),
  });
  editor.enable();
}

beforeEach(setup);
afterEach(() => editor.destroy());

describe("マウス操作", () => {
  it("未選択の要素を1モーションでドラッグできる", () => {
    el.dispatchEvent(pev("pointerdown", 10, 10));
    el.dispatchEvent(pev("pointermove", 60, 35));
    el.dispatchEvent(pev("pointerup", 60, 35));
    expect(sent).toEqual([
      { type: "move", target: "hero-mission", x: 50, y: 25 },
    ]);
    expect(el.classList.contains("is-selected")).toBe(true);
  });

  it("しきい値未満の移動はクリック扱いでイベントを送らない", () => {
    el.dispatchEvent(pev("pointerdown", 10, 10));
    el.dispatchEvent(pev("pointermove", 12, 11));
    el.dispatchEvent(pev("pointerup", 12, 11));
    expect(sent).toEqual([]);
    expect(el.classList.contains("is-selected")).toBe(true);
  });

  it("pointerdownをpreventDefaultしない（dblclick互換のため）", () => {
    const e = pev("pointerdown", 10, 10);
    el.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
  });

  it("dblclickでテキスト編集に入る", () => {
    el.dispatchEvent(
      new MouseEvent("dblclick", { bubbles: true, cancelable: true }),
    );
    expect(el.getAttribute("contenteditable")).toBeTruthy();
  });
});

describe("タッチ操作", () => {
  it("1タップ目は選択のみでドラッグしない", () => {
    el.dispatchEvent(pev("pointerdown", 10, 10, "touch"));
    el.dispatchEvent(pev("pointermove", 60, 35, "touch"));
    el.dispatchEvent(pev("pointerup", 60, 35, "touch"));
    expect(sent).toEqual([]);
    expect(el.classList.contains("is-selected")).toBe(true);
  });

  it("選択済みならドラッグできる", () => {
    el.dispatchEvent(pev("pointerdown", 10, 10, "touch"));
    el.dispatchEvent(pev("pointerup", 10, 10, "touch"));
    el.dispatchEvent(pev("pointerdown", 10, 10, "touch"));
    el.dispatchEvent(pev("pointermove", 40, 30, "touch"));
    el.dispatchEvent(pev("pointerup", 40, 30, "touch"));
    expect(sent).toEqual([
      { type: "move", target: "hero-mission", x: 30, y: 20 },
    ]);
  });

  it("素早い2タップでテキスト編集に入る", () => {
    el.dispatchEvent(pev("pointerdown", 10, 10, "touch"));
    el.dispatchEvent(pev("pointerup", 10, 10, "touch"));
    el.dispatchEvent(pev("pointerdown", 10, 10, "touch"));
    el.dispatchEvent(pev("pointerup", 10, 10, "touch"));
    expect(el.getAttribute("contenteditable")).toBeTruthy();
  });

  it("2押し目がドラッグならテキスト編集に入らない", () => {
    el.dispatchEvent(pev("pointerdown", 10, 10, "touch"));
    el.dispatchEvent(pev("pointerup", 10, 10, "touch"));
    el.dispatchEvent(pev("pointerdown", 10, 10, "touch"));
    el.dispatchEvent(pev("pointermove", 40, 30, "touch"));
    el.dispatchEvent(pev("pointerup", 40, 30, "touch"));
    expect(el.getAttribute("contenteditable")).not.toBe("plaintext-only");
    expect(sent).toHaveLength(1);
  });
});
