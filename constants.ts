import { GameState, Player, Team } from './types';

const generateId = () => Math.random().toString(36).substr(2, 9);

const defaultLineup = (prefix: string): Player[] => [
  { id: generateId(), name: `${prefix} #1`, number: '01', stat: '.300', position: 'SS' },
  { id: generateId(), name: `${prefix} #2`, number: '02', stat: '.280', position: '2B' },
  { id: generateId(), name: `${prefix} #3`, number: '03', stat: '.310', position: 'CF' },
  { id: generateId(), name: `${prefix} #4`, number: '04', stat: '.290', position: '1B' },
  { id: generateId(), name: `${prefix} #5`, number: '05', stat: '.250', position: 'RF' },
  { id: generateId(), name: `${prefix} #6`, number: '06', stat: '.240', position: '3B' },
  { id: generateId(), name: `${prefix} #7`, number: '07', stat: '.220', position: 'LF' },
  { id: generateId(), name: `${prefix} #8`, number: '08', stat: '.210', position: 'C' },
  { id: generateId(), name: `${prefix} #9`, number: '09', stat: '.200', position: 'DH' },
];

const defaultBench = (prefix: string): Player[] => [
  { id: generateId(), name: `${prefix} Bench 1`, number: '10', stat: '.200', position: 'OF' },
  { id: generateId(), name: `${prefix} Bench 2`, number: '11', stat: '.210', position: 'IF' },
  { id: generateId(), name: `${prefix} Bench 3`, number: '12', stat: '.190', position: 'C' },
];

export const INITIAL_STATE: GameState = {
  awayTeam: {
    name: 'AWAY',
    fullName: 'AWAY TEAM',
    score: 0,
    hits: 0,
    errors: 0,
    inningScores: Array(9).fill(null),
    color: '#1e40af', // Blue
    baseColor: '#facc15', // Yellow
    lineup: defaultLineup('AWAY'),
    bench: defaultBench('AWAY'),
    currentBatterIndex: 0,
    pitcher: {
      id: generateId(),
      name: 'Away P',
      number: '99',
      stat: 'P: 0',
    },
  },
  homeTeam: {
    name: 'HOME',
    fullName: 'HOME TEAM',
    score: 0,
    hits: 0,
    errors: 0,
    inningScores: Array(9).fill(null),
    color: '#b91c1c', // Red
    baseColor: '#facc15', // Yellow
    lineup: defaultLineup('HOME'),
    bench: defaultBench('HOME'),
    currentBatterIndex: 0,
    pitcher: {
      id: generateId(),
      name: 'Home P',
      number: '1',
      stat: 'P: 0',
    },
  },
  inning: 1,
  isTop: true,
  balls: 0,
  strikes: 0,
  outs: 0,
  bases: [false, false, false], // No runners
  baseRunners: [null, null, null],
  pitcher: {
    id: 'p1',
    name: 'Zhu',
    number: '98',
    stat: 'P: 8',
  },
  currentPitch: {
    type: 'SWEEPER',
    speed: '140',
    unit: 'Km/h',
    spinRate: '1789 RPM',
  },
  timer: 20,
  initialTimer: 20,
  isTimerRunning: false,
  displayMode: 'default',
  animation: null,
  showPlayerStat: true,
  showBatterInfo: true,
  showPitcherInfo: true,
  showPitchInfo: true,
  showCount: true,
  showTimer: true,
  strikeoutAnimationTrigger: 0,
  meta: {
    leagueName: 'FPBL 25th',
    date: '8/3',
    gameId: 'G265',
    broadcaster: 'Astra & co.',
    gameInfos: ['FPBL 25th', 'G265', '8/3'],
    broadcastMarginX: 20,
    broadcastMarginY: 20,
  },
  playByPlay: [],
  currentPaEvents: []
};

export const sanitizeGameState = (loadedState: any, fallbackState: GameState = INITIAL_STATE): GameState => {
  if (!loadedState || typeof loadedState !== 'object') {
    return fallbackState;
  }

  const sanitizeTeam = (teamData: any, defaultTeam: Team): Team => {
    if (!teamData || typeof teamData !== 'object') return defaultTeam;
    return {
      name: teamData.name || defaultTeam.name,
      fullName: teamData.fullName || defaultTeam.fullName,
      score: typeof teamData.score === 'number' ? teamData.score : defaultTeam.score,
      hits: typeof teamData.hits === 'number' ? teamData.hits : defaultTeam.hits,
      errors: typeof teamData.errors === 'number' ? teamData.errors : defaultTeam.errors,
      inningScores: Array.isArray(teamData.inningScores) ? teamData.inningScores : defaultTeam.inningScores,
      color: teamData.color || defaultTeam.color,
      baseColor: teamData.baseColor || defaultTeam.baseColor,
      lineup: Array.isArray(teamData.lineup) && teamData.lineup.length > 0 ? teamData.lineup : defaultTeam.lineup,
      bench: Array.isArray(teamData.bench) ? teamData.bench : defaultTeam.bench,
      currentBatterIndex: typeof teamData.currentBatterIndex === 'number' ? teamData.currentBatterIndex : 0,
      pitcher: teamData.pitcher && typeof teamData.pitcher === 'object' ? {
        id: teamData.pitcher.id || defaultTeam.pitcher.id,
        name: teamData.pitcher.name || defaultTeam.pitcher.name,
        number: teamData.pitcher.number ?? defaultTeam.pitcher.number,
        stat: teamData.pitcher.stat || defaultTeam.pitcher.stat,
      } : defaultTeam.pitcher,
      logoUrl: teamData.logoUrl || defaultTeam.logoUrl,
    };
  };

  return {
    ...fallbackState,
    ...loadedState,
    awayTeam: sanitizeTeam(loadedState.awayTeam, fallbackState.awayTeam),
    homeTeam: sanitizeTeam(loadedState.homeTeam, fallbackState.homeTeam),
    inning: typeof loadedState.inning === 'number' ? loadedState.inning : fallbackState.inning,
    isTop: typeof loadedState.isTop === 'boolean' ? loadedState.isTop : fallbackState.isTop,
    balls: typeof loadedState.balls === 'number' ? loadedState.balls : fallbackState.balls,
    strikes: typeof loadedState.strikes === 'number' ? loadedState.strikes : fallbackState.strikes,
    outs: typeof loadedState.outs === 'number' ? loadedState.outs : fallbackState.outs,
    bases: Array.isArray(loadedState.bases) && loadedState.bases.length === 3 ? loadedState.bases : fallbackState.bases,
    pitcher: loadedState.pitcher || fallbackState.pitcher,
    currentPitch: loadedState.currentPitch || fallbackState.currentPitch,
    timer: typeof loadedState.timer === 'number' ? loadedState.timer : fallbackState.timer,
    initialTimer: typeof loadedState.initialTimer === 'number' ? loadedState.initialTimer : fallbackState.initialTimer,
    isTimerRunning: typeof loadedState.isTimerRunning === 'boolean' ? loadedState.isTimerRunning : false,
    displayMode: loadedState.displayMode || fallbackState.displayMode,
    animation: null, // Always clear animation on fresh load/sync
    showPlayerStat: loadedState.showPlayerStat ?? fallbackState.showPlayerStat,
    showBatterInfo: loadedState.showBatterInfo ?? fallbackState.showBatterInfo,
    showPitcherInfo: loadedState.showPitcherInfo ?? fallbackState.showPitcherInfo,
    showPitchInfo: loadedState.showPitchInfo ?? fallbackState.showPitchInfo,
    showCount: loadedState.showCount ?? fallbackState.showCount,
    showTimer: loadedState.showTimer ?? fallbackState.showTimer,
    strikeoutAnimationTrigger: loadedState.strikeoutAnimationTrigger ?? fallbackState.strikeoutAnimationTrigger,
    meta: {
      ...fallbackState.meta,
      ...(loadedState.meta || {}),
    },
    playByPlay: Array.isArray(loadedState.playByPlay) ? loadedState.playByPlay : (fallbackState.playByPlay || []),
    currentPaEvents: Array.isArray(loadedState.currentPaEvents) ? loadedState.currentPaEvents : (fallbackState.currentPaEvents || [])
  };
};