import { GameState, ActionType, Player, Team } from './types';
import { INITIAL_STATE } from './constants';

const generateId = () => Math.random().toString(36).substr(2, 9);

const incrementPitchStat = (stat?: string): string => {
  if (!stat) return '1';
  const match = stat.match(/P:\s*(\d+)/i);
  if (match) {
    const count = parseInt(match[1], 10);
    return `P: ${count + 1}`;
  }
  const count = parseInt(stat, 10);
  if (!isNaN(count)) return (count + 1).toString();
  return '1';
};

const decrementPitchStat = (stat?: string): string => {
  if (!stat) return '0';
  const match = stat.match(/P:\s*(\d+)/i);
  if (match) {
    const count = parseInt(match[1], 10);
    return `P: ${Math.max(0, count - 1)}`;
  }
  const count = parseInt(stat, 10);
  if (!isNaN(count)) return Math.max(0, count - 1).toString();
  return '0';
};

const updateInningScore = (team: Team, inning: number, amount: number): (number | null)[] => {
  const newScores = [...team.inningScores];
  const index = inning - 1;
  if (index >= 0) {
    // Ensure the array is long enough
    while (newScores.length <= index) {
      newScores.push(null);
    }
    const currentScore = newScores[index] || 0;
    newScores[index] = currentScore + amount;
  }
  return newScores;
};

export const getPitcherCount = (p?: Partial<Player>): number => {
  if (!p) return 0;
  if (typeof p.pitchCount === 'number' && !isNaN(p.pitchCount)) return p.pitchCount;
  const num = parseInt(String(p.stat || '').replace(/[^0-9]/g, ''), 10);
  return isNaN(num) ? 0 : num;
};

// Automatically credit RBIs and Runs to players
const recordTeamScoring = (
  team: Team,
  scoringPlayerIds: (string | null | undefined)[],
  batterId: string | undefined,
  rbiCount: number,
  batterScored: boolean = false
): { lineup: Player[]; bench: Player[] } => {
  const validScoringIds = scoringPlayerIds.filter((id): id is string => Boolean(id));

  const updateList = (players: Player[]) => players.map(p => {
    let updatedRuns = p.runs || 0;
    let updatedRbi = p.rbi || 0;
    let changed = false;

    if (validScoringIds.includes(p.id)) {
      const timesScored = validScoringIds.filter(id => id === p.id).length;
      updatedRuns += timesScored;
      changed = true;
    } else if (batterScored && p.id === batterId) {
      updatedRuns += 1;
      changed = true;
    }

    if (p.id === batterId && rbiCount > 0) {
      updatedRbi += rbiCount;
      changed = true;
    }

    if (changed) {
      return { ...p, runs: updatedRuns, rbi: updatedRbi };
    }
    return p;
  });

  return {
    lineup: updateList(team.lineup),
    bench: updateList(team.bench)
  };
};

const resolveScoringRunners = (
  team: Team,
  scoringBaseIndices: (0 | 1 | 2)[],
  currentRunners: [string | null, string | null, string | null] | undefined,
  currentBatterIndex: number
): (string | null)[] => {
  const result: (string | null)[] = [];
  const usedIds = new Set<string>();

  for (const baseIdx of scoringBaseIndices) {
    const runnerId = currentRunners ? currentRunners[baseIdx] : null;
    if (runnerId && !usedIds.has(runnerId)) {
      result.push(runnerId);
      usedIds.add(runnerId);
    } else {
      let foundId: string | null = null;
      const count = team.lineup.length;
      for (let offset = 1; offset < count; offset++) {
        const candidateIdx = (currentBatterIndex - offset + count) % count;
        const candidate = team.lineup[candidateIdx];
        if (candidate && !usedIds.has(candidate.id)) {
          foundId = candidate.id;
          usedIds.add(foundId);
          break;
        }
      }
      result.push(foundId);
    }
  }
  return result;
};

export function reducer(state: GameState, action: ActionType): GameState {
  let nextState = baseReducer(state, action);

  const pitchIncrementActions: ActionType['type'][] = [
    'INCREMENT_BALL',
    'INCREMENT_STRIKE',
    'BATTER_OUT',
    'SINGLE',
    'DOUBLE',
    'TRIPLE',
    'HOME_RUN',
    'SAC_FLY'
  ];

  if (pitchIncrementActions.includes(action.type)) {
    const pitchingTeamKey = state.isTop ? 'homeTeam' : 'awayTeam';
    const curPitcher = nextState[pitchingTeamKey].pitcher;
    const nextCount = getPitcherCount(curPitcher) + 1;
    nextState = {
      ...nextState,
      [pitchingTeamKey]: {
        ...nextState[pitchingTeamKey],
        pitcher: {
          ...curPitcher,
          stat: String(nextCount),
          pitchCount: nextCount
        }
      }
    };
  }

  return nextState;
}

function baseReducer(state: GameState, action: ActionType): GameState {
  switch (action.type) {
    case 'INCREMENT_BALL': {
      if (state.balls >= 3) {
        // Walk (Base on Balls)
        const teamKey = state.isTop ? 'awayTeam' : 'homeTeam';
        const teamObj = state[teamKey];
        const curIndex = teamObj.currentBatterIndex;
        const batter = teamObj.lineup[curIndex];
        const nextIndex = teamObj.lineup.length > 0 ? (curIndex + 1) % teamObj.lineup.length : curIndex;

        const curRunners = state.baseRunners || [state.bases[0] ? 'r0' : null, state.bases[1] ? 'r1' : null, state.bases[2] ? 'r2' : null];
        let newBases = [...state.bases] as [boolean, boolean, boolean];
        let newRunners: [string | null, string | null, string | null] = [...curRunners];
        let runsScored = 0;
        let scoringRunnerIds: (string | null)[] = [];

        if (newBases[0]) {
          if (newBases[1]) {
            if (newBases[2]) {
              runsScored = 1;
              scoringRunnerIds = resolveScoringRunners(teamObj, [2], state.baseRunners, curIndex);
              newRunners = [batter ? batter.id : null, curRunners[0], curRunners[1]];
            } else {
              newBases[2] = true;
              newRunners[2] = curRunners[1];
              newRunners[1] = curRunners[0];
              newRunners[0] = batter ? batter.id : null;
            }
          } else {
            newBases[1] = true;
            newRunners[1] = curRunners[0];
            newRunners[0] = batter ? batter.id : null;
          }
        } else {
          newBases[0] = true;
          newRunners[0] = batter ? batter.id : null;
        }

        const { lineup: updatedLineup, bench: updatedBench } = recordTeamScoring(
          teamObj,
          scoringRunnerIds,
          batter?.id,
          runsScored, // batter RBI if bases loaded
          false
        );

        const newLineup = [...updatedLineup];
        if (newLineup[curIndex]) {
          newLineup[curIndex] = {
            ...newLineup[curIndex],
            atBats: [...(newLineup[curIndex].atBats || []), runsScored > 0 ? '四壞(1)' : '四壞']
          };
        }

        return {
          ...state,
          balls: 0,
          strikes: 0,
          bases: newBases,
          baseRunners: newRunners,
          [teamKey]: {
            ...teamObj,
            score: teamObj.score + runsScored,
            lineup: newLineup,
            bench: updatedBench,
            currentBatterIndex: nextIndex,
            inningScores: runsScored > 0 ? updateInningScore(teamObj, state.inning, runsScored) : teamObj.inningScores
          }
        };
      }
      return { 
        ...state, 
        balls: state.balls + 1,
      };
    }
      
    case 'DECREMENT_BALL':
      return {
        ...state,
        balls: Math.max(0, state.balls - 1),
      };
    
    case 'INCREMENT_STRIKE': {
      const isStrikeout = state.strikes >= 2;
      
      if (!isStrikeout) {
        return { 
          ...state, 
          strikes: state.strikes + 1,
        };
      }

      // It's a strikeout
      const isThirdOut = state.outs >= 2;
      
      const battingTeamKey = state.isTop ? 'awayTeam' : 'homeTeam';
      const curBatterIdx = state[battingTeamKey].currentBatterIndex;
      const updatedBattingLineup = [...state[battingTeamKey].lineup];
      if (updatedBattingLineup[curBatterIdx]) {
        updatedBattingLineup[curBatterIdx] = {
          ...updatedBattingLineup[curBatterIdx],
          atBats: [...(updatedBattingLineup[curBatterIdx].atBats || []), '三振']
        };
      }

      const nextAwayIndex = state.isTop 
        ? (state.awayTeam.currentBatterIndex + 1) % Math.max(1, state.awayTeam.lineup.length) 
        : state.awayTeam.currentBatterIndex;
        
      const nextHomeIndex = !state.isTop 
        ? (state.homeTeam.currentBatterIndex + 1) % Math.max(1, state.homeTeam.lineup.length) 
        : state.homeTeam.currentBatterIndex;

      const pitchingTeamKey = state.isTop ? 'homeTeam' : 'awayTeam';
      const curPitcher = state[pitchingTeamKey].pitcher;
      const updatedPitcher = curPitcher ? {
        ...curPitcher,
        strikeouts: (curPitcher.strikeouts || 0) + 1
      } : curPitcher;

      return { 
        ...state, 
        strikes: 0,
        balls: 0,
        outs: isThirdOut ? 0 : state.outs + 1,
        bases: isThirdOut ? [false, false, false] : state.bases,
        strikeoutAnimationTrigger: (state.strikeoutAnimationTrigger || 0) + 1,
        awayTeam: {
          ...state.awayTeam,
          lineup: state.isTop ? updatedBattingLineup : state.awayTeam.lineup,
          pitcher: !state.isTop ? (updatedPitcher || state.awayTeam.pitcher) : state.awayTeam.pitcher,
          currentBatterIndex: nextAwayIndex
        },
        homeTeam: {
          ...state.homeTeam,
          lineup: !state.isTop ? updatedBattingLineup : state.homeTeam.lineup,
          pitcher: state.isTop ? (updatedPitcher || state.homeTeam.pitcher) : state.homeTeam.pitcher,
          currentBatterIndex: nextHomeIndex
        }
      };
    }
      
    case 'DECREMENT_STRIKE':
      return {
        ...state,
        strikes: Math.max(0, state.strikes - 1),
      };

    case 'TRIGGER_K': {
      const pitchingTeamKey = state.isTop ? 'homeTeam' : 'awayTeam';
      const curPitcher = state[pitchingTeamKey].pitcher;
      const updatedPitcher = curPitcher ? {
        ...curPitcher,
        strikeouts: (curPitcher.strikeouts || 0) + 1
      } : curPitcher;
      return {
        ...state,
        strikeoutAnimationTrigger: (state.strikeoutAnimationTrigger || 0) + 1,
        [pitchingTeamKey]: {
          ...state[pitchingTeamKey],
          pitcher: updatedPitcher || state[pitchingTeamKey].pitcher
        }
      };
    }
    
    case 'INCREMENT_OUT':
      if (state.outs >= 2) {
        return { 
          ...state, 
          outs: 0, 
          balls: 0, 
          strikes: 0, 
          bases: [false, false, false],
          baseRunners: [null, null, null],
        };
      }
      return { 
        ...state, 
        outs: state.outs + 1,
      };
      
    case 'DECREMENT_OUT':
      return {
        ...state,
        outs: Math.max(0, state.outs - 1),
      };
    
    case 'RESET_COUNT':
      return { ...state, balls: 0, strikes: 0 };

    case 'TOGGLE_BASE': {
      const newBases = [...state.bases] as [boolean, boolean, boolean];
      newBases[action.baseIndex] = !newBases[action.baseIndex];
      const curRunners = state.baseRunners || [null, null, null];
      const newRunners = [...curRunners] as [string | null, string | null, string | null];
      if (!newBases[action.baseIndex]) {
        newRunners[action.baseIndex] = null;
      } else if (!newRunners[action.baseIndex]) {
        const teamKey = state.isTop ? 'awayTeam' : 'homeTeam';
        const teamObj = state[teamKey];
        const scoring = resolveScoringRunners(teamObj, [action.baseIndex], state.baseRunners, teamObj.currentBatterIndex);
        newRunners[action.baseIndex] = scoring[0] || `runner_${action.baseIndex}`;
      }
      return { ...state, bases: newBases, baseRunners: newRunners };
    }

    case 'ADD_SCORE':
      if (action.team === 'home') {
        return { 
          ...state, 
          homeTeam: { 
            ...state.homeTeam, 
            score: Math.max(0, state.homeTeam.score + action.amount),
            inningScores: updateInningScore(state.homeTeam, state.inning, action.amount)
          } 
        };
      } else {
        return { 
          ...state, 
          awayTeam: { 
            ...state.awayTeam, 
            score: Math.max(0, state.awayTeam.score + action.amount),
            inningScores: updateInningScore(state.awayTeam, state.inning, action.amount)
          } 
        };
      }

    case 'ADD_HIT': {
      const teamKey = action.team === 'home' ? 'homeTeam' : 'awayTeam';
      const currentHits = state[teamKey].hits || 0;
      const amount = action.amount ?? 1;
      return {
        ...state,
        [teamKey]: {
          ...state[teamKey],
          hits: Math.max(0, currentHits + amount)
        }
      };
    }

    case 'RESET_SCORE':
      return {
        ...state,
        awayTeam: { ...state.awayTeam, score: 0 },
        homeTeam: { ...state.homeTeam, score: 0 }
      };

    case 'RESET_GAME': {
      const resetPlayer = (p: Player): Player => ({
        ...p,
        atBats: [],
        runs: 0,
        rbi: 0,
        hits: 0,
        walks: 0,
        pitchCount: 0,
        strikeouts: 0,
        battersFaced: undefined,
        earnedRuns: 0,
        hitsAllowed: 0,
        runsAllowed: 0,
        inningsPitched: '0.0',
        stat: p.position === 'P' || (p.stat && p.stat.startsWith('P:')) ? '0' : p.stat
      });

      const resetPitcher = (p: Player): Player => ({
        ...p,
        stat: '0',
        pitchCount: 0,
        strikeouts: 0,
        battersFaced: undefined,
        earnedRuns: 0,
        hitsAllowed: 0,
        runsAllowed: 0,
        walks: 0,
        runs: 0,
        rbi: 0,
        hits: 0,
        inningsPitched: '0.0',
        atBats: []
      });

      return {
        ...state,
        balls: 0,
        strikes: 0,
        outs: 0,
        bases: [false, false, false],
        baseRunners: [null, null, null],
        inning: 1,
        isTop: true,
        timer: state.initialTimer,
        isTimerRunning: false,
        animation: null,
        currentPitch: {
          type: '',
          speed: '',
          unit: state.currentPitch?.unit || 'km/h',
          spinRate: ''
        },
        pitcher: state.pitcher ? resetPitcher(state.pitcher) : state.pitcher,
        awayTeam: {
          ...state.awayTeam,
          score: 0,
          hits: 0,
          errors: 0,
          inningScores: Array(9).fill(null),
          currentBatterIndex: 0,
          pitcherHistory: [],
          pitcher: resetPitcher(state.awayTeam.pitcher),
          lineup: state.awayTeam.lineup.map(resetPlayer),
          bench: state.awayTeam.bench.map(resetPlayer)
        },
        homeTeam: {
          ...state.homeTeam,
          score: 0,
          hits: 0,
          errors: 0,
          inningScores: Array(9).fill(null),
          currentBatterIndex: 0,
          pitcherHistory: [],
          pitcher: resetPitcher(state.homeTeam.pitcher),
          lineup: state.homeTeam.lineup.map(resetPlayer),
          bench: state.homeTeam.bench.map(resetPlayer)
        }
      };
    }

    case 'RESET_TEAM': {
      const targetTeam = action.team === 'home' ? 'homeTeam' : 'awayTeam';
      return {
        ...state,
        meta: {
          ...state.meta,
          settingsVersion: (state.meta.settingsVersion || 0) + 1
        },
        [targetTeam]: {
          ...state[targetTeam],
          lineup: INITIAL_STATE[targetTeam].lineup,
          bench: INITIAL_STATE[targetTeam].bench,
          name: INITIAL_STATE[targetTeam].name,
          fullName: INITIAL_STATE[targetTeam].fullName,
          color: INITIAL_STATE[targetTeam].color,
          baseColor: INITIAL_STATE[targetTeam].baseColor,
          logoUrl: INITIAL_STATE[targetTeam].logoUrl,
          pitcher: INITIAL_STATE[targetTeam].pitcher,
        }
      };
    }

    case 'RESET_TEAM_SETTINGS':
      return {
        ...state,
        meta: {
          ...state.meta,
          settingsVersion: (state.meta.settingsVersion || 0) + 1
        },
        awayTeam: {
          ...state.awayTeam,
          lineup: INITIAL_STATE.awayTeam.lineup,
          bench: INITIAL_STATE.awayTeam.bench,
          name: INITIAL_STATE.awayTeam.name,
          fullName: INITIAL_STATE.awayTeam.fullName,
          color: INITIAL_STATE.awayTeam.color,
          baseColor: INITIAL_STATE.awayTeam.baseColor,
          logoUrl: INITIAL_STATE.awayTeam.logoUrl,
          pitcher: INITIAL_STATE.awayTeam.pitcher,
        },
        homeTeam: {
          ...state.homeTeam,
          lineup: INITIAL_STATE.homeTeam.lineup,
          bench: INITIAL_STATE.homeTeam.bench,
          name: INITIAL_STATE.homeTeam.name,
          fullName: INITIAL_STATE.homeTeam.fullName,
          color: INITIAL_STATE.homeTeam.color,
          baseColor: INITIAL_STATE.homeTeam.baseColor,
          logoUrl: INITIAL_STATE.homeTeam.logoUrl,
          pitcher: INITIAL_STATE.homeTeam.pitcher,
        }
      };

    case 'SWAP_TEAMS':
      return {
        ...state,
        homeTeam: state.awayTeam,
        awayTeam: state.homeTeam,
        isTop: !state.isTop,
        meta: { ...state.meta, settingsVersion: (state.meta.settingsVersion || 0) + 1 }
      };

    case 'WALK': {
      const teamKey = state.isTop ? 'awayTeam' : 'homeTeam';
      const teamObj = state[teamKey];
      const curIndex = teamObj.currentBatterIndex;
      const batter = teamObj.lineup[curIndex];
      const nextIndex = teamObj.lineup.length > 0 ? (curIndex + 1) % teamObj.lineup.length : curIndex;
      const curRunners = state.baseRunners || [state.bases[0] ? 'r0' : null, state.bases[1] ? 'r1' : null, state.bases[2] ? 'r2' : null];
      let newBases = [...state.bases] as [boolean, boolean, boolean];
      let newRunners: [string | null, string | null, string | null] = [...curRunners];
      let runsScored = 0;
      let scoringRunnerIds: (string | null)[] = [];
      
      if (newBases[0]) {
        if (newBases[1]) {
          if (newBases[2]) {
            runsScored = 1;
            scoringRunnerIds = resolveScoringRunners(teamObj, [2], state.baseRunners, curIndex);
            newRunners = [batter ? batter.id : null, curRunners[0], curRunners[1]];
          } else {
            newBases[2] = true;
            newRunners[2] = curRunners[1];
            newRunners[1] = curRunners[0];
            newRunners[0] = batter ? batter.id : null;
          }
        } else {
          newBases[1] = true;
          newRunners[1] = curRunners[0];
          newRunners[0] = batter ? batter.id : null;
        }
      } else {
        newBases[0] = true;
        newRunners[0] = batter ? batter.id : null;
      }

      const { lineup: updatedLineup, bench: updatedBench } = recordTeamScoring(
        teamObj,
        scoringRunnerIds,
        batter?.id,
        runsScored, // batter gets 1 RBI if bases loaded
        false
      );

      const rawWalk = (action as any).walkType || '四壞';
      const walkText = rawWalk === '四球' ? '四壞' : rawWalk;
      const resultText = runsScored > 0 ? `${walkText}(1)` : walkText;
      const newLineup = [...updatedLineup];
      if (newLineup[curIndex]) {
        newLineup[curIndex] = {
          ...newLineup[curIndex],
          atBats: [...(newLineup[curIndex].atBats || []), resultText]
        };
      }

      const isDefensiveMiscue = walkText === 'K+WP' || walkText === 'K+PB' || walkText === '失誤';
      const fieldingTeamKey = state.isTop ? 'homeTeam' : 'awayTeam';
      const fieldingTeam = state[fieldingTeamKey];
      const updatedFieldingTeam = isDefensiveMiscue
        ? { ...fieldingTeam, errors: (fieldingTeam.errors || 0) + 1 }
        : fieldingTeam;

      return {
        ...state,
        balls: 0,
        strikes: 0,
        bases: newBases,
        baseRunners: newRunners,
        [teamKey]: {
          ...teamObj,
          score: teamObj.score + runsScored,
          lineup: newLineup,
          bench: updatedBench,
          currentBatterIndex: nextIndex,
          inningScores: runsScored > 0 ? updateInningScore(teamObj, state.inning, runsScored) : teamObj.inningScores
        },
        ...(isDefensiveMiscue ? { [fieldingTeamKey]: updatedFieldingTeam } : {})
      };
    }

    case 'SAC_FLY': {
      const teamKey = state.isTop ? 'awayTeam' : 'homeTeam';
      const teamObj = state[teamKey];
      const curIndex = teamObj.currentBatterIndex;
      const batter = teamObj.lineup[curIndex];
      const nextIndex = teamObj.lineup.length > 0 ? (curIndex + 1) % teamObj.lineup.length : curIndex;
      const willResetInning = state.outs >= 2;

      const runsScored = state.bases[2] ? 1 : 0;
      const scoringRunnerIds = runsScored > 0 ? resolveScoringRunners(teamObj, [2], state.baseRunners, curIndex) : [];

      const { lineup: updatedLineup, bench: updatedBench } = recordTeamScoring(
        teamObj,
        scoringRunnerIds,
        batter?.id,
        runsScored, // batter gets 1 RBI
        false
      );

      const newLineup = [...updatedLineup];
      if (newLineup[curIndex]) {
        newLineup[curIndex] = {
          ...newLineup[curIndex],
          atBats: [...(newLineup[curIndex].atBats || []), runsScored > 0 ? '高飛(1)' : '高飛']
        };
      }

      const curRunners = state.baseRunners || [null, null, null];
      const newBases: [boolean, boolean, boolean] = willResetInning ? [false, false, false] : [state.bases[0], state.bases[1], false];
      const newRunners: [string | null, string | null, string | null] = willResetInning ? [null, null, null] : [curRunners[0], curRunners[1], null];

      return {
        ...state,
        outs: willResetInning ? 0 : state.outs + 1,
        balls: 0,
        strikes: 0,
        bases: newBases,
        baseRunners: newRunners,
        [teamKey]: {
          ...teamObj,
          score: teamObj.score + runsScored,
          lineup: newLineup,
          bench: updatedBench,
          currentBatterIndex: nextIndex,
          inningScores: runsScored > 0 ? updateInningScore(teamObj, state.inning, runsScored) : teamObj.inningScores
        }
      };
    }

    case 'BATTER_OUT': {
      const teamKey = state.isTop ? 'awayTeam' : 'homeTeam';
      const teamObj = state[teamKey];
      const curIndex = teamObj.currentBatterIndex;
      const nextIndex = teamObj.lineup.length > 0 ? (curIndex + 1) % teamObj.lineup.length : curIndex;
      
      const willResetInning = state.outs >= 2;

      const resultText = (action as any).outType || '出局';

      const newLineup = [...teamObj.lineup];
      if (newLineup[curIndex]) {
        newLineup[curIndex] = {
          ...newLineup[curIndex],
          atBats: [...(newLineup[curIndex].atBats || []), resultText]
        };
      }

      return {
        ...state,
        [teamKey]: {
          ...teamObj,
          lineup: newLineup,
          currentBatterIndex: nextIndex
        },
        outs: willResetInning ? 0 : state.outs + 1,
        balls: 0,
        strikes: 0,
        bases: willResetInning ? [false, false, false] : state.bases,
        baseRunners: willResetInning ? [null, null, null] : state.baseRunners,
      };
    }

    case 'SINGLE': {
      const teamKey = state.isTop ? 'awayTeam' : 'homeTeam';
      const teamObj = state[teamKey];
      const curIndex = teamObj.currentBatterIndex;
      const batter = teamObj.lineup[curIndex];
      const nextIndex = teamObj.lineup.length > 0 ? (curIndex + 1) % teamObj.lineup.length : curIndex;

      const runsScored = state.bases[2] ? 1 : 0;
      const scoringRunnerIds = runsScored > 0 ? resolveScoringRunners(teamObj, [2], state.baseRunners, curIndex) : [];

      const { lineup: updatedLineup, bench: updatedBench } = recordTeamScoring(
        teamObj,
        scoringRunnerIds,
        batter?.id,
        runsScored, // batter gets 1 RBI
        false
      );

      const newLineup = [...updatedLineup];
      if (newLineup[curIndex]) {
        newLineup[curIndex] = {
          ...newLineup[curIndex],
          atBats: [...(newLineup[curIndex].atBats || []), runsScored > 0 ? '一安(1)' : '一安']
        };
      }

      const curRunners = state.baseRunners || [null, null, null];
      const newBases: [boolean, boolean, boolean] = [true, state.bases[0], state.bases[1]];
      const newRunners: [string | null, string | null, string | null] = [batter?.id || null, curRunners[0], curRunners[1]];

      return {
        ...state,
        balls: 0,
        strikes: 0,
        bases: newBases,
        baseRunners: newRunners,
        [teamKey]: { 
          ...teamObj, 
          score: teamObj.score + runsScored, 
          hits: teamObj.hits + 1,
          lineup: newLineup,
          bench: updatedBench,
          currentBatterIndex: nextIndex,
          inningScores: runsScored > 0 ? updateInningScore(teamObj, state.inning, runsScored) : teamObj.inningScores
        }
      };
    }

    case 'DOUBLE': {
      const teamKey = state.isTop ? 'awayTeam' : 'homeTeam';
      const teamObj = state[teamKey];
      const curIndex = teamObj.currentBatterIndex;
      const batter = teamObj.lineup[curIndex];
      const nextIndex = teamObj.lineup.length > 0 ? (curIndex + 1) % teamObj.lineup.length : curIndex;

      const scoringBases: (0 | 1 | 2)[] = [];
      if (state.bases[2]) scoringBases.push(2);
      if (state.bases[1]) scoringBases.push(1);
      const runsScored = scoringBases.length;
      const scoringRunnerIds = resolveScoringRunners(teamObj, scoringBases, state.baseRunners, curIndex);

      const { lineup: updatedLineup, bench: updatedBench } = recordTeamScoring(
        teamObj,
        scoringRunnerIds,
        batter?.id,
        runsScored, // batter gets runsScored RBIs
        false
      );

      const newLineup = [...updatedLineup];
      if (newLineup[curIndex]) {
        newLineup[curIndex] = {
          ...newLineup[curIndex],
          atBats: [...(newLineup[curIndex].atBats || []), runsScored > 0 ? `二安(${runsScored})` : '二安']
        };
      }

      const curRunners = state.baseRunners || [null, null, null];
      const newBases: [boolean, boolean, boolean] = [false, true, state.bases[0]];
      const newRunners: [string | null, string | null, string | null] = [null, batter?.id || null, curRunners[0]];

      return {
        ...state,
        balls: 0,
        strikes: 0,
        bases: newBases,
        baseRunners: newRunners,
        [teamKey]: { 
          ...teamObj, 
          score: teamObj.score + runsScored, 
          hits: teamObj.hits + 1,
          lineup: newLineup,
          bench: updatedBench,
          currentBatterIndex: nextIndex,
          inningScores: runsScored > 0 ? updateInningScore(teamObj, state.inning, runsScored) : teamObj.inningScores
        }
      };
    }

    case 'TRIPLE': {
      const teamKey = state.isTop ? 'awayTeam' : 'homeTeam';
      const teamObj = state[teamKey];
      const curIndex = teamObj.currentBatterIndex;
      const batter = teamObj.lineup[curIndex];
      const nextIndex = teamObj.lineup.length > 0 ? (curIndex + 1) % teamObj.lineup.length : curIndex;

      const scoringBases: (0 | 1 | 2)[] = [];
      if (state.bases[2]) scoringBases.push(2);
      if (state.bases[1]) scoringBases.push(1);
      if (state.bases[0]) scoringBases.push(0);
      const runsScored = scoringBases.length;
      const scoringRunnerIds = resolveScoringRunners(teamObj, scoringBases, state.baseRunners, curIndex);

      const { lineup: updatedLineup, bench: updatedBench } = recordTeamScoring(
        teamObj,
        scoringRunnerIds,
        batter?.id,
        runsScored, // batter gets runsScored RBIs
        false
      );

      const newLineup = [...updatedLineup];
      if (newLineup[curIndex]) {
        newLineup[curIndex] = {
          ...newLineup[curIndex],
          atBats: [...(newLineup[curIndex].atBats || []), runsScored > 0 ? `三安(${runsScored})` : '三安']
        };
      }

      const newBases: [boolean, boolean, boolean] = [false, false, true];
      const newRunners: [string | null, string | null, string | null] = [null, null, batter?.id || null];

      return {
        ...state,
        balls: 0,
        strikes: 0,
        bases: newBases,
        baseRunners: newRunners,
        [teamKey]: { 
          ...teamObj, 
          score: teamObj.score + runsScored, 
          hits: teamObj.hits + 1,
          lineup: newLineup,
          bench: updatedBench,
          currentBatterIndex: nextIndex,
          inningScores: runsScored > 0 ? updateInningScore(teamObj, state.inning, runsScored) : teamObj.inningScores
        }
      };
    }

    case 'HOME_RUN': {
      const teamKey = state.isTop ? 'awayTeam' : 'homeTeam';
      const teamObj = state[teamKey];
      const curIndex = teamObj.currentBatterIndex;
      const batter = teamObj.lineup[curIndex];
      const nextIndex = teamObj.lineup.length > 0 ? (curIndex + 1) % teamObj.lineup.length : curIndex;

      const scoringBases: (0 | 1 | 2)[] = [];
      if (state.bases[2]) scoringBases.push(2);
      if (state.bases[1]) scoringBases.push(1);
      if (state.bases[0]) scoringBases.push(0);
      const runnersOnBase = scoringBases.length;
      const runsScored = runnersOnBase + 1;
      const scoringRunnerIds = resolveScoringRunners(teamObj, scoringBases, state.baseRunners, curIndex);

      const { lineup: updatedLineup, bench: updatedBench } = recordTeamScoring(
        teamObj,
        scoringRunnerIds,
        batter?.id,
        runsScored, // batter gets all runs as RBI
        true // batter scored +1 run!
      );

      let animationType: 'homerun' | '2-run-homer' | '3-run-homer' | 'grand-slam' = 'homerun';
      if (runnersOnBase === 1) animationType = '2-run-homer';
      else if (runnersOnBase === 2) animationType = '3-run-homer';
      else if (runnersOnBase >= 3) animationType = 'grand-slam';

      const playerName = batter ? (batter.number ? `${batter.name} #${batter.number}` : batter.name) : (state.isTop ? '客隊打者' : '主隊打者');

      const newLineup = [...updatedLineup];
      if (newLineup[curIndex]) {
        newLineup[curIndex] = {
          ...newLineup[curIndex],
          atBats: [...(newLineup[curIndex].atBats || []), `全壘打(${runsScored})`]
        };
      }

      return {
        ...state,
        balls: 0,
        strikes: 0,
        bases: [false, false, false],
        baseRunners: [null, null, null],
        [teamKey]: { 
          ...teamObj, 
          score: teamObj.score + runsScored, 
          hits: teamObj.hits + 1,
          lineup: newLineup,
          bench: updatedBench,
          currentBatterIndex: nextIndex,
          inningScores: updateInningScore(teamObj, state.inning, runsScored)
        },
        animation: {
          type: animationType,
          playerName,
          teamName: teamObj.name || (state.isTop ? '客隊' : '主隊'),
          teamColor: teamObj.color || '#3b82f6',
          bubbleKey: Date.now()
        }
      };
    }

    case 'WILD_PITCH': {
      const battingTeamKey = state.isTop ? 'awayTeam' : 'homeTeam';
      const fieldingTeamKey = state.isTop ? 'homeTeam' : 'awayTeam';
      const battingTeam = state[battingTeamKey];
      const fieldingTeam = state[fieldingTeamKey];
      const curRunners = state.baseRunners || [null, null, null];
      
      let newBases = [...state.bases] as [boolean, boolean, boolean];
      let newRunners = [...curRunners] as [string | null, string | null, string | null];
      let runsScored = 0;
      let scoringRunnerIds: (string | null)[] = [];
      
      if (newBases[2]) {
        runsScored = 1;
        scoringRunnerIds = resolveScoringRunners(battingTeam, [2], state.baseRunners, battingTeam.currentBatterIndex);
        newBases[2] = false;
        newRunners[2] = null;
      }
      if (newBases[1]) {
        newBases[2] = true;
        newRunners[2] = newRunners[1];
        newBases[1] = false;
        newRunners[1] = null;
      }
      if (newBases[0]) {
        newBases[1] = true;
        newRunners[1] = newRunners[0];
        newBases[0] = false;
        newRunners[0] = null;
      }

      // Increment errors (+1) on the fielding (defending) team for WP and PB (Balk does not count as error)
      const isError = action.subType !== 'BK';
      const updatedFieldingTeam = {
        ...fieldingTeam,
        errors: isError ? (fieldingTeam.errors || 0) + 1 : fieldingTeam.errors
      };

      if (runsScored > 0) {
        const { lineup: updatedLineup, bench: updatedBench } = recordTeamScoring(
          battingTeam,
          scoringRunnerIds,
          undefined, // no batter RBI on wild pitch / passed ball
          0,
          false
        );

        return {
          ...state,
          bases: newBases,
          baseRunners: newRunners,
          [battingTeamKey]: {
            ...battingTeam,
            score: battingTeam.score + runsScored,
            lineup: updatedLineup,
            bench: updatedBench,
            inningScores: updateInningScore(battingTeam, state.inning, runsScored)
          },
          [fieldingTeamKey]: updatedFieldingTeam
        };
      }
      
      return {
        ...state,
        bases: newBases,
        baseRunners: newRunners,
        [fieldingTeamKey]: updatedFieldingTeam
      };
    }

    case 'EXIT_HR_ANIMATION':
      if (state.animation) {
        return { ...state, animation: { ...state.animation, isLocked: false, isExiting: true } };
      }
      return state;

    case 'LOCK_HR_ANIMATION':
      if (state.animation) {
        return { ...state, animation: { ...state.animation, isLocked: true } };
      }
      return state;

    case 'TRIGGER_HR_BUBBLE':
      if (state.animation) {
        return { ...state, animation: { ...state.animation, bubbleKey: (state.animation.bubbleKey || 0) + 1 } };
      }
      return state;

    case 'SET_ANIMATION':
      return { ...state, animation: action.animation };

    case 'NEXT_INNING': {
      const currentTeamKey = state.isTop ? 'awayTeam' : 'homeTeam';
      const currentTeamObj = state[currentTeamKey];
      const currentInningIdx = state.inning - 1;
      
      const newInningScores = [...currentTeamObj.inningScores];
      if (newInningScores[currentInningIdx] === null || newInningScores[currentInningIdx] === undefined) {
         newInningScores[currentInningIdx] = 0;
      }
      
      return { 
        ...state, 
        [currentTeamKey]: {
          ...currentTeamObj,
          inningScores: newInningScores
        },
        isTop: !state.isTop, 
        inning: state.isTop ? state.inning : state.inning + 1,
        balls: 0, strikes: 0, outs: 0, bases: [false, false, false],
        isTimerRunning: false,
        timer: state.initialTimer || 20
      };
    }

    case 'THREE_UP_THREE_DOWN': {
      const currentTeamKey = state.isTop ? 'awayTeam' : 'homeTeam';
      const currentTeamObj = state[currentTeamKey];
      const currentInningIdx = state.inning - 1;
      
      const newInningScores = [...currentTeamObj.inningScores];
      if (newInningScores[currentInningIdx] === null || newInningScores[currentInningIdx] === undefined) {
         newInningScores[currentInningIdx] = 0;
      }

      // Next batter advances by remaining outs to complete 3
      const remainingOuts = Math.max(1, 3 - state.outs);
      const nextIndex = currentTeamObj.lineup.length > 0 
        ? (currentTeamObj.currentBatterIndex + remainingOuts) % currentTeamObj.lineup.length
        : currentTeamObj.currentBatterIndex;
      
      return { 
        ...state, 
        [currentTeamKey]: {
          ...currentTeamObj,
          currentBatterIndex: nextIndex,
          inningScores: newInningScores
        },
        isTop: !state.isTop, 
        inning: state.isTop ? state.inning : state.inning + 1,
        balls: 0, strikes: 0, outs: 0, bases: [false, false, false],
        isTimerRunning: false,
        timer: state.initialTimer || 20
      };
    }

    case 'PREVIOUS_HALF_INNING':
      return {
        ...state,
        isTop: !state.isTop,
        inning: !state.isTop ? state.inning : Math.max(1, state.inning - 1),
      };

    case 'NEXT_FULL_INNING':
      return {
        ...state,
        inning: state.inning + 1,
      };

    case 'PREVIOUS_FULL_INNING':
      return {
        ...state,
        inning: Math.max(1, state.inning - 1),
      };

    case 'SET_INNING':
       return { ...state, inning: action.value };

    case 'UPDATE_PLAYER': {
      const teamKey = action.team === 'home' ? 'homeTeam' : 'awayTeam';
      const prevPlayer = state[teamKey][action.role as 'pitcher'];
      const updatedPlayer: Player = { 
        ...prevPlayer, 
        [action.field]: action.value 
      };
      if (action.role === 'pitcher') {
        if (action.field === 'stat') {
          const num = parseInt(String(action.value || '').replace(/[^0-9]/g, ''), 10);
          if (!isNaN(num)) updatedPlayer.pitchCount = num;
        } else if (action.field === 'pitchCount') {
          updatedPlayer.stat = String(action.value);
        }
      }
      return { 
        ...state, 
        [teamKey]: { 
          ...state[teamKey], 
          [action.role]: updatedPlayer
        } 
      };
    }

    case 'INCREMENT_PLAYER_STAT':
      if (action.role === 'pitcher') {
        const pitchingTeam = state.isTop ? 'homeTeam' : 'awayTeam';
        const curPitcher = state[pitchingTeam].pitcher;
        const currentPitches = getPitcherCount(curPitcher);
        const nextPitches = currentPitches + 1;
        return { 
          ...state, 
          [pitchingTeam]: { 
            ...state[pitchingTeam], 
            pitcher: { 
              ...curPitcher, 
              stat: String(nextPitches),
              pitchCount: nextPitches
            } 
          } 
        };
      }
      return state;

    case 'DECREMENT_PLAYER_STAT':
      if (action.role === 'pitcher') {
        const pitchingTeam = state.isTop ? 'homeTeam' : 'awayTeam';
        const curPitcher = state[pitchingTeam].pitcher;
        const currentPitches = getPitcherCount(curPitcher);
        const nextPitches = Math.max(0, currentPitches - 1);
        return { 
          ...state, 
          [pitchingTeam]: { 
            ...state[pitchingTeam], 
            pitcher: { 
              ...curPitcher, 
              stat: String(nextPitches),
              pitchCount: nextPitches
            } 
          } 
        };
      }
      return state;

    case 'SET_PITCH_COUNT': {
      const pitchingTeam = action.team ? (action.team === 'home' ? 'homeTeam' : 'awayTeam') : (state.isTop ? 'homeTeam' : 'awayTeam');
      const curPitcher = state[pitchingTeam].pitcher;
      const count = Math.max(0, action.value || 0);
      return {
        ...state,
        [pitchingTeam]: {
          ...state[pitchingTeam],
          pitcher: {
            ...curPitcher,
            stat: String(count),
            pitchCount: count
          }
        }
      };
    }

    case 'SUBSTITUTE_PITCHER': {
      const teamKey = action.team === 'home' ? 'homeTeam' : 'awayTeam';
      const teamObj = state[teamKey];
      const incomingPitcher = teamObj.bench[action.benchIndex];
      if (!incomingPitcher) return state;

      const opponentTeamKey = action.team === 'home' ? 'awayTeam' : 'homeTeam';
      const opponentLineup = state[opponentTeamKey].lineup;
      const totalOpponentAtBats = opponentLineup.reduce((acc, pl) => acc + (pl.atBats?.length || 0), 0);
      const isPitchingNow = action.team === 'home' ? state.isTop : !state.isTop;
      const prevBf = (teamObj.pitcherHistory || []).reduce((acc, p) => acc + (p.battersFaced || 0), 0);
      const outgoingPitcherBf = (typeof teamObj.pitcher.battersFaced === 'number' && teamObj.pitcher.battersFaced > 0)
        ? teamObj.pitcher.battersFaced
        : Math.max(0, totalOpponentAtBats - prevBf + (isPitchingNow ? 1 : 0));

      const outgoingPitcher: Player = {
        ...teamObj.pitcher,
        isStarter: !(teamObj.pitcherHistory && teamObj.pitcherHistory.length > 0),
        battersFaced: outgoingPitcherBf
      };

      const newHistory = [...(teamObj.pitcherHistory || []), outgoingPitcher];
      const newBench = [...teamObj.bench];
      newBench[action.benchIndex] = { ...outgoingPitcher, position: 'BN' };

      const newPitcher: Player = {
        ...incomingPitcher,
        position: 'P',
        stat: '0',
        pitchCount: 0,
        inningsPitched: '0.0',
        strikeouts: 0,
        hitsAllowed: 0,
        runsAllowed: 0,
        earnedRuns: 0,
        walks: 0,
        battersFaced: undefined
      };

      return {
        ...state,
        [teamKey]: {
          ...teamObj,
          pitcher: newPitcher,
          pitcherHistory: newHistory,
          bench: newBench
        }
      };
    }

    case 'UPDATE_TEAM': {
      const teamKey = action.team === 'home' ? 'homeTeam' : 'awayTeam';
      const newSettingsVer = (state.meta.settingsVersion || 0) + 1;
      if ('data' in action && (action as any).data) {
        return { 
          ...state, 
          [teamKey]: { ...state[teamKey], ...(action as any).data },
          meta: { ...state.meta, settingsVersion: newSettingsVer }
        };
      }
      if (action.field) {
        if (action.field === 'pitcher' && action.value) {
          const cur = state[teamKey].pitcher;
          const newHistory = (cur && cur.name && cur.name !== action.value.name)
            ? [...(state[teamKey].pitcherHistory || []), { ...cur, isStarter: !(state[teamKey].pitcherHistory && state[teamKey].pitcherHistory.length > 0) }]
            : (state[teamKey].pitcherHistory || []);
          return {
            ...state,
            [teamKey]: {
              ...state[teamKey],
              pitcher: action.value,
              pitcherHistory: newHistory
            },
            meta: { ...state.meta, settingsVersion: newSettingsVer }
          };
        }
        return { 
          ...state, 
          [teamKey]: { ...state[teamKey], [action.field]: action.value },
          meta: { ...state.meta, settingsVersion: newSettingsVer }
        };
      }
      return state;
    }

    case 'APPLY_TEAM_CONFIG': {
      const teamKey = action.team === 'home' ? 'homeTeam' : 'awayTeam';
      const newConfig = { ...action.config };
      if (newConfig.pitcher) {
        const count = getPitcherCount(newConfig.pitcher);
        newConfig.pitcher = {
          ...newConfig.pitcher,
          pitchCount: count,
          stat: String(count)
        };
      }
      if (newConfig.lineup.length > 0 && newConfig.currentBatterIndex >= newConfig.lineup.length) {
        newConfig.currentBatterIndex = newConfig.lineup.length - 1;
      }
      return { 
        ...state, 
        [teamKey]: { ...state[teamKey], ...newConfig },
        meta: { ...state.meta, settingsVersion: (state.meta.settingsVersion || 0) + 1 }
      };
    }

    case 'UPDATE_PITCH':
      return { ...state, currentPitch: { ...state.currentPitch, [action.field]: action.value } };
    
    case 'UPDATE_META':
      return { 
        ...state, 
        meta: { 
          ...state.meta, 
          [action.field]: action.value,
          settingsVersion: (state.meta.settingsVersion || 0) + 1
        } 
      };

    case 'SET_TIMER':
      return { ...state, timer: action.value, initialTimer: action.value };
    
    case 'TOGGLE_TIMER':
      return { ...state, isTimerRunning: !state.isTimerRunning };
      
    case 'RESET_TIMER':
      return { ...state, timer: state.initialTimer, isTimerRunning: false };
    
    case 'DECREMENT_TIMER':
      return { ...state, timer: Math.max(0, state.timer - 1) };

    case 'TOGGLE_VISIBILITY':
      return { ...state, [action.field]: !state[action.field] };

    case 'SET_VISIBILITY':
      return { ...state, [action.field]: action.value };

    case 'NEXT_BATTER': {
      const isTop = state.isTop;
      const tKey = isTop ? 'awayTeam' : 'homeTeam';
      const teamObj = state[tKey];
      if (teamObj.lineup.length === 0) return state;

      const nextIndex = (teamObj.currentBatterIndex + 1) % teamObj.lineup.length;

      return {
        ...state,
        [tKey]: { ...teamObj, currentBatterIndex: nextIndex }
      };
    }

    case 'PREVIOUS_BATTER': {
      const isTop = state.isTop;
      const tKey = isTop ? 'awayTeam' : 'homeTeam';
      const teamObj = state[tKey];
      if (teamObj.lineup.length === 0) return state;

      const prevIndex = (teamObj.currentBatterIndex - 1 + teamObj.lineup.length) % teamObj.lineup.length;

      return {
        ...state,
        [tKey]: { ...teamObj, currentBatterIndex: prevIndex }
      };
    }

    case 'SET_BATTER': {
      const tKey = action.team === 'home' ? 'homeTeam' : 'awayTeam';
      const teamObj = state[tKey];
      if (!teamObj.lineup[action.index]) return state;

      return {
        ...state,
        [tKey]: { ...teamObj, currentBatterIndex: action.index }
      };
    }

    case 'ADD_PLAYER_TO_LINEUP': {
      const tKey = action.team === 'home' ? 'homeTeam' : 'awayTeam';
      const newPlayer: Player = { id: generateId(), name: 'NAME', number: '00', stat: '.000', position: 'DH' };
      return {
        ...state,
        [tKey]: { ...state[tKey], lineup: [...state[tKey].lineup, newPlayer] }
      };
    }

    case 'UPDATE_LINEUP_PLAYER': {
      const tKey = action.team === 'home' ? 'homeTeam' : 'awayTeam';
      const newLineup = [...state[tKey].lineup];
      if (newLineup[action.index]) {
        let val = action.value;
        if (action.field === 'position' && typeof val === 'string') {
          if (val.trim() === '代打' || val.trim().toLowerCase() === 'ph') val = 'PH';
          else if (val.trim() === '代跑' || val.trim().toLowerCase() === 'pr') val = 'PR';
        }
        newLineup[action.index] = { ...newLineup[action.index], [action.field]: val };
      }
      return {
        ...state,
        [tKey]: { ...state[tKey], lineup: newLineup }
      };
    }

    case 'REMOVE_PLAYER_FROM_LINEUP': {
      const tKey = action.team === 'home' ? 'homeTeam' : 'awayTeam';
      const newLineup = state[tKey].lineup.filter((_, i) => i !== action.index);
      return {
        ...state,
        [tKey]: { ...state[tKey], lineup: newLineup }
      };
    }

    case 'MOVE_TO_BENCH': {
      const tKey = action.team === 'home' ? 'homeTeam' : 'awayTeam';
      const player = state[tKey].lineup[action.index];
      if (!player) return state;
      const newLineup = state[tKey].lineup.filter((_, i) => i !== action.index);
      const newBench = [...state[tKey].bench, player];
      return {
        ...state,
        [tKey]: { ...state[tKey], lineup: newLineup, bench: newBench }
      };
    }

    case 'MOVE_TO_LINEUP': {
      const tKey = action.team === 'home' ? 'homeTeam' : 'awayTeam';
      const player = state[tKey].bench[action.index];
      if (!player) return state;
      const newBench = state[tKey].bench.filter((_, i) => i !== action.index);
      const newLineup = [...state[tKey].lineup, { ...player, position: 'PH' }];
      return {
        ...state,
        [tKey]: { ...state[tKey], lineup: newLineup, bench: newBench }
      };
    }

    case 'REORDER_LINEUP': {
      const tKey = action.team === 'home' ? 'homeTeam' : 'awayTeam';
      const newLineup = [...state[tKey].lineup];
      const [removed] = newLineup.splice(action.startIndex, 1);
      newLineup.splice(action.endIndex, 0, removed);
      return {
        ...state,
        [tKey]: { ...state[tKey], lineup: newLineup }
      };
    }

    case 'REORDER_BENCH': {
      const tKey = action.team === 'home' ? 'homeTeam' : 'awayTeam';
      const newBench = [...state[tKey].bench];
      const [removed] = newBench.splice(action.startIndex, 1);
      newBench.splice(action.endIndex, 0, removed);
      return {
        ...state,
        [tKey]: { ...state[tKey], bench: newBench }
      };
    }

    case 'ADD_PLAYER_TO_BENCH': {
      const tKey = action.team === 'home' ? 'homeTeam' : 'awayTeam';
      const newPlayer: Player = {
        id: Math.random().toString(36).substring(2, 9),
        name: action.player?.name || `Bench ${state[tKey].bench.length + 1}`,
        number: action.player?.number || '00',
        stat: action.player?.stat || '.000',
        position: action.player?.position || 'BN'
      };
      return {
        ...state,
        [tKey]: {
          ...state[tKey],
          bench: [...state[tKey].bench, newPlayer]
        }
      };
    }

    case 'UPDATE_BENCH_PLAYER': {
      const tKey = action.team === 'home' ? 'homeTeam' : 'awayTeam';
      const newBench = [...state[tKey].bench];
      if (newBench[action.index]) {
        newBench[action.index] = { ...newBench[action.index], [action.field]: action.value };
      }
      return {
        ...state,
        [tKey]: { ...state[tKey], bench: newBench }
      };
    }

    case 'REMOVE_PLAYER_FROM_BENCH': {
      const tKey = action.team === 'home' ? 'homeTeam' : 'awayTeam';
      const newBench = state[tKey].bench.filter((_, i) => i !== action.index);
      return {
        ...state,
        [tKey]: { ...state[tKey], bench: newBench }
      };
    }

    case 'SWAP_LINEUP_BENCH': {
      const tKey = action.team === 'home' ? 'homeTeam' : 'awayTeam';
      const lineupPlayer = state[tKey].lineup[action.lineupIndex];
      const benchPlayer = state[tKey].bench[action.benchIndex];
      if (!lineupPlayer || !benchPlayer) return state;

      const newLineup = [...state[tKey].lineup];
      const newBench = [...state[tKey].bench];
      
      // Preserve original player / previous players history for this batting order slot
      const prevPlayers = lineupPlayer.previousPlayers && lineupPlayer.previousPlayers.length > 0
        ? [...lineupPlayer.previousPlayers, { ...lineupPlayer, previousPlayers: undefined, isStarter: false }]
        : [{ ...lineupPlayer, previousPlayers: undefined, isStarter: true }];

      // 換代打的時候 守位要自動改成PH
      const substitutedPlayer: Player = { 
        ...benchPlayer, 
        position: 'PH',
        isStarter: false,
        previousPlayers: prevPlayers
      };

      newLineup[action.lineupIndex] = substitutedPlayer;
      newBench[action.benchIndex] = { ...lineupPlayer, position: 'BN', previousPlayers: undefined };

      return {
        ...state,
        [tKey]: { ...state[tKey], lineup: newLineup, bench: newBench }
      };
    }

    case 'SET_INNING_SCORE': {
      const tKey = action.team === 'home' ? 'homeTeam' : 'awayTeam';
      const newInningScores = [...state[tKey].inningScores];
      while (newInningScores.length <= action.inningIndex) {
        newInningScores.push(null);
      }
      newInningScores[action.inningIndex] = action.score;
      const totalScore = newInningScores.reduce<number>((sum, val) => sum + (val || 0), 0);
      return {
        ...state,
        [tKey]: {
          ...state[tKey],
          score: totalScore,
          inningScores: newInningScores
        }
      };
    }

    case 'RECORD_AT_BAT': {
      const teamKey = (action.team ? (action.team === 'home' ? 'homeTeam' : 'awayTeam') : (state.isTop ? 'awayTeam' : 'homeTeam'));
      const teamObj = state[teamKey];
      const pIdx = action.playerIndex !== undefined ? action.playerIndex : teamObj.currentBatterIndex;
      const newLineup = [...teamObj.lineup];
      if (newLineup[pIdx]) {
        const curPlayer = newLineup[pIdx];
        let rbi = action.rbi;
        let runs = action.runs;
        if (rbi === undefined) {
          const m = action.result.match(/[\(（]\s*(\d+)\s*[\)）]/);
          if (m) {
            rbi = parseInt(m[1], 10);
          } else if (action.result.includes('全壘打') || action.result.includes('HR')) {
            rbi = 1;
          }
        }
        if (runs === undefined && (action.result.includes('全壘打') || action.result.includes('HR'))) {
          runs = 1;
        }
        newLineup[pIdx] = {
          ...curPlayer,
          atBats: [...(curPlayer.atBats || []), action.result],
          rbi: (curPlayer.rbi || 0) + (rbi || 0),
          runs: (curPlayer.runs || 0) + (runs || 0)
        };
      }
      return {
        ...state,
        [teamKey]: {
          ...teamObj,
          lineup: newLineup
        }
      };
    }

    case 'ADJUST_PLAYER_SCORE': {
      const teamKey = action.team === 'home' ? 'homeTeam' : 'awayTeam';
      const teamObj = state[teamKey];
      const newLineup = [...teamObj.lineup];
      if (newLineup[action.index]) {
        const p = newLineup[action.index];
        const curVal = p[action.field] || 0;
        newLineup[action.index] = {
          ...p,
          [action.field]: Math.max(0, curVal + action.amount)
        };
      }
      return {
        ...state,
        [teamKey]: {
          ...teamObj,
          lineup: newLineup
        }
      };
    }

    case 'CLEAR_ALL_AT_BATS': {
      return {
        ...state,
        awayTeam: {
          ...state.awayTeam,
          lineup: state.awayTeam.lineup.map(p => ({ ...p, atBats: [] })),
          bench: state.awayTeam.bench.map(p => ({ ...p, atBats: [] }))
        },
        homeTeam: {
          ...state.homeTeam,
          lineup: state.homeTeam.lineup.map(p => ({ ...p, atBats: [] })),
          bench: state.homeTeam.bench.map(p => ({ ...p, atBats: [] }))
        }
      };
    }

    case 'SET_DISPLAY_MODE':
      return { ...state, displayMode: action.mode };
      
    case 'TOGGLE_DISPLAY_MODE': {
      const modes: ('default' | 'lineup' | 'rhe' | 'broadcast')[] = ['default', 'lineup', 'rhe', 'broadcast'];
      const currentIndex = modes.indexOf(state.displayMode);
      const nextMode = modes[(currentIndex + 1) % modes.length];
      return { ...state, displayMode: nextMode };
    }

    case 'TOGGLE_LINEUP_MODE':
      return { ...state, displayMode: state.displayMode === 'lineup' ? 'default' : 'lineup' };
      
    case 'TOGGLE_RHE_MODE':
      return { ...state, displayMode: state.displayMode === 'rhe' ? 'default' : 'rhe' };
      
    case 'TOGGLE_BROADCAST_MODE':
      return { ...state, displayMode: state.displayMode === 'broadcast' ? 'default' : 'broadcast' };
      
    case 'TOGGLE_ADJUSTMENT_MODE':
      return { 
        ...state, 
        isAdjustmentMode: !state.isAdjustmentMode,
        displayMode: !state.isAdjustmentMode ? 'broadcast' : state.displayMode
      };
      
    case 'FULL_RESET':
      return JSON.parse(JSON.stringify(INITIAL_STATE));
      
    case 'REPLACE_STATE':
      if (action.state) {
        return {
          ...INITIAL_STATE,
          ...action.state,
          pitcher: action.state.pitcher ?? INITIAL_STATE.pitcher,
          currentPitch: action.state.currentPitch ?? INITIAL_STATE.currentPitch,
          timer: action.state.timer ?? INITIAL_STATE.timer,
          initialTimer: action.state.initialTimer ?? INITIAL_STATE.initialTimer,
          isTimerRunning: action.state.isTimerRunning ?? INITIAL_STATE.isTimerRunning,
          showCount: action.state.showCount ?? INITIAL_STATE.showCount,
          showTimer: action.state.showTimer ?? INITIAL_STATE.showTimer,
          showBatterInfo: action.state.showBatterInfo ?? INITIAL_STATE.showBatterInfo,
          showPitcherInfo: action.state.showPitcherInfo ?? INITIAL_STATE.showPitcherInfo,
          showPitchInfo: action.state.showPitchInfo ?? INITIAL_STATE.showPitchInfo,
          showPlayerStat: action.state.showPlayerStat ?? INITIAL_STATE.showPlayerStat,
          displayMode: action.state.displayMode ?? state.displayMode,
          animation: action.state.animation ?? INITIAL_STATE.animation,
          meta: {
            ...INITIAL_STATE.meta,
            ...(action.state.meta || {})
          }
        };
      }
      return state;

    default:
      return state;
  }
}
