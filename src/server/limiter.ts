export class SlidingWindowLimiter {
  private hits = new Map<string, number[]>();
  private lastSweep = 0;

  constructor(
    private limit: number,
    private windowMs: number,
  ) {}

  get size(): number {
    return this.hits.size;
  }

  allow(key: string, now: number): boolean {
    this.sweep(now);
    const recent = (this.hits.get(key) ?? []).filter(
      (t) => now - t < this.windowMs,
    );
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(key, recent);
    return true;
  }

  private sweep(now: number): void {
    if (now - this.lastSweep < this.windowMs) return;
    this.lastSweep = now;
    for (const [key, times] of this.hits) {
      if (now - times[times.length - 1]! >= this.windowMs) this.hits.delete(key);
    }
  }
}
