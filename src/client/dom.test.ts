// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { foldEvents } from "../shared/state";
import { captureDefaults, collectElements, renderWorld } from "./dom";

beforeEach(() => {
  document.body.innerHTML = `
    <p><span data-id="hero-name">TARAREBA株式会社</span></p>
    <p><span data-id="hero-mission">世界を書き換える。</span></p>
  `;
});

describe("renderWorld", () => {
  it("stateのある要素にtransformとテキストを適用する", () => {
    const elements = collectElements();
    const defaults = captureDefaults(elements);
    const state = foldEvents([
      { type: "setText", target: "hero-name", text: "書き換えた" },
      { type: "move", target: "hero-name", x: 10, y: 20 },
      { type: "transform", target: "hero-name", scale: 2, rotation: 45 },
    ]);
    renderWorld(elements, defaults, state);
    const el = elements.get("hero-name")!;
    expect(el.textContent).toBe("書き換えた");
    expect(el.style.transform).toBe(
      "translate(10px, 20px) rotate(45deg) scale(2)",
    );
  });

  it("stateのない要素はデフォルトに戻す", () => {
    const elements = collectElements();
    const defaults = captureDefaults(elements);
    const el = elements.get("hero-mission")!;
    el.textContent = "荒らされた";
    el.style.transform = "translate(1px, 1px)";
    renderWorld(elements, defaults, new Map());
    expect(el.textContent).toBe("世界を書き換える。");
    expect(el.style.transform).toBe("");
  });

  it("viewport外へのmoveはviewport内にクランプして描画する", () => {
    const elements = collectElements();
    const defaults = captureDefaults(elements);
    const el = elements.get("hero-name")!;
    Object.defineProperty(el, "offsetWidth", { value: 200 });
    Object.defineProperty(el, "offsetHeight", { value: 50 });
    const state = foldEvents([
      { type: "move", target: "hero-name", x: 2000, y: 0 },
    ]);
    renderWorld(elements, defaults, state);
    expect(el.style.transform).toBe(
      `translate(${window.innerWidth - 200}px, 0px) rotate(0deg) scale(1)`,
    );
  });

  it("HTML文字列をテキストとして描画する", () => {
    const elements = collectElements();
    const defaults = captureDefaults(elements);
    const state = foldEvents([
      { type: "setText", target: "hero-name", text: "<img src=x onerror=alert(1)>" },
    ]);
    renderWorld(elements, defaults, state);
    expect(elements.get("hero-name")!.querySelector("img")).toBeNull();
  });
});
