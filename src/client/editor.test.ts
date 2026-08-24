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

function kev(
  key: string,
  opts: { isComposing?: boolean; keyCode?: number; shiftKey?: boolean } = {},
): KeyboardEvent {
  const e = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    key,
    isComposing: opts.isComposing,
    shiftKey: opts.shiftKey,
  });
  if (opts.keyCode !== undefined) {
    Object.defineProperty(e, "keyCode", { value: opts.keyCode });
  }
  return e;
}

let editor: Editor;
let sent: EditEvent[];
let el: HTMLElement;
let state: WorldState;

function setup(): void {
  document.body.innerHTML = `<p><span data-id="hero-mission">世界を書き換える。</span></p>`;
  el = document.querySelector<HTMLElement>("[data-id]")!;
  sent = [];
  state = new Map();
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

describe("viewportクランプ", () => {
  function fakeSize(): void {
    Object.defineProperty(el, "offsetWidth", { value: 200 });
    Object.defineProperty(el, "offsetHeight", { value: 50 });
  }

  it("viewport外までドラッグしたらクランプ後の値を送る", () => {
    fakeSize();
    el.dispatchEvent(pev("pointerdown", 10, 10));
    el.dispatchEvent(pev("pointermove", 3000, 10));
    el.dispatchEvent(pev("pointerup", 3000, 10));
    expect(sent).toEqual([
      {
        type: "move",
        target: "hero-mission",
        x: window.innerWidth - 200,
        y: 0,
      },
    ]);
  });

  it("viewport外にある要素はクランプ後の位置からドラッグが始まる", () => {
    fakeSize();
    state.set("hero-mission", {
      text: null,
      x: 3000,
      y: 0,
      scale: 1,
      rotation: 0,
    });
    el.dispatchEvent(pev("pointerdown", 500, 10));
    el.dispatchEvent(pev("pointermove", 490, 10));
    el.dispatchEvent(pev("pointerup", 490, 10));
    expect(sent).toEqual([
      {
        type: "move",
        target: "hero-mission",
        x: window.innerWidth - 210,
        y: 0,
      },
    ]);
  });

  it("scaleハンドルで拡大するとはみ出す分をクランプして描画する", () => {
    fakeSize();
    el.dispatchEvent(pev("pointerdown", 10, 10));
    el.dispatchEvent(pev("pointerup", 10, 10));
    const handle = document.querySelectorAll<HTMLElement>(".editor-handle")[1]!;
    handle.dispatchEvent(pev("pointerdown", 10, 0));
    handle.dispatchEvent(pev("pointermove", 40, 0));
    expect(el.style.transform).toBe(
      "translate(300px, 75px) rotate(0deg) scale(4)",
    );
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

describe("テキスト編集中のキー操作", () => {
  beforeEach(() => {
    el.dispatchEvent(
      new MouseEvent("dblclick", { bubbles: true, cancelable: true }),
    );
  });

  it("Enterで編集を終える", () => {
    el.dispatchEvent(kev("Enter"));
    expect(el.getAttribute("contenteditable")).toBe("false");
  });

  it("IME変換中のEnterでは編集を終えない", () => {
    el.dispatchEvent(kev("Enter", { isComposing: true }));
    expect(el.getAttribute("contenteditable")).toBe("plaintext-only");
  });

  it("keyCode 229のEnterでは編集を終えない", () => {
    el.dispatchEvent(kev("Enter", { keyCode: 229 }));
    expect(el.getAttribute("contenteditable")).toBe("plaintext-only");
  });

  it("Escapeで選択を解除する", () => {
    document.dispatchEvent(kev("Escape"));
    expect(el.classList.contains("is-selected")).toBe(false);
  });

  it("IME変換中のEscapeでは選択を解除しない", () => {
    document.dispatchEvent(kev("Escape", { isComposing: true }));
    expect(el.classList.contains("is-selected")).toBe(true);
  });
});
