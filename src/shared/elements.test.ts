import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ELEMENT_IDS } from "./events";

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
