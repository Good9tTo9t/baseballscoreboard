/**
 * Baseball Scoreboard relay — Cloudflare Worker + Durable Object.
 *
 * One Durable Object per room. Every device connects over a plain WebSocket
 * on port 443 (wss://<worker>/room/<code>?role=host|client), so it works on
 * networks that block UDP (WebRTC) and non-standard ports (MQTT 8084).
 *
 * The relay is intentionally dumb:
 *   host   -> every client in the room
 *   client -> the host
 * It also remembers the host's latest SYNC_STATE so a newly joined client
 * gets the scoreboard immediately (same role as MQTT's retained message).
 */

// Minimal ambient types so this compiles without @cloudflare/workers-types.
declare const WebSocketPair: { new (): { 0: WebSocket; 1: WebSocket } };

interface Env {
  ROOMS: any;
}

const ROOM_RE = /^\/room\/([a-z0-9_-]{1,32})\/?$/i;

// Close code sent to an older host tab when a newer one takes over the room.
const CLOSE_REPLACED = 4001;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const match = url.pathname.match(ROOM_RE);

    if (!match) {
      return new Response('bsb relay ok', {
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      });
    }
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected a WebSocket upgrade', { status: 426 });
    }

    const room = match[1].toLowerCase();
    const stub = env.ROOMS.get(env.ROOMS.idFromName(room));
    return stub.fetch(request);
  },
};

export class Room {
  private ctx: any;
  // In-memory copy; storage is the fallback after the object hibernates.
  private lastState: string | null = null;

  constructor(ctx: any, _env: Env) {
    this.ctx = ctx;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const role = url.searchParams.get('role') === 'host' ? 'host' : 'client';

    const pair = new WebSocketPair();
    const clientSide = pair[0];
    const serverSide = pair[1];

    if (role === 'host') {
      // Only one host per room: the newest tab wins, older ones are told why.
      for (const old of this.ctx.getWebSockets('host')) {
        try {
          old.close(CLOSE_REPLACED, 'replaced by another host');
        } catch {}
      }
    }

    this.ctx.acceptWebSocket(serverSide, [role]);

    if (role === 'client') {
      const last = await this.getLastState();
      if (last) {
        try {
          serverSide.send(last);
        } catch {}
      }
    }

    return new Response(null, { status: 101, webSocket: clientSide } as any);
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== 'string') return;
    const isHost = this.ctx.getTags(ws).includes('host');

    if (isHost) {
      // The client always serialises `type` first, so a prefix check avoids
      // parsing large state payloads on every update.
      if (message.startsWith('{"type":"SYNC_STATE"')) {
        this.lastState = message;
        try {
          await this.ctx.storage.put('lastState', message);
        } catch {
          // Payload too large for storage (e.g. many photos); memory copy still works.
        }
      }
      for (const peer of this.ctx.getWebSockets('client')) {
        try {
          peer.send(message);
        } catch {}
      }
    } else {
      for (const host of this.ctx.getWebSockets('host')) {
        try {
          host.send(message);
        } catch {}
      }
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string) {
    try {
      ws.close(code === 1005 ? 1000 : code, reason);
    } catch {}
  }

  async webSocketError(_ws: WebSocket) {}

  private async getLastState(): Promise<string | null> {
    if (this.lastState) return this.lastState;
    try {
      this.lastState = (await this.ctx.storage.get('lastState')) ?? null;
    } catch {}
    return this.lastState;
  }
}
