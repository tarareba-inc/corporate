import { describe, expect, it } from "vitest";
import { replaySchedule } from "./schedule";

describe("replaySchedule", () => {
  it("0件は空配列", () => {
    expect(replaySchedule(0)).toEqual([]);
  });

  it("1件は即時再生", () => {
    expect(replaySchedule(1)).toEqual([0]);
  });

  it("少数なら等間隔450ms", () => {
    expect(replaySchedule(4)).toEqual([0, 450, 900, 1350]);
  });

  it("多数でも総尺6000msに収まる", () => {
    const times = replaySchedule(1000);
    expect(times).toHaveLength(1000);
    expect(times[0]).toBe(0);
    expect(times[times.length - 1]).toBe(6000);
  });

  it("単調非減少である", () => {
    const times = replaySchedule(500);
    for (let i = 1; i < times.length; i++) {
      expect(times[i]!).toBeGreaterThanOrEqual(times[i - 1]!);
    }
  });

  it("古い編集ほど詰まり直近ほど間隔が開く", () => {
    const times = replaySchedule(100);
    const firstGap = times[1]! - times[0]!;
    const lastGap = times[99]! - times[98]!;
    expect(lastGap).toBeGreaterThan(firstGap);
  });
});
