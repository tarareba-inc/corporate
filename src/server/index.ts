import type { StoredEvent } from "../shared/events";
import type { EventRow } from "./db";
import { rowToStoredEvent } from "./db";

export { World } from "./world";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/events") {
      const { results } = await env.DB.prepare(
        "SELECT id, ts, type, target, payload FROM events ORDER BY id ASC",
      ).all<EventRow>();
      const events = results
        .map(rowToStoredEvent)
        .filter((e): e is StoredEvent => e !== null);
      return Response.json(events, {
        headers: { "cache-control": "no-store" },
      });
    }
    if (url.pathname === "/ws") {
      return env.WORLD.get(env.WORLD.idFromName("world")).fetch(request);
    }
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
