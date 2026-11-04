

export interface Player {
  id: string;
  name: string;
  number: string;
  stat: string; // e.g., "1-1" for batter, "P:60" for pitcher
  position?: string;
  atBats?: string[];
  avg?: string;
  inningsPitched?: string;
  battersFaced?: number;
  strikeouts?: number;
  pitchCount?: number;
  runs?: number;
  rbi?: number;
  hits?: number;
  walks?: number;
  earnedRuns?: number;
  hitsAllowed?: number;
  runsAllowed?: number;
  isStarter?: boolean;
  previousPlayers?: Player[];
}

export interface SavedGameRecord {
  id: string;
  title: string;
  date: string;
  awayTeamName: string;
  homeTeamName: string;
  awayScore: number;
  homeScore: number;
  totalInnings: number;
  gameState: GameState;
  createdAt: number;
  notes?: string;
}

export interface Team {
  name: string; // Abbreviation e.g. "LSP"
  fullName: string;
  score: number;
  hits: number;
  errors: number;
  inningScores: (number | null)[]; // null means not played yet
  color: string;
  baseColor?: string;
  logoUrl?: string;
  logoNoBorder?: boolean;
  lineup: Player[];
  bench: Player[];
  currentBatterIndex: number;
  pitcher: Player;
  pitcherHistory?: Player[];
}

export interface PitchInfo {
  type: string;
  speed: string;
  unit: string;
  spinRate: string;
}

export interface GameMeta {
  leagueName: string;
  date: string;
  gameId: string;
  broadcaster: string;
  gameInfos?: string[];
  broadcastMarginX?: number;
  broadcastMarginY?: number;
  broadcastScale?: number;
  broadcastWidth?: number;
  broadcastRightColumnWidth?: number;
  broadcastPlayerRowHeight?: number;
  broadcastTeamRowHeight?: number;
  broadcastScoreWidth?: number;
  broadcastInningWidth?: number;
  broadcastShowTimer?: boolean;
  broadcastShowPitchCount?: boolean;
  broadcastTeamNameSize?: number;
  broadcastPlayerNameSize?: number;
  broadcastScoreSize?: number;
  broadcastTimerSize?: number;
  broadcastInningSize?: number;
  broadcastLogoSize?: number;
  broadcastCountGap?: number;
  broadcastPlayerNumberStyle?: 'normal' | 'gray' | 'hidden';
  broadcastVisible?: boolean;
  broadcastAnimKey?: number;
  swapSides?: boolean;
  settingsVersion?: number;
}

export interface AnimationData {
  type: 'homerun' | '2-run-homer' | '3-run-homer' | 'grand-slam';
  playerName: string;
  teamName: string;
  teamColor: string;
  bubbleKey?: number;
  isLocked?: boolean;
  isExiting?: boolean;
}

export interface GameState {
  awayTeam: Team;
  homeTeam: Team;
  
  // Inning
  inning: number;
  isTop: boolean; // true = top, false = bottom

  // Count
  balls: number;
  strikes: number;
  outs: number;

  // Runners (true = occupied)
  bases: [boolean, boolean, boolean]; // 1st, 2nd, 3rd
  baseRunners?: [string | null, string | null, string | null]; // IDs of players occupying 1st, 2nd, 3rd base

  // Active Players
  pitcher: Player;

  // Pitch Data
  currentPitch: PitchInfo;

  // Timer
  timer: number;
  isTimerRunning: boolean;
  
  // Display Settings
  displayMode: 'default' | 'lineup' | 'rhe' | 'broadcast';
  animation: AnimationData | null;
  showPlayerStat: boolean;
  showBatterInfo: boolean;
  showPitcherInfo: boolean;
  showPitchInfo: boolean;
  showCount: boolean;
  showTimer: boolean;
  
  meta: GameMeta;
  strikeoutAnimationTrigger?: number;
  isAdjustmentMode?: boolean;
  initialTimer: number;
}

export type ActionType = 
  | { type: 'INCREMENT_BALL' }
  | { type: 'DECREMENT_BALL' }
  | { type: 'INCREMENT_STRIKE' }
  | { type: 'DECREMENT_STRIKE' }
  | { type: 'TRIGGER_K' }
  | { type: 'INCREMENT_OUT' }
  | { type: 'DECREMENT_OUT' }
  | { type: 'RESET_COUNT' }
  | { type: 'TOGGLE_BASE'; baseIndex: 0 | 1 | 2 }
  | { type: 'ADD_SCORE'; team: 'home' | 'away'; amount: number }
  | { type: 'ADD_HIT'; team: 'home' | 'away'; amount?: number }
  | { type: 'RESET_SCORE' }
  | { type: 'RESET_GAME' }
  | { type: 'RESET_TEAM'; team: 'home' | 'away' }
  | { type: 'RESET_TEAM_SETTINGS' }
  | { type: 'SWAP_TEAMS' }
  | { type: 'WALK'; walkType?: '四球' | '四壞' | '觸身' | '不死三振' | '敬遠' | 'K+WP' | 'K+PB' | '失誤' }
  | { type: 'SAC_FLY' }
  | { type: 'SAC_BUNT' }
  | { type: 'BATTER_OUT'; outType?: string }
  | { type: 'SINGLE' }
  | { type: 'DOUBLE' }
  | { type: 'TRIPLE' }
  | { type: 'HOME_RUN' }
  | { type: 'WILD_PITCH'; subType?: 'WP' | 'PB' | 'BK' }
  | { type: 'SET_ANIMATION'; animation: AnimationData | null }
  | { type: 'NEXT_INNING' }
  | { type: 'PREVIOUS_HALF_INNING' }
  | { type: 'NEXT_FULL_INNING' }
  | { type: 'PREVIOUS_FULL_INNING' }
  | { type: 'SET_INNING'; value: number }
  | { type: 'UPDATE_PLAYER'; team: 'home' | 'away'; role: 'pitcher' | 'batter'; field: keyof Player; value: string }
  | { type: 'INCREMENT_PLAYER_STAT'; role: 'pitcher' | 'batter' }
  | { type: 'DECREMENT_PLAYER_STAT'; role: 'pitcher' | 'batter' }
  | { type: 'SET_PITCH_COUNT'; team?: 'home' | 'away'; value: number }
  | { type: 'SUBSTITUTE_PITCHER'; team: 'home' | 'away'; benchIndex: number; lineupIndex?: number }
  | { type: 'UPDATE_TEAM'; team: 'home' | 'away'; field?: keyof Team; value?: any; data?: Partial<Team> }
  | { type: 'APPLY_TEAM_CONFIG'; team: 'home' | 'away'; config: Partial<Team> }
  | { type: 'UPDATE_PITCH'; field: keyof PitchInfo; value: string }
  | { type: 'SET_TIMER'; value: number }
  | { type: 'TOGGLE_TIMER' }
  | { type: 'DECREMENT_TIMER' }
  | { type: 'RESET_TIMER' }
  | { type: 'NEXT_BATTER' }
  | { type: 'PREVIOUS_BATTER' }
  | { type: 'SET_BATTER'; team: 'home' | 'away'; index: number }
  | { type: 'ADD_PLAYER_TO_LINEUP'; team: 'home' | 'away' }
  | { type: 'UPDATE_LINEUP_PLAYER'; team: 'home' | 'away'; index: number; field: keyof Player; value: string }
  | { type: 'REMOVE_PLAYER_FROM_LINEUP'; team: 'home' | 'away'; index: number }
  | { type: 'ADD_PLAYER_TO_BENCH'; team: 'home' | 'away'; player?: Partial<Player> }
  | { type: 'UPDATE_BENCH_PLAYER'; team: 'home' | 'away'; index: number; field: keyof Player; value: string }
  | { type: 'REMOVE_PLAYER_FROM_BENCH'; team: 'home' | 'away'; index: number }
  | { type: 'SWAP_LINEUP_BENCH'; team: 'home' | 'away'; lineupIndex: number; benchIndex: number }
  | { type: 'MOVE_TO_BENCH'; team: 'home' | 'away'; index: number }
  | { type: 'MOVE_TO_LINEUP'; team: 'home' | 'away'; index: number }
  | { type: 'REORDER_LINEUP'; team: 'home' | 'away'; startIndex: number; endIndex: number }
  | { type: 'REORDER_BENCH'; team: 'home' | 'away'; startIndex: number; endIndex: number }
  | { type: 'SET_INNING_SCORE'; team: 'home' | 'away'; inningIndex: number; score: number | null }
  | { type: 'THREE_UP_THREE_DOWN' }
  | { type: 'RECORD_AT_BAT'; team?: 'home' | 'away'; playerIndex?: number; result: string; rbi?: number; runs?: number }
  | { type: 'ADJUST_PLAYER_SCORE'; team: 'home' | 'away'; index: number; field: 'rbi' | 'runs'; amount: number }
  | { type: 'CLEAR_ALL_AT_BATS' }
  | { type: 'UPDATE_META'; field: keyof GameMeta; value: any }
  | { type: 'TOGGLE_VISIBILITY'; field: 'showPlayerStat' | 'showBatterInfo' | 'showPitcherInfo' | 'showPitchInfo' | 'showCount' | 'showTimer' | 'isAdjustmentMode' }
  | { type: 'SET_VISIBILITY'; field: 'showPlayerStat' | 'showBatterInfo' | 'showPitcherInfo' | 'showPitchInfo' | 'showCount' | 'showTimer'; value: boolean }
  | { type: 'SET_DISPLAY_MODE'; mode: 'default' | 'lineup' | 'rhe' | 'broadcast' }
  | { type: 'TOGGLE_DISPLAY_MODE' }
  | { type: 'TOGGLE_LINEUP_MODE' }
  | { type: 'TOGGLE_RHE_MODE' }
  | { type: 'TOGGLE_BROADCAST_MODE' }
  | { type: 'TOGGLE_ADJUSTMENT_MODE' }
  | { type: 'FULL_RESET' }
  | { type: 'UNDO' }
  | { type: 'REPLACE_STATE'; state: GameState }
  | { type: 'TRIGGER_HR_BUBBLE' }
  | { type: 'LOCK_HR_ANIMATION' }
  | { type: 'EXIT_HR_ANIMATION' };