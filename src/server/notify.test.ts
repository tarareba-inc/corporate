import { describe, expect, it } from "vitest";
import { formatEventForDiscord } from "./notify";

describe("formatEventForDiscord", () => {
  it("setTextはテキストを含む", () => {
    const s = formatEventForDiscord({
      id: 1,
      ts: 0,
      type: "setText",
      target: "hero-name",
      text: "書き換えた",
    });
    expect(s).toContain("hero-name");
    expect(s).toContain("書き換えた");
  });

  it("長いテキストは80文字で切り詰める", () => {
    const s = formatEventForDiscord({
      id: 1,
      ts: 0,
      type: "setText",
      target: "hero-name",
      text: "あ".repeat(120),
    });
    expect(s.length).toBeLessThan(150);
    expect(s).toContain("…");
  });

  it("moveは座標を含む", () => {
    const s = formatEventForDiscord({
      id: 2,
      ts: 0,
      type: "move",
      target: "hero-name",
      x: 10.6,
      y: -3.2,
    });
    expect(s).toContain("11");
    expect(s).toContain("-3");
  });

  it("transformはscaleとrotationを含む", () => {
    const s = formatEventForDiscord({
      id: 3,
      ts: 0,
      type: "transform",
      target: "hero-name",
      scale: 2.5,
      rotation: 90,
    });
    expect(s).toContain("2.5");
    expect(s).toContain("90");
  });
});
