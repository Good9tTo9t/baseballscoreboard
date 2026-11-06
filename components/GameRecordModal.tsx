import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Save, FileText, Download, Upload, Printer, Copy, Check, 
  Edit2, Trash2, Plus, Minus, Calendar, Trophy, ChevronRight, ChevronLeft,
  Share2, RotateCcw, History, User, ListOrdered, Sparkles, CheckCircle2,
  Search, CornerDownLeft, FileSpreadsheet, AlertTriangle, Layers, Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { GameState, Team, Player, SavedGameRecord, PlateAppearanceRecord } from '../types';
import { getPitcherCount } from '../reducer';

interface GameRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: GameState;
  dispatch: React.Dispatch<any>;
  language: 'en' | 'zh' | 'ja';
}

const STORAGE_KEY = 'baseball_game_records_archive';

export const AT_BAT_OUTCOMES_CATEGORIES = [
  {
    key: 'hits',
    category: '安打 / 長打 (Hits)',
    color: 'emerald',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    items: [
      { id: '一安', label: '一壘安打 (1B)', full: '一壘安打 (Single)' },
      { id: '二安', label: '二壘安打 (2B)', full: '二壘安打 (Double)' },
      { id: '三安', label: '三壘安打 (3B)', full: '三壘安打 (Triple)' },
      { id: '全壘打', label: '全壘打', full: '全壘打 (Home Run)' },
      { id: '場內全', label: '場內全', full: '場內全壘打 (Inside-the-park HR)' },
      { id: '內安', label: '內野安打 (IFH)', full: '內野安打 (Infield Hit)' },
    ]
  },
  {
    key: 'walks',
    category: '四死球 / 上壘 (Walks & Safe)',
    color: 'sky',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    items: [
      { id: '四壞', label: '四壞保送 (BB)', full: '四壞球保送 (Base on Balls)' },
      { id: '觸身', label: '觸身球 (HBP)', full: '觸身球保送 (Hit by Pitch)' },
      { id: '敬遠', label: '故意四壞 (IBB)', full: '故意四壞保送 (Intentional Walk)' },
      { id: '不死', label: '不死', full: '不死三振上壘 (Dropped 3rd Strike)' },
      { id: '野選', label: '野手選擇 (FC)', full: '野手選擇上壘 (Fielder Choice)' },
      { id: '失誤', label: '守備失誤 (E)', full: '守備失誤上壘 (Error)' },
      { id: '妨礙打擊', label: '妨礙打擊 (CI)', full: '妨礙打擊上壘 (Catcher Interference)' },
    ]
  },
  {
    key: 'outs',
    category: '出局 / 三振 (Outs & Ks)',
    color: 'rose',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    items: [
      { id: '三振', label: '揮空三振 (K)', full: '揮棒落空三振 (Strikeout Swinging)' },
      { id: '見三振', label: '見定三振 (ꓘ)', full: '站著看好球三振 (Strikeout Looking)' },
      { id: '滾地', label: '滾地出局 (GO)', full: '滾地球出局 (Groundout)' },
      { id: '高飛', label: '高飛出局 (FO)', full: '外野高飛出局 (Flyout)' },
      { id: '平飛', label: '平飛出局 (LO)', full: '平飛球出局 (Lineout)' },
      { id: '內飛', label: '內野高飛 (IFF)', full: '內野高飛必死球 (Infield Fly)' },
      { id: '界外飛', label: '界外接殺 (FFO)', full: '界外球接殺出局 (Foul Flyout)' },
      { id: '雙殺', label: '雙殺打 (DP/GDP)', full: '雙殺打 (Double Play)' },
      { id: '三殺', label: '三殺打 (TP/GTP)', full: '三殺打 (Triple Play)' },
      { id: '妨礙守備', label: '妨礙守備', full: '妨礙守備出局 (Interference Out)' },
      { id: '出局', label: '一般出局 (OUT)', full: '一般出局 (Generic Out)' },
    ]
  },
  {
    key: 'pos_outs',
    category: '守位出局細項 (Positional Outs)',
    color: 'purple',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    items: [
      { id: '投滾', label: '投手滾地 (1-3)', full: '投手滾地球出局 (1-3)' },
      { id: '捕滾', label: '捕手滾地 (2-3)', full: '捕手滾地球出局 (2-3)' },
      { id: '一滾', label: '一壘滾地 (3-1)', full: '一壘滾地球出局 (3-1 / 3U)' },
      { id: '二滾', label: '二壘滾地 (4-3)', full: '二壘滾地球出局 (4-3)' },
      { id: '三滾', label: '三壘滾地 (5-3)', full: '三壘滾地球出局 (5-3)' },
      { id: '游滾', label: '游擊滾地 (6-3)', full: '游擊滾地球出局 (6-3)' },
      { id: '左飛', label: '左外飛球 (F7)', full: '左外野高飛接殺 (F7)' },
      { id: '中飛', label: '中外飛球 (F8)', full: '中外野高飛接殺 (F8)' },
      { id: '右飛', label: '右外飛球 (F9)', full: '右外野高飛接殺 (F9)' },
      { id: '捕飛', label: '捕手飛球 (F2)', full: '捕手界外/飛球接殺 (F2)' },
      { id: '一飛', label: '一壘飛球 (F3)', full: '一壘平飛/飛球接殺 (F3)' },
      { id: '二飛', label: '二壘飛球 (F4)', full: '二壘平飛/飛球接殺 (F4)' },
      { id: '三飛', label: '三壘飛球 (F5)', full: '三壘平飛/飛球接殺 (F5)' },
      { id: '游飛', label: '游擊飛球 (F6)', full: '游擊平飛/飛球接殺 (F6)' },
    ]
  },
  {
    key: 'sac',
    category: '戰術 / 推進 (Sacrifices)',
    color: 'teal',
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    items: [
      { id: '犧打', label: '犧牲短打 (SAC)', full: '犧牲觸擊短打 (Sacrifice Bunt)' },
      { id: '犧飛', label: '犧牲飛球 (SF)', full: '外野犧牲飛球 (Sacrifice Fly)' },
    ]
  }
];

export const getOutcomeBadgeStyle = (outcome: string) => {
  if (!outcome || outcome === '-' || outcome === '未登場') {
    return 'bg-slate-800 text-slate-400 border-slate-700';
  }
  // 不死 -> 紫色
  if (outcome.includes('不死')) {
    return 'bg-purple-900/60 text-purple-200 border-purple-500/50';
  }
  // 全壘打 -> 黃色
  if (outcome.includes('全壘打') || outcome.includes('場內全') || outcome.includes('HR')) {
    return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50 font-black';
  }
  // 安打 -> 綠色
  if (outcome.includes('安') || outcome.includes('1B') || outcome.includes('2B') || outcome.includes('3B') || outcome.includes('Hit')) {
    return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold';
  }
  // 三振 雙殺 -> 紅色
  if (outcome.includes('三振') || outcome.includes('雙殺') || outcome.includes('三殺') || outcome.includes('DP') || outcome.includes('TP') || outcome.includes('K') || outcome.includes('ꓘ') || outcome.includes('SO')) {
    return 'bg-rose-500/20 text-rose-300 border-rose-500/50 font-bold';
  }
  // 犧牲打 (犧打、犧飛) -> 藍綠色
  if (outcome.includes('犧') || outcome.includes('SAC') || outcome.includes('SF')) {
    return 'bg-teal-500/20 text-teal-300 border-teal-500/50 font-bold';
  }
  // 四 死 (四壞、四球、觸身、敬遠、保送) -> 藍色
  if (outcome.includes('四壞') || outcome.includes('四球') || outcome.includes('觸身') || outcome.includes('敬遠') || outcome.includes('保送') || outcome.includes('BB') || outcome.includes('HBP') || outcome.includes('IBB')) {
    return 'bg-blue-500/20 text-blue-300 border-blue-500/50 font-bold';
  }
  // 滾地 高飛 失誤 -> 灰色
  if (outcome.includes('滾') || outcome.includes('飛') || outcome.includes('失誤') || outcome.includes('野選') || outcome.includes('出局') || outcome.includes('GO') || outcome.includes('FO') || outcome.includes('LO') || outcome.includes('E')) {
    return 'bg-slate-700/60 text-slate-300 border-slate-600/60 font-semibold';
  }
  return 'bg-slate-800 text-slate-300 border-slate-700';
};

export const GameRecordModal: React.FC<GameRecordModalProps> = ({
  isOpen,
  onClose,
  state,
  dispatch,
  language
}) => {
  const [activeTab, setActiveTab] = useState<'boxscore' | 'playbyplay' | 'edit' | 'archive' | 'export'>('boxscore');
  const [selectedInningFilter, setSelectedInningFilter] = useState<number | 'all'>('all');
  const [activeTeamTab, setActiveTeamTab] = useState<'away' | 'home'>('away');
  const [savedRecords, setSavedRecords] = useState<SavedGameRecord[]>([]);
  const [recordTitle, setRecordTitle] = useState('');
  const [recordNotes, setRecordNotes] = useState('');
  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [expandedPaIds, setExpandedPaIds] = useState<Record<string, boolean>>({});

  // Edit draft states
  const [editingAwayTeam, setEditingAwayTeam] = useState<Team>(() => JSON.parse(JSON.stringify(state.awayTeam)));
  const [editingHomeTeam, setEditingHomeTeam] = useState<Team>(() => JSON.parse(JSON.stringify(state.homeTeam)));
  const [isSavedNotify, setIsSavedNotify] = useState(false);
  const [selectedAtBat, setSelectedAtBat] = useState<{
    playerIndex: number;
    abIndex: number | 'new';
    current: string;
    prevIndex?: number;
  } | null>(null);
  const [outcomeFilterCategory, setOutcomeFilterCategory] = useState<string>('all');
  const [outcomeSearchQuery, setOutcomeSearchQuery] = useState<string>('');
  const [customOutcomeInput, setCustomOutcomeInput] = useState<string>('');
  const [isConfirmClearPbp, setIsConfirmClearPbp] = useState(false);

  useEffect(() => {
    setSelectedAtBat(null);
    setOutcomeSearchQuery('');
    setCustomOutcomeInput('');
    setIsConfirmClearPbp(false);
  }, [isOpen, activeTab, activeTeamTab]);

  // Sync draft states when modal opens
  useEffect(() => {
    if (isOpen) {
      setEditingAwayTeam(JSON.parse(JSON.stringify(state.awayTeam)));
      setEditingHomeTeam(JSON.parse(JSON.stringify(state.homeTeam)));
      setRecordTitle(`${state.awayTeam.name} vs ${state.homeTeam.name} (${new Date().toLocaleDateString()})`);
      loadSavedRecords();
    }
  }, [isOpen]);

  const loadSavedRecords = () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        setSavedRecords(JSON.parse(data));
      } else {
        setSavedRecords([]);
      }
    } catch (e) {
      console.error('Failed to load saved records:', e);
    }
  };

  const saveCurrentGame = () => {
    try {
      const newRecord: SavedGameRecord = {
        id: `game-${Date.now()}`,
        title: recordTitle.trim() || `${state.awayTeam.name} vs ${state.homeTeam.name}`,
        date: new Date().toLocaleString(),
        awayTeamName: state.awayTeam.name,
        homeTeamName: state.homeTeam.name,
        awayScore: state.awayTeam.score,
        homeScore: state.homeTeam.score,
        totalInnings: state.inning,
        gameState: JSON.parse(JSON.stringify(state)),
        createdAt: Date.now(),
        notes: recordNotes.trim()
      };

      const updated = [newRecord, ...savedRecords];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSavedRecords(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) {
      console.error('Failed to save game record:', e);
    }
  };

  const deleteRecord = (id: string) => {
    if (confirm(language === 'zh' ? '確定要刪除這筆歷史紀錄嗎？' : 'Delete this record?')) {
      const updated = savedRecords.filter(r => r.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setSavedRecords(updated);
    }
  };

  const loadRecordToBoard = (record: SavedGameRecord) => {
    if (confirm(language === 'zh' ? '確定要將此場紀錄載入至計分板嗎？這將會取代當前比賽畫面。' : 'Load this game record to the scoreboard? This will replace current game.')) {
      dispatch({ type: 'REPLACE_STATE', state: record.gameState });
      onClose();
    }
  };

  // Compute player batting stats
  const getPlayerBattingStats = (p: Player) => {
    const atBats = p.atBats || [];
    let hits = p.hits ?? 0;
    let walks = p.walks ?? 0;
    let strikeouts = p.strikeouts ?? 0;
    let runs = p.runs ?? 0;
    let rbi = p.rbi ?? 0;

    const isWalk = (ab: string) => 
      ab.includes('四壞') || ab.includes('四球') || ab.includes('觸身') || ab.includes('敬遠') || 
      ab.includes('保送') || ab.includes('BB') || ab.includes('HBP') || ab.includes('IBB');

    const isHit = (ab: string) => 
      ab.includes('安') || ab.includes('全壘打') || ab.includes('場內全') || 
      ab.includes('HR') || ab.includes('1B') || ab.includes('2B') || ab.includes('3B');

    const isSO = (ab: string) => 
      ab.includes('三振') || ab.includes('K') || ab.includes('SO') || ab.includes('ꓘ') || ab.includes('不死');

    const isNonAb = (ab: string) => 
      isWalk(ab) ||
      ab.includes('犧') || ab.includes('SAC') || ab.includes('SF') || 
      ab.includes('妨礙打擊') || ab.includes('CI') || ab.includes('代打') || ab.includes('代跑') || 
      ab.includes('未登場') || ab === '-';

    // If explicit stats not provided, calculate from atBats history
    if (p.hits === undefined && atBats.length > 0) {
      hits = atBats.filter(isHit).length;
      walks = atBats.filter(isWalk).length;
      strikeouts = atBats.filter(isSO).length;
    }

    if (rbi === 0 && atBats.length > 0) {
      let calcRbi = 0;
      atBats.forEach(ab => {
        const m = ab.match(/[\(（]\s*(\d+)\s*[\)）]/);
        if (m) {
          calcRbi += parseInt(m[1], 10);
        } else if (ab.includes('全壘打') || ab.includes('HR')) {
          calcRbi += 1;
        }
      });
      if (calcRbi > 0) rbi = calcRbi;
    }

    if (runs === 0 && atBats.length > 0) {
      let calcRuns = 0;
      atBats.forEach(ab => {
        if (ab.includes('全壘打') || ab.includes('HR')) {
          calcRuns += 1;
        }
      });
      if (calcRuns > 0) runs = calcRuns;
    }

    const nonAb = atBats.filter(isNonAb).length;
    const abCount = Math.max(hits, atBats.length - nonAb);
    const avg = abCount > 0 ? (hits / abCount).toFixed(3).replace(/^0\./, '.') : '.000';

    return {
      pa: atBats.length,
      ab: abCount,
      h: hits,
      r: runs,
      rbi: rbi,
      bb: walks,
      so: strikeouts,
      avg: p.avg || avg,
      atBats
    };
  };

  // Team totals
  const getTeamTotals = (team: Team) => {
    let totalAB = 0;
    let totalH = 0;
    let totalR = team.score;
    let totalRBI = 0;
    let totalBB = 0;
    let totalSO = 0;

    team.lineup.forEach(p => {
      if (p.previousPlayers && p.previousPlayers.length > 0) {
        p.previousPlayers.forEach(prevP => {
          const s = getPlayerBattingStats(prevP);
          totalAB += s.ab;
          totalH += s.h;
          totalRBI += s.rbi;
          totalBB += s.bb;
          totalSO += s.so;
        });
      }
      const s = getPlayerBattingStats(p);
      totalAB += s.ab;
      totalH += s.h;
      totalRBI += s.rbi;
      totalBB += s.bb;
      totalSO += s.so;
    });

    return {
      ab: totalAB,
      r: totalR,
      h: totalH,
      rbi: totalRBI,
      bb: totalBB,
      so: totalSO,
      avg: totalAB > 0 ? (totalH / totalAB).toFixed(3).replace(/^0\./, '.') : '.000'
    };
  };

  // Apply edits to game state
  const handleApplyEdits = () => {
    dispatch({
      type: 'REPLACE_STATE',
      state: {
        ...state,
        awayTeam: editingAwayTeam,
        homeTeam: editingHomeTeam
      }
    });
    setIsSavedNotify(true);
    setTimeout(() => setIsSavedNotify(false), 2000);
  };

  // Update editing player
  const handleUpdateEditingPlayer = (
    team: 'away' | 'home', 
    type: 'lineup' | 'bench' | 'pitcher', 
    index: number, 
    field: keyof Player, 
    value: any
  ) => {
    const isAway = team === 'away';
    const setter = isAway ? setEditingAwayTeam : setEditingHomeTeam;

    setter(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (type === 'pitcher') {
        next.pitcher = { ...next.pitcher, [field]: value };
      } else if (type === 'lineup') {
        if (next.lineup[index]) {
          let val = value;
          if (field === 'position' && typeof val === 'string' && (val.trim() === '代打' || val.trim().toLowerCase() === 'ph')) {
            val = 'PH';
          }
          next.lineup[index] = { ...next.lineup[index], [field]: val };
        }
      } else if (type === 'bench') {
        if (next.bench[index]) {
          let val = value;
          if (field === 'position' && typeof val === 'string' && (val.trim() === '代打' || val.trim().toLowerCase() === 'ph')) {
            val = 'PH';
          }
          next.bench[index] = { ...next.bench[index], [field]: val };
        }
      }
      return next;
    });
  };

  // Set or replace at-bat outcome (or append if 'new')
  const handleSetAtBat = (team: 'away' | 'home', playerIndex: number, abIndex: number | 'new', outcome: string) => {
    const isAway = team === 'away';
    const isClear = outcome === '清除';
    const targetPrevIndex = selectedAtBat?.prevIndex;

    let updatedTeam: Team | null = null;
    let nextAbIndex: number | null = null;

    const updateLineupInTeam = (teamObj: Team): Team => {
      const next: Team = JSON.parse(JSON.stringify(teamObj));
      const player = next.lineup[playerIndex];
      if (player) {
        const targetPlayer = (targetPrevIndex !== undefined && player.previousPlayers && player.previousPlayers[targetPrevIndex])
          ? player.previousPlayers[targetPrevIndex]
          : player;

        if (!targetPlayer.atBats) targetPlayer.atBats = [];
        if (abIndex === 'new') {
          if (!isClear) {
            targetPlayer.atBats.push(outcome);
            nextAbIndex = targetPlayer.atBats.length - 1;
          }
        } else if (abIndex < targetPlayer.atBats.length) {
          if (isClear) {
            targetPlayer.atBats.splice(abIndex, 1);
          } else {
            targetPlayer.atBats[abIndex] = outcome;
            nextAbIndex = abIndex;
          }
        }
      }
      return next;
    };

    if (isAway) {
      setEditingAwayTeam(prev => {
        const next = updateLineupInTeam(prev);
        updatedTeam = next;
        return next;
      });
    } else {
      setEditingHomeTeam(prev => {
        const next = updateLineupInTeam(prev);
        updatedTeam = next;
        return next;
      });
    }

    // Immediately dispatch live update to state
    setTimeout(() => {
      if (updatedTeam) {
        const currentPbp = [...(state.playByPlay || [])];
        const targetTeam = isAway ? updatedTeam : (state.homeTeam || updatedTeam);
        const targetPlayer = targetTeam.lineup[playerIndex];
        const pId = targetPlayer?.id;
        const isSO = outcome.includes('三振') || outcome.includes('K') || outcome.includes('ꓘ') || outcome.includes('SO');
        const isWalk = outcome.includes('四壞') || outcome.includes('四球') || outcome.includes('敬遠');

        let updatedPbp = currentPbp;
        if (pId) {
          const playerPbpIndices: number[] = [];
          currentPbp.forEach((rec, idx) => {
            if (rec.batterId === pId || (rec.batterName === targetPlayer.name && rec.battingTeam === (isAway ? 'away' : 'home'))) {
              playerPbpIndices.push(idx);
            }
          });

          if (typeof abIndex === 'number' && abIndex < playerPbpIndices.length) {
            const pbpIdx = playerPbpIndices[abIndex];
            if (isClear) {
              updatedPbp = currentPbp.filter((_, idx) => idx !== pbpIdx);
            } else {
              updatedPbp = [...currentPbp];
              updatedPbp[pbpIdx] = {
                ...updatedPbp[pbpIdx],
                result: outcome,
                strikes: isSO ? 3 : updatedPbp[pbpIdx].strikes,
                balls: isWalk ? 4 : updatedPbp[pbpIdx].balls,
              };
            }
          } else if (abIndex === 'new' && !isClear) {
            const oppTeam = isAway ? state.homeTeam : state.awayTeam;
            const newRecord: PlateAppearanceRecord = {
              id: `pa-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              inning: state.inning,
              isTop: isAway,
              paNumber: currentPbp.length + 1,
              paInningNumber: currentPbp.filter(p => p.inning === state.inning && p.isTop === isAway).length + 1,
              battingTeam: isAway ? 'away' : 'home',
              battingTeamName: targetTeam.name,
              pitchingTeam: isAway ? 'home' : 'away',
              pitchingTeamName: oppTeam.name,
              batterId: targetPlayer.id,
              batterName: targetPlayer.name,
              batterNumber: targetPlayer.number,
              batterOrder: playerIndex + 1,
              pitcherId: oppTeam.pitcher?.id,
              pitcherName: oppTeam.pitcher?.name || (isAway ? '主隊投手' : '客隊投手'),
              pitcherNumber: oppTeam.pitcher?.number || '--',
              outs: state.outs,
              bases: [...state.bases],
              balls: isWalk ? 4 : 0,
              strikes: isSO ? 3 : 0,
              result: outcome,
              rbi: 0,
              runs: 0,
              awayScore: state.awayTeam.score,
              homeScore: state.homeTeam.score,
              timestamp: Date.now()
            };
            updatedPbp = [...currentPbp, newRecord];
          }
        }

        dispatch({
          type: 'REPLACE_STATE',
          state: {
            ...state,
            awayTeam: isAway ? updatedTeam : state.awayTeam,
            homeTeam: !isAway ? updatedTeam : state.homeTeam,
            playByPlay: updatedPbp
          }
        });
      }
    }, 0);

    setIsSavedNotify(true);
    setTimeout(() => setIsSavedNotify(false), 1500);

    if (isClear || nextAbIndex === null) {
      setSelectedAtBat(null);
    } else {
      setSelectedAtBat({
        playerIndex,
        abIndex: nextAbIndex,
        current: outcome,
        prevIndex: targetPrevIndex
      });
    }
  };

  // Navigate between at-bats (previous / next)
  const handleNavigateAtBat = (direction: 'prev' | 'next') => {
    if (!selectedAtBat) return;
    const currentTeam = activeTeamTab === 'away' ? (editingAwayTeam || state.awayTeam) : (editingHomeTeam || state.homeTeam);
    const { playerIndex, abIndex } = selectedAtBat;
    const lineup = currentTeam.lineup;
    if (!lineup || lineup.length === 0) return;

    if (direction === 'prev') {
      if (typeof abIndex === 'number' && abIndex > 0) {
        const prevAb = lineup[playerIndex].atBats?.[abIndex - 1] || '';
        setSelectedAtBat({ playerIndex, abIndex: abIndex - 1, current: prevAb });
      } else if (playerIndex > 0) {
        const prevPlayerIdx = playerIndex - 1;
        const prevPlayerAbs = lineup[prevPlayerIdx].atBats || [];
        if (prevPlayerAbs.length > 0) {
          setSelectedAtBat({ playerIndex: prevPlayerIdx, abIndex: prevPlayerAbs.length - 1, current: prevPlayerAbs[prevPlayerAbs.length - 1] });
        } else {
          setSelectedAtBat({ playerIndex: prevPlayerIdx, abIndex: 'new', current: '' });
        }
      }
    } else {
      const curPlayerAbs = lineup[playerIndex].atBats || [];
      if (typeof abIndex === 'number' && abIndex < curPlayerAbs.length - 1) {
        const nextAb = curPlayerAbs[abIndex + 1] || '';
        setSelectedAtBat({ playerIndex, abIndex: abIndex + 1, current: nextAb });
      } else if (typeof abIndex === 'number' && abIndex === curPlayerAbs.length - 1) {
        setSelectedAtBat({ playerIndex, abIndex: 'new', current: '' });
      } else if (playerIndex < lineup.length - 1) {
        const nextPlayerIdx = playerIndex + 1;
        const nextPlayerAbs = lineup[nextPlayerIdx].atBats || [];
        if (nextPlayerAbs.length > 0) {
          setSelectedAtBat({ playerIndex: nextPlayerIdx, abIndex: 0, current: nextPlayerAbs[0] });
        } else {
          setSelectedAtBat({ playerIndex: nextPlayerIdx, abIndex: 'new', current: '' });
        }
      }
    }
  };

  // Custom outcome handler
  const handleApplyCustomOutcome = () => {
    if (!selectedAtBat || !customOutcomeInput.trim()) return;
    handleSetAtBat(activeTeamTab, selectedAtBat.playerIndex, selectedAtBat.abIndex, customOutcomeInput.trim());
    setCustomOutcomeInput('');
  };

  const handleAddAtBat = (team: 'away' | 'home', index: number, result: string) => {
    handleSetAtBat(team, index, 'new', result);
  };

  const handleRemoveAtBat = (team: 'away' | 'home', playerIndex: number, abIndex: number) => {
    const isAway = team === 'away';
    let updatedTeam: Team | null = null;

    if (isAway) {
      setEditingAwayTeam(prev => {
        const next: Team = JSON.parse(JSON.stringify(prev));
        const player = next.lineup[playerIndex];
        if (player && player.atBats) {
          player.atBats.splice(abIndex, 1);
        }
        updatedTeam = next;
        return next;
      });
    } else {
      setEditingHomeTeam(prev => {
        const next: Team = JSON.parse(JSON.stringify(prev));
        const player = next.lineup[playerIndex];
        if (player && player.atBats) {
          player.atBats.splice(abIndex, 1);
        }
        updatedTeam = next;
        return next;
      });
    }

    setTimeout(() => {
      if (updatedTeam) {
        const currentPbp = [...(state.playByPlay || [])];
        const targetTeam = isAway ? updatedTeam : (state.homeTeam || updatedTeam);
        const targetPlayer = targetTeam.lineup[playerIndex];
        const pId = targetPlayer?.id;
        let updatedPbp = currentPbp;
        if (pId) {
          const playerPbpIndices: number[] = [];
          currentPbp.forEach((rec, idx) => {
            if (rec.batterId === pId || (rec.batterName === targetPlayer.name && rec.battingTeam === (isAway ? 'away' : 'home'))) {
              playerPbpIndices.push(idx);
            }
          });
          if (abIndex < playerPbpIndices.length) {
            const pbpIdx = playerPbpIndices[abIndex];
            updatedPbp = currentPbp.filter((_, idx) => idx !== pbpIdx);
          }
        }

        dispatch({
          type: 'REPLACE_STATE',
          state: {
            ...state,
            awayTeam: isAway ? updatedTeam : state.awayTeam,
            homeTeam: !isAway ? updatedTeam : state.homeTeam,
            playByPlay: updatedPbp
          }
        });
      }
    }, 0);

    setIsSavedNotify(true);
    setTimeout(() => setIsSavedNotify(false), 1500);
    setSelectedAtBat(null);
  };

  // Generate plain text Box Score for clipboard
  const generateTextReport = () => {
    const maxInnings = Math.max(9, state.awayTeam.inningScores.length, state.homeTeam.inningScores.length);
    const inningHeaders = Array.from({ length: maxInnings }, (_, i) => String(i + 1).padStart(2, ' ')).join(' ');
    
    const awayScores = Array.from({ length: maxInnings }, (_, i) => {
      const s = state.awayTeam.inningScores[i];
      return (s !== null && s !== undefined ? String(s) : '-').padStart(2, ' ');
    }).join(' ');

    const homeScores = Array.from({ length: maxInnings }, (_, i) => {
      const s = state.homeTeam.inningScores[i];
      return (s !== null && s !== undefined ? String(s) : '-').padStart(2, ' ');
    }).join(' ');

    const awayTotals = getTeamTotals(state.awayTeam);
    const homeTotals = getTeamTotals(state.homeTeam);

    let text = `========================================================\n`;
    text += `⚾ 棒球比賽攻守紀錄表 (BOX SCORE)\n`;
    text += `賽事：${recordTitle || `${state.awayTeam.name} vs ${state.homeTeam.name}`}\n`;
    text += `日期：${new Date().toLocaleDateString()} | 局數：第 ${state.inning} 局\n`;
    text += `--------------------------------------------------------\n`;
    text += `隊伍           ${inningHeaders} |  R  H  E\n`;
    text += `${state.awayTeam.name.padEnd(12, ' ')}  ${awayScores} | ${String(state.awayTeam.score).padStart(2, ' ')} ${String(state.awayTeam.hits).padStart(2, ' ')} ${String(state.awayTeam.errors).padStart(2, ' ')}\n`;
    text += `${state.homeTeam.name.padEnd(12, ' ')}  ${homeScores} | ${String(state.homeTeam.score).padStart(2, ' ')} ${String(state.homeTeam.hits).padStart(2, ' ')} ${String(state.homeTeam.errors).padStart(2, ' ')}\n`;
    text += `--------------------------------------------------------\n\n`;

    // Away Batting
    text += `【${state.awayTeam.name} 打擊成績】\n`;
    text += `棒次  背號  姓名        位置  AB  R  H RBI BB SO   AVG   打席結果\n`;
    state.awayTeam.lineup.forEach((p, idx) => {
      if (p.previousPlayers && p.previousPlayers.length > 0) {
        p.previousPlayers.forEach((prevP, prevIdx) => {
          const sPrev = getPlayerBattingStats(prevP);
          const order = prevIdx === 0 ? String(idx + 1).padStart(2, ' ') : '  ';
          const no = (prevP.number || '--').padStart(3, ' ');
          const name = (prevP.name || '---').padEnd(10, ' ');
          const pos = (prevP.position || '先發').padEnd(4, ' ');
          const abStr = (sPrev.atBats.length > 0 ? `[${sPrev.atBats.join(', ')}]` : '-');
          text += ` ${order}   #${no}  ${name} ${pos}  ${String(sPrev.ab).padStart(2, ' ')} ${String(sPrev.r).padStart(2, ' ')} ${String(sPrev.h).padStart(2, ' ')} ${String(sPrev.rbi).padStart(2, ' ')}  ${String(sPrev.bb).padStart(2, ' ')} ${String(sPrev.so).padStart(2, ' ')}  ${sPrev.avg}  ${abStr}\n`;
        });
      }
      const s = getPlayerBattingStats(p);
      const isSub = Boolean(p.previousPlayers && p.previousPlayers.length > 0);
      const order = !isSub ? String(idx + 1).padStart(2, ' ') : '  ';
      const no = (p.number || '--').padStart(3, ' ');
      const name = (p.name || '---').padEnd(10, ' ');
      const pos = (isSub ? '代打' : (p.position || 'DH')).padEnd(4, ' ');
      const abStr = (s.atBats.length > 0 ? `[${s.atBats.join(', ')}]` : '-');
      text += ` ${order}   #${no}  ${name} ${pos}  ${String(s.ab).padStart(2, ' ')} ${String(s.r).padStart(2, ' ')} ${String(s.h).padStart(2, ' ')} ${String(s.rbi).padStart(2, ' ')}  ${String(s.bb).padStart(2, ' ')} ${String(s.so).padStart(2, ' ')}  ${s.avg}  ${abStr}\n`;
    });
    text += `團隊總計: AB: ${awayTotals.ab} | H: ${awayTotals.h} | R: ${awayTotals.r} | RBI: ${awayTotals.rbi} | BB: ${awayTotals.bb} | SO: ${awayTotals.so} | AVG: ${awayTotals.avg}\n\n`;

    // Away Pitching
    text += `【${state.awayTeam.name} 投手成績】\n`;
    (state.awayTeam.pitcherHistory || []).forEach((hp) => {
      const bf = (typeof hp.battersFaced === 'number' && hp.battersFaced > 0) ? hp.battersFaced : state.homeTeam.lineup.reduce((acc, p) => acc + (p.atBats?.length || 0), 0);
      text += `[退場] #${hp.number || '--'} ${hp.name || '---'} | 打者: ${bf} | 局數: ${hp.inningsPitched || '0.0'} | 球數: ${getPitcherCount(hp)} | 三振: ${hp.strikeouts || 0}\n`;
    });
    const ap = state.awayTeam.pitcher;
    const apPrevBf = (state.awayTeam.pitcherHistory || []).reduce((acc, p) => acc + (p.battersFaced || 0), 0);
    const apCalcBf = Math.max(0, state.homeTeam.lineup.reduce((acc, p) => acc + (p.atBats?.length || 0), 0) - apPrevBf) + (!state.isTop ? 1 : 0);
    const apBf = (typeof ap.battersFaced === 'number' && ap.battersFaced > 0) ? ap.battersFaced : apCalcBf;
    text += `[在場] #${ap.number || '--'} ${ap.name || '---'} | 打者: ${apBf} | 局數: ${ap.inningsPitched || '0.0'} | 球數: ${getPitcherCount(ap)} | 三振: ${ap.strikeouts || 0}\n\n`;

    // Home Batting
    text += `【${state.homeTeam.name} 打擊成績】\n`;
    text += `棒次  背號  姓名        位置  AB  R  H RBI BB SO   AVG   打席結果\n`;
    state.homeTeam.lineup.forEach((p, idx) => {
      if (p.previousPlayers && p.previousPlayers.length > 0) {
        p.previousPlayers.forEach((prevP, prevIdx) => {
          const sPrev = getPlayerBattingStats(prevP);
          const order = prevIdx === 0 ? String(idx + 1).padStart(2, ' ') : '  ';
          const no = (prevP.number || '--').padStart(3, ' ');
          const name = (prevP.name || '---').padEnd(10, ' ');
          const pos = (prevP.position || '先發').padEnd(4, ' ');
          const abStr = (sPrev.atBats.length > 0 ? `[${sPrev.atBats.join(', ')}]` : '-');
          text += ` ${order}   #${no}  ${name} ${pos}  ${String(sPrev.ab).padStart(2, ' ')} ${String(sPrev.r).padStart(2, ' ')} ${String(sPrev.h).padStart(2, ' ')} ${String(sPrev.rbi).padStart(2, ' ')}  ${String(sPrev.bb).padStart(2, ' ')} ${String(sPrev.so).padStart(2, ' ')}  ${sPrev.avg}  ${abStr}\n`;
        });
      }
      const s = getPlayerBattingStats(p);
      const isSub = Boolean(p.previousPlayers && p.previousPlayers.length > 0);
      const order = !isSub ? String(idx + 1).padStart(2, ' ') : '  ';
      const no = (p.number || '--').padStart(3, ' ');
      const name = (p.name || '---').padEnd(10, ' ');
      const pos = (isSub ? '代打' : (p.position || 'DH')).padEnd(4, ' ');
      const abStr = (s.atBats.length > 0 ? `[${s.atBats.join(', ')}]` : '-');
      text += ` ${order}   #${no}  ${name} ${pos}  ${String(s.ab).padStart(2, ' ')} ${String(s.r).padStart(2, ' ')} ${String(s.h).padStart(2, ' ')} ${String(s.rbi).padStart(2, ' ')}  ${String(s.bb).padStart(2, ' ')} ${String(s.so).padStart(2, ' ')}  ${s.avg}  ${abStr}\n`;
    });
    text += `團隊總計: AB: ${homeTotals.ab} | H: ${homeTotals.h} | R: ${homeTotals.r} | RBI: ${homeTotals.rbi} | BB: ${homeTotals.bb} | SO: ${homeTotals.so} | AVG: ${homeTotals.avg}\n\n`;

    // Home Pitching
    text += `【${state.homeTeam.name} 投手成績】\n`;
    (state.homeTeam.pitcherHistory || []).forEach((hp) => {
      const bf = (typeof hp.battersFaced === 'number' && hp.battersFaced > 0) ? hp.battersFaced : state.awayTeam.lineup.reduce((acc, p) => acc + (p.atBats?.length || 0), 0);
      text += `[退場] #${hp.number || '--'} ${hp.name || '---'} | 打者: ${bf} | 局數: ${hp.inningsPitched || '0.0'} | 球數: ${getPitcherCount(hp)} | 三振: ${hp.strikeouts || 0}\n`;
    });
    const hp = state.homeTeam.pitcher;
    const hpPrevBf = (state.homeTeam.pitcherHistory || []).reduce((acc, p) => acc + (p.battersFaced || 0), 0);
    const hpCalcBf = Math.max(0, state.awayTeam.lineup.reduce((acc, p) => acc + (p.atBats?.length || 0), 0) - hpPrevBf) + (state.isTop ? 1 : 0);
    const hpBf = (typeof hp.battersFaced === 'number' && hp.battersFaced > 0) ? hp.battersFaced : hpCalcBf;
    text += `[在場] #${hp.number || '--'} ${hp.name || '---'} | 打者: ${hpBf} | 局數: ${hp.inningsPitched || '0.0'} | 球數: ${getPitcherCount(hp)} | 三振: ${hp.strikeouts || 0}\n`;
    text += `========================================================\n`;

    return text;
  };

  const handleCopyTextReport = () => {
    const text = generateTextReport();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `baseball-record-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Reconstruct or extract Play-by-Play list
  const effectivePlayByPlay = useMemo<PlateAppearanceRecord[]>(() => {
    if (Array.isArray(state.playByPlay)) {
      return state.playByPlay;
    }
    // Reconstruct from lineup ONLY if state.playByPlay is null/undefined (legacy games)
    const reconstructed: PlateAppearanceRecord[] = [];
    let paNum = 1;

    const maxAwayAbs = Math.max(0, ...state.awayTeam.lineup.map(p => (p.atBats?.length || 0)));
    const maxHomeAbs = Math.max(0, ...state.homeTeam.lineup.map(p => (p.atBats?.length || 0)));
    const totalRounds = Math.max(maxAwayAbs, maxHomeAbs);

    for (let round = 0; round < totalRounds; round++) {
      // Away at-bats (top half)
      state.awayTeam.lineup.forEach((p, idx) => {
        if (p.atBats && p.atBats[round]) {
          const res = p.atBats[round];
          const m = res.match(/[\(（]\s*(\d+)\s*[\)）]/);
          const rbi = m ? parseInt(m[1], 10) : (res.includes('全壘打') ? 1 : 0);
          const runs = res.includes('全壘打') ? 1 : 0;
          const isSO = res.includes('三振') || res.includes('K') || res.includes('ꓘ') || res.includes('SO');
          const isWalk = res.includes('四壞') || res.includes('四球') || res.includes('敬遠');
          reconstructed.push({
            id: `recon-away-${round}-${idx}`,
            inning: Math.min(9, Math.floor((paNum - 1) / 6) + 1),
            isTop: true,
            paNumber: paNum++,
            battingTeam: 'away',
            battingTeamName: state.awayTeam.name,
            pitchingTeam: 'home',
            pitchingTeamName: state.homeTeam.name,
            batterId: p.id,
            batterName: p.name,
            batterNumber: p.number,
            batterOrder: idx + 1,
            pitcherName: state.homeTeam.pitcher?.name || '主隊投手',
            pitcherNumber: state.homeTeam.pitcher?.number || '--',
            outs: 0,
            bases: [false, false, false],
            balls: isWalk ? 4 : 0,
            strikes: isSO ? 3 : 0,
            result: res,
            rbi,
            runs,
            awayScore: state.awayTeam.score,
            homeScore: state.homeTeam.score,
            timestamp: Date.now() - (totalRounds - round) * 60000
          });
        }
      });

      // Home at-bats (bottom half)
      state.homeTeam.lineup.forEach((p, idx) => {
        if (p.atBats && p.atBats[round]) {
          const res = p.atBats[round];
          const m = res.match(/[\(（]\s*(\d+)\s*[\)）]/);
          const rbi = m ? parseInt(m[1], 10) : (res.includes('全壘打') ? 1 : 0);
          const runs = res.includes('全壘打') ? 1 : 0;
          const isSO = res.includes('三振') || res.includes('K') || res.includes('ꓘ') || res.includes('SO');
          const isWalk = res.includes('四壞') || res.includes('四球') || res.includes('敬遠');
          reconstructed.push({
            id: `recon-home-${round}-${idx}`,
            inning: Math.min(9, Math.floor((paNum - 1) / 6) + 1),
            isTop: false,
            paNumber: paNum++,
            battingTeam: 'home',
            battingTeamName: state.homeTeam.name,
            pitchingTeam: 'away',
            pitchingTeamName: state.awayTeam.name,
            batterId: p.id,
            batterName: p.name,
            batterNumber: p.number,
            batterOrder: idx + 1,
            pitcherName: state.awayTeam.pitcher?.name || '客隊投手',
            pitcherNumber: state.awayTeam.pitcher?.number || '--',
            outs: 0,
            bases: [false, false, false],
            balls: isWalk ? 4 : 0,
            strikes: isSO ? 3 : 0,
            result: res,
            rbi,
            runs,
            awayScore: state.awayTeam.score,
            homeScore: state.homeTeam.score,
            timestamp: Date.now() - (totalRounds - round) * 60000 + 30000
          });
        }
      });
    }

    return reconstructed;
  }, [state.playByPlay, state.awayTeam, state.homeTeam]);

  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // --- SHEET 1: BOX SCORE ---
      const maxInnings = Math.max(9, state.awayTeam.inningScores.length, state.homeTeam.inningScores.length);
      const inningHeaders = Array.from({ length: maxInnings }, (_, i) => `${i + 1}局`);
      
      const lineScoreAoa: any[][] = [
        ['棒球比賽攻守紀錄表 (Box Score)'],
        ['賽事名稱', recordTitle || `${state.awayTeam.name} vs ${state.homeTeam.name}`, '日期', new Date().toLocaleDateString()],
        [''],
        ['【比分板 (Line Score)】'],
        ['隊伍', ...inningHeaders, 'R (得分)', 'H (安打)', 'E (失誤)'],
        [
          state.awayTeam.name,
          ...Array.from({ length: maxInnings }, (_, i) => state.awayTeam.inningScores[i] ?? '-'),
          state.awayTeam.score,
          state.awayTeam.hits,
          state.awayTeam.errors
        ],
        [
          state.homeTeam.name,
          ...Array.from({ length: maxInnings }, (_, i) => state.homeTeam.inningScores[i] ?? '-'),
          state.homeTeam.score,
          state.homeTeam.hits,
          state.homeTeam.errors
        ],
        [''],
        [`【${state.awayTeam.name} 打擊成績】`],
        ['棒次', '背號', '姓名', '守備位置', '打數 (AB)', '得分 (R)', '安打 (H)', '打點 (RBI)', '四死 (BB)', '三振 (SO)', '打擊率 (AVG)', '打席結果明細']
      ];

      const populateBattingRows = (team: Team, aoa: any[][]) => {
        team.lineup.forEach((p, idx) => {
          if (p.previousPlayers && p.previousPlayers.length > 0) {
            p.previousPlayers.forEach((prevP, prevIdx) => {
              const sPrev = getPlayerBattingStats(prevP);
              aoa.push([
                prevIdx === 0 ? idx + 1 : '',
                `#${prevP.number || '--'}`,
                prevP.name,
                prevP.position || '先發',
                sPrev.ab,
                sPrev.r,
                sPrev.h,
                sPrev.rbi,
                sPrev.bb,
                sPrev.so,
                sPrev.avg,
                sPrev.atBats.join(', ') || '-'
              ]);
            });
          }
          const s = getPlayerBattingStats(p);
          const isSub = Boolean(p.previousPlayers && p.previousPlayers.length > 0);
          aoa.push([
            !isSub ? idx + 1 : '↳ 代打',
            `#${p.number || '--'}`,
            p.name,
            p.position || (isSub ? 'PH' : 'DH'),
            s.ab,
            s.r,
            s.h,
            s.rbi,
            s.bb,
            s.so,
            s.avg,
            s.atBats.join(', ') || '-'
          ]);
        });
        const totals = getTeamTotals(team);
        aoa.push([
          '團隊總計', '', '', '',
          totals.ab, totals.r, totals.h, totals.rbi, totals.bb, totals.so, totals.avg, ''
        ]);
      };

      populateBattingRows(state.awayTeam, lineScoreAoa);

      lineScoreAoa.push(['']);
      lineScoreAoa.push([`【${state.homeTeam.name} 打擊成績】`]);
      lineScoreAoa.push(['棒次', '背號', '姓名', '守備位置', '打數 (AB)', '得分 (R)', '安打 (H)', '打點 (RBI)', '四死 (BB)', '三振 (SO)', '打擊率 (AVG)', '打席結果明細']);
      populateBattingRows(state.homeTeam, lineScoreAoa);

      lineScoreAoa.push(['']);
      lineScoreAoa.push(['【投手投球表現】']);
      lineScoreAoa.push(['所屬球隊', '狀態', '背號', '投手姓名', '面對打者 (BF)', '投球局數 (IP)', '投球總數 (NP)', '三振 (SO)']);

      // Away Pitchers
      (state.awayTeam.pitcherHistory || []).forEach(hp => {
        const bf = (typeof hp.battersFaced === 'number' && hp.battersFaced > 0) ? hp.battersFaced : state.homeTeam.lineup.reduce((acc, p) => acc + (p.atBats?.length || 0), 0);
        lineScoreAoa.push([state.awayTeam.name, '退場', `#${hp.number || '--'}`, hp.name, bf, hp.inningsPitched || '0.0', getPitcherCount(hp), hp.strikeouts || 0]);
      });
      const ap = state.awayTeam.pitcher;
      const apPrevBf = (state.awayTeam.pitcherHistory || []).reduce((acc, p) => acc + (p.battersFaced || 0), 0);
      const apCalcBf = Math.max(0, state.homeTeam.lineup.reduce((acc, p) => acc + (p.atBats?.length || 0), 0) - apPrevBf) + (!state.isTop ? 1 : 0);
      const apBf = (typeof ap.battersFaced === 'number' && ap.battersFaced > 0) ? ap.battersFaced : apCalcBf;
      lineScoreAoa.push([state.awayTeam.name, '在場', `#${ap.number || '--'}`, ap.name, apBf, ap.inningsPitched || '0.0', getPitcherCount(ap), ap.strikeouts || 0]);

      // Home Pitchers
      (state.homeTeam.pitcherHistory || []).forEach(hp => {
        const bf = (typeof hp.battersFaced === 'number' && hp.battersFaced > 0) ? hp.battersFaced : state.awayTeam.lineup.reduce((acc, p) => acc + (p.atBats?.length || 0), 0);
        lineScoreAoa.push([state.homeTeam.name, '退場', `#${hp.number || '--'}`, hp.name, bf, hp.inningsPitched || '0.0', getPitcherCount(hp), hp.strikeouts || 0]);
      });
      const hp = state.homeTeam.pitcher;
      const hpPrevBf = (state.homeTeam.pitcherHistory || []).reduce((acc, p) => acc + (p.battersFaced || 0), 0);
      const hpCalcBf = Math.max(0, state.awayTeam.lineup.reduce((acc, p) => acc + (p.atBats?.length || 0), 0) - hpPrevBf) + (state.isTop ? 1 : 0);
      const hpBf = (typeof hp.battersFaced === 'number' && hp.battersFaced > 0) ? hp.battersFaced : hpCalcBf;
      lineScoreAoa.push([state.homeTeam.name, '在場', `#${hp.number || '--'}`, hp.name, hpBf, hp.inningsPitched || '0.0', getPitcherCount(hp), hp.strikeouts || 0]);

      const wsBoxScore = XLSX.utils.aoa_to_sheet(lineScoreAoa);
      XLSX.utils.book_append_sheet(wb, wsBoxScore, '攻守紀錄 (Box Score)');

      // --- SHEET 2: PLAY BY PLAY ---
      const activePbp = effectivePlayByPlay;
      const pbpAoa: any[][] = [
        ['逐打席詳細紀錄表 (Play-by-Play)'],
        ['賽事名稱', recordTitle || `${state.awayTeam.name} vs ${state.homeTeam.name}`, '匯出時間', new Date().toLocaleString()],
        [''],
        [
          '打席序號',
          '局數',
          '半局',
          '進攻隊伍',
          '防守隊伍',
          '棒次',
          '打者姓名',
          '打者背號',
          '投手姓名',
          '投手背號',
          '當下出局數',
          '壘包狀況',
          '打席結束球數 (B-S)',
          '打席內事件 (暴投/捕逸)',
          '打席結果',
          '打點 (RBI)',
          '得分 (R)',
          '當下客隊比分',
          '當下主隊比分',
          '時間戳記'
        ]
      ];

      activePbp.forEach(p => {
        const baseStatus = [
          p.bases[0] ? '一壘' : null,
          p.bases[1] ? '二壘' : null,
          p.bases[2] ? '三壘' : null
        ].filter(Boolean);
        const baseText = baseStatus.length === 0 ? '無人在壘' : baseStatus.length === 3 ? '滿壘' : baseStatus.join('、') + '有人';
        const inPaEvents = p.eventsDuringPa && p.eventsDuringPa.length > 0 ? p.eventsDuringPa.join(', ') : '無';

        pbpAoa.push([
          p.paNumber,
          `${p.inning}局`,
          p.isTop ? '上半局 (▲)' : '下半局 (▼)',
          p.battingTeamName,
          p.pitchingTeamName,
          `第 ${p.batterOrder} 棒`,
          p.batterName,
          `#${p.batterNumber}`,
          p.pitcherName,
          `#${p.pitcherNumber}`,
          `${p.outs} 出局`,
          baseText,
          `${p.balls}B - ${p.strikes}S`,
          inPaEvents,
          p.result,
          p.rbi,
          p.runs,
          p.awayScore,
          p.homeScore,
          p.timestamp ? new Date(p.timestamp).toLocaleTimeString() : '-'
        ]);
      });

      const wsPbp = XLSX.utils.aoa_to_sheet(pbpAoa);
      XLSX.utils.book_append_sheet(wb, wsPbp, '逐打席紀錄 (Play-by-Play)');

      // Save file
      const safeGameTitle = (recordTitle || `${state.awayTeam.name}_vs_${state.homeTeam.name}`).replace(/[^a-zA-Z0-9_\-\u4e00-\u9fa5]/g, '_');
      XLSX.writeFile(wb, `${safeGameTitle}_攻守紀錄與逐打席.xlsx`);
    } catch (err) {
      console.error('Failed to export Excel:', err);
      alert('匯出 Excel 發生錯誤，請檢查瀏覽器下載權限。');
    }
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (imported && (imported.awayTeam || imported.homeTeam)) {
          dispatch({ type: 'REPLACE_STATE', state: imported });
          alert(language === 'zh' ? '成功匯入比賽紀錄！' : 'Game record successfully imported!');
          onClose();
        } else {
          alert(language === 'zh' ? '檔案格式不符' : 'Invalid file format');
        }
      } catch (err) {
        alert(language === 'zh' ? '無法解析 JSON 檔案' : 'Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  const currentDisplayTeam = activeTeamTab === 'away' ? (editingAwayTeam || state.awayTeam) : (editingHomeTeam || state.homeTeam);
  const otherTeam = activeTeamTab === 'away' ? (editingHomeTeam || state.homeTeam) : (editingAwayTeam || state.awayTeam);
  const isDisplayTeamPitching = activeTeamTab === 'away' ? !state.isTop : state.isTop;
  const currentEditingTeam = activeTeamTab === 'away' ? editingAwayTeam : editingHomeTeam;
  const maxInnings = Math.max(9, state.awayTeam.inningScores.length, state.homeTeam.inningScores.length);
  const inningsArray = Array.from({ length: maxInnings }, (_, i) => i + 1);

  // Common Outcomes Palette Panel for both Box Score and Edit Records (先點要更改的，再按右邊更換)
  const renderOutcomePalette = (currentTeam: Team, isDockedSheet: boolean = false) => {
    const selectedPlayer = selectedAtBat !== null ? currentTeam.lineup[selectedAtBat.playerIndex] : null;

    // Filter categories & search
    const filteredCategories = AT_BAT_OUTCOMES_CATEGORIES.map(cat => {
      if (outcomeFilterCategory !== 'all' && cat.key !== outcomeFilterCategory) {
        return null;
      }
      const q = outcomeSearchQuery.trim().toLowerCase();
      if (!q) return cat;

      const matchedItems = cat.items.filter(item => 
        item.id.toLowerCase().includes(q) ||
        item.label.toLowerCase().includes(q) ||
        item.full.toLowerCase().includes(q)
      );
      if (matchedItems.length === 0) return null;
      return { ...cat, items: matchedItems };
    }).filter(Boolean) as typeof AT_BAT_OUTCOMES_CATEGORIES;

    const filterTabs = [
      { key: 'all', label: '全部' },
      { key: 'hits', label: '安打' },
      { key: 'outs', label: '出局' },
      { key: 'pos_outs', label: '守位出局' },
      { key: 'walks', label: '保送' },
      { key: 'sac', label: '戰術' },
    ];

    return (
      <div className={`bg-slate-950/95 border-2 border-slate-700/80 rounded-2xl p-3 sm:p-4 shadow-2xl space-y-3 flex flex-col ${
        isDockedSheet ? 'max-h-[52vh]' : 'h-full max-h-[82vh]'
      }`}>
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-amber-400" />
            <h4 className="text-sm font-black text-white">更換打席結果</h4>
            {selectedAtBat && (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-bold">
                已選定
              </span>
            )}
          </div>
          {selectedAtBat && (
            <button
              type="button"
              onClick={() => setSelectedAtBat(null)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-1 font-bold"
            >
              <X size={12} />
              <span>取消選取</span>
            </button>
          )}
        </div>

        {/* Active Target Banner */}
        {selectedAtBat ? (
          <div className="bg-amber-950/60 border border-amber-500/60 rounded-xl p-2.5 sm:p-3 text-xs text-amber-200 space-y-2 shrink-0 animate-in fade-in duration-150">
            <div className="flex items-center justify-between gap-1.5 flex-wrap">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded text-[11px]">
                    第 {selectedAtBat.playerIndex + 1} 棒
                  </span>
                  <span className="font-bold text-white text-sm">
                    {selectedPlayer?.name || '打者'}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    #{selectedPlayer?.number || '--'}
                  </span>
                </div>
                <div className="text-[11px] text-amber-300 font-semibold mt-1 flex items-center gap-1">
                  {selectedAtBat.abIndex === 'new' ? (
                    <span className="text-sky-300 font-bold">▶ 準備新增打席（第 {(selectedPlayer?.atBats?.length || 0) + 1} 打席）</span>
                  ) : (
                    <span>
                      ▶ 更換第 <span className="font-bold text-white underline">{selectedAtBat.abIndex + 1}</span> 打席：
                      <span className="font-black text-amber-200 bg-amber-900/80 px-1.5 py-0.5 rounded ml-1 border border-amber-500/50">
                        {selectedAtBat.current || '未記錄'}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {/* Prev / Next at-bat navigation and delete */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleNavigateAtBat('prev')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-0.5 cursor-pointer active:scale-95"
                  title="跳至上一打席"
                >
                  <ChevronLeft size={13} />
                  <span className="hidden sm:inline">上打席</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigateAtBat('next')}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold transition-colors flex items-center gap-0.5 cursor-pointer active:scale-95"
                  title="跳至下一打席"
                >
                  <span className="hidden sm:inline">下打席</span>
                  <ChevronRight size={13} />
                </button>

                {selectedAtBat.abIndex !== 'new' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleRemoveAtBat(activeTeamTab, selectedAtBat.playerIndex, selectedAtBat.abIndex as number);
                    }}
                    className="px-2 py-1 bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-500/40 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer active:scale-95"
                    title="刪除此打席"
                  >
                    <Trash2 size={12} />
                    <span className="hidden sm:inline">刪除</span>
                  </button>
                )}
              </div>
            </div>

            <div className="text-[11px] text-amber-300 font-bold bg-amber-900/30 px-2 py-1 rounded flex items-center justify-between">
              <span>👇 點選結果即時套用修改：</span>
              {isSavedNotify && (
                <span className="text-emerald-400 font-bold flex items-center gap-1 animate-pulse">
                  <CheckCircle2 size={12} /> 已更新！
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 text-center space-y-1 shrink-0">
            <div className="font-bold text-slate-200 flex items-center justify-center gap-1.5">
              <Sparkles size={14} className="text-amber-400" />
              <span>點選球員打席即可快速修改</span>
            </div>
            <div className="text-[11px] text-slate-400 leading-relaxed">
              點擊球員名單中的打席徽章（或點「+新增」），即可在此面板直接點選更換或輸入自訂結果！
            </div>
          </div>
        )}

        {/* Custom Input Form (自由輸入任意結果) */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 rounded-xl p-1.5 shrink-0">
          <input 
            type="text" 
            value={customOutcomeInput}
            onChange={(e) => setCustomOutcomeInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleApplyCustomOutcome();
              }
            }}
            disabled={!selectedAtBat}
            placeholder={selectedAtBat ? "自訂輸入 (例: 6-4-3雙殺、右二壘打)..." : "請先點選打席後輸入自訂結果..."}
            className="flex-1 bg-slate-800 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 text-white placeholder-slate-500 outline-none focus:border-amber-400 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleApplyCustomOutcome}
            disabled={!selectedAtBat || !customOutcomeInput.trim()}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shrink-0 active:scale-95 cursor-pointer"
          >
            <CornerDownLeft size={13} />
            <span>套用</span>
          </button>
        </div>

        {/* Category Filter Tabs & Search */}
        <div className="space-y-1.5 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
            {filterTabs.map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setOutcomeFilterCategory(tab.key)}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  outcomeFilterCategory === tab.key
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text"
              value={outcomeSearchQuery}
              onChange={(e) => setOutcomeSearchQuery(e.target.value)}
              placeholder="搜尋結果關鍵字 (如: K, 安, 飛球, 滾地)..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-7 pr-7 py-1 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
            />
            {outcomeSearchQuery && (
              <button 
                type="button" 
                onClick={() => setOutcomeSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Categorized Outcomes List with Smooth Scroll */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-0">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500">
              無符合「{outcomeSearchQuery}」的項目，可使用上方自訂輸入。
            </div>
          ) : (
            filteredCategories.map((cat) => (
              <div key={cat.key} className="space-y-1.5">
                <div className="text-[11px] font-black text-slate-400 tracking-wider flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${
                      cat.color === 'emerald' ? 'bg-emerald-400' :
                      cat.color === 'sky' ? 'bg-sky-400' :
                      cat.color === 'rose' ? 'bg-rose-400' :
                      cat.color === 'purple' ? 'bg-purple-400' :
                      cat.color === 'amber' ? 'bg-amber-400' :
                      cat.color === 'teal' ? 'bg-teal-400' : 'bg-slate-400'
                    }`} />
                    <span>{cat.category}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono font-normal">{cat.items.length}項</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-1.5">
                  {cat.items.map(item => {
                    const isCurrent = selectedAtBat?.current === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={!selectedAtBat}
                        onClick={() => {
                          if (selectedAtBat) {
                            handleSetAtBat(activeTeamTab, selectedAtBat.playerIndex, selectedAtBat.abIndex, item.id);
                          }
                        }}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-between transition-all ${
                          !selectedAtBat 
                            ? 'bg-slate-900/60 text-slate-600 border border-slate-800/80 cursor-not-allowed opacity-50' 
                            : isCurrent
                              ? 'bg-amber-500 text-slate-950 border border-amber-300 ring-2 ring-amber-400 font-black shadow-md scale-[1.02]'
                              : 'bg-slate-900 hover:bg-blue-600 hover:text-white text-slate-200 border border-slate-700/80 active:scale-95 cursor-pointer shadow-sm'
                        }`}
                        title={item.full}
                      >
                        <span className="truncate mr-1 text-left">{item.label}</span>
                        {item.label !== item.id && (
                          <span className={`text-[10px] font-mono shrink-0 ${isCurrent ? 'text-slate-950 font-black' : 'text-slate-400 opacity-70'}`}>
                            {item.id}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[250] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-slate-700/80 rounded-2xl w-full max-w-7xl h-[92vh] max-h-[920px] flex flex-col shadow-2xl overflow-hidden text-white">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>{language === 'zh' ? '比賽攻守紀錄表與數據管理' : language === 'ja' ? '試合スコアブックと選手記録' : 'Game Box Score & Player Records'}</span>
              </h2>
              <p className="text-xs text-slate-400 hidden sm:block">
                {language === 'zh' ? '即時彙整雙方攻守成績、修改個人數據、保存歷史比賽與一鍵匯出紀錄表' : 'View, edit, save game box scores and export clean records'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-4 sm:px-6 pt-2.5 pb-2 border-b border-slate-800/80 bg-slate-900/90 shrink-0 gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setActiveTab('boxscore')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'boxscore'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText size={15} />
              <span>{language === 'zh' ? '攻守紀錄表' : language === 'ja' ? 'ボックススコア' : 'Box Score'}</span>
            </button>

            <button
              onClick={() => setActiveTab('playbyplay')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'playbyplay'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ListOrdered size={15} />
              <span>{language === 'zh' ? '逐打席紀錄表' : language === 'ja' ? '打席詳細速報' : 'Play-by-Play'}</span>
              {effectivePlayByPlay.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-mono">
                  {effectivePlayByPlay.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('edit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'edit'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Edit2 size={15} />
              <span>{language === 'zh' ? '更改數據紀錄' : language === 'ja' ? '記録の変更' : 'Edit Records'}</span>
            </button>

            <button
              onClick={() => setActiveTab('archive')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'archive'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <History size={15} />
              <span>{language === 'zh' ? '存檔紀錄簿' : language === 'ja' ? '保存済み記録' : 'Saved Archive'}</span>
              {savedRecords.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-mono">
                  {savedRecords.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('export')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'export'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Share2 size={15} />
              <span>{language === 'zh' ? '匯出整理與分享' : language === 'ja' ? '出力と共有' : 'Export & Share'}</span>
            </button>
          </div>

          {/* Quick Header Export Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer bg-emerald-950/60 hover:bg-emerald-800/80 border-emerald-600/60 text-emerald-300 hover:text-white"
              title="匯出包含攻守紀錄與逐打席的 Excel 試算表 (.xlsx)"
            >
              <FileSpreadsheet size={14} className="text-emerald-400" />
              <span className="hidden sm:inline">匯出 Excel</span>
            </button>

            <button
              onClick={handleExportJson}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white"
              title="下載 JSON 原始資料"
            >
              <Download size={14} className="text-blue-400" />
              <span className="hidden sm:inline">JSON</span>
            </button>

            <button
              onClick={handleCopyTextReport}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-900/50 border-emerald-500 text-emerald-300'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? (language === 'zh' ? '已複製！' : 'Copied!') : (language === 'zh' ? '複製' : 'Copy')}</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
          
          {/* TAB 1: BOX SCORE VIEW */}
          {activeTab === 'boxscore' && (
            <div className="space-y-4">
              
              {/* Line Score (每局比分總表) */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-lg overflow-x-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Trophy size={14} className="text-yellow-400" />
                    <span>{language === 'zh' ? '比賽即時記分板 (Line Score)' : 'Game Line Score'}</span>
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    {language === 'zh' ? `目前：${state.isTop ? '▲ 上半局' : '▼ 下半局'} 第 ${state.inning} 局` : `Current: ${state.isTop ? 'Top' : 'Bot'} Inning ${state.inning}`}
                  </span>
                </div>

                <table className="w-full text-center border-collapse text-xs sm:text-sm font-mono min-w-[500px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold">
                      <th className="py-1.5 px-3 text-left font-sans">{language === 'zh' ? '隊伍' : 'Team'}</th>
                      {inningsArray.map(inn => (
                        <th key={inn} className="py-1.5 px-2 font-bold w-8">{inn}</th>
                      ))}
                      <th className="py-1.5 px-3 font-black text-yellow-400 border-l border-slate-800 w-10">R</th>
                      <th className="py-1.5 px-3 font-bold text-sky-400 w-10">H</th>
                      <th className="py-1.5 px-3 font-bold text-rose-400 w-10">E</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Away Team Row */}
                    <tr className="border-b border-slate-800/60 font-bold hover:bg-slate-800/30">
                      <td className="py-2 px-3 text-left font-sans flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: state.awayTeam.color }} />
                        <span className="text-white font-bold">{state.awayTeam.name}</span>
                        {state.isTop && <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.2 rounded font-bold">攻</span>}
                      </td>
                      {inningsArray.map((_, i) => (
                        <td key={i} className="py-2 px-2 text-slate-300">
                          {state.awayTeam.inningScores[i] !== null && state.awayTeam.inningScores[i] !== undefined 
                            ? state.awayTeam.inningScores[i] 
                            : '-'}
                        </td>
                      ))}
                      <td className="py-2 px-3 font-black text-yellow-400 border-l border-slate-800 text-base">
                        {state.awayTeam.score}
                      </td>
                      <td className="py-2 px-3 font-bold text-sky-400 text-sm">
                        {state.awayTeam.hits}
                      </td>
                      <td className="py-2 px-3 font-bold text-rose-400 text-sm">
                        {state.awayTeam.errors}
                      </td>
                    </tr>

                    {/* Home Team Row */}
                    <tr className="font-bold hover:bg-slate-800/30">
                      <td className="py-2 px-3 text-left font-sans flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: state.homeTeam.color }} />
                        <span className="text-white font-bold">{state.homeTeam.name}</span>
                        {!state.isTop && <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.2 rounded font-bold">攻</span>}
                      </td>
                      {inningsArray.map((_, i) => (
                        <td key={i} className="py-2 px-2 text-slate-300">
                          {state.homeTeam.inningScores[i] !== null && state.homeTeam.inningScores[i] !== undefined 
                            ? state.homeTeam.inningScores[i] 
                            : '-'}
                        </td>
                      ))}
                      <td className="py-2 px-3 font-black text-yellow-400 border-l border-slate-800 text-base">
                        {state.homeTeam.score}
                      </td>
                      <td className="py-2 px-3 font-bold text-sky-400 text-sm">
                        {state.homeTeam.hits}
                      </td>
                      <td className="py-2 px-3 font-bold text-rose-400 text-sm">
                        {state.homeTeam.errors}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                <div className="lg:col-span-8 space-y-4">
                  {/* Team Selector & Pitcher Card */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveTeamTab('away')}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          activeTeamTab === 'away'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: state.awayTeam.color }} />
                        <span>{state.awayTeam.name} {language === 'zh' ? '打線成績' : 'Batting'}</span>
                      </button>

                      <button
                        onClick={() => setActiveTeamTab('home')}
                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          activeTeamTab === 'home'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: state.homeTeam.color }} />
                        <span>{state.homeTeam.name} {language === 'zh' ? '打線成績' : 'Batting'}</span>
                      </button>
                    </div>

                    {/* Pitcher Summary Badge */}
                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs font-mono">
                      <span className="text-slate-400 font-bold">{currentDisplayTeam.name} 投手:</span>
                      <span className="text-white font-bold">{currentDisplayTeam.pitcher.name || '---'} #{currentDisplayTeam.pitcher.number}</span>
                      <span className="text-slate-500">|</span>
                      <span className="text-yellow-400 font-bold">
                        打者: {(() => {
                          const prevBf = (currentDisplayTeam.pitcherHistory || []).reduce((acc, p) => acc + (p.battersFaced || 0), 0);
                          const calculated = Math.max(0, otherTeam.lineup.reduce((acc, p) => acc + (p.atBats?.length || 0), 0) - prevBf) + (isDisplayTeamPitching ? 1 : 0);
                          return (typeof currentDisplayTeam.pitcher.battersFaced === 'number' && currentDisplayTeam.pitcher.battersFaced > 0)
                            ? currentDisplayTeam.pitcher.battersFaced
                            : calculated;
                        })()}
                      </span>
                      <span className="text-slate-500">|</span>
                      <span className="text-sky-300 font-bold">用球: {getPitcherCount(currentDisplayTeam.pitcher)}</span>
                    </div>
                  </div>

                  {/* Batting Records Table */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-lg overflow-x-auto">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentDisplayTeam.color }} />
                        <span>{currentDisplayTeam.name} {language === 'zh' ? '全體球員攻守數據明細表' : 'Batting Box Score'}</span>
                      </span>
                      <span className="text-[11px] text-amber-300 font-medium">
                        {language === 'zh' ? '💡 點擊任一打席，即可由右側更換結果' : 'Click any at-bat to change outcome from right panel'}
                      </span>
                    </div>

                    <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[700px]">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-mono font-bold text-center">
                          <th className="py-2 px-2 text-left font-sans w-12">{language === 'zh' ? '棒次' : 'Ord'}</th>
                          <th className="py-2 px-2 w-12 font-sans">{language === 'zh' ? '背號' : 'No.'}</th>
                          <th className="py-2 px-3 text-left font-sans">{language === 'zh' ? '選手姓名' : 'Name'}</th>
                          <th className="py-2 px-2 w-12 font-sans">{language === 'zh' ? '守備' : 'Pos'}</th>
                          <th className="py-2 px-2 w-12 font-bold">{language === 'zh' ? '打數' : 'AB'}</th>
                          <th className="py-2 px-2 w-12 font-bold">{language === 'zh' ? '得分' : 'R'}</th>
                          <th className="py-2 px-2 w-12 font-bold text-yellow-400">{language === 'zh' ? '安打' : 'H'}</th>
                          <th className="py-2 px-2 w-12 font-bold">{language === 'zh' ? '打點' : 'RBI'}</th>
                          <th className="py-2 px-2 w-12 font-bold text-sky-400">{language === 'zh' ? '四死' : 'BB'}</th>
                          <th className="py-2 px-2 w-12 font-bold text-rose-400">{language === 'zh' ? '三振' : 'SO'}</th>
                          <th className="py-2 px-3 w-16 font-bold text-amber-300">{language === 'zh' ? '打擊率' : 'AVG'}</th>
                          <th className="py-2 px-3 text-left font-sans">{language === 'zh' ? '打席結果歷程 (點選更換)' : 'At-Bat Breakdown'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentDisplayTeam.lineup.flatMap((p, idx) => {
                          const isCurrentBatter = (state.isTop && activeTeamTab === 'away') || (!state.isTop && activeTeamTab === 'home') 
                            ? currentDisplayTeam.currentBatterIndex === idx 
                            : false;
                          const rows = [];

                          // Render substituted-out previous players for this order slot (starting player on top)
                          if (p.previousPlayers && p.previousPlayers.length > 0) {
                            p.previousPlayers.forEach((prevP, prevIdx) => {
                              const sPrev = getPlayerBattingStats(prevP);
                              const isFirstStarter = prevIdx === 0;
                              rows.push(
                                <tr 
                                  key={`${prevP.id || idx}-prev-${prevIdx}`}
                                  className="border-b border-slate-800/40 font-mono text-center hover:bg-slate-800/30 transition-colors bg-slate-900/30 text-slate-300"
                                >
                                  <td className="py-2 px-2 text-left font-bold text-slate-300 align-middle">
                                    {isFirstStarter ? `${idx + 1}.` : ''}
                                  </td>
                                  <td className="py-2 px-2 text-slate-400 font-bold align-middle">
                                    #{prevP.number || '--'}
                                  </td>
                                  <td className="py-2 px-3 text-left font-sans font-bold text-slate-200 align-middle">
                                    <div className="inline-flex items-center gap-1.5">
                                      <span>{prevP.name}</span>
                                      <span className="text-[10px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-mono border border-slate-700">先發</span>
                                    </div>
                                  </td>
                                  <td className="py-2 px-2 text-slate-400 font-sans font-bold align-middle">
                                    {prevP.position || 'DH'}
                                  </td>
                                  <td className="py-2 px-2 font-bold text-slate-300 align-middle">{sPrev.ab}</td>
                                  <td className="py-2 px-2 font-bold text-slate-300 align-middle">{sPrev.r}</td>
                                  <td className="py-2 px-2 font-bold text-yellow-400 align-middle">{sPrev.h}</td>
                                  <td className="py-2 px-2 font-bold text-slate-300 align-middle">{sPrev.rbi}</td>
                                  <td className="py-2 px-2 font-bold text-sky-400 align-middle">{sPrev.bb}</td>
                                  <td className="py-2 px-2 font-bold text-rose-400 align-middle">{sPrev.so}</td>
                                  <td className="py-2 px-3 font-bold text-amber-300 align-middle">{sPrev.avg}</td>
                                  <td className="py-2 px-3 text-left align-middle">
                                    <div className="flex flex-wrap items-center gap-1.5 font-sans">
                                      {sPrev.atBats.length === 0 ? (
                                        <span className="text-slate-500 text-xs italic">無打席</span>
                                      ) : (
                                        sPrev.atBats.map((ab, abIdx) => {
                                          const isSelected = selectedAtBat?.playerIndex === idx && selectedAtBat?.abIndex === abIdx && selectedAtBat?.prevIndex === prevIdx;
                                          return (
                                            <button 
                                              key={abIdx} 
                                              type="button"
                                              onClick={() => setSelectedAtBat(isSelected ? null : { playerIndex: idx, abIndex: abIdx, current: ab, prevIndex: prevIdx })}
                                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                                isSelected 
                                                  ? 'bg-amber-400 text-slate-950 font-black ring-2 ring-amber-300 ring-offset-1 ring-offset-slate-900 shadow-md scale-105' 
                                                  : `${getOutcomeBadgeStyle(ab)} hover:brightness-125 border shadow-sm active:scale-95`
                                              }`}
                                              title="點選此打席更換結果"
                                            >
                                              <span className="text-[10px] opacity-70">#{abIdx + 1}</span>
                                              <span>{ab}</span>
                                              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />}
                                            </button>
                                          );
                                        })
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            });
                          }

                          // Current player in this slot (if substituted, shown below original player without order number)
                          const isSub = Boolean(p.previousPlayers && p.previousPlayers.length > 0);
                          const s = getPlayerBattingStats(p);

                          rows.push(
                            <tr 
                              key={p.id || idx} 
                              className={`border-b border-slate-800/60 font-mono text-center hover:bg-slate-800/40 transition-colors ${
                                isCurrentBatter ? 'bg-blue-950/40 border-l-2 border-l-blue-400' : isSub ? 'bg-amber-950/20' : ''
                              }`}
                            >
                              <td className="py-2 px-2 text-left font-bold text-slate-300 align-middle">
                                {!isSub ? `${idx + 1}.` : <span className="text-amber-400/80 font-black pl-1.5">↳</span>}
                              </td>
                              <td className="py-2 px-2 text-slate-400 font-bold align-middle">
                                #{p.number || '--'}
                              </td>
                              <td className="py-2 px-3 text-left font-sans font-bold text-white align-middle">
                                <div className="inline-flex items-center gap-1.5">
                                  <span className={isSub ? 'text-amber-300' : ''}>{p.name}</span>
                                  {isSub && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 font-mono">
                                      代打
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 px-2 text-slate-400 font-sans font-bold align-middle">
                                {p.position || (isSub ? 'PH' : 'DH')}
                              </td>
                              <td className="py-2 px-2 font-bold text-slate-200 align-middle">{s.ab}</td>
                              <td className="py-2 px-2 font-bold text-slate-200 align-middle">{s.r}</td>
                              <td className="py-2 px-2 font-bold text-yellow-400 align-middle">{s.h}</td>
                              <td className="py-2 px-2 font-bold text-slate-200 align-middle">{s.rbi}</td>
                              <td className="py-2 px-2 font-bold text-sky-400 align-middle">{s.bb}</td>
                              <td className="py-2 px-2 font-bold text-rose-400 align-middle">{s.so}</td>
                              <td className="py-2 px-3 font-bold text-amber-300 align-middle">{s.avg}</td>
                              <td className="py-2 px-3 text-left align-middle">
                                <div className="flex flex-wrap items-center gap-1.5 font-sans">
                                  {s.atBats.length === 0 ? (
                                    <span className="text-slate-500 text-xs italic">無打席</span>
                                  ) : (
                                    s.atBats.map((ab, abIdx) => {
                                      const isSelected = selectedAtBat?.playerIndex === idx && selectedAtBat?.abIndex === abIdx && selectedAtBat?.prevIndex === undefined;
                                      return (
                                        <button 
                                          key={abIdx} 
                                          type="button"
                                          onClick={() => setSelectedAtBat(isSelected ? null : { playerIndex: idx, abIndex: abIdx, current: ab })}
                                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                            isSelected 
                                              ? 'bg-amber-400 text-slate-950 font-black ring-2 ring-amber-300 ring-offset-1 ring-offset-slate-900 shadow-md scale-105' 
                                              : `${getOutcomeBadgeStyle(ab)} hover:brightness-125 border shadow-sm active:scale-95`
                                          }`}
                                          title="點選此打席，再從右側更換結果"
                                        >
                                          <span className="text-[10px] opacity-70">#{abIdx + 1}</span>
                                          <span>{ab}</span>
                                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />}
                                        </button>
                                      );
                                    })
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const isAddingNew = selectedAtBat?.playerIndex === idx && selectedAtBat?.abIndex === 'new' && selectedAtBat?.prevIndex === undefined;
                                      setSelectedAtBat(isAddingNew ? null : { playerIndex: idx, abIndex: 'new', current: '' });
                                    }}
                                    className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                      selectedAtBat?.playerIndex === idx && selectedAtBat?.abIndex === 'new' && selectedAtBat?.prevIndex === undefined
                                        ? 'bg-blue-600 text-white font-black ring-2 ring-blue-300 scale-105'
                                        : 'bg-slate-800/60 hover:bg-slate-800 text-blue-400 border-dashed border-blue-500/40 hover:border-blue-400 active:scale-95'
                                    }`}
                                    title="點選後再由右邊選項新增打席"
                                  >
                                    <Plus size={11} />
                                    <span>新增</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );

                          return rows;
                        })}

                        {/* Team Total Row */}
                        {(() => {
                          const totals = getTeamTotals(currentDisplayTeam);
                          return (
                            <tr className="bg-slate-900/90 font-mono font-bold text-center border-t-2 border-slate-700">
                              <td colSpan={4} className="py-2.5 px-3 text-left font-sans font-black text-yellow-400">
                                {language === 'zh' ? '團隊合計 (TOTALS)' : 'TEAM TOTALS'}
                              </td>
                              <td className="py-2.5 px-2 text-white">{totals.ab}</td>
                              <td className="py-2.5 px-2 text-white">{totals.r}</td>
                              <td className="py-2.5 px-2 text-yellow-400">{totals.h}</td>
                              <td className="py-2.5 px-2 text-white">{totals.rbi}</td>
                              <td className="py-2.5 px-2 text-sky-400">{totals.bb}</td>
                              <td className="py-2.5 px-2 text-rose-400">{totals.so}</td>
                              <td className="py-2.5 px-3 text-amber-300">{totals.avg}</td>
                              <td className="py-2.5 px-3 text-left text-slate-400 text-xs font-sans">
                                {currentDisplayTeam.lineup.reduce((cnt, p) => cnt + 1 + (p.previousPlayers?.length || 0), 0)} 位打者出賽
                              </td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Pitching Summary Table */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-lg overflow-x-auto">
                    <div className="text-xs font-black text-slate-300 mb-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentDisplayTeam.color }} />
                      <span>{currentDisplayTeam.name} {language === 'zh' ? '投手投球成績' : 'Pitching Records'}</span>
                    </div>

                    <table className="w-full text-center border-collapse text-xs sm:text-sm font-mono min-w-[650px]">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-bold">
                          <th className="py-2 px-3 text-left font-sans">{language === 'zh' ? '投手姓名' : 'Pitcher'}</th>
                          <th className="py-2 px-2">{language === 'zh' ? '背號' : 'No.'}</th>
                          <th className="py-2 px-2 font-sans">{language === 'zh' ? '狀態' : 'Status'}</th>
                          <th className="py-2 px-2 text-yellow-400">{language === 'zh' ? '打者' : 'BF'}</th>
                          <th className="py-2 px-2 text-slate-300">{language === 'zh' ? '投球局數' : 'IP'}</th>
                          <th className="py-2 px-2 text-sky-300">{language === 'zh' ? '用球數' : 'NP'}</th>
                          <th className="py-2 px-2 text-rose-400">{language === 'zh' ? '奪三振' : 'SO'}</th>
                          <th className="py-2 px-2">{language === 'zh' ? '被安打' : 'H'}</th>
                          <th className="py-2 px-2">{language === 'zh' ? '失分' : 'R'}</th>
                          <th className="py-2 px-2">{language === 'zh' ? '責失' : 'ER'}</th>
                          <th className="py-2 px-2">{language === 'zh' ? '四死球' : 'BB'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Substituted-off pitchers */}
                        {(currentDisplayTeam.pitcherHistory || []).map((hp, hIdx) => {
                          const bf = (typeof hp.battersFaced === 'number' && hp.battersFaced > 0) ? hp.battersFaced : otherTeam.lineup.reduce((acc, p) => acc + (p.atBats?.length || 0), 0);
                          return (
                            <tr key={hp.id || `h-${hIdx}`} className="border-b border-slate-800/40 hover:bg-slate-800/20 text-slate-300 bg-slate-900/30">
                              <td className="py-2.5 px-3 text-left font-sans text-slate-200 font-bold flex items-center gap-2">
                                <span>{hp.name || '---'}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">P</span>
                              </td>
                              <td className="py-2.5 px-2 text-slate-400">#{hp.number || '--'}</td>
                              <td className="py-2.5 px-2">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-bold border border-slate-700">退場</span>
                              </td>
                              <td className="py-2.5 px-2 text-yellow-400 font-bold">{bf}</td>
                              <td className="py-2.5 px-2 text-slate-300 font-bold">{hp.inningsPitched || '0.0'}</td>
                              <td className="py-2.5 px-2 text-sky-300 font-bold">{getPitcherCount(hp)}</td>
                              <td className="py-2.5 px-2 text-rose-400 font-bold">{hp.strikeouts || 0}</td>
                              <td className="py-2.5 px-2 text-slate-300">{hp.hitsAllowed || 0}</td>
                              <td className="py-2.5 px-2 text-slate-300">{hp.runsAllowed || 0}</td>
                              <td className="py-2.5 px-2 text-slate-300">{hp.earnedRuns || 0}</td>
                              <td className="py-2.5 px-2 text-slate-300">{hp.walks || 0}</td>
                            </tr>
                          );
                        })}

                        {/* Current pitcher on the field */}
                        {(() => {
                          const curP = currentDisplayTeam.pitcher;
                          const prevBf = (currentDisplayTeam.pitcherHistory || []).reduce((acc, p) => acc + (p.battersFaced || 0), 0);
                          const calculated = Math.max(0, otherTeam.lineup.reduce((acc, p) => acc + (p.atBats?.length || 0), 0) - prevBf) + (isDisplayTeamPitching ? 1 : 0);
                          const bf = (typeof curP.battersFaced === 'number' && curP.battersFaced > 0)
                            ? curP.battersFaced
                            : calculated;
                          return (
                            <tr className="border-b border-slate-800/60 font-bold hover:bg-slate-800/30">
                              <td className="py-2.5 px-3 text-left font-sans text-white font-bold flex items-center gap-2">
                                <span>{curP.name || '---'}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 font-mono">P</span>
                              </td>
                              <td className="py-2.5 px-2 text-slate-400">#{curP.number || '--'}</td>
                              <td className="py-2.5 px-2">
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">在場上</span>
                              </td>
                              <td className="py-2.5 px-2 text-yellow-400 font-black">{bf}</td>
                              <td className="py-2.5 px-2 text-slate-300 font-black">{curP.inningsPitched || '0.0'}</td>
                              <td className="py-2.5 px-2 text-sky-300 font-bold">{getPitcherCount(curP)}</td>
                              <td className="py-2.5 px-2 text-rose-400 font-bold">{curP.strikeouts || 0}</td>
                              <td className="py-2.5 px-2 text-slate-300">{curP.hitsAllowed || 0}</td>
                              <td className="py-2.5 px-2 text-slate-300">{curP.runsAllowed || 0}</td>
                              <td className="py-2.5 px-2 text-slate-300">{curP.earnedRuns || 0}</td>
                              <td className="py-2.5 px-2 text-slate-300">{curP.walks || 0}</td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right side Outcomes Palette Panel in Tab 1 */}
                <div className="hidden lg:block lg:col-span-4 sticky top-1 space-y-3">
                  {renderOutcomePalette(currentDisplayTeam)}
                </div>
              </div>

              {/* On compact / mobile screens (< lg), if an at-bat is selected, dock outcome palette cleanly at bottom */}
              {selectedAtBat && (
                <div className="lg:hidden sticky bottom-0 left-0 right-0 z-40 bg-slate-950/98 backdrop-blur-md border-t-2 border-amber-500 rounded-t-2xl shadow-2xl p-3 -mx-3 -mb-3 sm:-mx-5 sm:-mb-5 animate-in slide-in-from-bottom duration-200">
                  {renderOutcomePalette(currentDisplayTeam, true)}
                </div>
              )}
            </div>
          )}

          {/* TAB 1.5: PLAY-BY-PLAY (逐打席紀錄表) */}
          {activeTab === 'playbyplay' && (
            <div className="space-y-4">
              
              {/* Header & Controls Banner */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 sm:p-4 shadow-lg space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                      <ListOrdered size={18} className="text-teal-400" />
                      <span>{language === 'zh' ? '逐打席詳細紀錄表 (Play-by-Play)' : 'Play-by-Play Game Log'}</span>
                      <span className="text-xs font-mono font-normal text-teal-300 bg-teal-950/60 border border-teal-500/40 px-2 py-0.5 rounded-full">
                        共 {effectivePlayByPlay.length} 打席
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {language === 'zh' 
                        ? '詳細記載每打席當下出局數、幾壘有人、結束時球數 (B-S)、暴投/捕逸事件與打擊結果' 
                        : 'Detailed log of each PA: outs, runners on base, final count, WP/PB incidents and result'}
                    </p>
                  </div>

                  {/* Actions: Export Excel, Export JSON, Clear */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportExcel}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30 transition-all cursor-pointer active:scale-95"
                    >
                      <FileSpreadsheet size={14} />
                      <span>{language === 'zh' ? '匯出 Excel (.xlsx)' : 'Export Excel'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportJson}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer active:scale-95"
                    >
                      <Download size={14} />
                      <span>{language === 'zh' ? '匯出 JSON' : 'Export JSON'}</span>
                    </button>

                    {effectivePlayByPlay.length > 0 && (
                      !isConfirmClearPbp ? (
                        <button
                          type="button"
                          onClick={() => setIsConfirmClearPbp(true)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 transition-all cursor-pointer active:scale-95"
                          title="清空所有逐打席紀錄"
                        >
                          <Trash2 size={13} />
                          <span className="hidden sm:inline">{language === 'zh' ? '清空紀錄' : 'Clear'}</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-rose-950/90 border border-rose-600/80 px-2.5 py-1 rounded-xl shadow-lg animate-in fade-in duration-150">
                          <span className="text-[11px] text-rose-200 font-bold whitespace-nowrap">
                            {language === 'zh' ? '確定清空紀錄？' : 'Clear all?'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              dispatch({ type: 'CLEAR_PLAY_BY_PLAY' });
                              setIsConfirmClearPbp(false);
                            }}
                            className="px-2 py-0.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow cursor-pointer active:scale-95"
                          >
                            {language === 'zh' ? '確定' : 'Yes'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsConfirmClearPbp(false)}
                            className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer active:scale-95"
                          >
                            {language === 'zh' ? '取消' : 'Cancel'}
                          </button>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* Inning Filter Navigation */}
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-2 mb-2">
                    <Filter size={13} className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-300">
                      {language === 'zh' ? '分局篩選 (點選切換該局，避免長度過長)：' : 'Filter by Inning:'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* ALL button */}
                    <button
                      type="button"
                      onClick={() => setSelectedInningFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        selectedInningFilter === 'all'
                          ? 'bg-teal-600 text-white shadow-md shadow-teal-900/40 ring-1 ring-teal-400'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                      }`}
                    >
                      <span>{language === 'zh' ? '全部局數' : 'All Innings'}</span>
                      <span className="text-[10px] opacity-75 font-mono">({effectivePlayByPlay.length})</span>
                    </button>

                    {/* Innings 1 to N buttons */}
                    {Array.from(
                      { length: Math.max(9, state.inning, ...effectivePlayByPlay.map(p => p.inning)) },
                      (_, i) => i + 1
                    ).map(inn => {
                      const countInInning = effectivePlayByPlay.filter(p => p.inning === inn).length;
                      const isCurrentGameInning = state.inning === inn;
                      const isSelected = selectedInningFilter === inn;

                      return (
                        <button
                          key={inn}
                          type="button"
                          onClick={() => setSelectedInningFilter(inn)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            isSelected
                              ? 'bg-teal-600 text-white shadow-md shadow-teal-900/40 ring-1 ring-teal-400'
                              : countInInning > 0
                                ? 'bg-slate-900 hover:bg-slate-800 text-white border border-slate-700'
                                : 'bg-slate-900/60 hover:bg-slate-800/80 text-slate-500 border border-slate-800/60'
                          }`}
                        >
                          <span>{language === 'zh' ? `第 ${inn} 局` : `Inn ${inn}`}</span>
                          {countInInning > 0 && (
                            <span className={`text-[10px] px-1 rounded-full font-mono ${
                              isSelected ? 'bg-teal-900/80 text-teal-200' : 'bg-slate-800 text-slate-300'
                            }`}>
                              {countInInning}
                            </span>
                          )}
                          {isCurrentGameInning && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse ml-0.5" title="進行中" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Play-by-Play List Display */}
              {(() => {
                const filteredPbp = selectedInningFilter === 'all'
                  ? effectivePlayByPlay
                  : effectivePlayByPlay.filter(p => p.inning === selectedInningFilter);

                if (filteredPbp.length === 0) {
                  return (
                    <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800/60 text-slate-500 flex items-center justify-center">
                        <ListOrdered size={24} />
                      </div>
                      <h4 className="text-white font-bold text-sm">
                        {selectedInningFilter === 'all'
                          ? (language === 'zh' ? '目前尚無打席紀錄' : 'No plate appearance records yet')
                          : (language === 'zh' ? `第 ${selectedInningFilter} 局尚無打席紀錄` : `No records in Inning ${selectedInningFilter}`)}
                      </h4>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        {language === 'zh'
                          ? '在計分板記錄安打、出局、四死球或暴投時，系統將即時自動寫入逐打席歷程！可點選上方「全部局數」或其他局數瀏覽。'
                          : 'As you record at-bats, singles, home runs, outs, walks, or wild pitches, records will automatically appear here!'}
                      </p>
                      {selectedInningFilter !== 'all' && (
                        <button
                          type="button"
                          onClick={() => setSelectedInningFilter('all')}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                        >
                          {language === 'zh' ? '顯示全部局數' : 'Show All Innings'}
                        </button>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {/* List of Play-by-Play items */}
                    <div className="grid grid-cols-1 gap-2.5">
                      {filteredPbp.map((pa, idx) => {
                        const isTop = pa.isTop;
                        const battingColor = isTop ? state.awayTeam.color : state.homeTeam.color;
                        const pitchingColor = isTop ? state.homeTeam.color : state.awayTeam.color;

                        // Diamond base representation
                        const base1 = pa.bases[0];
                        const base2 = pa.bases[1];
                        const base3 = pa.bases[2];
                        const runnerCount = [base1, base2, base3].filter(Boolean).length;
                        const baseText = runnerCount === 0 
                          ? '無人在壘' 
                          : runnerCount === 3 
                            ? '滿壘' 
                            : [base1 ? '一壘' : null, base2 ? '二壘' : null, base3 ? '三壘' : null].filter(Boolean).join('、') + '有人';

                        const hasEvents = Boolean(pa.eventsDuringPa && pa.eventsDuringPa.length > 0);
                        const isExpanded = Boolean(expandedPaIds[pa.id]);

                        return (
                          <div
                            key={pa.id || idx}
                            onClick={() => {
                              if (hasEvents) {
                                setExpandedPaIds(prev => ({ ...prev, [pa.id]: !prev[pa.id] }));
                              }
                            }}
                            className={`bg-slate-950/85 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-lg transition-all ${
                              hasEvents 
                                ? 'cursor-pointer hover:border-amber-500/40 hover:bg-slate-900/80' 
                                : 'hover:border-slate-700/90 hover:bg-slate-900/60'
                            }`}
                          >
                            {/* Card Header */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 font-mono font-bold text-[11px] border border-slate-700">
                                  PA #{pa.paNumber}
                                </span>

                                <span className={`px-2 py-0.5 rounded-lg font-bold text-[11px] flex items-center gap-1 ${
                                  isTop ? 'bg-blue-950 text-blue-300 border border-blue-800/60' : 'bg-indigo-950 text-indigo-300 border border-indigo-800/60'
                                }`}>
                                  <span>{isTop ? '▲' : '▼'}</span>
                                  <span>{pa.inning} 局{isTop ? '上' : '下'}</span>
                                </span>

                                <div className="flex items-center gap-1.5 font-bold">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: battingColor }} />
                                  <span className="text-white">{pa.battingTeamName}</span>
                                  <span className="text-slate-500 text-[10px]">進攻</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
                                <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-300">
                                  比分 {state.awayTeam.name} {pa.awayScore} - {pa.homeScore} {state.homeTeam.name}
                                </span>
                                {pa.timestamp && (
                                  <span className="hidden sm:inline text-slate-500">
                                    {new Date(pa.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    dispatch({ type: 'DELETE_PLAY_BY_PLAY_RECORD', id: pa.id });
                                  }}
                                  className="text-slate-500 hover:text-rose-400 transition-colors p-1 rounded hover:bg-slate-800 cursor-pointer"
                                  title="刪除此打席紀錄"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            </div>

                            {/* Card Body Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-12 gap-3 pt-3 items-center">
                              
                              {/* 1. Batter Info */}
                              <div className="sm:col-span-3 space-y-0.5">
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                  打者 (Batter)
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-1.5 py-0.2 rounded font-mono">
                                    第 {pa.batterOrder} 棒
                                  </span>
                                  <span className="text-white font-bold text-sm">
                                    {pa.batterName}
                                  </span>
                                  <span className="text-slate-400 font-mono text-xs">
                                    #{pa.batterNumber}
                                  </span>
                                </div>
                              </div>

                              {/* 2. Pitcher Info */}
                              <div className="sm:col-span-2 space-y-0.5">
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                  <span>投手 (Pitcher)</span>
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pitchingColor }} />
                                </div>
                                <div className="flex items-center gap-1 text-slate-200 font-bold text-sm">
                                  <span>{pa.pitcherName}</span>
                                  <span className="text-slate-400 font-mono text-xs">#{pa.pitcherNumber}</span>
                                </div>
                              </div>

                              {/* 3. Outs Situation */}
                              <div className="sm:col-span-2 space-y-0.5">
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                  當下出局數
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${
                                    pa.outs === 0 
                                      ? 'bg-slate-800/80 text-slate-300 border-slate-700' 
                                      : pa.outs === 1 
                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' 
                                        : 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                                  }`}>
                                    {pa.outs} 出局
                                  </span>
                                  {/* Circles */}
                                  <div className="flex items-center gap-1">
                                    <span className={`w-2 h-2 rounded-full ${pa.outs >= 1 ? 'bg-rose-500' : 'bg-slate-700'}`} />
                                    <span className={`w-2 h-2 rounded-full ${pa.outs >= 2 ? 'bg-rose-500' : 'bg-slate-700'}`} />
                                  </div>
                                </div>
                              </div>

                              {/* 4. Runners on Base Situation with Mini Diamond & Event Badge */}
                              <div className="sm:col-span-2 space-y-0.5">
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                  幾壘有人
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {/* Mini Diamond */}
                                  <div className="relative w-6 h-6 shrink-0 flex items-center justify-center">
                                    {/* 2nd base */}
                                    <span className={`absolute top-0 w-2 h-2 rotate-45 border ${
                                      base2 ? 'bg-amber-400 border-amber-200 ring-1 ring-amber-400/60' : 'bg-slate-800 border-slate-700'
                                    }`} />
                                    {/* 3rd base */}
                                    <span className={`absolute left-0 w-2 h-2 rotate-45 border ${
                                      base3 ? 'bg-amber-400 border-amber-200 ring-1 ring-amber-400/60' : 'bg-slate-800 border-slate-700'
                                    }`} />
                                    {/* 1st base */}
                                    <span className={`absolute right-0 w-2 h-2 rotate-45 border ${
                                      base1 ? 'bg-amber-400 border-amber-200 ring-1 ring-amber-400/60' : 'bg-slate-800 border-slate-700'
                                    }`} />
                                    {/* Home plate */}
                                    <span className="absolute bottom-0 w-1.5 h-1.5 rotate-45 bg-slate-600 border border-slate-500" />
                                  </div>

                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`text-xs font-bold ${runnerCount > 0 ? 'text-amber-300' : 'text-slate-400'}`}>
                                      {baseText}
                                    </span>
                                    {/* Subtle Event Badge right next to 幾壘有人 */}
                                    {hasEvents && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedPaIds(prev => ({ ...prev, [pa.id]: !prev[pa.id] }));
                                        }}
                                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer select-none ${
                                          isExpanded
                                            ? 'bg-amber-500/25 text-amber-200 border-amber-400/50 shadow-sm shadow-amber-950/40 ring-1 ring-amber-400/30'
                                            : 'bg-amber-500/10 text-amber-300/80 border-amber-500/25 hover:bg-amber-500/20 hover:text-amber-200'
                                        }`}
                                        title={isExpanded ? '點擊收合打席事件' : '此打席有暴投/捕逸等事件，點擊展開詳情'}
                                      >
                                        <span className="text-[10px] leading-none">⚡</span>
                                        <span className="scale-95 origin-left">事件</span>
                                        <span className="text-[8px] opacity-75 font-mono ml-0.5">
                                          {isExpanded ? '▲' : '▼'}
                                        </span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* 5. Count & Events */}
                              <div className="sm:col-span-3 flex flex-wrap items-center justify-between sm:justify-end gap-2">
                                {/* Balls & Strikes */}
                                <div className="space-y-0.5">
                                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-right">
                                    結束球數
                                  </div>
                                  <div className="flex items-center gap-1.5 font-mono text-xs font-bold bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                                    <span className="text-sky-400">{pa.balls}B</span>
                                    <span className="text-slate-600">-</span>
                                    <span className="text-rose-400">{pa.strikes}S</span>
                                  </div>
                                </div>

                                {/* Outcome Result Badge */}
                                <div className="space-y-0.5 text-right">
                                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    打席結果
                                  </div>
                                  <div className="flex items-center justify-end">
                                    <div className="relative inline-flex items-center">
                                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black border shadow-sm ${getOutcomeBadgeStyle(pa.result)}`}>
                                        {pa.result}
                                      </span>
                                      {pa.rbi > 0 && (
                                        <span 
                                          className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-[3px] bg-red-600 text-white font-mono font-black text-[9px] leading-none flex items-center justify-center shadow border border-red-300 z-10 select-none pointer-events-none"
                                          title={`打點: ${pa.rbi}`}
                                        >
                                          {pa.rbi}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                            </div>

                            {/* In-PA Events Footer (Wild Pitch, Passed Ball, Balk) - Shown only when expanded */}
                            {hasEvents && isExpanded && (
                              <div className="mt-2.5 pt-2 border-t border-slate-800/70 flex items-center gap-2 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
                                <span className="flex items-center gap-1.5 text-amber-300 font-bold text-[11px] bg-amber-950/40 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                                  <AlertTriangle size={12} className="text-amber-400 shrink-0" />
                                  <span className="text-amber-400/90 font-bold">打席內事件：</span>
                                  <span className="text-amber-100">{pa.eventsDuringPa!.join('、')}</span>
                                </span>
                              </div>
                            )}

                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

            </div>
          )}

          {/* TAB 2: EDIT RECORDS (更改球員與攻守紀錄) */}
          {activeTab === 'edit' && (
            <div className="space-y-4">
              
              {/* Top Banner with Save Action */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-amber-950/40 border border-amber-500/50 p-3 sm:p-4 rounded-xl">
                <div>
                  <h3 className="font-bold text-amber-300 text-sm flex items-center gap-2">
                    <Edit2 size={16} />
                    <span>{language === 'zh' ? '即時更改選手數據紀錄' : 'Edit Player Statistics'}</span>
                  </h3>
                  <p className="text-xs text-amber-200/80 mt-0.5">
                    {language === 'zh' ? '在此可直接手動微調任何選手的姓名、背號、打數、得分、安打、打點、打席結果歷程與投手用球數' : 'Modify player names, numbers, AB, H, R, RBI, and at-bat results here.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleApplyEdits}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black shadow-lg transition-all cursor-pointer ${
                      isSavedNotify
                        ? 'bg-emerald-600 text-white shadow-emerald-900/40'
                        : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/40 active:scale-95'
                    }`}
                  >
                    {isSavedNotify ? <Check size={16} /> : <Save size={16} />}
                    <span>{isSavedNotify ? (language === 'zh' ? '已儲存生效！' : 'Saved!') : (language === 'zh' ? '保存更改至比賽' : 'Save Changes')}</span>
                  </button>
                </div>
              </div>

              {/* Team Selector in Edit Mode */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTeamTab('away')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTeamTab === 'away'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: editingAwayTeam.color }} />
                  <span>{editingAwayTeam.name} (客隊)</span>
                </button>

                <button
                  onClick={() => setActiveTeamTab('home')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    activeTeamTab === 'home'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: editingHomeTeam.color }} />
                  <span>{editingHomeTeam.name} (主隊)</span>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* Left 8 cols: Pitcher & Lineup */}
                <div className="lg:col-span-8 space-y-4">
                  {/* Pitcher Editor Card */}
                  <div className="bg-slate-950/80 border border-slate-800 p-3 sm:p-4 rounded-xl space-y-3">
                    <div className="font-bold text-xs text-slate-300 flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="flex items-center gap-1.5">
                        <User size={14} className="text-yellow-400" />
                        <span>{currentEditingTeam.name} 投手數據修改</span>
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">PITCHER</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 text-xs font-mono">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">姓名</label>
                        <input 
                          type="text" 
                          value={currentEditingTeam.pitcher.name || ''} 
                          onChange={(e) => handleUpdateEditingPlayer(activeTeamTab, 'pitcher', 0, 'name', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 px-2 py-1.5 rounded text-white font-sans font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">背號</label>
                        <input 
                          type="text" 
                          value={currentEditingTeam.pitcher.number || ''} 
                          onChange={(e) => handleUpdateEditingPlayer(activeTeamTab, 'pitcher', 0, 'number', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 px-2 py-1.5 rounded text-white font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">打者 (BF)</label>
                        <input 
                          type="number" 
                          value={currentEditingTeam.pitcher.battersFaced !== undefined ? currentEditingTeam.pitcher.battersFaced : ''} 
                          placeholder="自動"
                          onChange={(e) => handleUpdateEditingPlayer(activeTeamTab, 'pitcher', 0, 'battersFaced', parseInt(e.target.value, 10) || 0)}
                          className="w-full bg-slate-900 border border-slate-700 px-2 py-1.5 rounded text-yellow-400 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">投球局數 (IP)</label>
                        <input 
                          type="text" 
                          value={currentEditingTeam.pitcher.inningsPitched || ''} 
                          placeholder="e.g. 5.1"
                          onChange={(e) => handleUpdateEditingPlayer(activeTeamTab, 'pitcher', 0, 'inningsPitched', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 px-2 py-1.5 rounded text-slate-200 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">用球數 (NP)</label>
                        <input 
                          type="number" 
                          value={currentEditingTeam.pitcher.pitchCount ?? (currentEditingTeam.pitcher.stat || 0)} 
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            handleUpdateEditingPlayer(activeTeamTab, 'pitcher', 0, 'pitchCount', val);
                            handleUpdateEditingPlayer(activeTeamTab, 'pitcher', 0, 'stat', String(val));
                          }}
                          className="w-full bg-slate-900 border border-slate-700 px-2 py-1.5 rounded text-sky-300 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">奪三振 (K)</label>
                        <input 
                          type="number" 
                          value={currentEditingTeam.pitcher.strikeouts || 0} 
                          onChange={(e) => handleUpdateEditingPlayer(activeTeamTab, 'pitcher', 0, 'strikeouts', parseInt(e.target.value, 10) || 0)}
                          className="w-full bg-slate-900 border border-slate-700 px-2 py-1.5 rounded text-rose-400 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">失分 (R)</label>
                        <input 
                          type="number" 
                          value={currentEditingTeam.pitcher.runsAllowed || 0} 
                          onChange={(e) => handleUpdateEditingPlayer(activeTeamTab, 'pitcher', 0, 'runsAllowed', parseInt(e.target.value, 10) || 0)}
                          className="w-full bg-slate-900 border border-slate-700 px-2 py-1.5 rounded text-slate-200 font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Lineup Players Edit List */}
                  <div className="bg-slate-950/80 border border-slate-800 p-3 sm:p-4 rounded-xl space-y-3">
                    <div className="font-bold text-xs text-slate-300 flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="flex items-center gap-1.5">
                        <ListOrdered size={14} className="text-blue-400" />
                        <span>{currentEditingTeam.name} 先發打線個別選手修改 ({currentEditingTeam.lineup.length} 人)</span>
                      </span>
                      <span className="text-[11px] text-amber-300 font-medium hidden sm:inline">
                        💡 先點選選手打席，再由右側面板選擇更換
                      </span>
                    </div>

                    <div className="space-y-3">
                      {currentEditingTeam.lineup.map((p, idx) => {
                        const stats = getPlayerBattingStats(p);
                        return (
                          <div 
                            key={p.id || idx} 
                            className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl space-y-2.5 hover:border-slate-700 transition-colors"
                          >
                            {/* Row 1: Player Profile & Quick Numbers */}
                            <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 text-xs items-center font-mono">
                              <div className="sm:col-span-1 font-bold text-slate-400 text-center">
                                第 {idx + 1} 棒
                              </div>
                              <div className="sm:col-span-3">
                                <input 
                                  type="text" 
                                  value={p.name} 
                                  onChange={(e) => handleUpdateEditingPlayer(activeTeamTab, 'lineup', idx, 'name', e.target.value)}
                                  placeholder="選手姓名"
                                  className="w-full bg-slate-950 border border-slate-700 px-2 py-1 rounded text-white font-sans font-bold"
                                />
                              </div>
                              <div className="sm:col-span-2 flex items-center gap-1">
                                <span className="text-slate-400 text-[10px]">#</span>
                                <input 
                                  type="text" 
                                  value={p.number || ''} 
                                  onChange={(e) => handleUpdateEditingPlayer(activeTeamTab, 'lineup', idx, 'number', e.target.value)}
                                  placeholder="背號"
                                  className="w-12 bg-slate-950 border border-slate-700 px-1.5 py-1 rounded text-white font-bold text-center"
                                />
                                <input 
                                  type="text" 
                                  value={p.position || 'DH'} 
                                  onChange={(e) => handleUpdateEditingPlayer(activeTeamTab, 'lineup', idx, 'position', e.target.value)}
                                  placeholder="守備"
                                  className="w-12 bg-slate-950 border border-slate-700 px-1.5 py-1 rounded text-slate-300 font-sans text-center"
                                />
                              </div>
                              
                              {/* Quick Stats Edit */}
                              <div className="sm:col-span-6 flex flex-wrap items-center gap-2 justify-end">
                                <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-800" title="得分 (Runs)">
                                  <span className="text-[10px] text-slate-400">得</span>
                                  <input 
                                    type="number" 
                                    value={p.runs || 0} 
                                    onChange={(e) => handleUpdateEditingPlayer(activeTeamTab, 'lineup', idx, 'runs', parseInt(e.target.value, 10) || 0)}
                                    className="w-8 bg-transparent text-white font-bold text-center outline-none" 
                                  />
                                </div>
                                <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-800" title="安打數 (Hits)">
                                  <span className="text-[10px] text-yellow-400">安</span>
                                  <input 
                                    type="number" 
                                    value={p.hits !== undefined ? p.hits : stats.h} 
                                    onChange={(e) => handleUpdateEditingPlayer(activeTeamTab, 'lineup', idx, 'hits', parseInt(e.target.value, 10) || 0)}
                                    className="w-8 bg-transparent text-yellow-400 font-bold text-center outline-none" 
                                  />
                                </div>
                                <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-800" title="打點 (RBI)">
                                  <span className="text-[10px] text-slate-400">點</span>
                                  <input 
                                    type="number" 
                                    value={p.rbi || 0} 
                                    onChange={(e) => handleUpdateEditingPlayer(activeTeamTab, 'lineup', idx, 'rbi', parseInt(e.target.value, 10) || 0)}
                                    className="w-8 bg-transparent text-white font-bold text-center outline-none" 
                                  />
                                </div>
                                <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-800" title="四死球保送 (BB)">
                                  <span className="text-[10px] text-sky-400">保</span>
                                  <input 
                                    type="number" 
                                    value={p.walks !== undefined ? p.walks : stats.bb} 
                                    onChange={(e) => handleUpdateEditingPlayer(activeTeamTab, 'lineup', idx, 'walks', parseInt(e.target.value, 10) || 0)}
                                    className="w-8 bg-transparent text-sky-400 font-bold text-center outline-none" 
                                  />
                                </div>
                                <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded border border-slate-800" title="三振 (SO)">
                                  <span className="text-[10px] text-rose-400">K</span>
                                  <input 
                                    type="number" 
                                    value={p.strikeouts !== undefined ? p.strikeouts : stats.so} 
                                    onChange={(e) => handleUpdateEditingPlayer(activeTeamTab, 'lineup', idx, 'strikeouts', parseInt(e.target.value, 10) || 0)}
                                    className="w-8 bg-transparent text-rose-400 font-bold text-center outline-none" 
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Row 2: At-Bat Badges (Click to select like position swapping) */}
                            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5 text-xs">
                              <span className="text-[10px] font-bold text-slate-500 font-sans mr-1">打席紀錄:</span>
                              {(p.atBats || []).map((ab, abIdx) => {
                                const isSelected = selectedAtBat?.playerIndex === idx && selectedAtBat?.abIndex === abIdx;
                                return (
                                  <button 
                                    key={abIdx} 
                                    type="button"
                                    onClick={() => setSelectedAtBat(isSelected ? null : { playerIndex: idx, abIndex: abIdx, current: ab })}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                      isSelected 
                                        ? 'bg-amber-500 text-slate-950 font-black ring-2 ring-amber-300 shadow-md shadow-amber-500/30 scale-105' 
                                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-500 active:scale-95'
                                    }`}
                                    title="點選此打席，再從右側面板點選結果進行更換"
                                  >
                                    <span className="text-[10px] opacity-70">#{abIdx + 1}</span>
                                    <span>{ab}</span>
                                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />}
                                  </button>
                                );
                              })}

                              {/* Button to add new at-bat */}
                              {(() => {
                                const isAddingNew = selectedAtBat?.playerIndex === idx && selectedAtBat?.abIndex === 'new';
                                return (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedAtBat(isAddingNew ? null : { playerIndex: idx, abIndex: 'new', current: '' })}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                      isAddingNew
                                        ? 'bg-blue-600 text-white font-black ring-2 ring-blue-300 shadow-md scale-105'
                                        : 'bg-slate-800/60 hover:bg-slate-800 text-blue-400 border-dashed border-blue-500/40 hover:border-blue-400 active:scale-95'
                                    }`}
                                    title="點選後再按右邊選項新增打席"
                                  >
                                    <Plus size={12} />
                                    <span>新增打席</span>
                                  </button>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right 4 cols: Sticky Outcome Palette Panel */}
                <div className="hidden lg:block lg:col-span-4 sticky top-1 space-y-3">
                  {renderOutcomePalette(currentEditingTeam)}
                </div>
              </div>

              {/* On compact / mobile screens (< lg), if an at-bat is selected, dock outcome palette cleanly at bottom */}
              {selectedAtBat && (
                <div className="lg:hidden sticky bottom-0 left-0 right-0 z-40 bg-slate-950/98 backdrop-blur-md border-t-2 border-amber-500 rounded-t-2xl shadow-2xl p-3 -mx-3 -mb-3 sm:-mx-5 sm:-mb-5 animate-in slide-in-from-bottom duration-200">
                  {renderOutcomePalette(currentEditingTeam, true)}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ARCHIVE & SAVED RECORDS (儲存與歷史紀錄管理) */}
          {activeTab === 'archive' && (
            <div className="space-y-4">
              
              {/* Save Current Game Box */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3 shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Save size={16} className="text-emerald-400" />
                    <span>{language === 'zh' ? '將當前比賽儲存為歷史紀錄' : 'Save Current Game to Archive'}</span>
                  </h3>
                  {saveSuccess && (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={14} />
                      <span>{language === 'zh' ? '已成功儲存！' : 'Saved successfully!'}</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      {language === 'zh' ? '紀錄標題 / 賽事名稱' : 'Record Title'}
                    </label>
                    <input 
                      type="text" 
                      value={recordTitle} 
                      onChange={(e) => setRecordTitle(e.target.value)}
                      placeholder="例：2026/10/01 週末友誼賽 G1"
                      className="w-full bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg text-sm text-white font-bold outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">
                      {language === 'zh' ? '備註說明 (選填)' : 'Notes (Optional)'}
                    </label>
                    <input 
                      type="text" 
                      value={recordNotes} 
                      onChange={(e) => setRecordNotes(e.target.value)}
                      placeholder="例：九局下再見全壘打"
                      className="w-full bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg text-sm text-white outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={saveCurrentGame}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-900/40 active:scale-95 transition-all cursor-pointer"
                  >
                    <Save size={15} />
                    <span>{language === 'zh' ? '保存此場紀錄' : 'Save Game Record'}</span>
                  </button>
                </div>
              </div>

              {/* Saved Records List */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3 shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <History size={16} className="text-blue-400" />
                    <span>{language === 'zh' ? '已儲存之歷史比賽紀錄' : 'Saved Game Archives'}</span>
                    <span className="text-xs font-mono text-slate-400">({savedRecords.length} 場)</span>
                  </h3>
                </div>

                {savedRecords.length === 0 ? (
                  <div className="text-center py-10 text-slate-500 text-xs">
                    <p className="text-2xl mb-2">📋</p>
                    <p>{language === 'zh' ? '目前尚無儲存的歷史紀錄，可點擊上方「保存此場紀錄」將比賽存檔。' : 'No saved records yet.'}</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {savedRecords.map(rec => (
                      <div 
                        key={rec.id} 
                        className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 p-3 sm:p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="font-bold text-white text-sm flex items-center gap-2">
                            <span>{rec.title}</span>
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                              第 {rec.totalInnings} 局
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-3 font-mono">
                            <span className="text-white font-bold">
                              {rec.awayTeamName} {rec.awayScore} : {rec.homeScore} {rec.homeTeamName}
                            </span>
                            <span>·</span>
                            <span>{rec.date}</span>
                            {rec.notes && (
                              <>
                                <span>·</span>
                                <span className="text-slate-500 font-sans italic">{rec.notes}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            onClick={() => loadRecordToBoard(rec)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95"
                            title="載入這場比賽至計分板"
                          >
                            <RotateCcw size={13} />
                            <span>{language === 'zh' ? '載入至計分板' : 'Load Game'}</span>
                          </button>

                          <button
                            onClick={() => deleteRecord(rec.id)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                            title="刪除此紀錄"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: EXPORT & SHARE (整理紀錄表、複製純文字與 JSON 備份) */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              
              {/* Quick Actions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                
                {/* 1. Copy Plain Text Box Score */}
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex flex-col justify-between space-y-3">
                  <div>
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center mb-2">
                      <Copy size={16} />
                    </div>
                    <h4 className="font-bold text-white text-sm">
                      {language === 'zh' ? '一鍵複製純文字紀錄' : 'Copy Plain Text Box Score'}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      {language === 'zh' ? '整理為排版工整之文字成績表，適合直接貼在 LINE 群組或社群軟體。' : 'Formatted for messaging apps and social media.'}
                    </p>
                  </div>
                  <button
                    onClick={handleCopyTextReport}
                    className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      copied 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95'
                    }`}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copied ? (language === 'zh' ? '已複製到剪貼簿！' : 'Copied!') : (language === 'zh' ? '複製文字紀錄' : 'Copy Box Score')}</span>
                  </button>
                </div>

                {/* 2. Download Excel Workbook (.xlsx) */}
                <div className="bg-slate-950/80 border border-emerald-500/30 p-4 rounded-xl flex flex-col justify-between space-y-3">
                  <div>
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
                      <FileSpreadsheet size={16} />
                    </div>
                    <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                      <span>{language === 'zh' ? '匯出 Excel 試算表' : 'Export Excel (.xlsx)'}</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1 rounded font-mono">雙Sheet</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      {language === 'zh' ? '包含「攻守紀錄表 (Box Score)」與「逐打席紀錄 (Play-by-Play)」雙工作表，可於 Excel/試算表直接編輯。' : 'Includes Box Score & Play-by-Play sheets.'}
                    </p>
                  </div>
                  <button
                    onClick={handleExportExcel}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/30 transition-all cursor-pointer active:scale-95"
                  >
                    <FileSpreadsheet size={14} />
                    <span>{language === 'zh' ? '下載 Excel 檔 (.xlsx)' : 'Download .xlsx'}</span>
                  </button>
                </div>

                {/* 3. Download JSON Backup */}
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex flex-col justify-between space-y-3">
                  <div>
                    <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center mb-2">
                      <Download size={16} />
                    </div>
                    <h4 className="font-bold text-white text-sm">
                      {language === 'zh' ? '匯出 JSON 紀錄備份' : 'Export JSON Backup'}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      {language === 'zh' ? '完整將比賽陣容、數據、比分與逐打席導出為檔案，可隨時重新匯入。' : 'Save complete game dataset as a downloadable file.'}
                    </p>
                  </div>
                  <button
                    onClick={handleExportJson}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  >
                    <Download size={14} />
                    <span>{language === 'zh' ? '下載 JSON 檔' : 'Download JSON'}</span>
                  </button>
                </div>

                {/* 4. Import JSON File */}
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex flex-col justify-between space-y-3">
                  <div>
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center mb-2">
                      <Upload size={16} />
                    </div>
                    <h4 className="font-bold text-white text-sm">
                      {language === 'zh' ? '匯入 JSON 紀錄檔案' : 'Import JSON Record'}
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      {language === 'zh' ? '載入先前備份的比賽紀錄檔案至計分板。' : 'Restore a previously exported game record.'}
                    </p>
                  </div>
                  <label className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 text-center">
                    <Upload size={14} />
                    <span>{language === 'zh' ? '選擇檔案匯入' : 'Upload File'}</span>
                    <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Text Preview Box */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <FileText size={14} />
                    <span>{language === 'zh' ? '文字紀錄表預覽 (Text Preview)' : 'Text Report Preview'}</span>
                  </span>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <Printer size={13} />
                    <span>{language === 'zh' ? '列印 / 存為 PDF' : 'Print / Save PDF'}</span>
                  </button>
                </div>

                <pre className="w-full bg-slate-900 border border-slate-800 p-3 sm:p-4 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre leading-relaxed select-text">
                  {generateTextReport()}
                </pre>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between shrink-0 text-xs">
          <span className="text-slate-500">
            {language === 'zh' ? '支援完整先發、替補、各局得分、局數打擊歷程與投手數據整理' : 'Supports complete box scores, lineup stats, and archives.'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
          >
            {language === 'zh' ? '關閉' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
