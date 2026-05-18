/**
 * Mobile WebSocket wrapper for the realtime gateway.
 *
 * Auth model: handshake-based.
 *   - Open `wss://api/ws` with no token in the URL.
 *   - Server requires the first frame within 5s to be `{type:'auth',token}`.
 *   - The server's existing fallback path also reads tokens from the query
 *     string, but we deliberately don't use that here — the access token is
 *     short-lived and we don't want it persisted in Cloud Run access logs.
 *
 * AppState integration is handled by the provider (disconnect on background,
 * reconnect on active).
 *
 * On 4001 close (token expired / expiring), the refresh hook is called before
 * the next reconnect attempt.
 *
 * Server emits protocol-level WS pings every 25s; the RN WebSocket impl
 * auto-pongs at the protocol level — no application-level heartbeat needed.
 */

type Listener = (payload: unknown) => void;

interface RealtimeClientOptions {
  baseUrl: string;
  /** Resolves the current access token. Called before each connect attempt. */
  getToken: () => Promise<string | null>;
  /** Refresh tokens (returns true on success). Called when server closes with 4001. */
  refresh: () => Promise<boolean>;
}

const MAX_BACKOFF_MS = 30_000;
const AUTH_TIMEOUT_MS = 5_000;

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<Listener>>();
  private reconnectAttempt = 0;
  private closedByCaller = false;
  private connectedListeners = new Set<(connected: boolean) => void>();
  private connectInFlight = false;
  private authTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly opts: RealtimeClientOptions) {}

  async connect(): Promise<void> {
    this.closedByCaller = false;
    if (this.connectInFlight) return;
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) return;

    this.connectInFlight = true;
    let token: string | null = null;
    try {
      token = await this.opts.getToken();
    } catch {
      token = null;
    }

    if (!token) {
      this.connectInFlight = false;
      this.scheduleReconnect();
      return;
    }

    const wsBase = this.opts.baseUrl.replace(/^http/i, (m) =>
      m === 'https' ? 'wss' : 'ws',
    );
    const url = `${wsBase}/ws`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      this.connectInFlight = false;
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;
    this.connectInFlight = false;

    // The server's first-frame auth window — if we don't send the token in
    // time the server closes, but we also fail-fast on our side to surface
    // a clean reconnect.
    this.authTimer = setTimeout(() => {
      try {
        ws.close(1002, 'auth_timeout');
      } catch {
        // ignore
      }
    }, AUTH_TIMEOUT_MS);

    ws.onopen = () => {
      // Send the auth handshake immediately. Keep the token in the WS frame
      // (TLS-encrypted) instead of the URL (logged by Cloud Run).
      try {
        ws.send(JSON.stringify({ type: 'auth', token }));
      } catch {
        // ignore — server will close on auth timeout
      }
    };

    ws.onmessage = (e) => {
      let frame: { event?: string; payload?: unknown };
      try {
        frame = JSON.parse(typeof e.data === 'string' ? e.data : String(e.data));
      } catch {
        return;
      }
      if (!frame?.event) return;

      // 'ready' is the server's confirmation that auth succeeded. Until we see
      // it, we're not really connected from the consumer's POV.
      if (frame.event === 'ready') {
        if (this.authTimer) {
          clearTimeout(this.authTimer);
          this.authTimer = null;
        }
        this.reconnectAttempt = 0;
        this.notifyConnected(true);
        return;
      }

      const set = this.listeners.get(frame.event);
      if (!set) return;
      for (const l of set) {
        try {
          l(frame.payload);
        } catch {
          // listener errors must not break the socket
        }
      }
    };

    ws.onerror = () => {
      // close handler does cleanup + reconnect
    };

    ws.onclose = async (e: WebSocketCloseEvent) => {
      if (this.authTimer) {
        clearTimeout(this.authTimer);
        this.authTimer = null;
      }
      this.cleanup();
      this.notifyConnected(false);
      if (this.closedByCaller) return;

      if (e.code === 4001) {
        try {
          const ok = await this.opts.refresh();
          if (ok) {
            this.reconnectAttempt = 0;
            void this.connect();
            return;
          }
        } catch {
          // fall through to backoff
        }
      }

      this.scheduleReconnect();
    };
  }

  disconnect(): void {
    this.closedByCaller = true;
    if (this.authTimer) {
      clearTimeout(this.authTimer);
      this.authTimer = null;
    }
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      try {
        this.ws.close(1000, 'client_disconnect');
      } catch {
        // ignore
      }
    }
    this.ws = null;
    this.notifyConnected(false);
  }

  on(event: string, fn: Listener): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(fn);
    return () => {
      set?.delete(fn);
    };
  }

  onConnectionChange(fn: (connected: boolean) => void): () => void {
    this.connectedListeners.add(fn);
    return () => this.connectedListeners.delete(fn);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private cleanup(): void {
    this.ws = null;
  }

  private notifyConnected(connected: boolean): void {
    for (const l of this.connectedListeners) {
      try {
        l(connected);
      } catch {
        // ignore
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.closedByCaller) return;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempt++, MAX_BACKOFF_MS);
    setTimeout(() => {
      if (!this.closedByCaller) void this.connect();
    }, delay);
  }
}
