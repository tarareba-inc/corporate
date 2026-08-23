import { describe, expect, it } from "vitest";
import type { StoredEvent } from "../shared/events";
import { EventCache } from "./history";

const ev = (id: number): StoredEvent => ({
  id,
  ts: id,
  type: "move",
  target: "hero-name",
  x: 0,
  y: 0,
});

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("EventCache.get", () => {
  it("初回は読み込み結果を返す", async () => {
    const cache = new EventCache(async () => [ev(1), ev(2)], 1000);
    expect(await cache.get(0)).toEqual([ev(1), ev(2)]);
  });

  it("TTL内の2回目は読み込まない", async () => {
    let loads = 0;
    const cache = new EventCache(async () => {
      loads++;
      return [];
    }, 1000);
    await cache.get(0);
    await cache.get(999);
    expect(loads).toBe(1);
  });

  it("TTLを過ぎると読み直す", async () => {
    let loads = 0;
    const cache = new EventCache(async () => {
      loads++;
      return [];
    }, 1000);
    await cache.get(0);
    await cache.get(1000);
    expect(loads).toBe(2);
  });

  it("読み込み中に重ねて呼んでも読み込みは1回", async () => {
    let loads = 0;
    const d = deferred<StoredEvent[]>();
    const cache = new EventCache(() => {
      loads++;
      return d.promise;
    }, 1000);
    const a = cache.get(0);
    const b = cache.get(1);
    d.resolve([ev(1)]);
    expect(await a).toEqual([ev(1)]);
    expect(await b).toEqual([ev(1)]);
    expect(loads).toBe(1);
  });

  it("読み込みに失敗したら次の呼び出しで読み直す", async () => {
    let loads = 0;
    const cache = new EventCache(async () => {
      loads++;
      if (loads === 1) throw new Error("boom");
      return [ev(1)];
    }, 1000);
    await expect(cache.get(0)).rejects.toThrow("boom");
    expect(await cache.get(1)).toEqual([ev(1)]);
  });
});

describe("EventCache.append", () => {
  it("追加したイベントが次のgetに含まれる", async () => {
    const cache = new EventCache(async () => [ev(1)], 1000);
    await cache.append(ev(2), 0);
    expect(await cache.get(1)).toEqual([ev(1), ev(2)]);
  });

  it("読み込み中に追加したイベントは読み込み完了後の配列に入る", async () => {
    const d = deferred<StoredEvent[]>();
    const cache = new EventCache(() => d.promise, 1000);
    const loading = cache.get(0);
    const appending = cache.append(ev(2), 1);
    d.resolve([ev(1)]);
    await loading;
    await appending;
    expect(await cache.get(2)).toEqual([ev(1), ev(2)]);
  });

  it("読み込み結果に既に含まれるidは重複しない", async () => {
    const cache = new EventCache(async () => [ev(1), ev(2)], 1000);
    await cache.append(ev(2), 0);
    expect(await cache.get(1)).toEqual([ev(1), ev(2)]);
  });
});
