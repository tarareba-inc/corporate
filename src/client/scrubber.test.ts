// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { StoredEvent } from "../shared/events";
import { setupScrubber } from "./scrubber";

let starts: number;
let ends: number;
let range: HTMLInputElement;
let destroyScrubber: () => void;

const events: StoredEvent[] = [
  { id: 1, ts: 0, type: "move", target: "hero-mission", x: 10, y: 10 },
  { id: 2, ts: 0, type: "move", target: "hero-mission", x: 20, y: 20 },
];

function slide(value: string): void {
  range.value = value;
  range.dispatchEvent(new Event("input", { bubbles: true }));
}

beforeEach(() => {
  document.body.innerHTML = `
    <p><span data-id="hero-mission">世界を書き換える。</span></p>
    <div id="scrubber">
      <input id="scrubber-range" type="range" min="0" value="0" step="1" />
      <button id="scrubber-live" type="button">現在に戻る</button>
    </div>
  `;
  range = document.getElementById("scrubber-range") as HTMLInputElement;
  starts = 0;
  ends = 0;
  const { destroy } = setupScrubber({
    events,
    elements: new Map([
      ["hero-mission", document.querySelector<HTMLElement>("[data-id]")!],
    ]),
    defaults: new Map([["hero-mission", "世界を書き換える。"]]),
    getLiveState: () => new Map(),
    onScrubStart: () => starts++,
    onScrubEnd: () => ends++,
  });
  destroyScrubber = destroy;
});

afterEach(() => destroyScrubber());

describe("setupScrubber", () => {
  it("スライダーを動かすとスクラブ開始は1回だけ通知される", () => {
    slide("1");
    slide("0");
    expect(starts).toBe(1);
    expect(ends).toBe(0);
  });

  it("スライダーを右端に戻すと自動でライブに復帰する", () => {
    slide("1");
    slide(String(events.length));
    expect(ends).toBe(1);
  });

  it("スクラブ中にスクラバー外をクリックするとライブに復帰する", () => {
    slide("1");
    document
      .querySelector("[data-id]")!
      .dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(ends).toBe(1);
  });

  it("スクラバー内のクリックでは復帰しない", () => {
    slide("1");
    range.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(ends).toBe(0);
  });

  it("スクラブ中はbodyにis-scrubbingが付き復帰で外れる", () => {
    slide("1");
    expect(document.body.classList.contains("is-scrubbing")).toBe(true);
    document.getElementById("scrubber-live")!.click();
    expect(document.body.classList.contains("is-scrubbing")).toBe(false);
    expect(ends).toBe(1);
  });

  it("スクラブしていないときのクリックは何も通知しない", () => {
    document
      .querySelector("[data-id]")!
      .dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(ends).toBe(0);
  });
});
