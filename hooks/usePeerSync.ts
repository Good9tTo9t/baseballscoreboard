import { useState, useEffect, useRef, useCallback } from 'react';
import { Peer, DataConnection } from 'peerjs';
import mqtt, { MqttClient } from 'mqtt';
import { GameState, ActionType } from '../types';

export type RemoteRole = 'editor' | 'viewer';

export interface ConnectedClientInfo {
  id: string;
  name: string;
  clientType: 'remote' | 'obs';
  role: RemoteRole;
  connectedAt: number;
  lastSeen: number;
  transport: 'webrtc' | 'mqtt';
  peerId?: string;
}

export interface PeerMessage {
  type:
    | 'SYNC_STATE'
    | 'REQUEST_STATE'
    | 'DISPATCH'
    | 'PING'
    | 'PONG'
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

const PEER_PREFIX = 'bsb-p2p-v3-';

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

  // Client unique identity (preserved across re-renders in session)
  const myClientIdRef = useRef<string>('');
  if (!myClientIdRef.current) {
    if (typeof window !== 'undefined') {
      try {
        let stored = sessionStorage.getItem('bsb_client_id');
        if (!stored) {
          stored = 'cli_' + Math.random().toString(36).substring(2, 9);
          sessionStorage.setItem('bsb_client_id', stored);
        }
        myClientIdRef.current = stored;
      } catch {
        myClientIdRef.current = 'cli_' + Math.random().toString(36).substring(2, 9);
      }
    } else {
      myClientIdRef.current = 'cli_' + Math.random().toString(36).substring(2, 9);
    }
  }
  const myClientId = myClientIdRef.current;

  // Remote role state (for client): 'editor' or 'viewer'
  const [myRole, setMyRole] = useState<RemoteRole>('editor');
  const myRoleRef = useRef<RemoteRole>('editor');
  myRoleRef.current = myRole;

  // Kicked state (for client)
  const [isKicked, setIsKicked] = useState(false);
  const isKickedRef = useRef(false);
  isKickedRef.current = isKicked;

  // Connected clients management (for Host)
  const [connectedClients, setConnectedClients] = useState<ConnectedClientInfo[]>([]);
  const connectedClientsRef = useRef<Map<string, ConnectedClientInfo>>(new Map());

  // Default role for newly connected devices (for Host)
  const [defaultRole, setDefaultRoleState] = useState<RemoteRole>(() => {
    try {
      const saved = localStorage.getItem('scoreboard_remote_default_role');
      return saved === 'viewer' ? 'viewer' : 'editor';
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
    } catch (e) {}
  }, []);

  // Kicked client IDs blacklist (for Host)
  const kickedClientIdsRef = useRef<Set<string>>(new Set());

  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map());
  const clientConnRef = useRef<DataConnection | null>(null);
  const mqttClientRef = useRef<MqttClient | null>(null);
  const webrtcConnectedRef = useRef(false);
  const mqttConnectedRef = useRef(false);
  const roomCodeRef = useRef(roomCode);
  roomCodeRef.current = roomCode;

  const currentStateRef = useRef(currentState);
  currentStateRef.current = currentState;

  const currentLanguageRef = useRef(language);
  currentLanguageRef.current = language;

  const onRemoteDispatchRef = useRef(onRemoteDispatch);
  onRemoteDispatchRef.current = onRemoteDispatch;

  const onRemoteStateUpdateRef = useRef(onRemoteStateUpdate);
  onRemoteStateUpdateRef.current = onRemoteStateUpdate;

  // Deduplication & versioning refs
  const stateVersionRef = useRef<number>(1);
  const lastProcessedStateVersionRef = useRef<number>(0);
  const processedActionIdsRef = useRef<Map<string, number>>(new Map());
  const lastSentActionRef = useRef<{ key: string; time: number }>({ key: '', time: 0 });

  // Host action deduplication handler
  const handleHostIncomingAction = useCallback((action: ActionType, actionId?: string) => {
    if (!onRemoteDispatchRef.current) return;
    if (actionId) {
      const now = Date.now();
      processedActionIdsRef.current.forEach((t, id) => {
        if (now - t > 15000) processedActionIdsRef.current.delete(id);
      });
      if (processedActionIdsRef.current.has(actionId)) {
        return;
      }
      processedActionIdsRef.current.set(actionId, now);
    }
    onRemoteDispatchRef.current(action);
  }, []);

  // Client state update deduplication handler
  const handleClientIncomingState = useCallback((newState: GameState, newLang?: 'en' | 'zh' | 'ja', version?: number) => {
    if (!onRemoteStateUpdateRef.current) return;
    if (typeof version === 'number') {
      if (version < lastProcessedStateVersionRef.current) {
        return;
      }
      lastProcessedStateVersionRef.current = version;
    }
    setStatus('connected');
    setErrorMessage(null);
    onRemoteStateUpdateRef.current(newState, newLang);
  }, []);

  // Host: Register or refresh a connected client info
  const registerOrUpdateClient = useCallback((
    msg: PeerMessage,
    transport: 'webrtc' | 'mqtt',
    conn?: DataConnection
  ) => {
    if (!isHost) return;
    const clientId = msg.clientId || conn?.peer || 'unknown_client';

    // If blacklisted/kicked, immediately send KICK_CLIENT and drop
    if (kickedClientIdsRef.current.has(clientId)) {
      const kickMsg: PeerMessage = {
        type: 'KICK_CLIENT',
        targetClientId: clientId,
        timestamp: Date.now(),
      };
      if (conn && conn.open) {
        try { conn.send(kickMsg); } catch (e) {}
        try { conn.close(); } catch (e) {}
      }
      if (mqttClientRef.current && mqttClientRef.current.connected) {
        const cleanRoom = roomCodeRef.current.trim().toLowerCase();
        try {
          mqttClientRef.current.publish(`bsb3/room/${cleanRoom}/host_to_client`, JSON.stringify(kickMsg));
        } catch (e) {}
      }
      return;
    }

    const existing = connectedClientsRef.current.get(clientId);
    const clientType = msg.clientType || (msg.device?.includes('OBS') ? 'obs' : 'remote');
    const assignedRole: RemoteRole = existing ? existing.role : (clientType === 'obs' ? 'viewer' : defaultRoleRef.current);

    const clientInfo: ConnectedClientInfo = {
      id: clientId,
      name: msg.clientName || existing?.name || (clientType === 'obs' ? 'OBS 實況圖層' : '遠端遙控裝置'),
      clientType,
      role: assignedRole,
      connectedAt: existing?.connectedAt || Date.now(),
      lastSeen: Date.now(),
      transport,
      peerId: conn?.peer,
    };

    connectedClientsRef.current.set(clientId, clientInfo);
    setConnectedClients(Array.from(connectedClientsRef.current.values()));
    setConnectedClientsCount(connectedClientsRef.current.size);

    // Send role confirmation back to client
    const roleMsg: PeerMessage = {
      type: 'ROLE_UPDATE',
      targetClientId: clientId,
      role: assignedRole,
      timestamp: Date.now(),
    };
    if (conn && conn.open) {
      try { conn.send(roleMsg); } catch (e) {}
    }
    if (mqttClientRef.current && mqttClientRef.current.connected) {
      const cleanRoom = roomCodeRef.current.trim().toLowerCase();
      try {
        mqttClientRef.current.publish(`bsb3/room/${cleanRoom}/host_to_client`, JSON.stringify(roleMsg));
      } catch (e) {}
    }
  }, [isHost]);

  // Host: Kick a client
  const kickClient = useCallback((clientId: string) => {
    if (!isHost) return;
    kickedClientIdsRef.current.add(clientId);
    const client = connectedClientsRef.current.get(clientId);
    connectedClientsRef.current.delete(clientId);
    setConnectedClients(Array.from(connectedClientsRef.current.values()));
    setConnectedClientsCount(connectedClientsRef.current.size);

    const kickMsg: PeerMessage = {
      type: 'KICK_CLIENT',
      targetClientId: clientId,
      timestamp: Date.now(),
    };

    // Close WebRTC connection
    connectionsRef.current.forEach((conn, peerId) => {
      if (conn.open && (peerId === client?.peerId || peerId === clientId)) {
        try { conn.send(kickMsg); } catch (e) {}
        try { conn.close(); } catch (e) {}
        connectionsRef.current.delete(peerId);
      } else if (conn.open) {
        try { conn.send(kickMsg); } catch (e) {}
      }
    });

    // Cloud MQTT
    if (mqttClientRef.current && mqttClientRef.current.connected) {
      const cleanRoom = roomCodeRef.current.trim().toLowerCase();
      try {
        mqttClientRef.current.publish(`bsb3/room/${cleanRoom}/host_to_client`, JSON.stringify(kickMsg));
      } catch (e) {}
    }
  }, [isHost]);

  // Host: Unblock all kicked clients
  const unblockKickedClients = useCallback(() => {
    kickedClientIdsRef.current.clear();
  }, []);

  // Host: Change client permission role ('editor' or 'viewer')
  const setClientRole = useCallback((clientId: string, role: RemoteRole) => {
    if (!isHost) return;
    const client = connectedClientsRef.current.get(clientId);
    if (client) {
      client.role = role;
      connectedClientsRef.current.set(clientId, { ...client });
      setConnectedClients(Array.from(connectedClientsRef.current.values()));
    }

    const roleMsg: PeerMessage = {
      type: 'ROLE_UPDATE',
      targetClientId: clientId,
      role,
      timestamp: Date.now(),
    };

    connectionsRef.current.forEach((conn) => {
      if (conn.open) {
        try { conn.send(roleMsg); } catch (e) {}
      }
    });

    if (mqttClientRef.current && mqttClientRef.current.connected) {
      const cleanRoom = roomCodeRef.current.trim().toLowerCase();
      try {
        mqttClientRef.current.publish(`bsb3/room/${cleanRoom}/host_to_client`, JSON.stringify(roleMsg));
      } catch (e) {}
    }
  }, [isHost]);

  // Client: Retry connection after kicked
  const retryConnectAfterKick = useCallback(() => {
    setIsKicked(false);
    setErrorMessage(null);
    setStatus('connecting');

    const cleanRoom = roomCodeRef.current.trim().toLowerCase();
    const helloMsg: PeerMessage = {
      type: 'CLIENT_HELLO',
      clientId: myClientId,
      clientName: getDeviceSummary(),
      timestamp: Date.now(),
    };

    if (clientConnRef.current && clientConnRef.current.open) {
      try { clientConnRef.current.send(helloMsg); } catch (e) {}
    }
    if (mqttClientRef.current && mqttClientRef.current.connected && cleanRoom) {
      try {
        mqttClientRef.current.publish(`bsb3/room/${cleanRoom}/client_to_host`, JSON.stringify(helloMsg));
      } catch (e) {}
    }
  }, [myClientId]);

  // Broadcast state changes to all connected peers and cloud MQTT subscribers (Host only)
  const broadcastState = useCallback((stateToBroadcast?: GameState, langToBroadcast?: 'en' | 'zh' | 'ja') => {
    if (!isHost) return;
    stateVersionRef.current += 1;
    const msg: PeerMessage = {
      type: 'SYNC_STATE',
      state: stateToBroadcast || currentStateRef.current,
      stateVersion: stateVersionRef.current,
      language: langToBroadcast || currentLanguageRef.current,
      timestamp: Date.now(),
    };

    // 1. WebRTC DataConnection
    connectionsRef.current.forEach((conn) => {
      if (conn.open) {
        try {
          conn.send(msg);
        } catch (e) {
          console.warn('[PeerSync] Failed to send state update to client', e);
        }
      }
    });

    // 2. Cloud MQTT WebSocket
    if (mqttClientRef.current && mqttClientRef.current.connected) {
      const cleanRoom = roomCodeRef.current.trim().toLowerCase();
      if (cleanRoom) {
        try {
          mqttClientRef.current.publish(`bsb3/room/${cleanRoom}/state`, JSON.stringify(msg), { retain: true, qos: 0 });
        } catch (e) {}
      }
    }
  }, [isHost]);

  // Send action to host (Client only)
  const sendAction = useCallback((action: ActionType) => {
    if (isHost) {
      if (onRemoteDispatchRef.current) {
        onRemoteDispatchRef.current(action);
      }
      return;
    }

    if (isKickedRef.current) {
      console.warn('[PeerSync Client] Cannot send action: remote disconnected by host');
      return;
    }

    if (myRoleRef.current === 'viewer') {
      console.warn('[PeerSync Client] Blocked action: read-only viewer mode');
      return;
    }

    const now = Date.now();
    const actionKey = JSON.stringify(action);
    if (actionKey === lastSentActionRef.current.key && now - lastSentActionRef.current.time < 100) {
      return;
    }
    lastSentActionRef.current = { key: actionKey, time: now };

    const actionId = `act_${now}_${Math.random().toString(36).substring(2, 9)}`;
    const msg: PeerMessage = {
      type: 'DISPATCH',
      actionId,
      clientId: myClientId,
      action,
      timestamp: now,
    };

    const conn = clientConnRef.current;
    if (conn && conn.open) {
      try {
        conn.send(msg);
      } catch (e) {
        console.error('[PeerSync] Error sending action to host via WebRTC', e);
      }
    }

    if (mqttClientRef.current && mqttClientRef.current.connected) {
      const cleanRoom = roomCodeRef.current.trim().toLowerCase();
      if (cleanRoom) {
        try {
          mqttClientRef.current.publish(`bsb3/room/${cleanRoom}/client_to_host`, JSON.stringify(msg));
        } catch (e) {}
      }
    }
  }, [isHost, myClientId]);

  // Request state from host (Client only)
  const requestState = useCallback(() => {
    const conn = clientConnRef.current;
    if (conn && conn.open) {
      conn.send({ type: 'REQUEST_STATE', clientId: myClientId, timestamp: Date.now() });
    }
    if (mqttClientRef.current && mqttClientRef.current.connected) {
      const cleanRoom = roomCodeRef.current.trim().toLowerCase();
      if (cleanRoom) {
        try {
          mqttClientRef.current.publish(`bsb3/room/${cleanRoom}/client_to_host`, JSON.stringify({
            type: 'REQUEST_STATE',
            clientId: myClientId,
            timestamp: Date.now(),
          }));
        } catch (e) {}
      }
    }
  }, [myClientId]);

  useEffect(() => {
    if (!enabled || !roomCode) {
      setStatus('disconnected');
      return;
    }

    const cleanRoom = roomCode.trim().toLowerCase();
    if (!cleanRoom) return;

    let isDestroyed = false;
    setStatus('connecting');
    setErrorMessage(null);

    const iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
    ];

    const hostPeerId = `${PEER_PREFIX}${cleanRoom}`;

    let reconnectTimer: any = null;
    let clientConnectTimer: any = null;
    let heartbeatTimer: any = null;
    let inactivePruneTimer: any = null;
    let reconnectAttempts = 0;

    // Cloud MQTT WebSocket pub/sub with dual-broker failover (EMQX + HiveMQ)
    const stateTopic = `bsb3/room/${cleanRoom}/state`;
    const actionTopic = `bsb3/room/${cleanRoom}/client_to_host`;
    const controlTopic = `bsb3/room/${cleanRoom}/host_to_client`;
    const clientId = `bsb_${isHost ? 'host' : 'cli'}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const MQTT_BROKER_URLS = [
      'wss://broker.emqx.io:8084/mqtt',
      'wss://broker.hivemq.com:8884/mqtt',
    ];

    let mqttClient: MqttClient | null = null;
    let fallbackBrokerTimer: any = null;

    const initMqttConnection = (brokerIndex: number) => {
      if (isDestroyed) return;
      const brokerUrl = MQTT_BROKER_URLS[brokerIndex % MQTT_BROKER_URLS.length];

      try {
        const client = mqtt.connect(brokerUrl, {
          clientId: `${clientId}_b${brokerIndex}`,
          clean: true,
          connectTimeout: 4000,
          reconnectPeriod: 2500,
        });
        mqttClient = client;
        mqttClientRef.current = client;

        // Auto fallback to HiveMQ if primary doesn't connect within 3.5s
        if (brokerIndex < MQTT_BROKER_URLS.length - 1) {
          fallbackBrokerTimer = setTimeout(() => {
            if (!mqttConnectedRef.current && !isDestroyed) {
              console.warn(`[PeerSync MQTT] Primary broker ${brokerUrl} timeout, falling back to backup broker...`);
              try { client.end(true); } catch (e) {}
              initMqttConnection(brokerIndex + 1);
            }
          }, 3500);
        }

        client.on('connect', () => {
          if (isDestroyed) return;
          if (fallbackBrokerTimer) clearTimeout(fallbackBrokerTimer);
          mqttConnectedRef.current = true;
          setStatus('connected');
          setErrorMessage(null);

          if (isHost) {
            client.subscribe(actionTopic);
            const payload = JSON.stringify({
              type: 'SYNC_STATE',
              state: currentStateRef.current,
              language: currentLanguageRef.current,
              timestamp: Date.now(),
            });
            client.publish(stateTopic, payload, { retain: true, qos: 0 });
          } else {
            // Client subscribes to state updates and host control commands
            client.subscribe([stateTopic, controlTopic], { qos: 0 }, (err) => {
              if (!err) {
                const helloPayload = JSON.stringify({
                  type: 'CLIENT_HELLO',
                  clientId: myClientId,
                  clientName: getDeviceSummary(),
                  timestamp: Date.now(),
                });
                client.publish(actionTopic, helloPayload);
                client.publish(actionTopic, JSON.stringify({ type: 'REQUEST_STATE', clientId: myClientId, timestamp: Date.now() }));
              }
            });
          }
        });

        client.on('message', (topic, payload) => {
          if (isDestroyed) return;
          try {
            const msg = JSON.parse(payload.toString()) as PeerMessage;
            if (topic === stateTopic && msg.type === 'SYNC_STATE' && msg.state) {
              if (!isHost) {
                mqttConnectedRef.current = true;
                handleClientIncomingState(msg.state, msg.language, msg.stateVersion);
              }
            } else if (topic === controlTopic && !isHost) {
              // Client receives host control messages (ROLE_UPDATE, KICK_CLIENT)
              if (msg.type === 'ROLE_UPDATE') {
                if (msg.targetClientId === myClientId || !msg.targetClientId) {
                  if (msg.role) setMyRole(msg.role);
                }
              } else if (msg.type === 'KICK_CLIENT') {
                if (msg.targetClientId === myClientId || !msg.targetClientId) {
                  setIsKicked(true);
                  setStatus('disconnected');
                  setErrorMessage('您的遠端遙控已被主機解除');
                  if (clientConnRef.current) {
                    try { clientConnRef.current.close(); } catch (e) {}
                  }
                }
              }
            } else if (topic === actionTopic && isHost) {
              if (msg.type === 'CLIENT_HELLO' || msg.type === 'DEVICE_INFO' || msg.type === 'PING') {
                registerOrUpdateClient(msg, 'mqtt');
              } else if (msg.type === 'DISPATCH' && msg.action) {
                const cid = msg.clientId;
                if (cid && kickedClientIdsRef.current.has(cid)) {
                  console.warn('[PeerSync Host] Rejected action from kicked client:', cid);
                  return;
                }
                if (cid) {
                  const client = connectedClientsRef.current.get(cid);
                  if (client && client.role === 'viewer') {
                    console.warn('[PeerSync Host] Rejected action from viewer client:', cid);
                    return;
                  }
                }
                handleHostIncomingAction(msg.action, msg.actionId);
              } else if (msg.type === 'REQUEST_STATE') {
                if (msg.clientId) {
                  registerOrUpdateClient(msg, 'mqtt');
                }
                const resp = JSON.stringify({
                  type: 'SYNC_STATE',
                  state: currentStateRef.current,
                  stateVersion: stateVersionRef.current,
                  language: currentLanguageRef.current,
                  timestamp: Date.now(),
                });
                client.publish(stateTopic, resp, { retain: true, qos: 0 });
              }
            }
          } catch (e) {
            console.warn('[Cloud Sync] Failed to parse message', e);
          }
        });

        client.on('error', (err) => {
          console.warn('[Cloud Sync] Notice on broker ' + brokerUrl + ':', err);
          if (!mqttConnectedRef.current && brokerIndex < MQTT_BROKER_URLS.length - 1 && !isDestroyed) {
            if (fallbackBrokerTimer) clearTimeout(fallbackBrokerTimer);
            try { client.end(true); } catch (e) {}
            initMqttConnection(brokerIndex + 1);
          }
        });

        client.on('close', () => {
          mqttConnectedRef.current = false;
          if (!webrtcConnectedRef.current && !isDestroyed) {
            setStatus('connecting');
          }
        });
      } catch (e) {
        console.warn('[Cloud Sync] Init error on broker ' + brokerUrl + ':', e);
        if (brokerIndex < MQTT_BROKER_URLS.length - 1 && !isDestroyed) {
          initMqttConnection(brokerIndex + 1);
        }
      }
    };

    initMqttConnection(0);

    const connectClientToHost = () => {
      if (isDestroyed || !peerRef.current || peerRef.current.destroyed || isHost) return;
      if (isKickedRef.current) return;
      if (clientConnRef.current && clientConnRef.current.open) return;

      try {
        const conn = peerRef.current.connect(hostPeerId, {
          reliable: true,
        });
        clientConnRef.current = conn;

        conn.on('open', () => {
          if (isDestroyed) return;
          webrtcConnectedRef.current = true;
          setStatus('connected');
          setErrorMessage(null);

          // Say hello with device info & identity
          conn.send({
            type: 'CLIENT_HELLO',
            clientId: myClientId,
            clientName: getDeviceSummary(),
            timestamp: Date.now(),
          });

          // Request state
          conn.send({
            type: 'REQUEST_STATE',
            clientId: myClientId,
            device: typeof navigator !== 'undefined' ? navigator.userAgent : 'mobile',
            timestamp: Date.now(),
          });
        });

        conn.on('data', (data: any) => {
          if (isDestroyed) return;
          const msg = data as PeerMessage;
          if (msg.type === 'SYNC_STATE' && msg.state) {
            handleClientIncomingState(msg.state, msg.language, msg.stateVersion);
          } else if (msg.type === 'ROLE_UPDATE') {
            if (msg.targetClientId === myClientId || !msg.targetClientId) {
              if (msg.role) setMyRole(msg.role);
            }
          } else if (msg.type === 'KICK_CLIENT') {
            if (msg.targetClientId === myClientId || !msg.targetClientId) {
              setIsKicked(true);
              setStatus('disconnected');
              setErrorMessage('您的遠端遙控已被主機解除');
              try { conn.close(); } catch (e) {}
            }
          } else if (msg.type === 'PONG' && msg.timestamp) {
            const rtt = Date.now() - msg.timestamp;
            setLatency(rtt);
          }
        });

        conn.on('close', () => {
          if (isDestroyed) return;
          webrtcConnectedRef.current = false;
          if (!mqttConnectedRef.current) {
            setStatus('connecting');
            setLatency(null);
          }
          if (!isKickedRef.current) {
            if (clientConnectTimer) clearTimeout(clientConnectTimer);
            clientConnectTimer = setTimeout(connectClientToHost, 3000);
          }
        });

        conn.on('error', () => {
          if (isDestroyed) return;
          webrtcConnectedRef.current = false;
          if (!mqttConnectedRef.current) {
            setStatus('connecting');
          }
          if (!isKickedRef.current) {
            if (clientConnectTimer) clearTimeout(clientConnectTimer);
            clientConnectTimer = setTimeout(connectClientToHost, 3000);
          }
        });
      } catch (e) {
        if (!isKickedRef.current) {
          if (clientConnectTimer) clearTimeout(clientConnectTimer);
          clientConnectTimer = setTimeout(connectClientToHost, 3000);
        }
      }
    };

    const scheduleReconnect = () => {
      if (isDestroyed || !peerRef.current || peerRef.current.destroyed) return;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      const delay = Math.min(1500 * Math.pow(1.5, Math.min(reconnectAttempts, 5)), 12000);
      reconnectTimer = setTimeout(() => {
        if (isDestroyed || !peerRef.current || peerRef.current.destroyed) return;
        if (peerRef.current.disconnected) {
          try {
            reconnectAttempts++;
            peerRef.current.reconnect();
          } catch (e) {
            console.warn('[PeerSync] Reconnection invocation error', e);
          }
        }
      }, delay);
    };

    const initPeer = () => {
      if (isDestroyed) return;
      try {
        if (peerRef.current) {
          try {
            peerRef.current.destroy();
          } catch (e) {}
        }

        const peer = isHost
          ? new Peer(hostPeerId, {
              debug: 0,
              config: { iceServers },
            })
          : new Peer({
              debug: 0,
              config: { iceServers },
            });

        peerRef.current = peer;

        peer.on('open', () => {
          if (isDestroyed) return;
          reconnectAttempts = 0;
          if (reconnectTimer) clearTimeout(reconnectTimer);
          
          if (isHost) {
            setStatus('connected');
            setErrorMessage(null);
          } else {
            connectClientToHost();
          }
        });

        if (isHost) {
          peer.on('connection', (conn) => {
            if (isDestroyed) return;

            conn.on('open', () => {
              if (isDestroyed) return;
              connectionsRef.current.set(conn.peer, conn);

              // Immediately push state
              conn.send({
                type: 'SYNC_STATE',
                state: currentStateRef.current,
                language: currentLanguageRef.current,
                timestamp: Date.now(),
              });
            });

            conn.on('data', (data: any) => {
              if (isDestroyed) return;
              const msg = data as PeerMessage;
              if (msg.type === 'CLIENT_HELLO' || msg.type === 'DEVICE_INFO') {
                registerOrUpdateClient(msg, 'webrtc', conn);
              } else if (msg.type === 'PING') {
                registerOrUpdateClient(msg, 'webrtc', conn);
                if (msg.timestamp) {
                  conn.send({
                    type: 'PONG',
                    timestamp: msg.timestamp,
                  });
                }
              } else if (msg.type === 'DISPATCH' && msg.action) {
                const cid = msg.clientId;
                if (cid && kickedClientIdsRef.current.has(cid)) {
                  console.warn('[PeerSync Host] Rejected action from kicked client:', cid);
                  return;
                }
                if (cid) {
                  const client = connectedClientsRef.current.get(cid);
                  if (client && client.role === 'viewer') {
                    console.warn('[PeerSync Host] Rejected action from viewer client:', cid);
                    return;
                  }
                }
                handleHostIncomingAction(msg.action, msg.actionId);
              } else if (msg.type === 'REQUEST_STATE') {
                if (msg.clientId) {
                  registerOrUpdateClient(msg, 'webrtc', conn);
                }
                conn.send({
                  type: 'SYNC_STATE',
                  state: currentStateRef.current,
                  stateVersion: stateVersionRef.current,
                  language: currentLanguageRef.current,
                  timestamp: Date.now(),
                });
              }
            });

            conn.on('close', () => {
              connectionsRef.current.delete(conn.peer);
            });

            conn.on('error', () => {
              connectionsRef.current.delete(conn.peer);
            });
          });
        }

        peer.on('error', (err: any) => {
          if (isDestroyed) return;
          const msg = String(err?.message || err || '');
          const errType = err?.type || '';

          if (errType === 'network' || errType === 'server-error' || errType === 'socket-closed' || errType === 'socket-error' || msg.includes('Lost connection to server')) {
            scheduleReconnect();
            return;
          }

          if (errType === 'unavailable-id') {
            if (!mqttConnectedRef.current) {
              setErrorMessage('房間代碼連線中...');
            }
            setTimeout(() => {
              if (!isDestroyed) {
                initPeer();
              }
            }, 2000);
          } else if (errType === 'peer-unavailable') {
            webrtcConnectedRef.current = false;
            if (!mqttConnectedRef.current) {
              setErrorMessage('等待連線至計分板...');
              setStatus('connecting');
            }
            if (clientConnectTimer) clearTimeout(clientConnectTimer);
            clientConnectTimer = setTimeout(connectClientToHost, 3000);
          } else {
            webrtcConnectedRef.current = false;
            if (!mqttConnectedRef.current) {
              setErrorMessage(msg || '連線服務暫時無法存取');
              setStatus('connecting');
            }
          }
        });

        peer.on('disconnected', () => {
          if (isDestroyed) return;
          scheduleReconnect();
        });
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err?.message || '初始化 P2P 服務失敗');
      }
    };

    initPeer();

    // Heartbeat sync for Host & prune inactive clients
    if (isHost) {
      heartbeatTimer = setInterval(() => {
        if (connectionsRef.current.size > 0) {
          const msg: PeerMessage = {
            type: 'SYNC_STATE',
            state: currentStateRef.current,
            stateVersion: stateVersionRef.current,
            language: currentLanguageRef.current,
            timestamp: Date.now(),
          };
          connectionsRef.current.forEach((conn) => {
            if (conn.open) {
              try {
                conn.send(msg);
              } catch (e) {}
            }
          });
        }
      }, 3500);

      // Prune inactive clients older than 20s
      inactivePruneTimer = setInterval(() => {
        const now = Date.now();
        let changed = false;
        connectedClientsRef.current.forEach((client, id) => {
          if (now - client.lastSeen > 20000) {
            connectedClientsRef.current.delete(id);
            changed = true;
          }
        });
        if (changed) {
          setConnectedClients(Array.from(connectedClientsRef.current.values()));
          setConnectedClientsCount(connectedClientsRef.current.size);
        }
      }, 5000);
    }

    // Periodic state broadcast for host over MQTT (retained heartbeat every 4 seconds)
    let hostBroadcastInterval: any = null;
    if (isHost) {
      hostBroadcastInterval = setInterval(() => {
        if (mqttClientRef.current && mqttClientRef.current.connected) {
          const cleanRoom = roomCodeRef.current.trim().toLowerCase();
          if (cleanRoom) {
            try {
              const msg: PeerMessage = {
                type: 'SYNC_STATE',
                state: currentStateRef.current,
                stateVersion: stateVersionRef.current,
                language: currentLanguageRef.current,
                timestamp: Date.now(),
              };
              mqttClientRef.current.publish(`bsb3/room/${cleanRoom}/state`, JSON.stringify(msg), { retain: true, qos: 0 });
            } catch (e) {}
          }
        }
      }, 4000);
    }

    // Ping & State-polling interval for client to measure latency, keep alive & ensure OBS state is synced
    let pingInterval: any = null;
    if (!isHost) {
      pingInterval = setInterval(() => {
        if (isKickedRef.current) return;
        const conn = clientConnRef.current;
        if (conn && conn.open) {
          conn.send({ type: 'PING', clientId: myClientId, timestamp: Date.now() });
        } else {
          connectClientToHost();
        }
        // Regularly request state from host over MQTT so newly opened OBS overlays or dropped packets sync immediately
        requestState();
      }, 3000);
    }

    const handleBeforeUnload = () => {
      if (peerRef.current) {
        try {
          peerRef.current.destroy();
        } catch (e) {}
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      isDestroyed = true;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (clientConnectTimer) clearTimeout(clientConnectTimer);
      if (fallbackBrokerTimer) clearTimeout(fallbackBrokerTimer);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (inactivePruneTimer) clearInterval(inactivePruneTimer);
      if (hostBroadcastInterval) clearInterval(hostBroadcastInterval);
      if (pingInterval) clearInterval(pingInterval);
      connectionsRef.current.forEach((conn) => conn.close());
      connectionsRef.current.clear();
      if (clientConnRef.current) {
        clientConnRef.current.close();
        clientConnRef.current = null;
      }
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
      if (mqttClient) {
        try {
          mqttClient.end(true);
        } catch (e) {}
      }
      mqttClientRef.current = null;
      setStatus('disconnected');
      setConnectedClientsCount(0);
      setConnectedClients([]);
      setLatency(null);
    };
  }, [isHost, roomCode, enabled, handleClientIncomingState, handleHostIncomingAction, myClientId, registerOrUpdateClient]);

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
  };
}
