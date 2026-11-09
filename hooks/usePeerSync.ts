import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, ActionType } from '../types';

/**
 * Remote sync between the host scoreboard, phone remotes and OBS overlays.
 *
 * Two transports, both used at the same time:
 *   1. Cloud relay — one WebSocket on port 443 to the Cloudflare Worker in /relay.
 *      Works on school / corporate networks that block UDP (WebRTC) and
 *      non-standard ports (MQTT on 8084).
 *   2. BroadcastChannel — same browser, same machine, ~0ms.
 *
 * The relay URL is DEFAULT_RELAY_URL below, or VITE_RELAY_URL if set.
 */

export type RemoteRole = 'editor' | 'viewer';

export type SyncTransport = 'relay' | 'broadcast_channel';

export interface ConnectedClientInfo {
  id: string;
  name: string;
  clientType: 'remote' | 'obs';
  role: RemoteRole;
  connectedAt: number;
  lastSeen: number;
  transport: SyncTransport;
}

export interface PeerMessage {
  type:
    | 'SYNC_STATE'
    | 'REQUEST_STATE'
    | 'DISPATCH'
    | 'PING'
    | 'PONG'
    | 'HEARTBEAT'
    | 'DEVICE_INFO'
    | 'CLIENT_HELLO'
    | 'ROLE_UPDATE'
    | 'KICK_CLIENT'
    | 'KICKED';
  actionId?: string;
  state?: GameState;
  stateVersion?: number;
  language?: 'en' | 'zh' | 'ja';
  action?: ActionType;
  timestamp?: number;
  device?: string;
  clientId?: string;
  clientName?: string;
  clientType?: 'remote' | 'obs';
  role?: RemoteRole;
  targetClientId?: string;
}

export interface PeerSyncOptions {
  isHost: boolean;
  roomCode: string;
  currentState: GameState;
  language: 'en' | 'zh' | 'ja';
  onRemoteDispatch?: (action: ActionType) => void;
  onRemoteStateUpdate?: (state: GameState, language?: 'en' | 'zh' | 'ja') => void;
  enabled?: boolean;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// Must match CLOSE_REPLACED in relay/src/index.ts
const CLOSE_REPLACED = 4001;

const HEARTBEAT_MS = 2500;
const CLIENT_PRUNE_MS = 15000;
const HOST_SILENT_MS = 6500;
const HOST_DEAD_MS = 12000;

// Deployed from ./relay (`npx wrangler deploy`). Override with VITE_RELAY_URL,
// e.g. VITE_RELAY_URL=ws://localhost:8787 to test against `wrangler dev`.
const DEFAULT_RELAY_URL = 'wss://bsb-relay.bsb-relay.workers.dev';

function getRelayBaseUrl(): string | null {
  const env = (import.meta as any).env || {};
  const configured = (env.VITE_RELAY_URL as string | undefined)?.trim();
  return (configured || DEFAULT_RELAY_URL).replace(/\/+$/, '');
}

export function getDeviceSummary(): string {
  if (typeof navigator === 'undefined') return '遠端裝置';
  const ua = navigator.userAgent;
  let os = '裝置';
  if (/iPhone/i.test(ua)) os = 'iPhone';
  else if (/iPad/i.test(ua)) os = 'iPad';
  else if (/Android/i.test(ua)) os = 'Android 手機';
  else if (/Macintosh|Mac OS/i.test(ua)) os = 'Mac 電腦';
  else if (/Windows/i.test(ua)) os = 'Windows 電腦';
  else if (/Linux/i.test(ua)) os = 'Linux 電腦';

  let browser = '瀏覽器';
  if (/Edg/i.test(ua)) browser = 'Edge';
  else if (/Chrome|CriOS/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';

  return `${os} (${browser})`;
}

export function usePeerSync({
  isHost,
  roomCode,
  currentState,
  language,
  onRemoteDispatch,
  onRemoteStateUpdate,
  enabled = true,
}: PeerSyncOptions) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [connectedClientsCount, setConnectedClientsCount] = useState<number>(0);
  const [latency, setLatency] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Client unique identity (preserved for this tab's session)
  const myClientIdRef = useRef<string>('');
  if (!myClientIdRef.current) {
    const gen = () => 'cli_' + Math.random().toString(36).substring(2, 9);
    try {
      let stored = sessionStorage.getItem('bsb_client_id');
      if (!stored) {
        stored = gen();
        sessionStorage.setItem('bsb_client_id', stored);
      }
      myClientIdRef.current = stored;
    } catch {
      myClientIdRef.current = gen();
    }
  }
  const myClientId = myClientIdRef.current;

  // Remote role (client side)
  const [myRole, setMyRole] = useState<RemoteRole>('editor');
  const myRoleRef = useRef<RemoteRole>('editor');
  myRoleRef.current = myRole;

  // Kicked state (client side)
  const [isKicked, setIsKicked] = useState(false);
  const isKickedRef = useRef(false);
  isKickedRef.current = isKicked;

  // Connected clients (host side)
  const [connectedClients, setConnectedClients] = useState<ConnectedClientInfo[]>([]);
  const connectedClientsRef = useRef<Map<string, ConnectedClientInfo>>(new Map());

  const [defaultRole, setDefaultRoleState] = useState<RemoteRole>(() => {
    try {
      return localStorage.getItem('scoreboard_remote_default_role') === 'viewer' ? 'viewer' : 'editor';
    } catch {
      return 'editor';
    }
  });
  const defaultRoleRef = useRef<RemoteRole>(defaultRole);
  defaultRoleRef.current = defaultRole;

  const setDefaultRole = useCallback((role: RemoteRole) => {
    setDefaultRoleState(role);
    try {
      localStorage.setItem('scoreboard_remote_default_role', role);
    } catch {}
  }, []);

  const kickedClientIdsRef = useRef<Set<string>>(new Set());

  // Transports
  const wsRef = useRef<WebSocket | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const lastHostSeenRef = useRef<number>(0);

  const currentStateRef = useRef(currentState);
  currentStateRef.current = currentState;
  const currentLanguageRef = useRef(language);
  currentLanguageRef.current = language;
  const onRemoteDispatchRef = useRef(onRemoteDispatch);
  onRemoteDispatchRef.current = onRemoteDispatch;
  const onRemoteStateUpdateRef = useRef(onRemoteStateUpdate);
  onRemoteStateUpdateRef.current = onRemoteStateUpdate;

  const stateVersionRef = useRef<number>(1);
  const processedActionIdsRef = useRef<Map<string, number>>(new Map());
  const lastSentActionRef = useRef<{ key: string; time: number }>({ key: '', time: 0 });

  // ---- Low-level send: every message goes to both transports ----
  const send = useCallback((msg: PeerMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(msg)); // `type` is the first key — the relay relies on that
      } catch (e) {
        console.warn('[Sync] relay send failed', e);
      }
    }
    const bc = broadcastChannelRef.current;
    if (bc) {
      try {
        bc.postMessage(msg);
      } catch {}
    }
  }, []);

  const makeSyncMessage = (): PeerMessage => ({
    type: 'SYNC_STATE',
    state: currentStateRef.current,
    stateVersion: stateVersionRef.current,
    language: currentLanguageRef.current,
    timestamp: Date.now(),
  });

  const updateClientsState = () => {
    setConnectedClients(Array.from(connectedClientsRef.current.values()));
    setConnectedClientsCount(connectedClientsRef.current.size);
  };

  // ---- Host: register / refresh a client ----
  const registerOrUpdateClient = useCallback((msg: PeerMessage, transport: SyncTransport) => {
    if (!isHost || !msg.clientId) return;
    const clientId = msg.clientId;

    if (kickedClientIdsRef.current.has(clientId)) {
      send({ type: 'KICK_CLIENT', targetClientId: clientId, timestamp: Date.now() });
      return;
    }

    const existing = connectedClientsRef.current.get(clientId);
    const clientType = msg.clientType || existing?.clientType || (msg.device?.includes('OBS') ? 'obs' : 'remote');
    const role: RemoteRole = existing ? existing.role : clientType === 'obs' ? 'viewer' : defaultRoleRef.current;

    connectedClientsRef.current.set(clientId, {
      id: clientId,
      name: msg.clientName || existing?.name || (clientType === 'obs' ? 'OBS 實況圖層' : '遠端遙控裝置'),
      clientType,
      role,
      connectedAt: existing?.connectedAt || Date.now(),
      lastSeen: Date.now(),
      transport,
    });
    updateClientsState();

    if (!existing) {
      send({ type: 'ROLE_UPDATE', targetClientId: clientId, role, timestamp: Date.now() });
    }
  }, [isHost, send]);

  // ---- Host: incoming message from any transport ----
  const handleHostMessage = useCallback((msg: PeerMessage, transport: SyncTransport) => {
    switch (msg.type) {
      case 'CLIENT_HELLO':
      case 'DEVICE_INFO':
        registerOrUpdateClient(msg, transport);
        // A new client may have been assigned a role already; re-confirm it.
        if (msg.clientId) {
          const c = connectedClientsRef.current.get(msg.clientId);
          if (c) send({ type: 'ROLE_UPDATE', targetClientId: c.id, role: c.role, timestamp: Date.now() });
        }
        break;
      case 'PING':
        registerOrUpdateClient(msg, transport);
        if (msg.timestamp) send({ type: 'PONG', targetClientId: msg.clientId, timestamp: msg.timestamp });
        break;
      case 'REQUEST_STATE':
        registerOrUpdateClient(msg, transport);
        send(makeSyncMessage());
        break;
      case 'DISPATCH': {
        if (!msg.action) return;
        const cid = msg.clientId;
        if (cid && kickedClientIdsRef.current.has(cid)) return;
        if (cid && connectedClientsRef.current.get(cid)?.role === 'viewer') return;

        // The same action can arrive over both transports — run it once.
        if (msg.actionId) {
          const now = Date.now();
          processedActionIdsRef.current.forEach((t, id) => {
            if (now - t > 15000) processedActionIdsRef.current.delete(id);
          });
          if (processedActionIdsRef.current.has(msg.actionId)) return;
          processedActionIdsRef.current.set(msg.actionId, now);
        }
        onRemoteDispatchRef.current?.(msg.action);
        break;
      }
    }
  }, [registerOrUpdateClient, send]);

  // ---- Client: incoming message from any transport ----
  const handleClientMessage = useCallback((msg: PeerMessage) => {
    const forMe = !msg.targetClientId || msg.targetClientId === myClientId;

    switch (msg.type) {
      case 'SYNC_STATE':
        if (!msg.state) return;
        lastHostSeenRef.current = Date.now();
        if (!isKickedRef.current) {
          setStatus('connected');
          setErrorMessage(null);
        }
        onRemoteStateUpdateRef.current?.(msg.state, msg.language);
        break;
      case 'HEARTBEAT':
        lastHostSeenRef.current = Date.now();
        if (!isKickedRef.current) {
          setStatus('connected');
          setErrorMessage(null);
        }
        break;
      case 'PONG':
        lastHostSeenRef.current = Date.now();
        if (forMe && msg.timestamp) setLatency(Date.now() - msg.timestamp);
        break;
      case 'ROLE_UPDATE':
        if (forMe && msg.role) setMyRole(msg.role);
        break;
      case 'KICK_CLIENT':
        if (forMe) {
          setIsKicked(true);
          setStatus('disconnected');
          setErrorMessage('您的遠端遙控已被主機解除');
        }
        break;
    }
  }, [myClientId]);

  // ---- Host actions ----
  const kickClient = useCallback((clientId: string) => {
    if (!isHost) return;
    kickedClientIdsRef.current.add(clientId);
    connectedClientsRef.current.delete(clientId);
    updateClientsState();
    send({ type: 'KICK_CLIENT', targetClientId: clientId, timestamp: Date.now() });
  }, [isHost, send]);

  const unblockKickedClients = useCallback(() => {
    kickedClientIdsRef.current.clear();
  }, []);

  const setClientRole = useCallback((clientId: string, role: RemoteRole) => {
    if (!isHost) return;
    const client = connectedClientsRef.current.get(clientId);
    if (client) {
      connectedClientsRef.current.set(clientId, { ...client, role });
      updateClientsState();
    }
    send({ type: 'ROLE_UPDATE', targetClientId: clientId, role, timestamp: Date.now() });
  }, [isHost, send]);

  const broadcastState = useCallback((stateToBroadcast?: GameState, langToBroadcast?: 'en' | 'zh' | 'ja') => {
    if (!isHost) return;
    stateVersionRef.current += 1;
    send({
      type: 'SYNC_STATE',
      state: stateToBroadcast || currentStateRef.current,
      stateVersion: stateVersionRef.current,
      language: langToBroadcast || currentLanguageRef.current,
      timestamp: Date.now(),
    });
  }, [isHost, send]);

  // ---- Client actions ----
  const sayHello = useCallback(() => {
    send({ type: 'CLIENT_HELLO', clientId: myClientId, clientName: getDeviceSummary(), timestamp: Date.now() });
    send({ type: 'REQUEST_STATE', clientId: myClientId, timestamp: Date.now() });
  }, [myClientId, send]);

  const retryConnectAfterKick = useCallback(() => {
    setIsKicked(false);
    isKickedRef.current = false;
    setErrorMessage(null);
    setStatus('connecting');
    sayHello();
  }, [sayHello]);

  const sendAction = useCallback((action: ActionType) => {
    if (isHost) {
      onRemoteDispatchRef.current?.(action);
      return;
    }
    if (isKickedRef.current) {
      console.warn('[Sync] Cannot send action: remote disconnected by host');
      return;
    }
    if (myRoleRef.current === 'viewer') {
      console.warn('[Sync] Blocked action: read-only viewer mode');
      return;
    }

    const now = Date.now();
    const actionKey = JSON.stringify(action);
    if (actionKey === lastSentActionRef.current.key && now - lastSentActionRef.current.time < 80) return;
    lastSentActionRef.current = { key: actionKey, time: now };

    send({
      type: 'DISPATCH',
      actionId: `act_${now}_${Math.random().toString(36).substring(2, 9)}`,
      clientId: myClientId,
      action,
      timestamp: now,
    });
  }, [isHost, myClientId, send]);

  const requestState = useCallback(() => {
    send({ type: 'REQUEST_STATE', clientId: myClientId, timestamp: Date.now() });
  }, [myClientId, send]);

  const reconnectRef = useRef<() => void>(() => {});

  // ---- Connection lifecycle ----
  useEffect(() => {
    const cleanRoom = roomCode.trim().toLowerCase();
    if (!enabled || !cleanRoom) {
      setStatus('disconnected');
      return;
    }

    let isDestroyed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempts = 0;
    let replacedByOtherHost = false;
    const timers: ReturnType<typeof setInterval>[] = [];

    setStatus('connecting');
    setErrorMessage(null);
    lastHostSeenRef.current = 0;

    const onMessage = (msg: PeerMessage | null | undefined, transport: SyncTransport) => {
      if (isDestroyed || !msg || !msg.type) return;
      if (isHost) handleHostMessage(msg, transport);
      else handleClientMessage(msg);
    };

    // 1. BroadcastChannel (same browser)
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel(`bsb3_sync_${cleanRoom}`);
        broadcastChannelRef.current = bc;
        bc.onmessage = (event) => onMessage(event.data as PeerMessage, 'broadcast_channel');
      } catch (e) {
        console.warn('[Sync] BroadcastChannel not available', e);
      }
    }

    // 2. Cloud relay WebSocket (port 443)
    const relayBase = getRelayBaseUrl();

    const scheduleReconnect = () => {
      if (isDestroyed || replacedByOtherHost || reconnectTimer) return;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
      reconnectAttempts++;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connectRelay();
      }, delay);
    };

    const connectRelay = () => {
      if (isDestroyed || !relayBase || replacedByOtherHost) return;
      const existing = wsRef.current;
      if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) {
        return; // never tear down a connection that is still opening
      }

      let ws: WebSocket;
      try {
        ws = new WebSocket(`${relayBase}/room/${encodeURIComponent(cleanRoom)}?role=${isHost ? 'host' : 'client'}`);
      } catch (e) {
        console.warn('[Sync] relay connect error', e);
        scheduleReconnect();
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        if (isDestroyed || wsRef.current !== ws) return;
        reconnectAttempts = 0;
        if (isHost) {
          setStatus('connected');
          setErrorMessage(null);
          // Lets the relay cache the current state for clients that join later.
          send(makeSyncMessage());
        } else if (!isKickedRef.current) {
          sayHello();
        }
      };

      ws.onmessage = (event) => {
        if (typeof event.data !== 'string') return;
        try {
          onMessage(JSON.parse(event.data) as PeerMessage, 'relay');
        } catch (e) {
          console.warn('[Sync] Failed to parse relay message', e);
        }
      };

      ws.onclose = (event) => {
        if (wsRef.current === ws) wsRef.current = null;
        if (isDestroyed) return;

        if (event.code === CLOSE_REPLACED) {
          replacedByOtherHost = true;
          setStatus('error');
          setErrorMessage('此房號已在其他視窗或裝置開啟主控台，本視窗已停止雲端同步');
          return;
        }
        if (isHost) setStatus('connecting');
        scheduleReconnect();
      };

      ws.onerror = () => {
        // onclose follows and handles the reconnect
      };
    };

    if (relayBase) {
      connectRelay();
    } else {
      setStatus(isHost ? 'error' : 'connecting');
      setErrorMessage('尚未設定雲端中繼伺服器 (VITE_RELAY_URL)，目前只能同一台電腦同步');
      console.warn('[Sync] VITE_RELAY_URL is not set; only same-browser sync is available');
    }

    const forceReconnectNow = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      reconnectAttempts = 0;
      connectRelay();
    };

    // 3. Liveness
    if (isHost) {
      timers.push(setInterval(() => {
        send({ type: 'HEARTBEAT', timestamp: Date.now() });
      }, HEARTBEAT_MS));

      timers.push(setInterval(() => {
        const now = Date.now();
        let changed = false;
        connectedClientsRef.current.forEach((c, id) => {
          if (now - c.lastSeen > CLIENT_PRUNE_MS) {
            connectedClientsRef.current.delete(id);
            changed = true;
          }
        });
        if (changed) updateClientsState();
      }, 4000));
    } else {
      timers.push(setInterval(() => {
        if (isKickedRef.current) return;
        const now = Date.now();
        send({ type: 'PING', clientId: myClientId, timestamp: now });

        const ws = wsRef.current;
        if (!ws) forceReconnectNow();

        const silentFor = lastHostSeenRef.current ? now - lastHostSeenRef.current : 0;
        if (lastHostSeenRef.current === 0) {
          setStatus('connecting');
        } else if (silentFor > HOST_SILENT_MS) {
          setStatus('connecting');
          setErrorMessage('與計分板通訊逾時，正在重新連線...');
          setLatency(null);
          requestState();
          // Phones often keep a dead socket "open" after sleeping; drop it.
          if (silentFor > HOST_DEAD_MS && ws && ws.readyState === WebSocket.OPEN) {
            try { ws.close(); } catch {}
          }
        }
      }, HEARTBEAT_MS));
    }

    // 4. Wake-up / network change
    const onWake = () => {
      if (isDestroyed) return;
      forceReconnectNow();
      if (isHost) broadcastState();
      else requestState();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') onWake();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', onWake);

    reconnectRef.current = () => {
      if (isDestroyed) return;
      setStatus('connecting');
      setErrorMessage(null);
      replacedByOtherHost = false;
      onWake();
    };

    return () => {
      isDestroyed = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', onWake);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      timers.forEach(clearInterval);

      if (wsRef.current) {
        try { wsRef.current.close(1000); } catch {}
        wsRef.current = null;
      }
      if (broadcastChannelRef.current) {
        try { broadcastChannelRef.current.close(); } catch {}
        broadcastChannelRef.current = null;
      }

      setStatus('disconnected');
      setConnectedClientsCount(0);
      setConnectedClients([]);
      setLatency(null);
    };
  }, [isHost, roomCode, enabled, myClientId, handleHostMessage, handleClientMessage, send, sayHello, requestState, broadcastState]);

  const reconnect = useCallback(() => {
    reconnectRef.current();
  }, []);

  return {
    status,
    connectedClientsCount,
    connectedClients,
    defaultRole,
    setDefaultRole,
    kickClient,
    unblockKickedClients,
    setClientRole,
    myRole,
    isKicked,
    retryConnectAfterKick,
    latency,
    errorMessage,
    broadcastState,
    sendAction,
    requestState,
    reconnect,
  };
}
