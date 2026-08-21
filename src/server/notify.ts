import type { StoredEvent } from "../shared/events";

function truncate(s: string, max: number): string {
  const chars = [...s];
  return chars.length <= max ? s : chars.slice(0, max).join("") + "…";
}

export function formatEventForDiscord(ev: StoredEvent): string {
  switch (ev.type) {
    case "setText":
      return `✏️ #${ev.id} [${ev.target}] "${truncate(ev.text, 80)}"`;
    case "move":
      return `↔️ #${ev.id} [${ev.target}] (${Math.round(ev.x)}, ${Math.round(ev.y)})`;
    case "transform":
      return `🔄 #${ev.id} [${ev.target}] scale=${ev.scale} rotation=${ev.rotation}`;
  }
}

export async function notifyDiscord(
  webhookUrl: string,
  ev: StoredEvent,
): Promise<void> {
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      content: formatEventForDiscord(ev),
      allowed_mentions: { parse: [] },
    }),
  });
}
