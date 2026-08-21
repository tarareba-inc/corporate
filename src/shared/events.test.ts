import { describe, expect, it } from "vitest";
import { ELEMENT_IDS, validateEvent } from "./events";

const target = ELEMENT_IDS[0];

describe("validateEvent", () => {
  it("正しいsetTextを受理する", () => {
    expect(validateEvent({ type: "setText", target, text: "こんにちは" })).toEqual({
      type: "setText",
      target,
      text: "こんにちは",
    });
  });

  it("未知のtargetを拒否する", () => {
    expect(validateEvent({ type: "setText", target: "nope", text: "x" })).toBeNull();
  });

  it("121文字のテキストを拒否する", () => {
    expect(validateEvent({ type: "setText", target, text: "あ".repeat(121) })).toBeNull();
  });

  it("120文字ちょうどのテキストを受理する", () => {
    expect(validateEvent({ type: "setText", target, text: "あ".repeat(120) })).not.toBeNull();
  });

  it("制御文字を含むテキストを拒否する", () => {
    expect(validateEvent({ type: "setText", target, text: "a\u0007b" })).toBeNull();
  });

  it("改行は受理する", () => {
    expect(validateEvent({ type: "setText", target, text: "a\nb" })).not.toBeNull();
  });

  it("正しいmoveを受理する", () => {
    expect(validateEvent({ type: "move", target, x: -12.5, y: 300 })).toEqual({
      type: "move",
      target,
      x: -12.5,
      y: 300,
    });
  });

  it("範囲外のmoveを拒否する", () => {
    expect(validateEvent({ type: "move", target, x: 4001, y: 0 })).toBeNull();
  });

  it("非数のmoveを拒否する", () => {
    expect(validateEvent({ type: "move", target, x: Number.NaN, y: 0 })).toBeNull();
    expect(validateEvent({ type: "move", target, x: "1", y: 0 })).toBeNull();
  });

  it("正しいtransformを受理する", () => {
    expect(validateEvent({ type: "transform", target, scale: 2, rotation: -45 })).toEqual({
      type: "transform",
      target,
      scale: 2,
      rotation: -45,
    });
  });

  it("scale範囲外のtransformを拒否する", () => {
    expect(validateEvent({ type: "transform", target, scale: 0.1, rotation: 0 })).toBeNull();
    expect(validateEvent({ type: "transform", target, scale: 9, rotation: 0 })).toBeNull();
  });

  it("rotation範囲外のtransformを拒否する", () => {
    expect(validateEvent({ type: "transform", target, scale: 1, rotation: 3601 })).toBeNull();
  });

  it("未知のtypeを拒否する", () => {
    expect(validateEvent({ type: "delete", target })).toBeNull();
  });

  it("オブジェクトでない入力を拒否する", () => {
    expect(validateEvent(null)).toBeNull();
    expect(validateEvent("x")).toBeNull();
  });

  it("余分なプロパティを取り除いて返す", () => {
    expect(validateEvent({ type: "move", target, x: 1, y: 2, evil: true })).toEqual({
      type: "move",
      target,
      x: 1,
      y: 2,
    });
  });
});
