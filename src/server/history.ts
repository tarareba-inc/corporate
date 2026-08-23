import type { StoredEvent } from "../shared/events";

export class EventCache {
  private events: StoredEvent[] | null = null;
  private loadedAt = 0;
  private loading: Promise<StoredEvent[]> | null = null;

  constructor(
    private load: () => Promise<StoredEvent[]>,
    private ttlMs: number,
  ) {}

  get(now: number): Promise<StoredEvent[]> {
    if (this.loading) return this.loading;
    if (this.events && now - this.loadedAt < this.ttlMs) {
      return Promise.resolve(this.events);
    }
    this.loading = this.load()
      .then((events) => {
        this.events = events;
        this.loadedAt = now;
        return events;
      })
      .finally(() => {
        this.loading = null;
      });
    return this.loading;
  }

  async append(ev: StoredEvent, now: number): Promise<void> {
    const events = await this.get(now);
    if (!events.some((e) => e.id === ev.id)) events.push(ev);
  }
}
