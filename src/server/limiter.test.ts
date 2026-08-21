import { describe, expect, it } from "vitest";
import { SlidingWindowLimiter } from "./limiter";

describe("SlidingWindowLimiter", () => {
  it("上限までは許可する", () => {
    const l = new SlidingWindowLimiter(3, 60_000);
    expect(l.allow("a", 0)).toBe(true);
    expect(l.allow("a", 1)).toBe(true);
    expect(l.allow("a", 2)).toBe(true);
  });

  it("上限を超えると拒否する", () => {
    const l = new SlidingWindowLimiter(3, 60_000);
    l.allow("a", 0);
    l.allow("a", 1);
    l.allow("a", 2);
    expect(l.allow("a", 3)).toBe(false);
  });

  it("ウィンドウが過ぎると再び許可する", () => {
    const l = new SlidingWindowLimiter(2, 60_000);
    l.allow("a", 0);
    l.allow("a", 100);
    expect(l.allow("a", 200)).toBe(false);
    expect(l.allow("a", 60_100)).toBe(true);
  });

  it("キーごとに独立して数える", () => {
    const l = new SlidingWindowLimiter(1, 60_000);
    expect(l.allow("a", 0)).toBe(true);
    expect(l.allow("b", 0)).toBe(true);
    expect(l.allow("a", 1)).toBe(false);
  });

  it("拒否された試行はカウントに入らない", () => {
    const l = new SlidingWindowLimiter(1, 100);
    l.allow("a", 0);
    l.allow("a", 50);
    expect(l.allow("a", 101)).toBe(true);
  });
});
