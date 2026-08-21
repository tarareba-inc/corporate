import { describe, expect, it } from "vitest";
import { applyEvent, foldEvents } from "./state";

describe("foldEvents", () => {
  it("空の履歴は空の状態になる", () => {
    expect(foldEvents([]).size).toBe(0);
  });

  it("setTextはtextだけを更新する", () => {
    const s = foldEvents([{ type: "setText", target: "hero-name", text: "書き換え" }]);
    expect(s.get("hero-name")).toEqual({
      text: "書き換え",
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
    });
  });

  it("moveは位置だけを更新しtextを保持する", () => {
    const s = foldEvents([
      { type: "setText", target: "hero-name", text: "A" },
      { type: "move", target: "hero-name", x: 10, y: -20 },
    ]);
    expect(s.get("hero-name")).toEqual({
      text: "A",
      x: 10,
      y: -20,
      scale: 1,
      rotation: 0,
    });
  });

  it("同じフィールドは後勝ちになる", () => {
    const s = foldEvents([
      { type: "move", target: "hero-name", x: 1, y: 1 },
      { type: "move", target: "hero-name", x: 2, y: 2 },
      { type: "move", target: "hero-name", x: 3, y: 3 },
    ]);
    expect(s.get("hero-name")).toMatchObject({ x: 3, y: 3 });
  });

  it("transformはscaleとrotationを更新する", () => {
    const s = foldEvents([
      { type: "transform", target: "hero-name", scale: 2, rotation: 90 },
    ]);
    expect(s.get("hero-name")).toMatchObject({ scale: 2, rotation: 90 });
  });

  it("要素ごとに独立した状態を持つ", () => {
    const s = foldEvents([
      { type: "move", target: "hero-name", x: 5, y: 5 },
      { type: "move", target: "hero-mission", x: 9, y: 9 },
    ]);
    expect(s.get("hero-name")).toMatchObject({ x: 5, y: 5 });
    expect(s.get("hero-mission")).toMatchObject({ x: 9, y: 9 });
  });
});

describe("applyEvent", () => {
  it("既存のMapを破壊的に更新する", () => {
    const s = foldEvents([]);
    applyEvent(s, { type: "setText", target: "hero-name", text: "x" });
    expect(s.get("hero-name")?.text).toBe("x");
  });
});
