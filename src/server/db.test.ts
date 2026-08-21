import { describe, expect, it } from "vitest";
import { eventPayload, rowToStoredEvent } from "./db";

describe("eventPayload", () => {
  it("setTextはtextのみを持つ", () => {
    expect(
      eventPayload({ type: "setText", target: "hero-name", text: "x" }),
    ).toEqual({ text: "x" });
  });

  it("moveはxとyを持つ", () => {
    expect(eventPayload({ type: "move", target: "hero-name", x: 1, y: 2 })).toEqual(
      { x: 1, y: 2 },
    );
  });

  it("transformはscaleとrotationを持つ", () => {
    expect(
      eventPayload({ type: "transform", target: "hero-name", scale: 2, rotation: 45 }),
    ).toEqual({ scale: 2, rotation: 45 });
  });
});

describe("rowToStoredEvent", () => {
  it("正しい行をStoredEventに変換する", () => {
    expect(
      rowToStoredEvent({
        id: 7,
        ts: 1000,
        type: "move",
        target: "hero-name",
        payload: '{"x":1,"y":2}',
      }),
    ).toEqual({ id: 7, ts: 1000, type: "move", target: "hero-name", x: 1, y: 2 });
  });

  it("壊れたJSONはnullを返す", () => {
    expect(
      rowToStoredEvent({ id: 1, ts: 0, type: "move", target: "hero-name", payload: "{" }),
    ).toBeNull();
  });

  it("バリデーションを通らない行はnullを返す", () => {
    expect(
      rowToStoredEvent({
        id: 1,
        ts: 0,
        type: "move",
        target: "deleted-element",
        payload: '{"x":1,"y":2}',
      }),
    ).toBeNull();
  });
});
