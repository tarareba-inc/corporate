import type { EditEvent, StoredEvent } from "../shared/events";

export type ServerMessage =
  | { kind: "event"; event: StoredEvent }
  | { kind: "rejected"; reason: string; target?: string };

export function connectWorld(
  onMessage: (m: ServerMessage) => void,
): { send: (ev: EditEvent) => void } {
  let ws: WebSocket | null = null;

  const open = () => {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    ws = new WebSocket(`${proto}://${location.host}/ws`);
    ws.onmessage = (e) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(e.data as string);
      } catch {
        return;
      }
      onMessage(parsed as ServerMessage);
    };
    ws.onclose = () => {
      ws = null;
      setTimeout(open, 2000 + Math.random() * 3000);
    };
  };
  open();

  return {
    send: (ev) => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ kind: "edit", event: ev }));
      }
    },
  };
}
