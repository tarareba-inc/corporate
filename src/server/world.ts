import { DurableObject } from "cloudflare:workers";
import { validateEvent } from "../shared/events";
import { insertEvent } from "./db";
import { SlidingWindowLimiter } from "./limiter";
import { notifyDiscord } from "./notify";

const MAX_MESSAGE_BYTES = 4096;
const EDITS_PER_MINUTE = 10;

async function hashIp(ip: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export class World extends DurableObject<Env> {
  private limiter = new SlidingWindowLimiter(EDITS_PER_MINUTE, 60_000);

  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    pair[1].serializeAttachment({ ip });
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  override async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer,
  ): Promise<void> {
    if (typeof message !== "string" || message.length > MAX_MESSAGE_BYTES) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(message);
    } catch {
      return;
    }
    if ((parsed as { kind?: unknown } | null)?.kind !== "edit") return;
    const ev = validateEvent((parsed as { event?: unknown }).event);
    if (!ev) {
      ws.send(JSON.stringify({ kind: "rejected", reason: "invalid" }));
      return;
    }
    const { ip } = (ws.deserializeAttachment() ?? { ip: "unknown" }) as {
      ip: string;
    };
    if (!this.limiter.allow(ip, Date.now())) {
      ws.send(
        JSON.stringify({
          kind: "rejected",
          reason: "rate_limited",
          target: ev.target,
        }),
      );
      return;
    }
    const ipHash = await hashIp(ip, this.env.IP_HASH_SALT ?? "");
    const stored = await insertEvent(this.env.DB, ev, ipHash, Date.now());
    const out = JSON.stringify({ kind: "event", event: stored });
    for (const client of this.ctx.getWebSockets()) {
      try {
        client.send(out);
      } catch {
        // 切断済みクライアントへの送信失敗は無視してよい
      }
    }
    const webhook = this.env.DISCORD_WEBHOOK_URL;
    if (webhook) {
      this.ctx.waitUntil(notifyDiscord(webhook, stored).catch(() => {}));
    }
  }
}
