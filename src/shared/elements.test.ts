import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ELEMENT_IDS, TEXT_RULES, textRuleHint } from "./events";

describe("index.htmlとELEMENT_IDSの整合", () => {
  const html = readFileSync("index.html", "utf8");
  const idsInHtml = [...html.matchAll(/data-id="([^"]+)"/g)].map((m) => m[1]!);

  it("data-idに重複がない", () => {
    expect(new Set(idsInHtml).size).toBe(idsInHtml.length);
  });

  it("data-idの集合がELEMENT_IDSと一致する", () => {
    expect([...idsInHtml].sort()).toEqual([...ELEMENT_IDS].sort());
  });
});

describe("index.htmlの既定テキストとTEXT_RULES", () => {
  const html = readFileSync("index.html", "utf8");
  const texts = new Map(
    [...html.matchAll(/data-id="([^"]+)">([^<]*)</g)].map((m) => [m[1]!, m[2]!]),
  );

  for (const id of Object.keys(TEXT_RULES)) {
    it(`${id}の既定テキストがルールを満たす`, () => {
      expect(textRuleHint(id, texts.get(id)!)).toBeNull();
    });
  }
});
