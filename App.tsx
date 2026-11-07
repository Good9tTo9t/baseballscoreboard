

import React, { useReducer, useEffect, useRef, useState } from 'react';
import { GameState, ActionType, Player } from './types';
import { INITIAL_STATE } from './constants';
import { ScoreboardDisplay } from './components/ScoreboardDisplay';
import { ScoreboardControls } from './components/ScoreboardControls';
import { ScoreboardControlsV2 } from './components/ScoreboardControlsV2';
import { MonitorPlay, Maximize, Minimize, Keyboard, Settings, ExternalLink, RotateCcw, BookOpen, Plus, Minus, Menu, X, Smartphone, Sliders, Tv } from 'lucide-react';
import { useShortcuts, DEFAULT_SHORTCUTS, ShortcutMap } from './hooks/useShortcuts';
import { ShortcutSettingsModal } from './components/ShortcutSettingsModal';
import { UserGuideModal } from './components/UserGuideModal';
import { SettingsModal } from './components/SettingsModal';
import { GameRecordModal } from './components/GameRecordModal';
import { RemoteSyncModal } from './components/RemoteSyncModal';
import { ObsOverlayModal } from './components/ObsOverlayModal';
import { MobileRemoteView } from './components/MobileRemoteView';
import { usePeerSync } from './hooks/usePeerSync';
import { decodeMatchData } from './utils/matchCodec';

import { reducer } from './reducer';

const generateRoomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const getInitialState = (init: GameState): GameState => {
  try {
    // 1. Check if URL contains embedded match / roster data (e.g. exported OBS card URLs)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const dataParam = urlParams.get('d') || urlParams.get('data');
      if (dataParam) {
        const decoded = decodeMatchData(dataParam, init);
        return {
          ...decoded,
          animation: null,
        };
      }
    }

    // 2. Check localStorage
    const savedState = localStorage.getItem('scoreboard_state');
    if (savedState) {
      const parsed = JSON.parse(savedState);
      return {
        ...init,
        ...parsed,
        animation: null, // Clear any animation on start
      };
    }
  } catch (e) {
    console.error("Failed to load initial state", e);
  }
  return init;
};

export const App: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE, getInitialState);
  const displayRef = useRef<HTMLDivElement>(null);

  const [isShortcutModalOpen, setIsShortcutModalOpen] = useState(false);
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(false);
  const [isUserGuideModalOpen, setIsUserGuideModalOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isGameRecordModalOpen, setIsGameRecordModalOpen] = useState(false);
  const [shortcuts, setShortcuts] = useState<ShortcutMap>(DEFAULT_SHORTCUTS);
  const [consoleLanguage, setConsoleLanguage] = useState<'en' | 'zh' | 'ja'>(() => {
    try {
      const saved = localStorage.getItem('scoreboard_console_language');
      if (saved === 'en' || saved === 'zh' || saved === 'ja') return saved;
      const oldSaved = localStorage.getItem('scoreboard_language');
      if (oldSaved === 'en' || oldSaved === 'zh' || oldSaved === 'ja') return oldSaved;
    } catch {}
    return 'zh';
  });
  const [scoreboardLanguage, setScoreboardLanguage] = useState<'en' | 'zh' | 'ja'>(() => {
    try {
      const saved = localStorage.getItem('scoreboard_display_language');
      if (saved === 'en' || saved === 'zh' || saved === 'ja') return saved;
      const oldSaved = localStorage.getItem('scoreboard_language');
      if (oldSaved === 'en' || oldSaved === 'zh' || oldSaved === 'ja') return oldSaved;
    } catch {}
    return 'zh';
  });

  const handleConsoleLanguageChange = (newLang: 'en' | 'zh' | 'ja') => {
    setConsoleLanguage(newLang);
    try {
      localStorage.setItem('scoreboard_console_language', newLang);
    } catch {}
  };

  const handleScoreboardLanguageChange = (newLang: 'en' | 'zh' | 'ja') => {
    setScoreboardLanguage(newLang);
    try {
      localStorage.setItem('scoreboard_display_language', newLang);
    } catch {}
    if (channelRef.current) {
      channelRef.current.postMessage({ 
        type: 'SYNC_STATE', 
        state: stateRef.current, 
        scoreboardLanguage: newLang,
        language: newLang 
      });
    }
    if (displayWindowOpenedRef.current) {
      displayWindowOpenedRef.current.postMessage({ 
        type: 'SYNC_STATE', 
        state: stateRef.current, 
        scoreboardLanguage: newLang,
        language: newLang 
      }, '*');
    }
    peerBroadcastState(stateRef.current, newLang);
  };
  const [history, setHistory] = useState<GameState[]>([]);
  const [controlPanelWidth, setControlPanelWidth] = useState(33.33); // percentage
  const [localDisplayMode, setLocalDisplayMode] = useState<GameState['displayMode'] | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);
  const [showIosTip, setShowIosTip] = useState(false);
  const [isPortrait, setIsPortrait] = useState(() => typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false);
  const [useBetaControls, setUseBetaControls] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('scoreboard_beta_controls');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleOrientation = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    handleOrientation();
    window.addEventListener('resize', handleOrientation);
    window.addEventListener('orientationchange', handleOrientation);
    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener('change', handleOrientation);
    }
    return () => {
      window.removeEventListener('resize', handleOrientation);
      window.removeEventListener('orientationchange', handleOrientation);
      if (window.screen?.orientation) {
        window.screen.orientation.removeEventListener('change', handleOrientation);
      }
    };
  }, []);

  const handleToggleBetaControls = (val: boolean) => {
    setUseBetaControls(val);
    try {
      localStorage.setItem('scoreboard_beta_controls', JSON.stringify(val));
    } catch (e) {
      console.error("Failed to save beta controls setting", e);
    }
  };

  const [isDisplayMode, setIsDisplayMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('mode') === 'display';
  });

  const [isObsMode, setIsObsMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    return mode === 'obs' || mode === 'overlay' || urlParams.get('transparent') === '1' || urlParams.get('transparent') === 'true';
  });

  const [obsLayoutParam] = useState<GameState['displayMode'] | null>(() => {
    if (typeof window === 'undefined') return null;
    const urlParams = new URLSearchParams(window.location.search);
    const card = (urlParams.get('card') || urlParams.get('layout') || '').toLowerCase();
    if (card === 'broadcast' || card === 'scorebug') return 'broadcast';
    if (card === 'lineup') return 'lineup';
    if (card === 'rhe' || card === 'box' || card === 'inning') return 'rhe';
    if (card === 'default' || card === 'classic') return 'default';
    return null;
  });

  const [isObsModalOpen, setIsObsModalOpen] = useState(false);

  const [isRemoteMode, setIsRemoteMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    if (mode === 'obs' || mode === 'overlay' || urlParams.get('transparent') === '1') return false;
    return mode === 'remote' || mode === 'controller' || Boolean(urlParams.get('room'));
  });

  const [roomCode, setRoomCode] = useState(() => {
    if (typeof window === 'undefined') return 'SCORE1';
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) return roomParam.toUpperCase();
    try {
      const saved = localStorage.getItem('scoreboard_room_code');
      if (saved) return saved;
      const gen = generateRoomCode();
      localStorage.setItem('scoreboard_room_code', gen);
      return gen;
    } catch {
      return generateRoomCode();
    }
  });

  const [isRemoteSyncModalOpen, setIsRemoteSyncModalOpen] = useState(false);
  const handleDispatchRef = useRef<(action: ActionType) => void>(() => {});

  const hasRoomQuery = typeof window !== 'undefined' ? Boolean(new URLSearchParams(window.location.search).get('room')) : false;

  const {
    status: peerStatus,
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
    latency: peerLatency,
    errorMessage: peerErrorMessage,
    broadcastState: peerBroadcastState,
    sendAction: peerSendAction,
    requestState: peerRequestState,
  } = usePeerSync({
    isHost: !isRemoteMode && !isObsMode && !isDisplayMode,
    roomCode,
    currentState: state,
    language: scoreboardLanguage,
    onRemoteDispatch: (remoteAction) => {
      console.log('[Host Scoreboard] Remote action received via WebRTC P2P:', remoteAction);
      handleDispatchRef.current(remoteAction);
    },
    onRemoteStateUpdate: (remoteState, remoteLang) => {
      if (!remoteState) return;
      // In OBS overlay mode or display projection mode, always apply incoming state immediately
      if (!isObsMode && !isDisplayMode) {
        // On remote controller, prevent redundant re-renders only when local optimistic state already matches
        const curr = stateRef.current;
        if (curr &&
            curr.balls === remoteState.balls &&
            curr.strikes === remoteState.strikes &&
            curr.outs === remoteState.outs &&
            curr.inning === remoteState.inning &&
            curr.isTop === remoteState.isTop &&
            curr.awayTeam.score === remoteState.awayTeam.score &&
            curr.homeTeam.score === remoteState.homeTeam.score &&
            curr.awayTeam.hits === remoteState.awayTeam.hits &&
            curr.homeTeam.hits === remoteState.homeTeam.hits &&
            curr.awayTeam.errors === remoteState.awayTeam.errors &&
            curr.homeTeam.errors === remoteState.homeTeam.errors &&
            curr.bases[0] === remoteState.bases[0] &&
            curr.bases[1] === remoteState.bases[1] &&
            curr.bases[2] === remoteState.bases[2] &&
            curr.awayTeam.currentBatterIndex === remoteState.awayTeam.currentBatterIndex &&
            curr.homeTeam.currentBatterIndex === remoteState.homeTeam.currentBatterIndex &&
            curr.displayMode === remoteState.displayMode &&
            curr.meta?.settingsVersion === remoteState.meta?.settingsVersion &&
            curr.meta?.broadcastVisible === remoteState.meta?.broadcastVisible &&
            curr.meta?.broadcastAnimKey === remoteState.meta?.broadcastAnimKey &&
            curr.meta?.broadcastScale === remoteState.meta?.broadcastScale &&
            curr.meta?.broadcastWidth === remoteState.meta?.broadcastWidth &&
            curr.meta?.broadcastMarginX === remoteState.meta?.broadcastMarginX &&
            curr.meta?.broadcastMarginY === remoteState.meta?.broadcastMarginY &&
            curr.isAdjustmentMode === remoteState.isAdjustmentMode
        ) {
          if (remoteLang && remoteLang !== scoreboardLanguage) setScoreboardLanguage(remoteLang);
          return;
        }
      }
      dispatch({ type: 'REPLACE_STATE', state: remoteState });
      if (remoteLang) setScoreboardLanguage(remoteLang);
    },
    enabled: isRemoteMode || isObsMode || !isDisplayMode,
  });

  const isResizingRef = useRef(false);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);

  const effectiveDisplayMode = localDisplayMode || state.displayMode;
  const isBroadcast = effectiveDisplayMode === 'broadcast';

  useEffect(() => {
    if (!previewContainerRef.current) return;
    const updateScale = () => {
      if (!previewContainerRef.current) return;
      const { clientWidth, clientHeight } = previewContainerRef.current;
      if (clientWidth <= 0 || clientHeight <= 0) return;
      const mode = localDisplayMode || state.displayMode;
      const refW = mode === 'broadcast' ? 1920 : 960;
      const refH = mode === 'broadcast' ? 1080 : 540;
      const s = Math.min(clientWidth / refW, clientHeight / refH);
      const targetScale = Math.max(0.1, Math.min(1.5, Math.round(s * 1000) / 1000));
      setPreviewScale(prev => (Math.abs(prev - targetScale) > 0.002 ? targetScale : prev));
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(previewContainerRef.current);
    window.addEventListener('resize', updateScale);
    window.addEventListener('orientationchange', updateScale);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateScale);
      window.removeEventListener('orientationchange', updateScale);
    };
  }, [useBetaControls, isPortrait, isDisplayMode, controlPanelWidth, localDisplayMode, state.displayMode]);

  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const [fullscreenScale, setFullscreenScale] = useState(() => {
    if (typeof window === 'undefined') return 1;
    const mode = localDisplayMode || state.displayMode;
    const refW = mode === 'broadcast' ? 1920 : 960;
    const refH = mode === 'broadcast' ? 1080 : 540;
    const s = Math.min((window.innerWidth - 12) / refW, (window.innerHeight - 12) / refH);
    return Math.max(0.1, s);
  });

  useEffect(() => {
    const updateFsScale = () => {
      let w = window.innerWidth;
      let h = window.innerHeight;
      if (fullscreenContainerRef.current) {
        const cw = fullscreenContainerRef.current.clientWidth;
        const ch = fullscreenContainerRef.current.clientHeight;
        if (cw > 0 && ch > 0) {
          w = cw;
          h = ch;
        }
      }
      if (w <= 0 || h <= 0) return;
      const mode = localDisplayMode || state.displayMode;
      const refW = mode === 'broadcast' ? 1920 : 960;
      const refH = mode === 'broadcast' ? 1080 : 540;
      const s = Math.min((w - 12) / refW, (h - 12) / refH);
      const targetScale = Math.max(0.1, Math.round(s * 1000) / 1000);
      setFullscreenScale(prev => (Math.abs(prev - targetScale) > 0.002 ? targetScale : prev));
    };

    updateFsScale();
    const ro = fullscreenContainerRef.current ? new ResizeObserver(updateFsScale) : null;
    if (fullscreenContainerRef.current) {
      ro?.observe(fullscreenContainerRef.current);
    }

    window.addEventListener('resize', updateFsScale);
    window.addEventListener('orientationchange', updateFsScale);

    const handleFsChange = () => {
      setTimeout(updateFsScale, 50);
      setTimeout(updateFsScale, 200);
      setTimeout(updateFsScale, 500);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);

    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', updateFsScale);
      window.removeEventListener('orientationchange', updateFsScale);
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, [localDisplayMode, state.displayMode, isFullscreen, isPseudoFullscreen, isPortrait]);

  const channelRef = useRef<BroadcastChannel | null>(null);
  const isLocalAction = useRef(false);
  const stateRef = useRef(state);
  const displayWindowsRef = useRef<Set<MessageEventSource>>(new Set());
  const displayWindowOpenedRef = useRef<Window | null>(null);

  // Keep stateRef updated for the REQUEST_STATE handler
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Initialize sync mechanisms
  useEffect(() => {
    const channel = new BroadcastChannel('scoreboard_sync');
    channelRef.current = channel;

    const handleSyncState = (
      newState: GameState, 
      newScoreboardLang?: "en" | "zh" | "ja",
      newConsoleLang?: "en" | "zh" | "ja"
    ) => {
      if (stateRef.current) {
        const curr = stateRef.current;
        const isIdentical = 
          curr.balls === newState.balls &&
          curr.strikes === newState.strikes &&
          curr.outs === newState.outs &&
          curr.inning === newState.inning &&
          curr.isTop === newState.isTop &&
          curr.bases[0] === newState.bases[0] &&
          curr.bases[1] === newState.bases[1] &&
          curr.bases[2] === newState.bases[2] &&
          curr.awayTeam.score === newState.awayTeam.score &&
          curr.homeTeam.score === newState.homeTeam.score &&
          curr.displayMode === newState.displayMode &&
          JSON.stringify(curr) === JSON.stringify(newState);

        if (isIdentical) {
          if (newScoreboardLang && newScoreboardLang !== scoreboardLanguage) {
            setScoreboardLanguage(newScoreboardLang);
          }
          if (newConsoleLang && newConsoleLang !== consoleLanguage) {
            setConsoleLanguage(newConsoleLang);
          }
          return;
        }
      }
      // Direct dispatch doesn't set isLocalAction, so it won't be re-broadcasted
      dispatch({ type: 'REPLACE_STATE', state: newState });
      if (newScoreboardLang) setScoreboardLanguage(newScoreboardLang);
      if (newConsoleLang) setConsoleLanguage(newConsoleLang);
    };

    const handleRequestState = () => {
      if (!isDisplayMode && !isRemoteMode) {
        const currentState = stateRef.current;
        channel.postMessage({ 
          type: 'SYNC_STATE', 
          state: currentState, 
          scoreboardLanguage, 
          consoleLanguage, 
          language: scoreboardLanguage 
        });
        localStorage.setItem('scoreboard_state', JSON.stringify(currentState));
        localStorage.setItem('scoreboard_sync_time', Date.now().toString());
      }
    };

    // 1. BroadcastChannel
    channel.onmessage = (event) => {
      if (event.data.type === 'SYNC_STATE') {
        const sbLang = event.data.scoreboardLanguage || event.data.language;
        handleSyncState(event.data.state, sbLang, event.data.consoleLanguage);
      } else if (event.data.type === 'REQUEST_STATE') {
        handleRequestState();
      } else if (event.data.type === 'DISPATCH') {
        if (!isRemoteMode) {
          handleDispatchRef.current(event.data.action);
        }
      }
    };

    // 2. Window postMessage
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_STATE' && event.data.state) {
        const sbLang = event.data.scoreboardLanguage || event.data.language;
        handleSyncState(event.data.state, sbLang, event.data.consoleLanguage);
      } else if (event.data?.type === 'REQUEST_STATE') {
        if (!isDisplayMode && event.source) {
          displayWindowsRef.current.add(event.source);
          try {
            (event.source as Window).postMessage({ 
              type: 'SYNC_STATE', 
              state: stateRef.current, 
              scoreboardLanguage, 
              consoleLanguage, 
              language: scoreboardLanguage 
            }, '*');
          } catch (e) {
            console.error("Failed to send state to requesting window", e);
          }
        }
      }
    };
    window.addEventListener('message', handleMessage);

    // 3. LocalStorage
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'scoreboard_state' && event.newValue) {
        try {
          const newState = JSON.parse(event.newValue);
          handleSyncState(newState);
        } catch (e) {
          console.error("Failed to parse state from localStorage", e);
        }
      } else if (event.key === 'scoreboard_request_state' && !isDisplayMode && !isObsMode) {
        localStorage.setItem('scoreboard_state', JSON.stringify(stateRef.current));
      }
    };
    window.addEventListener('storage', handleStorage);

    // Request initial state or broadcast current state
    if (isDisplayMode || isRemoteMode || isObsMode) {
      channel.postMessage({ type: 'REQUEST_STATE' });
      if (window.opener) {
        window.opener.postMessage({ type: 'REQUEST_STATE' }, '*');
      }
      localStorage.setItem('scoreboard_request_state', Date.now().toString());
    } else {
      // Controller broadcasts its state on mount to sync any existing display windows or OBS
      channel.postMessage({ 
        type: 'SYNC_STATE', 
        state: stateRef.current, 
        scoreboardLanguage, 
        consoleLanguage, 
        language: scoreboardLanguage 
      });
      try {
        localStorage.setItem('scoreboard_state', JSON.stringify(stateRef.current));
      } catch (e) {}
    }

    // Fallback: read from localStorage immediately
    const savedState = localStorage.getItem('scoreboard_state');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        parsed.animation = null;
        handleSyncState(parsed);
      } catch (e) {}
    }

    return () => {
      channel.close();
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
    };
  }, [isDisplayMode]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const percentage = (1 - e.clientX / window.innerWidth) * 100;
      setControlPanelWidth(Math.min(Math.max(percentage, 20), 80));
    };
    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = 'default';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Sync state whenever it changes locally
  useEffect(() => {
    if (isDisplayMode || isObsMode || isRemoteMode) {
      if (!isLocalAction.current) return;
      isLocalAction.current = false;
      if (window.opener) {
        try {
          window.opener.postMessage({ 
            type: 'SYNC_STATE', 
            state, 
            scoreboardLanguage, 
            consoleLanguage, 
            language: scoreboardLanguage 
          }, '*');
        } catch (e) {}
      }
      return;
    }

    // Host controller: always sync to storage, broadcast channel, and opened display windows
    isLocalAction.current = false;
    
    // 1. BroadcastChannel
    if (channelRef.current) {
      channelRef.current.postMessage({ 
        type: 'SYNC_STATE', 
        state, 
        scoreboardLanguage, 
        consoleLanguage, 
        language: scoreboardLanguage 
      });
    }
    
    // 2. LocalStorage
    try {
      localStorage.setItem('scoreboard_state', JSON.stringify(state));
    } catch (e) {}
    
    // 3. postMessage
    if (displayWindowOpenedRef.current) {
      try {
        displayWindowOpenedRef.current.postMessage({ 
          type: 'SYNC_STATE', 
          state, 
          scoreboardLanguage, 
          consoleLanguage, 
          language: scoreboardLanguage 
        }, '*');
      } catch (e) {
        // Window might be closed
      }
    }
    displayWindowsRef.current.forEach(win => {
      try {
        (win as Window).postMessage({ 
          type: 'SYNC_STATE', 
          state, 
          scoreboardLanguage, 
          consoleLanguage, 
          language: scoreboardLanguage 
        }, '*');
      } catch (e) {
        displayWindowsRef.current.delete(win);
      }
    });
  }, [state, scoreboardLanguage, consoleLanguage, isDisplayMode, isObsMode, isRemoteMode]);

  const handleDispatch = (action: ActionType) => {
    // If in remote mobile mode, send action to host scoreboard via WebRTC / Cloud sync
    if (isRemoteMode) {
      peerSendAction(action);
      // Immediate local dispatch provides instant tactile feedback on the phone
      dispatch(action);
      return;
    }

    if (action.type === 'UNDO') {
      if (history.length > 0) {
        const previousState = history[history.length - 1];
        setHistory(prev => prev.slice(0, -1));
        isLocalAction.current = true;
        dispatch({ type: 'REPLACE_STATE', state: previousState });
      }
      return;
    }

    // Save history for relevant actions
    const ignoredActions = ['DECREMENT_TIMER', 'SET_TIMER', 'TOGGLE_TIMER', 'SET_ANIMATION', 'REPLACE_STATE'];
    if (!ignoredActions.includes(action.type)) {
      setHistory(prev => [...prev.slice(-49), state]);
    }

    isLocalAction.current = true;
    dispatch(action);
  };
  handleDispatchRef.current = handleDispatch;

  // Broadcast state to all connected peers whenever host state changes
  useEffect(() => {
    if (!isRemoteMode && !isObsMode && !isDisplayMode) {
      peerBroadcastState(state, scoreboardLanguage);
    }
  }, [state, scoreboardLanguage, isRemoteMode, isObsMode, isDisplayMode, peerBroadcastState]);

  // Shortcuts are always enabled now
  useShortcuts(true, shortcuts, handleDispatch, state);
  
  const handleConfirmReset = () => {
    handleDispatch({ type: 'RESET_GAME' });
    setIsResetConfirmOpen(false);
  };

  const handleCancelReset = () => {
    setIsResetConfirmOpen(false);
  };

  // Timer Effect
  useEffect(() => {
    if (isDisplayMode) return; // Only the controller ticks the timer
    let interval: ReturnType<typeof setInterval>;
    if (state.isTimerRunning && state.timer > 0) {
      interval = setInterval(() => {
        handleDispatch({ type: 'DECREMENT_TIMER' });
      }, 1000);
    } else if (state.timer === 0 && state.isTimerRunning) {
      handleDispatch({ type: 'TOGGLE_TIMER' }); // Stop when reached 0
    }
    return () => clearInterval(interval);
  }, [state.isTimerRunning, state.timer, isDisplayMode]);

  // Sync document title for SEO and browser tab
  useEffect(() => {
    document.title = '棒球電子計分板';
  }, []);

  const getFullscreenElement = () => {
    return (
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement ||
      null
    );
  };

  const toggleFullscreen = async () => {
    // If currently in pseudo-fullscreen, exit it
    if (isPseudoFullscreen) {
      setIsPseudoFullscreen(false);
      setIsFullscreen(false);
      return;
    }

    // If currently in native fullscreen, exit it
    if (getFullscreenElement()) {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      } catch (e) {
        console.warn('Exit native fullscreen error:', e);
      }
      setIsFullscreen(false);
      return;
    }

    // Try native fullscreen
    const target = document.documentElement;
    let nativeSuccess = false;

    try {
      if (target && target.requestFullscreen) {
        await target.requestFullscreen();
        nativeSuccess = true;
      } else if (target && (target as any).webkitRequestFullscreen) {
        await (target as any).webkitRequestFullscreen();
        nativeSuccess = true;
      } else if (target && (target as any).webkitRequestFullScreen) {
        await (target as any).webkitRequestFullScreen();
        nativeSuccess = true;
      } else if (target && (target as any).mozRequestFullScreen) {
        await (target as any).mozRequestFullScreen();
        nativeSuccess = true;
      } else if (target && (target as any).msRequestFullscreen) {
        await (target as any).msRequestFullscreen();
        nativeSuccess = true;
      }
    } catch (err) {
      console.warn('Native fullscreen not available or failed:', err);
      nativeSuccess = false;
    }

    setIsFullscreen(true);
    if (!nativeSuccess) {
      // Native fullscreen not supported (e.g. iPhone Safari) -> Seamless CSS Immersive Fullscreen
      setIsPseudoFullscreen(true);

      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      if (isIos && !sessionStorage.getItem('ios_fullscreen_tip_dismissed')) {
        setShowIosTip(true);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNative = !!getFullscreenElement();
      if (!isNative && !isPseudoFullscreen) {
        setIsFullscreen(false);
      } else if (isNative) {
        setIsFullscreen(true);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPseudoFullscreen) {
        setIsPseudoFullscreen(false);
        setIsFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPseudoFullscreen]);

  // OBS Transparent Browser Source Effect
  useEffect(() => {
    if (isObsMode) {
      document.documentElement.classList.add('obs-mode');
      document.body.classList.add('obs-mode');
      document.documentElement.style.background = 'transparent';
      document.body.style.background = 'transparent';
      const root = document.getElementById('root');
      if (root) {
        root.style.background = 'transparent';
      }
      return () => {
        document.documentElement.classList.remove('obs-mode');
        document.body.classList.remove('obs-mode');
        document.documentElement.style.background = '';
        document.body.style.background = '';
      };
    }
  }, [isObsMode]);

  // Dedicated OBS Overlay View
  if (isObsMode) {
    const effectiveDisplayMode = obsLayoutParam || localDisplayMode || state.displayMode;
    return (
      <div className="fixed inset-0 w-screen h-screen bg-transparent overflow-hidden select-none pointer-events-none">
        <ScoreboardDisplay
          ref={displayRef}
          state={{
            ...state,
            displayMode: effectiveDisplayMode,
            isAdjustmentMode: false,
          }}
          dispatch={handleDispatch}
          language={scoreboardLanguage}
          isVerticalFullscreen={false}
          isObsMode={true}
        />
      </div>
    );
  }

  if (isRemoteMode) {
    if (isDisplayMode) {
      return (
        <div className="fixed inset-0 bg-slate-950 flex flex-col font-sans overflow-hidden select-none">
          {/* Remote Projection Top Bar */}
          <div className="absolute top-3 left-3 z-50 flex items-center gap-2 opacity-35 hover:opacity-100 transition-opacity bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 shadow-xl">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>{consoleLanguage === 'zh' ? '遠端同步中' : 'Live Sync'} #{roomCode}</span>
            </div>
            <div className="h-4 w-px bg-slate-700 mx-1"></div>
            {(['default', 'lineup', 'rhe', 'broadcast'] as const).map(mode => {
              const isActive = (localDisplayMode || state.displayMode) === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setLocalDisplayMode(mode)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg capitalize transition-colors ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {mode}
                </button>
              );
            })}
          </div>

          <div className="absolute top-3 right-3 z-50 flex items-center gap-2 opacity-40 hover:opacity-100 transition-opacity">
            <button
              onClick={() => setIsDisplayMode(false)}
              className="px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all shadow-xl backdrop-blur-md border border-slate-700 flex items-center gap-1.5 cursor-pointer"
              title={consoleLanguage === 'zh' ? '退出投影，返回控制台' : 'Back to Controls'}
            >
              <Sliders size={14} />
              <span>{consoleLanguage === 'zh' ? '返回控制台' : 'Controls'}</span>
            </button>
            <button 
              onClick={toggleFullscreen}
              className="p-2 bg-slate-800/90 hover:bg-slate-700 text-white rounded-xl transition-colors shadow-xl backdrop-blur-md border border-slate-700 cursor-pointer"
              title={isFullscreen || isPseudoFullscreen ? (consoleLanguage === 'zh' ? '退出全螢幕' : 'Exit Fullscreen') : (consoleLanguage === 'zh' ? '全螢幕' : 'Fullscreen')}
            >
              {isFullscreen || isPseudoFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>

          {/* Fullscreen Scoreboard Display */}
          <div className="w-full h-full p-2 sm:p-4 flex items-center justify-center overflow-hidden">
            {isPortrait ? (
              <ScoreboardDisplay 
                ref={displayRef} 
                state={localDisplayMode ? { ...state, displayMode: localDisplayMode } : state} 
                dispatch={handleDispatch} 
                language={scoreboardLanguage} 
                isVerticalFullscreen={true} 
              />
            ) : (
              <div 
                style={{
                  width: isBroadcast ? 1920 : 960,
                  height: isBroadcast ? 1080 : 540,
                  transform: `scale(${fullscreenScale})`,
                  transformOrigin: 'center center',
                  flexShrink: 0
                }}
                className={isBroadcast ? "relative border border-slate-700/60 rounded-xl bg-slate-950/70 shadow-2xl overflow-hidden" : "relative"}
              >
                <ScoreboardDisplay 
                  ref={displayRef} 
                  state={localDisplayMode ? { ...state, displayMode: localDisplayMode } : state} 
                  dispatch={handleDispatch} 
                  language={scoreboardLanguage} 
                  isVerticalFullscreen={false} 
                />
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 w-full h-full bg-slate-950 overflow-hidden flex flex-col">
        <MobileRemoteView
          state={state}
          dispatch={handleDispatch}
          language={consoleLanguage}
          connectionStatus={peerStatus}
          latency={peerLatency}
          errorMessage={peerErrorMessage}
          roomCode={roomCode}
          onChangeRoomCode={(newCode) => {
            const clean = newCode.toUpperCase();
            setRoomCode(clean);
            try {
              localStorage.setItem('scoreboard_room_code', clean);
            } catch (e) {}
          }}
          onReconnect={() => {
            peerRequestState();
          }}
          useBetaControls={useBetaControls}
          onExitRemoteMode={() => {
            setIsRemoteMode(false);
            const url = new URL(window.location.href);
            url.searchParams.delete('mode');
            url.searchParams.delete('room');
            window.history.replaceState({}, '', url.toString());
          }}
          onOpenRecordModal={() => setIsGameRecordModalOpen(true)}
          onToggleProjectMode={() => setIsDisplayMode(true)}
          onOpenObsModal={() => setIsObsModalOpen(true)}
          myRole={myRole}
          isKicked={isKicked}
          onRetryConnect={retryConnectAfterKick}
        />
        <GameRecordModal
          isOpen={isGameRecordModalOpen}
          onClose={() => setIsGameRecordModalOpen(false)}
          state={state}
          dispatch={handleDispatch}
          language={consoleLanguage}
        />
        <ObsOverlayModal
          isOpen={isObsModalOpen}
          onClose={() => setIsObsModalOpen(false)}
          language={consoleLanguage}
          roomCode={roomCode}
          currentDisplayMode={state.displayMode}
          state={state}
          dispatch={handleDispatch}
        />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col font-sans overflow-hidden">
      {/* Navigation Header */}
      {!isDisplayMode && (
        <header className="bg-slate-800 border-b border-slate-700 p-3 flex justify-between items-center z-50 shrink-0">
          <div className="flex items-center space-x-2">
            <div 
              className="flex items-center space-x-2 cursor-pointer select-none"
              onDoubleClick={toggleFullscreen}
              title="Double click to toggle fullscreen"
            >
              <MonitorPlay className="text-yellow-400" />
              <h1 className="text-white font-bold text-xl hidden md:block">Pro Baseball Scoreboard</h1>
              <h1 className="text-white font-bold text-xl md:hidden">PBS</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 bg-slate-900 p-1 rounded-lg">
            <button
              onClick={() => setIsToolbarExpanded(!isToolbarExpanded)}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex items-center justify-center"
              title="Expand Toolbar"
            >
              <Menu size={18} />
            </button>
            <div className="w-px h-6 bg-slate-700 mx-1"></div>
            <button
              onClick={() => {
                const win = window.open('/?mode=display', '_blank');
                if (win) displayWindowOpenedRef.current = win;
              }}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex items-center space-x-1 cursor-pointer"
              title="Open Display Window"
            >
              <ExternalLink size={18} />
              {isToolbarExpanded && <span className="text-xs font-medium ml-1">Project</span>}
            </button>
            <div className="w-px h-6 bg-slate-700 mx-1"></div>
            <button
              onClick={() => setIsObsModalOpen(true)}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex items-center space-x-1 cursor-pointer"
              title={consoleLanguage === 'zh' ? 'OBS 實況透明圖層' : consoleLanguage === 'ja' ? 'OBS 透過オーバーレイ' : 'OBS Overlay'}
            >
              <Tv size={18} />
              {isToolbarExpanded && <span className="text-xs font-medium ml-1">OBS</span>}
            </button>
            <div className="w-px h-6 bg-slate-700 mx-1"></div>
            <button
              onClick={() => setIsRemoteSyncModalOpen(true)}
              className={`p-1.5 rounded-md transition-all flex items-center space-x-1 ${
                connectedClientsCount > 0
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-600/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
              title={consoleLanguage === 'zh' ? '手機遠端遙控' : 'Mobile Remote Control'}
            >
              <Smartphone size={18} />
              {connectedClientsCount > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              )}
              {isToolbarExpanded && (
                <span className="text-xs font-medium ml-1">
                  {consoleLanguage === 'zh' ? '手機遙控' : 'Remote'}
                </span>
              )}
            </button>
            <div className="w-px h-6 bg-slate-700 mx-1"></div>
            <button
              onClick={() => setIsUserGuideModalOpen(true)}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex items-center space-x-1"
              title="User Guide"
            >
              <BookOpen size={18} />
              {isToolbarExpanded && <span className="text-xs font-medium ml-1">Guide</span>}
            </button>
            <button
              onClick={() => setIsShortcutModalOpen(true)}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex items-center space-x-1"
              title="Shortcut Settings"
            >
              <Keyboard size={18} />
              {isToolbarExpanded && <span className="text-xs font-medium ml-1">Shortcuts</span>}
            </button>
            <button
              onClick={() => setIsResetConfirmOpen(true)}
              className="p-1.5 rounded-md text-red-400 hover:text-white hover:bg-red-900/50 transition-colors"
              title="Reset Game"
            >
              <RotateCcw size={18} />
            </button>
            <div className="w-px h-6 bg-slate-700 mx-1"></div>
            <button 
              onClick={toggleFullscreen}
              className={`p-1.5 rounded-md transition-colors ${
                isFullscreen || isPseudoFullscreen 
                  ? 'text-yellow-400 bg-slate-700 hover:text-white' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
              title={
                isFullscreen || isPseudoFullscreen
                  ? (consoleLanguage === 'zh' ? '退出全螢幕' : consoleLanguage === 'en' ? 'Exit Fullscreen' : '全画面終了')
                  : (consoleLanguage === 'zh' ? '全螢幕' : consoleLanguage === 'en' ? 'Fullscreen' : '全画面')
              }
            >
              {isFullscreen || isPseudoFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
            <div className="w-px h-6 bg-slate-700 mx-1"></div>
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex items-center space-x-1 cursor-pointer"
              title={consoleLanguage === 'zh' ? '設定' : consoleLanguage === 'en' ? 'Settings' : '設定'}
            >
              <Settings size={18} />
              {isToolbarExpanded && <span className="text-xs font-medium ml-1">{consoleLanguage === 'zh' ? '設定' : consoleLanguage === 'en' ? 'Settings' : '設定'}</span>}
            </button>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative flex">
        {/* Split Screen Layout */}
        <div className={`w-full h-full flex ${(isPortrait && typeof window !== 'undefined' && window.innerWidth < 768) ? 'flex-col' : (useBetaControls ? 'flex-col md:flex-row' : 'flex-row')} gap-0 overflow-hidden`}>
          {/* Left/Top: Display */}
          <div 
            className={`flex-none p-2 sm:p-4 bg-slate-950 flex flex-col items-center justify-center ${isDisplayMode ? 'overflow-hidden' : 'overflow-y-auto overscroll-contain'} overflow-x-hidden no-scrollbar border-b md:border-b-0 md:border-r border-slate-700 relative ${
              (isPortrait && typeof window !== 'undefined' && window.innerWidth < 768)
                ? 'w-full h-[35vh] sm:h-[42vh] shrink-0' 
                : (useBetaControls ? 'w-full md:w-[var(--left-width)] h-[35vh] sm:h-[42vh] md:h-full shrink-0' : 'w-[var(--left-width)] h-full')
            }`}
            style={{ 
              '--left-width': isDisplayMode ? '100%' : `calc(${100 - controlPanelWidth}% - 4px)`
            } as React.CSSProperties}
          >
              
              {isDisplayMode && (
                <div className="absolute top-4 left-4 flex gap-2 z-50 opacity-30 hover:opacity-100 transition-opacity">
                  <div className="bg-slate-800/80 rounded-md p-1 flex">
                    {(['default', 'lineup', 'rhe', 'broadcast'] as const).map(mode => {
                      const isActive = (localDisplayMode || state.displayMode) === mode;
                      return (
                        <button
                          key={mode}
                          onClick={() => setLocalDisplayMode(mode)}
                          className={`px-3 py-1 text-xs font-medium rounded capitalize transition-colors ${
                            isActive 
                              ? 'bg-blue-600 text-white' 
                              : 'text-slate-400 hover:text-white hover:bg-slate-700'
                          }`}
                        >
                          {mode}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {isDisplayMode && (
                <button 
                  onClick={toggleFullscreen}
                  className="absolute top-4 right-4 p-2 bg-slate-800/60 hover:bg-slate-700/80 text-white rounded-md transition-colors z-50 opacity-40 hover:opacity-100 shadow-lg backdrop-blur-xs cursor-pointer"
                  title={
                    isFullscreen || isPseudoFullscreen
                      ? (consoleLanguage === 'zh' ? '退出全螢幕' : consoleLanguage === 'en' ? 'Exit Fullscreen' : '全画面終了')
                      : (consoleLanguage === 'zh' ? '全螢幕' : consoleLanguage === 'en' ? 'Fullscreen' : '全画面')
                  }
                >
                  {isFullscreen || isPseudoFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
                </button>
              )}

              <div ref={previewContainerRef} className="w-full h-full max-w-full flex items-center justify-center overflow-hidden relative">
                {isDisplayMode && isPortrait ? (
                  <div className="w-full h-full p-2 flex items-center justify-center">
                    <ScoreboardDisplay 
                      ref={displayRef} 
                      state={localDisplayMode ? { ...state, displayMode: localDisplayMode } : state} 
                      dispatch={handleDispatch} 
                      language={scoreboardLanguage} 
                      isVerticalFullscreen={true} 
                    />
                  </div>
                ) : (
                  <div 
                    style={{
                      width: isBroadcast ? 1920 : 960,
                      height: isBroadcast ? 1080 : 540,
                      transform: `scale(${previewScale})`,
                      transformOrigin: 'center center',
                      flexShrink: 0
                    }}
                    className={isBroadcast ? "relative border-2 border-slate-700/80 rounded-2xl bg-slate-950/80 shadow-2xl overflow-hidden" : "relative"}
                  >
                    {isBroadcast && !isDisplayMode && (
                      <div className="absolute top-3 left-3 z-30 pointer-events-none flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900/85 border border-slate-700/70 text-slate-300 text-[11px] font-mono select-none backdrop-blur-md shadow-md">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>OBS 實況預覽 (1920 × 1080)</span>
                      </div>
                    )}
                    <ScoreboardDisplay 
                      ref={displayRef} 
                      state={localDisplayMode ? { ...state, displayMode: localDisplayMode } : state} 
                      dispatch={handleDispatch} 
                      language={scoreboardLanguage} 
                      isVerticalFullscreen={false} 
                    />
                  </div>
                )}
              </div>
          </div>
          
          {/* Resize Handle */}
          {!isDisplayMode && (
            <div 
              className={`${(isPortrait && typeof window !== 'undefined' && window.innerWidth < 768) ? 'hidden' : (useBetaControls ? 'hidden md:flex' : 'flex')} w-1 bg-slate-700 hover:bg-blue-500 cursor-col-resize transition-colors z-50 items-center justify-center shrink-0`}
              onMouseDown={(e) => {
                e.preventDefault();
                isResizingRef.current = true;
                document.body.style.cursor = 'col-resize';
              }}
            >
              <div className="w-px h-8 bg-slate-500/50"></div>
            </div>
          )}

          {/* Right/Bottom: Controls */}
          {!isDisplayMode && (
            <div 
              className={`flex-1 overflow-y-auto overscroll-contain shadow-inner min-h-0 relative ${
                (isPortrait && typeof window !== 'undefined' && window.innerWidth < 768) ? 'w-full' : (useBetaControls ? 'w-full md:w-auto' : '')
              } ${useBetaControls ? 'bg-slate-900' : 'bg-gray-100'}`}
              style={{ flexBasis: (isPortrait && typeof window !== 'undefined' && window.innerWidth < 768) ? undefined : `${controlPanelWidth}%` }}
            >
                {useBetaControls ? (
                  <ScoreboardControlsV2 
                    state={state} 
                    dispatch={handleDispatch} 
                    language={consoleLanguage} 
                    onOpenRecordModal={() => setIsGameRecordModalOpen(true)}
                  />
                ) : (
                  <ScoreboardControls 
                    state={state} 
                    dispatch={handleDispatch} 
                    language={consoleLanguage} 
                    onOpenRecordModal={() => setIsGameRecordModalOpen(true)}
                  />
                )}
            </div>
          )}
        </div>
      </main>

       {/* Footer */}
       <footer className="bg-slate-900 text-slate-500 text-[10px] text-center p-1 border-t border-slate-800 flex flex-col sm:flex-row justify-center items-center gap-1 z-50 relative">
          <span>Made by Yorunann</span>
          <span className="text-slate-600 ml-2">v3.4.14</span>
       </footer>

        <ShortcutSettingsModal
          isOpen={isShortcutModalOpen}
          onClose={() => setIsShortcutModalOpen(false)}
          shortcuts={shortcuts}
          onSave={setShortcuts}
          language={consoleLanguage}
        />

        <UserGuideModal
          isOpen={isUserGuideModalOpen}
          onClose={() => setIsUserGuideModalOpen(false)}
          language={consoleLanguage}
        />

        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          consoleLanguage={consoleLanguage}
          scoreboardLanguage={scoreboardLanguage}
          onConsoleLanguageChange={handleConsoleLanguageChange}
          onScoreboardLanguageChange={handleScoreboardLanguageChange}
          language={consoleLanguage}
          useBetaControls={useBetaControls}
          onToggleBetaControls={handleToggleBetaControls}
        />

        <GameRecordModal
          isOpen={isGameRecordModalOpen}
          onClose={() => setIsGameRecordModalOpen(false)}
          state={state}
          dispatch={handleDispatch}
          language={consoleLanguage}
        />

        <RemoteSyncModal
          isOpen={isRemoteSyncModalOpen}
          onClose={() => setIsRemoteSyncModalOpen(false)}
          roomCode={roomCode}
          onRegenerateRoomCode={() => {
            const newCode = generateRoomCode();
            setRoomCode(newCode);
            try {
              localStorage.setItem('scoreboard_room_code', newCode);
            } catch (e) {}
          }}
          connectionStatus={peerStatus}
          connectedClientsCount={connectedClientsCount}
          connectedClients={connectedClients}
          defaultRole={defaultRole}
          onChangeDefaultRole={setDefaultRole}
          onKickClient={kickClient}
          onChangeClientRole={setClientRole}
          onUnblockAll={unblockKickedClients}
          language={consoleLanguage}
        />

        <ObsOverlayModal
          isOpen={isObsModalOpen}
          onClose={() => setIsObsModalOpen(false)}
          language={consoleLanguage}
          roomCode={roomCode}
          currentDisplayMode={state.displayMode}
          state={state}
          dispatch={handleDispatch}
        />

        {/* Fullscreen Scoreboard Overlay (both Native and Pseudo Immersive Mode) */}
        {(isFullscreen || isPseudoFullscreen) && (
          <div 
            onDoubleClick={toggleFullscreen}
            className="fixed inset-0 z-[150] bg-slate-950 flex flex-col items-center justify-center overflow-hidden p-2 select-none touch-manipulation"
          >
            {/* Floating Top Bar with Mode Switcher & Exit Button */}
            {!isDisplayMode ? (
              <div className="absolute top-3 right-3 flex items-center gap-2 z-50">
                <div className="bg-slate-800/85 backdrop-blur-md rounded-lg p-1 flex border border-slate-700 shadow-xl">
                  {(['default', 'lineup', 'rhe', 'broadcast'] as const).map(mode => {
                    const isActive = (localDisplayMode || state.displayMode) === mode;
                    return (
                      <button
                        key={mode}
                        onClick={() => setLocalDisplayMode(mode)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded capitalize transition-colors ${
                          isActive 
                            ? 'bg-blue-600 text-white' 
                            : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
                        }`}
                      >
                        {mode}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={toggleFullscreen}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-white rounded-lg shadow-xl backdrop-blur-md border border-slate-600 transition-all text-xs font-bold"
                  title={consoleLanguage === 'zh' ? '退出全螢幕' : consoleLanguage === 'en' ? 'Exit Fullscreen' : '全画面終了'}
                >
                  <Minimize size={16} className="text-yellow-400" />
                  <span>{consoleLanguage === 'zh' ? '退出全螢幕' : consoleLanguage === 'en' ? 'Exit' : '終了'}</span>
                </button>
              </div>
            ) : (
              /* Project Mode: Hide the menu completely. Hovering top-right reveals a discreet exit button, and double-click or ESC also exits cleanly. */
              <div className="absolute top-3 right-3 z-50 opacity-0 hover:opacity-100 transition-opacity duration-300">
                <button
                  onClick={toggleFullscreen}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 text-white/80 hover:text-white rounded-lg shadow-lg backdrop-blur-md border border-slate-700/60 text-xs font-medium cursor-pointer"
                  title={consoleLanguage === 'zh' ? '退出全螢幕 (或按 ESC / 雙擊畫面)' : consoleLanguage === 'en' ? 'Exit Fullscreen (ESC or Double-click)' : '全画面終了'}
                >
                  <Minimize size={14} className="text-yellow-400" />
                  <span>{consoleLanguage === 'zh' ? '退出全螢幕' : consoleLanguage === 'en' ? 'Exit' : '終了'}</span>
                </button>
              </div>
            )}

            {/* iOS Tip Banner */}
            {showIosTip && (
              <div className="absolute bottom-4 left-4 right-4 max-w-lg mx-auto bg-slate-900/95 border border-yellow-500/50 text-slate-200 text-xs p-3.5 rounded-xl shadow-2xl z-50 flex items-start gap-3 backdrop-blur-md animate-in fade-in slide-in-from-bottom-3">
                <span className="text-lg shrink-0">💡</span>
                <div className="flex-1 leading-relaxed">
                  <div className="font-bold text-yellow-300 mb-1">
                    {consoleLanguage === 'zh' ? 'iPhone 全螢幕說明' : consoleLanguage === 'en' ? 'iPhone Fullscreen Tip' : 'iPhone 全画面ヒント'}
                  </div>
                  {consoleLanguage === 'zh' ? (
                    <span>
                      已為您開啟全版沈浸模式！若想要<strong>完全隱藏 Safari 網址列與底欄</strong>，可點擊 Safari 底部「<strong>分享</strong>」按鈕 ➔ 選擇「<strong>加入主畫面</strong>」，即可像原生 App 一樣以 100% 完整無邊框全螢幕開啟！
                    </span>
                  ) : (
                    <span>
                      Immersive mode active! Due to iOS limitations, to completely hide Safari's address and bottom bars, tap <strong>Share</strong> ➔ <strong>Add to Home Screen</strong> for a 100% borderless app!
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowIosTip(false);
                    sessionStorage.setItem('ios_fullscreen_tip_dismissed', '1');
                  }}
                  className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 shrink-0"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {/* Scoreboard display */}
            <div 
              ref={fullscreenContainerRef}
              className="w-full h-full max-w-full flex items-center justify-center overflow-hidden relative"
            >
              {isPortrait ? (
                <div className="w-full h-full py-10 px-2 flex items-center justify-center">
                  <ScoreboardDisplay 
                    state={localDisplayMode ? { ...state, displayMode: localDisplayMode } : state} 
                    dispatch={handleDispatch} 
                    language={scoreboardLanguage} 
                    isVerticalFullscreen={true} 
                  />
                </div>
              ) : (
                <div 
                  style={{
                    width: isBroadcast ? 1920 : 960,
                    height: isBroadcast ? 1080 : 540,
                    transform: `scale(${fullscreenScale})`,
                    transformOrigin: 'center center',
                    flexShrink: 0
                  }}
                  className={isBroadcast ? "relative border border-slate-700/60 rounded-xl bg-slate-950/70 shadow-2xl overflow-hidden" : "relative"}
                >
                  <ScoreboardDisplay 
                    state={localDisplayMode ? { ...state, displayMode: localDisplayMode } : state} 
                    dispatch={handleDispatch} 
                    language={scoreboardLanguage} 
                    isVerticalFullscreen={false} 
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reset Confirmation Modal */}
        {isResetConfirmOpen && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
            <div className="bg-slate-800 border-2 border-red-500/50 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <RotateCcw size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {consoleLanguage === 'en' ? 'Reset Game' : consoleLanguage === 'zh' ? '重置比賽' : '試合をリセット'}
                </h3>
                <p className="text-slate-400 mb-6">
                  {consoleLanguage === 'en' 
                    ? 'Are you sure you want to reset the game? This will clear all scores, counts, pitch counts, and at-bat results, but will keep team rosters and saved archives intact.' 
                    : consoleLanguage === 'zh'
                    ? '確定要重置比賽嗎？這將會清除所有比分、好壞球數、局數、投手用球數與選手打席紀錄，但會保留隊伍名單與已存檔的比賽紀錄。此操作無法復原。'
                    : '試合をリセットしてもよろしいですか？ スコア、カウント、投球数、打席結果はクリアされますが、チーム名簿や保存済みの記録は保持されます。'}
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setIsResetConfirmOpen(false)}
                    className="flex-1 px-4 py-3 bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-600 transition-colors"
                  >
                    {consoleLanguage === 'en' ? 'Cancel' : consoleLanguage === 'zh' ? '取消' : 'キャンセル'}
                  </button>
                  <button
                    onClick={handleConfirmReset}
                    className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-500 transition-colors shadow-lg shadow-red-900/20"
                  >
                    {consoleLanguage === 'en' ? 'Reset All' : consoleLanguage === 'zh' ? '確認重置' : 'リセット'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};