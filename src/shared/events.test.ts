import { describe, expect, it } from "vitest";
import { ELEMENT_IDS, TEXT_RULES, textRuleHint, validateEvent } from "./events";

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

describe("textRuleHint", () => {
  it("ルールのない要素はどんなテキストでも許可する", () => {
    expect(textRuleHint("hero-mission", "github.cam/x")).toBeNull();
  });

  it("ルールの対象がELEMENT_IDSに含まれる", () => {
    for (const id of Object.keys(TEXT_RULES)) {
      expect(ELEMENT_IDS as readonly string[]).toContain(id);
    }
  });

  describe("contact-email", () => {
    it("tarareba.comのアドレスを許可する", () => {
      expect(textRuleHint("contact-email", "hello@tarareba.com")).toBeNull();
    });

    it("他ドメインのアドレスを拒否する", () => {
      expect(textRuleHint("contact-email", "evil@phish.com")).not.toBeNull();
    });

    it("末尾に本物を置いた誘導文を拒否する", () => {
      expect(
        textRuleHint("contact-email", "本物は evil@phish.com です yuta25@tarareba.com"),
      ).not.toBeNull();
    });

    it("サブドメインを装ったアドレスを拒否する", () => {
      expect(
        textRuleHint("contact-email", "evil@tarareba.com.attacker.jp"),
      ).not.toBeNull();
    });

    it("ローカル部が空のアドレスを拒否する", () => {
      expect(textRuleHint("contact-email", "@tarareba.com")).not.toBeNull();
    });

    it("大文字小文字を問わない", () => {
      expect(textRuleHint("contact-email", "Hello@Tarareba.com")).toBeNull();
    });
  });

  describe("repo-url", () => {
    it("github.comのURLを許可する", () => {
      expect(textRuleHint("repo-url", "github.com/tarareba-inc/corporate")).toBeNull();
    });

    it("パスが空のURLを許可する", () => {
      expect(textRuleHint("repo-url", "github.com/")).toBeNull();
    });

    it("似せたドメインを拒否する", () => {
      expect(textRuleHint("repo-url", "github.cam/tarareba-inc/corporate")).not.toBeNull();
    });

    it("空白で区切った誘導文を拒否する", () => {
      expect(textRuleHint("repo-url", "github.com/x evil.com")).not.toBeNull();
    });

    it("パスに矢印を混ぜた誘導を拒否する", () => {
      expect(textRuleHint("repo-url", "github.com/→evil.com")).not.toBeNull();
    });

    it("パスの日本語を拒否する", () => {
      expect(textRuleHint("repo-url", "github.com/嘘だよ")).not.toBeNull();
    });

    it("サブドメインを拒否する", () => {
      expect(textRuleHint("repo-url", "gist.github.com/xxx")).not.toBeNull();
    });

    it("ホスト部に同形異字を使ったURLを拒否する", () => {
      expect(textRuleHint("repo-url", "githуb.com/tarareba-inc/corporate")).not.toBeNull();
    });

    it("大文字小文字を問わない", () => {
      expect(textRuleHint("repo-url", "GitHub.com/tarareba-inc")).toBeNull();
    });
  });
});

describe("validateEventはテキストのルールを見ない", () => {
  it("ルールに反する過去のsetTextも受理する", () => {
    expect(
      validateEvent({
        type: "setText",
        target: "repo-url",
        text: "github.cam/tarareba-inc/corporate",
      }),
    ).not.toBeNull();
  });
});
