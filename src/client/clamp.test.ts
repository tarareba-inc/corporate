import { describe, expect, it } from "vitest";
import { clampedOffset } from "./clamp";

const rect = { left: 100, top: 200, width: 200, height: 50 };
const base = { x: 0, y: 0, scale: 1, rotation: 0 };
const VW = 1000;

describe("clampedOffset", () => {
  it("画面内に収まっていれば補正しない", () => {
    const off = clampedOffset(rect, { ...base, x: 50, y: 10 }, VW);
    expect(off).toEqual({ x: 50, y: 10 });
  });

  it("右にはみ出したら右端に収める", () => {
    const off = clampedOffset(rect, { ...base, x: 750 }, VW);
    expect(off.x).toBeCloseTo(700);
  });

  it("左にはみ出したら左端に収める", () => {
    const off = clampedOffset(rect, { ...base, x: -150 }, VW);
    expect(off.x).toBeCloseTo(-100);
  });

  it("上にはみ出したら上端に収める", () => {
    const off = clampedOffset(rect, { ...base, y: -260 }, VW);
    expect(off.y).toBeCloseTo(-200);
  });

  it("下方向は補正しない", () => {
    const off = clampedOffset(rect, { ...base, y: 5000 }, VW);
    expect(off.y).toBe(5000);
  });

  it("scaleで広がった分を考慮する", () => {
    const off = clampedOffset(rect, { ...base, scale: 2, x: 850 }, VW);
    expect(off.x).toBeCloseTo(600);
  });

  it("回転後の外接矩形で判定する", () => {
    const off = clampedOffset(rect, { ...base, rotation: 90, x: 790 }, VW);
    expect(off.x).toBeCloseTo(775, 1);
  });

  it("幅がviewportを超えるときは中心が画面内に収まる位置まで許す", () => {
    const off = clampedOffset(rect, { ...base, scale: 8, x: 1300 }, VW);
    expect(off.x).toBeCloseTo(800);
  });
});
