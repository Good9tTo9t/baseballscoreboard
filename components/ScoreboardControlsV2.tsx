import React, { useState, useEffect } from 'react';
import { GameState, ActionType, Team, Player } from '../types';
import { getPitcherCount } from '../reducer';
import { 
  Plus, 
  Minus, 
  RotateCcw, 
  Users, 
  Table2, 
  Tv, 
  PenTool, 
  ChevronRight, 
  ChevronLeft,
  ZoomIn, 
  ZoomOut,
  Timer,
  Play,
  Pause,
  Eye,
  EyeOff,
  Settings,
  ArrowDown,
  ArrowUp,
  Flame,
  Check,
  X,
  FileSpreadsheet,
  Smartphone
} from 'lucide-react';
import { LineupImportModal } from './LineupImportModal';
import { ImageCropperModal } from './ImageCropperModal';

interface ScoreboardControlsV2Props {
  state: GameState;
  dispatch: React.Dispatch<ActionType>;
  language?: 'en' | 'zh' | 'ja';
  onOpenRecordModal?: () => void;
}

export const ScoreboardControlsV2: React.FC<ScoreboardControlsV2Props> = ({
  state,
  dispatch,
  language = 'zh',
  onOpenRecordModal
}) => {
  const [activeTab, setActiveTab] = useState<'match' | 'lineups' | 'innings' | 'display'>('match');
  const [editingTeamKey, setEditingTeamKey] = useState<'away' | 'home'>('away');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState('');
  const [isWalkModalOpen, setIsWalkModalOpen] = useState(false);
  const [isOutModalOpen, setIsOutModalOpen] = useState(false);
  const [isWpPbModalOpen, setIsWpPbModalOpen] = useState(false);

  // Customizable Timer Presets (stored in localStorage)
  const [preset1, setPreset1] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('scoreboard_timer_preset1');
      return saved ? parseInt(saved, 10) : 15;
    } catch {
      return 15;
    }
  });

  const [preset2, setPreset2] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('scoreboard_timer_preset2');
      return saved ? parseInt(saved, 10) : 20;
    } catch {
      return 20;
    }
  });

  const [isEditingPresets, setIsEditingPresets] = useState(false);
  const [tempPreset1, setTempPreset1] = useState(preset1.toString());
  const [tempPreset2, setTempPreset2] = useState(preset2.toString());

  const handleSavePresets = () => {
    const p1 = Math.max(1, parseInt(tempPreset1, 10) || 15);
    const p2 = Math.max(1, parseInt(tempPreset2, 10) || 20);
    setPreset1(p1);
    setPreset2(p2);
    try {
      localStorage.setItem('scoreboard_timer_preset1', p1.toString());
      localStorage.setItem('scoreboard_timer_preset2', p2.toString());
    } catch (e) {
      console.error('Failed to save timer presets', e);
    }
    setIsEditingPresets(false);
  };

  // Active batter & pitcher
  const isTop = state.isTop;
  const battingTeamKey = isTop ? 'away' : 'home';
  const fieldingTeamKey = isTop ? 'home' : 'away';
  const battingTeam = isTop ? state.awayTeam : state.homeTeam;
  const fieldingTeam = isTop ? state.homeTeam : state.awayTeam;
  const activeBatter: Partial<Player> = battingTeam.lineup[battingTeam.currentBatterIndex] || { name: '打者', number: '', stat: '.000', position: 'DH' };
  const activePitcher = fieldingTeam.pitcher || { name: '投手', number: '', stat: '0', position: 'P' };
  const activeCatcher: Partial<Player> = fieldingTeam.lineup.find(p => p.position === 'C' || p.position === '捕手' || p.position === '2') || { name: '捕手', number: '', position: 'C' };
  
  // Current active base color
  const activeBaseColor = isTop 
    ? (state.awayTeam.baseColor || state.awayTeam.color || '#facc15')
    : (state.homeTeam.baseColor || state.homeTeam.color || '#facc15');

  // Confirm Walk / On-Base from Modal
  const handleConfirmWalk = (walkType: '四球' | '四壞' | '觸身' | '不死三振' | '敬遠' | 'K+WP' | 'K+PB' | '失誤') => {
    if (walkType === '不死三振' || walkType === 'K+WP' || walkType === 'K+PB') {
      dispatch({ type: 'WALK', walkType });
      dispatch({ type: 'TRIGGER_K' });
    } else {
      dispatch({ type: 'WALK', walkType });
    }
    setIsWalkModalOpen(false);
  };

  // Confirm Out from Modal
  const handleConfirmOut = (outType: '高飛' | '滾地' | '野選' | '雙殺' | '三振' | '出局' | '高飛犧牲打') => {
    if (outType === '高飛犧牲打' && state.outs < 2) {
      dispatch({ type: 'SAC_FLY' });
    } else if (outType === '雙殺') {
      dispatch({ type: 'RECORD_AT_BAT', result: '雙殺' });
      if (state.outs >= 1) {
        dispatch({ type: 'NEXT_BATTER' });
        dispatch({ type: 'NEXT_INNING' });
      } else {
        dispatch({ type: 'INCREMENT_OUT' });
        dispatch({ type: 'INCREMENT_OUT' });
        if (state.bases[0]) {
          dispatch({ type: 'TOGGLE_BASE', baseIndex: 0 });
        }
        dispatch({ type: 'RESET_COUNT' });
        dispatch({ type: 'NEXT_BATTER' });
      }
    } else if (outType === '野選') {
      dispatch({ type: 'RECORD_AT_BAT', result: '野選' });
      if (!state.bases[0]) {
        dispatch({ type: 'TOGGLE_BASE', baseIndex: 0 });
      }
      dispatch({ type: 'INCREMENT_OUT' });
      dispatch({ type: 'RESET_COUNT' });
      dispatch({ type: 'NEXT_BATTER' });
    } else if (outType === '三振') {
      dispatch({ type: 'RECORD_AT_BAT', result: '三振' });
      dispatch({ type: 'TRIGGER_K' });
      dispatch({ type: 'INCREMENT_OUT' });
      dispatch({ type: 'RESET_COUNT' });
      dispatch({ type: 'NEXT_BATTER' });
    } else {
      dispatch({ type: 'BATTER_OUT', outType });
    }
    setIsOutModalOpen(false);
  };

  // Quick Hit/Outcome dispatch
  const handleQuickOutcome = (type: '1B' | '2B' | '3B' | 'HR' | 'BB' | 'OUT' | '3OUT') => {
    switch (type) {
      case '1B': {
        dispatch({ type: 'SINGLE' });
        break;
      }
      case '2B': {
        dispatch({ type: 'DOUBLE' });
        break;
      }
      case '3B': {
        dispatch({ type: 'TRIPLE' });
        break;
      }
      case 'HR': {
        dispatch({ type: 'HOME_RUN' });
        break;
      }
      case 'BB': {
        setIsWalkModalOpen(true);
        break;
      }
      case 'OUT': {
        setIsOutModalOpen(true);
        break;
      }
      case '3OUT': {
        dispatch({ type: 'RECORD_AT_BAT', result: '出局' });
        dispatch({ type: 'THREE_UP_THREE_DOWN' });
        break;
      }
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setTempImageSrc(reader.result as string);
        setCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedDataUrl: string, noBorder?: boolean) => {
    dispatch({ type: 'UPDATE_TEAM', team: editingTeamKey, field: 'logoUrl', value: croppedDataUrl });
    dispatch({ type: 'UPDATE_TEAM', team: editingTeamKey, field: 'logoNoBorder', value: Boolean(noBorder) });
    setCropModalOpen(false);
  };

  // Substitute Pitcher from Bench
  const handleSubstitutePitcher = (benchIndex: number) => {
    const benchPlayer = fieldingTeam.bench[benchIndex];
    if (!benchPlayer) return;
    dispatch({
      type: 'SUBSTITUTE_PITCHER',
      team: fieldingTeamKey,
      benchIndex
    });
  };

  // Substitute Batter from Bench (Pinch Hit / Pinch Run)
  const handleSubstituteBatter = (benchIndex: number) => {
    const benchPlayer = battingTeam.bench[benchIndex];
    if (!benchPlayer) return;
    dispatch({
      type: 'SWAP_LINEUP_BENCH',
      team: battingTeamKey,
      lineupIndex: battingTeam.currentBatterIndex,
      benchIndex
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 select-none overflow-hidden font-sans relative">
      {/* Top Segmented Navigation Tabs (No inning button here so tabs are never covered or squished!) */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-2.5 py-1.5 shrink-0 gap-1.5">
        <div className="flex items-center gap-1.5 w-full">
          <button
            onClick={() => setActiveTab('match')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'match'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <span>{language === 'en' ? 'Game Hub' : language === 'zh' ? '比賽主控' : 'メイン'}</span>
          </button>

          <button
            onClick={() => setActiveTab('lineups')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'lineups'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Users size={14} />
            <span>{language === 'en' ? 'Lineup' : language === 'zh' ? '打線名單' : 'スタメン'}</span>
          </button>

          <button
            onClick={() => setActiveTab('innings')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'innings'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Table2 size={14} />
            <span>{language === 'en' ? 'Box Score' : language === 'zh' ? '局數比分' : 'スコア'}</span>
          </button>

          <button
            onClick={() => setActiveTab('display')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'display'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <Tv size={14} />
            <span>{language === 'en' ? 'Display' : language === 'zh' ? '轉播版面' : '表示設定'}</span>
          </button>

          {onOpenRecordModal && (
            <button
              onClick={onOpenRecordModal}
              className="flex items-center justify-center gap-1 py-2 px-2.5 rounded-lg text-xs font-bold transition-all bg-emerald-700 hover:bg-emerald-600 text-white shrink-0 shadow-md cursor-pointer"
              title={language === 'zh' ? '開啟完整攻守紀錄表與歷史存檔管理' : 'Open Game Records & Box Score'}
            >
              <FileSpreadsheet size={14} />
              <span className="hidden sm:inline">{language === 'zh' ? '紀錄表' : 'Records'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Scroll Area */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-2.5 sm:p-3.5 space-y-3">
        {activeTab === 'match' && (
          <>
            {/* 1. INNING CONTROL & 換局按鈕 + BSO BALLS/STRIKES/OUTS + PITCH COUNT */}
            <div className="bg-slate-800/95 border border-slate-700/80 rounded-2xl p-2.5 sm:p-3 shadow-lg space-y-2.5">
              {/* Inning Status & Repositioned 換局 Button */}
              <div className="flex items-center justify-between bg-slate-900/90 border border-slate-700/80 px-3 py-2 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">目前局數:</span>
                  <span className="text-sm font-black text-yellow-400 font-mono">
                    {state.isTop ? '▲' : '▼'} 第 {state.inning} 局
                  </span>
                  <div className="flex items-center gap-0.5 ml-1">
                    <button
                      onClick={() => dispatch({ type: 'PREVIOUS_HALF_INNING' })}
                      className="w-6 h-6 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-bold flex items-center justify-center active:scale-95"
                      title="退回半局"
                    >
                      -
                    </button>
                    <button
                      onClick={() => dispatch({ type: 'NEXT_FULL_INNING' })}
                      className="w-6 h-6 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-bold flex items-center justify-center active:scale-95"
                      title="加一局"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Repositioned Inning Advance Button */}
                <button
                  onClick={() => dispatch({ type: 'NEXT_INNING' })}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-lg text-xs font-black shadow-md active:scale-95 transition-all"
                  title="切換上下半局 (換局)"
                >
                  <span>{language === 'zh' ? '換局' : 'Inning Switch'}</span>
                  <span>{state.isTop ? '▼' : '▲'}</span>
                </button>
              </div>

              {/* BSO Grid */}
              <div className="grid grid-cols-3 gap-2">
                {/* BALL (B) */}
                <div className="bg-slate-900/80 border border-emerald-900/50 rounded-xl p-2 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black text-emerald-400 font-mono">B 壞球</span>
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <span 
                          key={i} 
                          className={`w-2.5 h-2.5 rounded-full transition-all ${
                            i < state.balls ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => dispatch({ type: 'INCREMENT_BALL' })}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-sm rounded-lg shadow-md active:scale-95 transition-transform"
                  >
                    +1
                  </button>
                </div>

                {/* STRIKE (S) */}
                <div className="bg-slate-900/80 border border-amber-900/50 rounded-xl p-2 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black text-amber-400 font-mono">S 好球</span>
                    <div className="flex gap-1">
                      {[0, 1].map(i => (
                        <span 
                          key={i} 
                          className={`w-2.5 h-2.5 rounded-full transition-all ${
                            i < state.strikes ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]' : 'bg-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => dispatch({ type: 'INCREMENT_STRIKE' })}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-black text-sm rounded-lg shadow-md active:scale-95 transition-transform"
                  >
                    +1
                  </button>
                </div>

                {/* OUT (O) */}
                <div className="bg-slate-900/80 border border-rose-900/50 rounded-xl p-2 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black text-rose-400 font-mono">O 出局</span>
                    <div className="flex gap-1">
                      {[0, 1].map(i => (
                        <span 
                          key={i} 
                          className={`w-2.5 h-2.5 rounded-full transition-all ${
                            i < state.outs ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' : 'bg-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      dispatch({ type: 'INCREMENT_OUT' });
                      dispatch({ type: 'INCREMENT_PLAYER_STAT', role: 'pitcher' });
                    }}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-black text-sm rounded-lg shadow-md active:scale-95 transition-transform"
                  >
                    +1
                  </button>
                </div>
              </div>

              {/* Pitch Count & Reset B/S & Visibility Toggles */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-slate-700/60 text-xs">
                <button
                  onClick={() => dispatch({ type: 'RESET_COUNT' })}
                  className="px-2.5 py-1.5 bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-bold transition-colors active:scale-95"
                >
                  {language === 'en' ? 'Reset B/S' : language === 'zh' ? '清空好壞球' : 'BSリセット'}
                </button>

                {/* Compact Inline Pitch Count */}
                <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700 px-2 py-1 rounded-xl">
                  <span className="text-[11px] font-bold text-slate-400">
                    {language === 'zh' ? '用球數:' : 'Pitch:'}
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={getPitcherCount(activePitcher)}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        dispatch({ type: 'SET_PITCH_COUNT', team: fieldingTeamKey, value: val });
                      }
                    }}
                    className="w-10 bg-slate-800 text-xs font-black text-yellow-400 font-mono text-center rounded border border-slate-600 py-0.5 outline-none focus:border-yellow-400"
                    title={language === 'zh' ? '點擊直接修改用球數' : 'Click to edit pitch count directly'}
                  />
                  <button
                    onClick={() => dispatch({ type: 'DECREMENT_PLAYER_STAT', role: 'pitcher' })}
                    className="w-5 h-5 bg-slate-800 hover:bg-slate-700 text-white font-black text-xs rounded flex items-center justify-center border border-slate-600 active:scale-95 cursor-pointer"
                    title="Pitch -1"
                  >
                    -
                  </button>
                  <button
                    onClick={() => dispatch({ type: 'INCREMENT_PLAYER_STAT', role: 'pitcher' })}
                    className="w-5 h-5 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded flex items-center justify-center shadow-sm active:scale-95 cursor-pointer"
                    title="Pitch +1"
                  >
                    +
                  </button>
                  <button
                    onClick={() => setIsWpPbModalOpen(true)}
                    className="px-1.5 py-0.5 bg-orange-700/80 hover:bg-orange-600 text-white text-[10px] font-bold rounded ml-0.5 active:scale-95 cursor-pointer"
                    title={language === 'zh' ? '暴投 / 捕逸 (WP / PB)' : 'Wild Pitch / Passed Ball (WP/PB)'}
                  >
                    {language === 'zh' ? '暴投/捕逸' : 'WP/PB'}
                  </button>
                </div>

                {/* Restored Visibility Toggles for BSO and Batting AVG */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => dispatch({ type: 'TOGGLE_VISIBILITY', field: 'showCount' })}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                      state.showCount 
                        ? 'bg-emerald-950/60 border-emerald-600/80 text-emerald-300' 
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                    title={state.showCount ? '隱藏好壞球數 (BSO)' : '顯示好壞球數 (BSO)'}
                  >
                    {state.showCount ? <Eye size={12} /> : <EyeOff size={12} />}
                    <span>{language === 'zh' ? 'BSO球數' : 'BSO'}</span>
                  </button>

                  <button
                    onClick={() => dispatch({ type: 'TOGGLE_VISIBILITY', field: 'showPlayerStat' })}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                      state.showPlayerStat 
                        ? 'bg-blue-950/60 border-blue-600/80 text-blue-300' 
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                    title={state.showPlayerStat ? '隱藏打擊率/打席數據' : '顯示打擊率/打席數據'}
                  >
                    {state.showPlayerStat ? <Eye size={12} /> : <EyeOff size={12} />}
                    <span>{language === 'zh' ? '打擊率' : 'AVG'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 2. 打席快速結算 (Refined Quick Outcomes: Strikeout removed, HR & 3-Up-3-Down added!) */}
            <div className="bg-slate-800/95 border border-slate-700/80 rounded-2xl p-2.5 sm:p-3 shadow-md space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  {language === 'en' ? 'Quick Outcome' : language === 'zh' ? '打席快速結算' : 'クイック判定'}
                </span>
                <button
                  onClick={() => dispatch({ type: 'UNDO' })}
                  className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-white bg-slate-700/60 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors active:scale-95"
                >
                  <RotateCcw size={13} />
                  <span>{language === 'zh' ? '復原' : 'Undo'}</span>
                </button>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                <button
                  onClick={() => handleQuickOutcome('1B')}
                  className="py-2.5 px-1 bg-slate-700 hover:bg-slate-600 active:bg-blue-600 text-white font-black text-xs rounded-lg text-center transition-all active:scale-95 shadow-sm"
                >
                  1B 一安
                </button>
                <button
                  onClick={() => handleQuickOutcome('2B')}
                  className="py-2.5 px-1 bg-slate-700 hover:bg-slate-600 active:bg-blue-600 text-white font-black text-xs rounded-lg text-center transition-all active:scale-95 shadow-sm"
                >
                  2B 二安
                </button>
                <button
                  onClick={() => handleQuickOutcome('3B')}
                  className="py-2.5 px-1 bg-slate-700 hover:bg-slate-600 active:bg-blue-600 text-white font-black text-xs rounded-lg text-center transition-all active:scale-95 shadow-sm"
                >
                  3B 三安
                </button>
                <button
                  onClick={() => handleQuickOutcome('HR')}
                  className="py-2.5 px-1 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-lg text-center transition-all active:scale-95 shadow-md border border-yellow-300/40"
                  title="全壘打 (自動觸發動畫與比分)"
                >
                  全壘打
                </button>
                <button
                  onClick={() => handleQuickOutcome('BB')}
                  className="py-2.5 px-1 bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs rounded-lg text-center transition-all active:scale-95 shadow-sm"
                >
                  {language === 'zh' ? '上壘' : language === 'ja' ? '出塁' : 'On-Base'}
                </button>
                <button
                  onClick={() => handleQuickOutcome('OUT')}
                  className="py-2.5 px-1 bg-rose-700 hover:bg-rose-600 text-white font-black text-xs rounded-lg text-center transition-all active:scale-95 shadow-sm"
                >
                  打者出局
                </button>
                <button
                  onClick={() => handleQuickOutcome('3OUT')}
                  className="py-2.5 px-1 bg-indigo-700 hover:bg-indigo-600 text-white font-black text-xs rounded-lg text-center transition-all active:scale-95 shadow-sm"
                  title="三上三下 (清空壘包並自動換局)"
                >
                  三上三下
                </button>
              </div>
            </div>

            {/* 3. 現正投打對決 (Moved below HR & Pitch Count) */}
            <div className="bg-slate-800/95 border border-slate-700/80 rounded-2xl p-2.5 sm:p-3 shadow-lg space-y-2">
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5">
                <span className="text-xs font-black text-blue-400 flex items-center gap-1.5">
                  <span>{language === 'zh' ? '現正投打對決' : 'Current Matchup'}</span>
                </span>
              </div>

              {/* Pitcher vs Batter Split Cards */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Pitcher Card */}
                <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-2 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: fieldingTeam.color }} />
                      <span>{fieldingTeam.name} 投手</span>
                    </span>
                    <span className="text-[10px] bg-slate-800 text-yellow-400 font-mono font-bold px-1.5 py-0.5 rounded">
                      用球: {getPitcherCount(activePitcher)}
                    </span>
                  </div>
                  <div className="font-bold text-white text-sm sm:text-base truncate my-0.5">
                    {activePitcher.name} {activePitcher.number ? `#${activePitcher.number}` : ''}
                  </div>
                  {/* Bench Pitcher Substitution Select */}
                  <select
                    className="w-full bg-slate-800 border border-slate-700 text-slate-300 text-[10px] rounded px-1.5 py-1 mt-1 outline-none cursor-pointer"
                    onChange={(e) => {
                      if (e.target.value !== '') {
                        handleSubstitutePitcher(parseInt(e.target.value, 10));
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>{language === 'zh' ? '換投手 (選板凳)' : 'Change Pitcher'}</option>
                    {fieldingTeam.bench.map((p, idx) => (
                      <option key={p.id || idx} value={idx}>
                        #{p.number} {p.name} ({p.position || 'P'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Batter Card */}
                <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-2 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: battingTeam.color }} />
                      <span>{battingTeam.name} 第{battingTeam.currentBatterIndex + 1}棒</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 px-1 py-0.5 rounded font-mono font-bold" title="得分 (Runs)">
                        R: {activeBatter.runs || 0}
                      </span>
                      <span className="text-[10px] bg-blue-950/80 text-blue-300 border border-blue-500/30 px-1 py-0.5 rounded font-mono font-bold" title="打點 (RBI)">
                        RBI: {activeBatter.rbi || 0}
                      </span>
                    </div>
                  </div>
                  <div className="font-bold text-white text-sm sm:text-base truncate my-0.5">
                    {activeBatter.name} {activeBatter.number ? `#${activeBatter.number}` : ''}
                  </div>
                  {/* Bench Pinch Hit / Run Select */}
                  <select
                    className="w-full bg-slate-800 border border-slate-700 text-slate-300 text-[10px] rounded px-1.5 py-1 mt-1 outline-none cursor-pointer"
                    onChange={(e) => {
                      if (e.target.value !== '') {
                        handleSubstituteBatter(parseInt(e.target.value, 10));
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>{language === 'zh' ? '代打/代跑 (選板凳)' : 'Pinch Hit/Run'}</option>
                    {battingTeam.bench.map((p, idx) => (
                      <option key={p.id || idx} value={idx}>
                        #{p.number} {p.name} ({p.position || 'BN'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 4. MOVED BELOW BSO & RESULTS: 調整分數與壘包區 (Score and base controls moved here, color labels removed!) */}
            <div className="bg-slate-800/95 border border-slate-700/80 rounded-2xl p-2.5 sm:p-3 shadow-xl">
              <div className="grid grid-cols-3 gap-2 items-stretch">
                
                {/* 1. AWAY TEAM SCORE CARD (No team/base color pickers) */}
                <div className={`flex flex-col justify-between p-2.5 rounded-xl transition-all border ${
                  state.isTop ? 'bg-slate-700/60 border-blue-500/80 ring-2 ring-blue-500/20 shadow-md' : 'bg-slate-800/50 border-slate-700'
                }`}>
                  <div className="flex items-center gap-1.5 w-full justify-between min-w-0">
                    <span className="text-xs font-black text-slate-200 truncate">
                      {state.awayTeam.name || '客隊'}
                    </span>
                    {state.isTop && <span className="text-[9px] bg-blue-500 text-white px-1.5 py-0.5 rounded-sm font-bold shrink-0">攻</span>}
                  </div>

                  {/* Big Score Display */}
                  <div className="text-center my-1">
                    <span className="text-3xl sm:text-4xl font-black tracking-tight text-white font-mono drop-shadow-sm">
                      {state.awayTeam.score}
                    </span>
                  </div>

                  {/* Score +/- Touch Buttons */}
                  <div className="flex gap-1.5 w-full">
                    <button
                      onClick={() => dispatch({ type: 'ADD_SCORE', team: 'away', amount: -1 })}
                      className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white font-bold rounded-lg flex items-center justify-center shadow-sm text-sm active:scale-95 transition-transform"
                      title="Away -1"
                    >
                      <Minus size={15} />
                    </button>
                    <button
                      onClick={() => dispatch({ type: 'ADD_SCORE', team: 'away', amount: 1 })}
                      className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-400 text-white font-bold rounded-lg flex items-center justify-center shadow-md text-sm active:scale-95 transition-transform"
                      title="Away +1"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>

                {/* 2. BASES DIAMOND (Center Column) */}
                <div className="flex flex-col items-center justify-between p-1.5 rounded-xl bg-slate-900/80 border border-slate-700/80 h-full">
                  <div className="text-[10px] font-bold text-slate-400 tracking-wider">
                    {language === 'en' ? 'BASES' : language === 'zh' ? '壘包跑者' : '走者'}
                  </div>

                  {/* Symmetrical Diamond Graphic */}
                  <div className="relative w-28 h-20 my-auto flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 112 80">
                      <polygon 
                        points="56,12 94,40 56,68 18,40" 
                        fill="rgba(30, 41, 59, 0.4)" 
                        stroke="rgba(148, 163, 184, 0.3)" 
                        strokeWidth="2" 
                      />
                    </svg>

                    {/* 2nd Base */}
                    <button
                      onClick={() => dispatch({ type: 'TOGGLE_BASE', baseIndex: 1 })}
                      className="absolute top-0.5 left-1/2 -translate-x-1/2 w-6 h-6 rotate-45 border-2 rounded-xs transition-all shadow-md active:scale-90 flex items-center justify-center cursor-pointer z-10"
                      style={{
                        backgroundColor: state.bases[1] ? activeBaseColor : '#1e293b',
                        borderColor: state.bases[1] ? '#ffffff' : '#64748b',
                        boxShadow: state.bases[1] ? `0 0 12px ${activeBaseColor}` : undefined
                      }}
                      title="2nd Base (二壘)"
                    >
                      <span className="-rotate-45 text-[9px] font-black text-slate-900 select-none">
                        {state.bases[1] ? '●' : '2'}
                      </span>
                    </button>

                    {/* 3rd Base */}
                    <button
                      onClick={() => dispatch({ type: 'TOGGLE_BASE', baseIndex: 2 })}
                      className="absolute left-1.5 top-7 w-6 h-6 rotate-45 border-2 rounded-xs transition-all shadow-md active:scale-90 flex items-center justify-center cursor-pointer z-10"
                      style={{
                        backgroundColor: state.bases[2] ? activeBaseColor : '#1e293b',
                        borderColor: state.bases[2] ? '#ffffff' : '#64748b',
                        boxShadow: state.bases[2] ? `0 0 12px ${activeBaseColor}` : undefined
                      }}
                      title="3rd Base (三壘)"
                    >
                      <span className="-rotate-45 text-[9px] font-black text-slate-900 select-none">
                        {state.bases[2] ? '●' : '3'}
                      </span>
                    </button>

                    {/* 1st Base */}
                    <button
                      onClick={() => dispatch({ type: 'TOGGLE_BASE', baseIndex: 0 })}
                      className="absolute right-1.5 top-7 w-6 h-6 rotate-45 border-2 rounded-xs transition-all shadow-md active:scale-90 flex items-center justify-center cursor-pointer z-10"
                      style={{
                        backgroundColor: state.bases[0] ? activeBaseColor : '#1e293b',
                        borderColor: state.bases[0] ? '#ffffff' : '#64748b',
                        boxShadow: state.bases[0] ? `0 0 12px ${activeBaseColor}` : undefined
                      }}
                      title="1st Base (一壘)"
                    >
                      <span className="-rotate-45 text-[9px] font-black text-slate-900 select-none">
                        {state.bases[0] ? '●' : '1'}
                      </span>
                    </button>

                    {/* Home Plate */}
                    <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-slate-600 border border-slate-400 rotate-45 opacity-60 flex items-center justify-center z-10">
                      <span className="-rotate-45 text-[6px] text-white font-bold">H</span>
                    </div>
                  </div>

                  {/* Clear Bases Button */}
                  <button
                    onClick={() => {
                      if (state.bases[0]) dispatch({ type: 'TOGGLE_BASE', baseIndex: 0 });
                      if (state.bases[1]) dispatch({ type: 'TOGGLE_BASE', baseIndex: 1 });
                      if (state.bases[2]) dispatch({ type: 'TOGGLE_BASE', baseIndex: 2 });
                    }}
                    className="w-full py-1 text-[10px] text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded border border-slate-700/60 transition-colors text-center active:scale-95"
                  >
                    {language === 'en' ? 'Clear Bases' : language === 'zh' ? '清空壘包' : 'クリア'}
                  </button>
                </div>

                {/* 3. HOME TEAM SCORE CARD (No team/base color pickers) */}
                <div className={`flex flex-col justify-between p-2.5 rounded-xl transition-all border ${
                  !state.isTop ? 'bg-slate-700/60 border-red-500/80 ring-2 ring-red-500/20 shadow-md' : 'bg-slate-800/50 border-slate-700'
                }`}>
                  <div className="flex items-center gap-1.5 w-full justify-between min-w-0">
                    <span className="text-xs font-black text-slate-200 truncate">
                      {state.homeTeam.name || '主隊'}
                    </span>
                    {!state.isTop && <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded-sm font-bold shrink-0">攻</span>}
                  </div>

                  {/* Big Score Display */}
                  <div className="text-center my-1">
                    <span className="text-3xl sm:text-4xl font-black tracking-tight text-white font-mono drop-shadow-sm">
                      {state.homeTeam.score}
                    </span>
                  </div>

                  {/* Score +/- Touch Buttons */}
                  <div className="flex gap-1.5 w-full">
                    <button
                      onClick={() => dispatch({ type: 'ADD_SCORE', team: 'home', amount: -1 })}
                      className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white font-bold rounded-lg flex items-center justify-center shadow-sm text-sm active:scale-95 transition-transform"
                      title="Home -1"
                    >
                      <Minus size={15} />
                    </button>
                    <button
                      onClick={() => dispatch({ type: 'ADD_SCORE', team: 'home', amount: 1 })}
                      className="flex-1 py-1.5 bg-red-600 hover:bg-red-500 active:bg-red-400 text-white font-bold rounded-lg flex items-center justify-center shadow-md text-sm active:scale-95 transition-transform"
                      title="Home +1"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* 5. 投球計時器 (PITCH TIMER WITH USER-CUSTOMIZABLE 2 PRESET BUTTONS!) */}
            <div className="bg-slate-800/95 border border-slate-700/80 rounded-2xl p-2.5 sm:p-3 shadow-md space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Timer size={14} className={state.isTimerRunning ? 'text-green-400 animate-spin' : 'text-slate-400'} />
                  <span>{language === 'zh' ? '投球計時器 (Pitch Timer)' : 'Pitch Timer'}</span>
                </span>

                <button
                  onClick={() => setIsEditingPresets(!isEditingPresets)}
                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-700/60 hover:bg-slate-700 transition-colors"
                >
                  <Settings size={11} />
                  <span>{isEditingPresets ? (language === 'zh' ? '完成' : 'Done') : (language === 'zh' ? '自訂秒數' : 'Edit Presets')}</span>
                </button>
              </div>

              {/* Editing Form for Custom Presets */}
              {isEditingPresets && (
                <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">鍵1:</span>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={tempPreset1}
                      onChange={(e) => setTempPreset1(e.target.value)}
                      className="w-12 bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-center text-xs font-bold text-white font-mono"
                    />
                    <span className="text-[11px] text-slate-400">秒</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-400">鍵2:</span>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={tempPreset2}
                      onChange={(e) => setTempPreset2(e.target.value)}
                      className="w-12 bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-center text-xs font-bold text-white font-mono"
                    />
                    <span className="text-[11px] text-slate-400">秒</span>
                  </div>
                  <button
                    onClick={handleSavePresets}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold active:scale-95 transition-transform"
                  >
                    {language === 'zh' ? '儲存' : 'Save'}
                  </button>
                </div>
              )}

              {/* Timer Controls Row */}
              <div className="flex items-center gap-2">
                {/* Big Timer Digital Display */}
                <div className={`px-3 py-1.5 rounded-xl border font-mono font-black text-xl shrink-0 min-w-[56px] text-center ${
                  state.timer <= 8 && state.isTimerRunning 
                    ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse' 
                    : 'bg-slate-900/90 border-slate-700 text-white'
                }`}>
                  {state.timer}
                </div>

                {/* Preset 1 Button (User Customizable!) */}
                <button
                  onClick={() => {
                    dispatch({ type: 'SET_TIMER', value: preset1 });
                    if (!state.isTimerRunning) dispatch({ type: 'TOGGLE_TIMER' });
                  }}
                  className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 active:bg-blue-600 text-white font-black text-xs rounded-xl text-center active:scale-95 transition-all shadow-sm"
                  title={`設定並開始 ${preset1} 秒`}
                >
                  {preset1} 秒
                </button>

                {/* Preset 2 Button (User Customizable!) */}
                <button
                  onClick={() => {
                    dispatch({ type: 'SET_TIMER', value: preset2 });
                    if (!state.isTimerRunning) dispatch({ type: 'TOGGLE_TIMER' });
                  }}
                  className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 active:bg-blue-600 text-white font-black text-xs rounded-xl text-center active:scale-95 transition-all shadow-sm"
                  title={`設定並開始 ${preset2} 秒`}
                >
                  {preset2} 秒
                </button>

                {/* Start / Pause Button */}
                <button
                  onClick={() => dispatch({ type: 'TOGGLE_TIMER' })}
                  className={`px-3.5 py-2 rounded-xl text-white font-black text-xs flex items-center gap-1 active:scale-95 transition-all shadow-md shrink-0 ${
                    state.isTimerRunning 
                      ? 'bg-rose-600 hover:bg-rose-500' 
                      : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  {state.isTimerRunning ? <Pause size={13} /> : <Play size={13} />}
                  <span>{state.isTimerRunning ? '暫停' : '開始'}</span>
                </button>

                {/* Reset Button */}
                <button
                  onClick={() => dispatch({ type: 'RESET_TIMER' })}
                  className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-xl active:scale-95 transition-colors shrink-0"
                  title="重設計時器"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>
          </>
        )}

        {/* TAB 2: TEAMS & LINEUP (WITH BOTH LINEUP & RESTORED BENCH SECTIONS!) */}
        {activeTab === 'lineups' && (
          <div className="space-y-3">
            {/* 1. HUGE PROMINENT PASTE IMPORT BUTTON AT THE VERY TOP */}
            <button
              onClick={() => setImportModalOpen(true)}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 active:scale-98 text-white rounded-xl text-sm font-black shadow-lg flex items-center justify-center gap-2 transition-all border border-indigo-400/30"
            >
              <PenTool size={17} />
              <span>{language === 'en' ? 'Paste Import Lineup (CSV / Text / 0B)' : language === 'zh' ? '貼上匯入球員名單 (支援 0B/bench 板凳)' : '貼付インポート'}</span>
            </button>

            {/* Team Selector Switch */}
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                onClick={() => setEditingTeamKey('away')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  editingTeamKey === 'away'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: state.awayTeam.color }} />
                <span>{state.awayTeam.name || '客隊'}</span>
              </button>
              <button
                onClick={() => setEditingTeamKey('home')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  editingTeamKey === 'home'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: state.homeTeam.color }} />
                <span>{state.homeTeam.name || '主隊'}</span>
              </button>
            </div>

            {/* Team Meta & Colors Editor */}
            {(() => {
              const currentTeam = editingTeamKey === 'away' ? state.awayTeam : state.homeTeam;
              return (
                <div className="bg-slate-800/95 border border-slate-700 rounded-2xl p-3 space-y-3">
                  <div className="font-bold text-xs text-slate-300">
                    {language === 'en' ? 'Team Configuration' : language === 'zh' ? '球隊代表色與外觀設定' : 'チーム設定'}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Team Name */}
                    <div className="col-span-2">
                      <label className="text-[10px] text-slate-400 font-bold block mb-1">
                        {language === 'zh' ? '球隊名稱' : 'Team Name'}
                      </label>
                      <input
                        type="text"
                        value={currentTeam.name}
                        onChange={(e) => dispatch({ type: 'UPDATE_TEAM', team: editingTeamKey, field: 'name', value: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white font-bold outline-none focus:border-blue-500"
                        placeholder="Team Name"
                      />
                    </div>

                    {/* Team Color Picker */}
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold">
                          {language === 'zh' ? '隊伍代表色' : 'Team Color'}
                        </div>
                        <span className="text-xs font-mono text-slate-300">{currentTeam.color}</span>
                      </div>
                      <input
                        type="color"
                        value={currentTeam.color}
                        onChange={(e) => dispatch({ type: 'UPDATE_TEAM', team: editingTeamKey, field: 'color', value: e.target.value })}
                        className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent"
                      />
                    </div>

                    {/* BASE COLOR PICKER */}
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-amber-400 font-bold">
                          {language === 'zh' ? '壘包亮燈色' : 'Base Color'}
                        </div>
                        <span className="text-xs font-mono text-slate-300">{currentTeam.baseColor || currentTeam.color || '#facc15'}</span>
                      </div>
                      <input
                        type="color"
                        value={currentTeam.baseColor || currentTeam.color || '#facc15'}
                        onChange={(e) => dispatch({ type: 'UPDATE_TEAM', team: editingTeamKey, field: 'baseColor', value: e.target.value })}
                        className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent"
                      />
                    </div>

                    {/* Logo Upload */}
                    <div className="col-span-2 flex flex-col gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {currentTeam.logoUrl ? (
                            <img 
                              src={currentTeam.logoUrl} 
                              alt="Logo" 
                              className={`w-8 h-8 ${currentTeam.logoNoBorder ? 'object-contain' : 'rounded-full object-cover border border-slate-600'}`} 
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-white">
                              {currentTeam.name.substring(0, 1)}
                            </div>
                          )}
                          <span className="text-xs text-slate-300 font-bold">
                            {language === 'zh' ? '隊徽 Logo' : 'Team Logo'}
                          </span>
                        </div>
                        <label className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-xs">
                          {language === 'zh' ? '上傳更換' : 'Upload'}
                          <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                        </label>
                      </div>
                      {currentTeam.logoUrl && (
                        <label className="flex items-center gap-2 cursor-pointer pt-1 border-t border-slate-800 text-slate-300 select-none">
                          <input 
                            type="checkbox"
                            checked={Boolean(currentTeam.logoNoBorder)}
                            onChange={(e) => dispatch({ type: 'UPDATE_TEAM', team: editingTeamKey, field: 'logoNoBorder', value: e.target.checked })}
                            className="w-3.5 h-3.5 rounded text-blue-600 bg-slate-800 border-slate-600 cursor-pointer"
                          />
                          <span className="text-[11px] text-slate-300">
                            {language === 'zh' ? '無邊框與底色模式 (直接顯示透明隊徽)' : language === 'ja' ? '枠線・背景なし (透明PNG)' : 'No border mode (transparent PNG)'}
                          </span>
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 先發名單 (LINEUP LIST) */}
            {(() => {
              const currentTeam = editingTeamKey === 'away' ? state.awayTeam : state.homeTeam;
              return (
                <div className="bg-slate-800/95 border border-slate-700 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">
                      {language === 'zh' ? `先發打線 (${currentTeam.lineup.length}人)` : `Lineup (${currentTeam.lineup.length})`}
                    </span>
                    <button
                      onClick={() => dispatch({ type: 'ADD_PLAYER_TO_LINEUP', team: editingTeamKey })}
                      className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-colors active:scale-95"
                    >
                      <Plus size={14} />
                      <span>{language === 'zh' ? '新增打者' : 'Add'}</span>
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-[260px] overflow-y-auto no-scrollbar">
                    {currentTeam.lineup.map((player, idx) => (
                      <div
                        key={player.id || idx}
                        className={`flex items-center gap-1.5 p-1.5 rounded-xl border text-xs ${
                          idx === currentTeam.currentBatterIndex
                            ? 'bg-blue-950/60 border-blue-500/80 shadow-sm'
                            : 'bg-slate-900/60 border-slate-700'
                        }`}
                      >
                        <span className="w-5 text-center font-bold text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={player.position || ''}
                          onChange={(e) => dispatch({ type: 'UPDATE_LINEUP_PLAYER', team: editingTeamKey, index: idx, field: 'position', value: e.target.value })}
                          className="w-10 bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-center font-bold text-white uppercase text-[11px]"
                          placeholder="POS"
                        />
                        <input
                          type="text"
                          value={player.number}
                          onChange={(e) => dispatch({ type: 'UPDATE_LINEUP_PLAYER', team: editingTeamKey, index: idx, field: 'number', value: e.target.value })}
                          className="w-10 bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-center font-bold text-white text-[11px]"
                          placeholder="#"
                        />
                        <input
                          type="text"
                          value={player.name}
                          onChange={(e) => dispatch({ type: 'UPDATE_LINEUP_PLAYER', team: editingTeamKey, index: idx, field: 'name', value: e.target.value })}
                          className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-0.5 font-bold text-white text-[11px]"
                          placeholder="Player Name"
                        />
                        <input
                          type="text"
                          value={player.stat || ''}
                          onChange={(e) => dispatch({ type: 'UPDATE_LINEUP_PLAYER', team: editingTeamKey, index: idx, field: 'stat', value: e.target.value })}
                          className="w-14 bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-center text-slate-300 font-mono text-[11px]"
                          placeholder=".000"
                        />
                        {/* Move to Bench button */}
                        <button
                          onClick={() => dispatch({ type: 'MOVE_TO_BENCH', team: editingTeamKey, index: idx })}
                          className="text-slate-400 hover:text-amber-400 p-1 hover:bg-slate-800 rounded"
                          title="移至板凳席"
                        >
                          <ArrowDown size={13} />
                        </button>
                        <button
                          onClick={() => dispatch({ type: 'REMOVE_PLAYER_FROM_LINEUP', team: editingTeamKey, index: idx })}
                          className="text-slate-500 hover:text-red-400 p-1 hover:bg-slate-800 rounded"
                          title="刪除"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* RESTORED: 板凳球員 (BENCH PLAYERS SECTION) */}
            {(() => {
              const currentTeam = editingTeamKey === 'away' ? state.awayTeam : state.homeTeam;
              return (
                <div className="bg-slate-800/95 border border-amber-900/40 rounded-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <span>{language === 'zh' ? `板凳席名單 (${currentTeam.bench.length}人)` : `Bench (${currentTeam.bench.length})`}</span>
                    </span>
                    <button
                      onClick={() => dispatch({ type: 'ADD_PLAYER_TO_BENCH', team: editingTeamKey })}
                      className="px-2.5 py-1 bg-amber-700/80 hover:bg-amber-600 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-colors active:scale-95"
                    >
                      <Plus size={14} />
                      <span>{language === 'zh' ? '新增板凳' : 'Add Bench'}</span>
                    </button>
                  </div>

                  {currentTeam.bench.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-xs bg-slate-900/40 rounded-xl border border-slate-800">
                      {language === 'zh' ? '尚無板凳球員。可點擊上方按鈕新增，或由先發名單移至板凳。' : 'No bench players yet.'}
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto no-scrollbar">
                      {currentTeam.bench.map((player, idx) => (
                        <div
                          key={player.id || idx}
                          className="flex items-center gap-1.5 p-1.5 rounded-xl border border-slate-700 bg-slate-900/60 text-xs"
                        >
                          <span className="w-5 text-center font-bold text-amber-500/80 font-mono text-[10px]">
                            B{idx + 1}
                          </span>
                          <input
                            type="text"
                            value={player.position || 'BN'}
                            onChange={(e) => dispatch({ type: 'UPDATE_BENCH_PLAYER', team: editingTeamKey, index: idx, field: 'position', value: e.target.value })}
                            className="w-10 bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-center font-bold text-amber-300 uppercase text-[11px]"
                            placeholder="BN"
                          />
                          <input
                            type="text"
                            value={player.number}
                            onChange={(e) => dispatch({ type: 'UPDATE_BENCH_PLAYER', team: editingTeamKey, index: idx, field: 'number', value: e.target.value })}
                            className="w-10 bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-center font-bold text-white text-[11px]"
                            placeholder="#"
                          />
                          <input
                            type="text"
                            value={player.name}
                            onChange={(e) => dispatch({ type: 'UPDATE_BENCH_PLAYER', team: editingTeamKey, index: idx, field: 'name', value: e.target.value })}
                            className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-0.5 font-bold text-white text-[11px]"
                            placeholder="Player Name"
                          />
                          <input
                            type="text"
                            value={player.stat || ''}
                            onChange={(e) => dispatch({ type: 'UPDATE_BENCH_PLAYER', team: editingTeamKey, index: idx, field: 'stat', value: e.target.value })}
                            className="w-14 bg-slate-800 border border-slate-600 rounded px-1 py-0.5 text-center text-slate-300 font-mono text-[11px]"
                            placeholder=".000"
                          />
                          {/* Move to Lineup button */}
                          <button
                            onClick={() => dispatch({ type: 'MOVE_TO_LINEUP', team: editingTeamKey, index: idx })}
                            className="text-slate-400 hover:text-green-400 p-1 hover:bg-slate-800 rounded"
                            title="換入先發打線"
                          >
                            <ArrowUp size={13} />
                          </button>
                          <button
                            onClick={() => dispatch({ type: 'REMOVE_PLAYER_FROM_BENCH', team: editingTeamKey, index: idx })}
                            className="text-slate-500 hover:text-red-400 p-1 hover:bg-slate-800 rounded"
                            title="刪除"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 3: INNINGS (Box Score) */}
        {activeTab === 'innings' && (
          <div className="bg-slate-800/95 border border-slate-700 rounded-2xl p-3 space-y-3">
            <div className="text-xs font-bold text-slate-300">
              {language === 'zh' ? '局數比分調整' : 'Inning Scores'}
            </div>
            <div className="space-y-2">
              {/* Away Inning Scores */}
              <div className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-700">
                <div className="text-xs font-bold text-blue-400 mb-1.5">
                  {state.awayTeam.name || '客隊'}
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-9 gap-1.5">
                  {Array.from({ length: 9 }, (_, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-400 mb-0.5">{i + 1}局</span>
                      <input
                        type="number"
                        min="0"
                        value={state.awayTeam.inningScores[i] ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                          dispatch({ type: 'SET_INNING_SCORE', team: 'away', inningIndex: i, score: val });
                        }}
                        className="w-full text-center bg-slate-800 border border-slate-600 rounded py-1 text-sm font-bold text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Home Inning Scores */}
              <div className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-700">
                <div className="text-xs font-bold text-red-400 mb-1.5">
                  {state.homeTeam.name || '主隊'}
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-9 gap-1.5">
                  {Array.from({ length: 9 }, (_, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-400 mb-0.5">{i + 1}局</span>
                      <input
                        type="number"
                        min="0"
                        value={state.homeTeam.inningScores[i] ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                          dispatch({ type: 'SET_INNING_SCORE', team: 'home', inningIndex: i, score: val });
                        }}
                        className="w-full text-center bg-slate-800 border border-slate-600 rounded py-1 text-sm font-bold text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {onOpenRecordModal && (
                <div className="pt-2 border-t border-slate-700/80">
                  <button
                    onClick={onOpenRecordModal}
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                  >
                    <FileSpreadsheet size={16} />
                    <span>{language === 'zh' ? '查看完整攻守紀錄表與數據管理 (存檔 / 更改)' : 'Open Full Box Score & Record Management'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: DISPLAY & BROADCAST SETTINGS */}
        {activeTab === 'display' && (
          <div className="bg-slate-800/95 border border-slate-700 rounded-2xl p-3 space-y-4">
            <div className="font-bold text-xs text-slate-300">
              {language === 'en' ? 'Display & Broadcast Controls' : language === 'zh' ? '轉播版面與外觀設定' : '表示・配信設定'}
            </div>

            {/* Display Mode Selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 block">
                {language === 'zh' ? '計分板版面模式' : 'Scoreboard Layout'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(['default', 'lineup', 'rhe', 'broadcast'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => dispatch({ type: 'SET_DISPLAY_MODE', mode })}
                    className={`py-2 px-2 text-xs font-bold rounded-xl capitalize transition-all border ${
                      state.displayMode === mode
                        ? 'bg-blue-600 border-blue-400 text-white shadow-md'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {mode === 'default' ? '標準 (Default)' : mode === 'lineup' ? '打線 (Lineup)' : mode === 'rhe' ? '局數 (RHE)' : '轉播 (Broadcast)'}
                  </button>
                ))}
              </div>
            </div>

            {/* RESTORED: Toggle Buttons for BSO, AVG/Stats, Pitcher, Batter, Timer */}
            <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-3 space-y-2">
              <span className="text-xs font-bold text-slate-300 block mb-1">
                {language === 'zh' ? '顯示元素開關' : 'Visibility Toggles'}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => dispatch({ type: 'TOGGLE_VISIBILITY', field: 'showCount' })}
                  className={`flex items-center justify-between p-2 rounded-lg text-xs font-bold border transition-colors ${
                    state.showCount ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  <span>{language === 'zh' ? '好壞球數 (BSO)' : 'Pitch Count (BSO)'}</span>
                  {state.showCount ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>

                <button
                  onClick={() => dispatch({ type: 'TOGGLE_VISIBILITY', field: 'showPlayerStat' })}
                  className={`flex items-center justify-between p-2 rounded-lg text-xs font-bold border transition-colors ${
                    state.showPlayerStat ? 'bg-blue-950/60 border-blue-500 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  <span>{language === 'zh' ? '打擊率/打席成績' : 'Batting Stats (AVG)'}</span>
                  {state.showPlayerStat ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>

                <button
                  onClick={() => dispatch({ type: 'TOGGLE_VISIBILITY', field: 'showTimer' })}
                  className={`flex items-center justify-between p-2 rounded-lg text-xs font-bold border transition-colors ${
                    state.showTimer ? 'bg-purple-950/60 border-purple-500 text-purple-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  <span>{language === 'zh' ? '投球計時器' : 'Pitch Timer'}</span>
                  {state.showTimer ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>

                <button
                  onClick={() => dispatch({ type: 'TOGGLE_VISIBILITY', field: 'showBatterInfo' })}
                  className={`flex items-center justify-between p-2 rounded-lg text-xs font-bold border transition-colors ${
                    state.showBatterInfo ? 'bg-indigo-950/60 border-indigo-500 text-indigo-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  <span>{language === 'zh' ? '打者資訊' : 'Batter Info'}</span>
                  {state.showBatterInfo ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
              </div>
            </div>

            {/* Mobile Broadcast Scaling Controls */}
            <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-yellow-400 flex items-center gap-1.5">
                  <Tv size={15} />
                  <span>{language === 'zh' ? '手機/轉播字卡縮放大小' : 'Broadcast Scale'}</span>
                </span>
                <span className="font-mono font-bold text-sm text-white">
                  {Math.round((state.meta.broadcastScale ?? 1) * 100)}%
                </span>
              </div>

              {/* Slider */}
              <input
                type="range"
                min="0.3"
                max="2.5"
                step="0.05"
                value={state.meta.broadcastScale ?? 1}
                onChange={(e) => dispatch({ type: 'UPDATE_META', field: 'broadcastScale', value: parseFloat(e.target.value) })}
                className="w-full accent-blue-500 cursor-pointer"
              />

              {/* Stepper Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => dispatch({ type: 'UPDATE_META', field: 'broadcastScale', value: Math.max(0.3, Number(((state.meta.broadcastScale ?? 1) - 0.1).toFixed(2))) })}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white text-xs font-bold rounded-lg border border-slate-700 flex items-center justify-center gap-1 active:scale-95 transition-transform"
                >
                  <ZoomOut size={14} />
                  <span>縮小 -10%</span>
                </button>
                <button
                  onClick={() => dispatch({ type: 'UPDATE_META', field: 'broadcastScale', value: 1.0 })}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-lg border border-slate-700 active:scale-95 transition-transform"
                >
                  預設 100%
                </button>
                <button
                  onClick={() => dispatch({ type: 'UPDATE_META', field: 'broadcastScale', value: Math.min(2.5, Number(((state.meta.broadcastScale ?? 1) + 0.1).toFixed(2))) })}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-400 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 shadow-md active:scale-95 transition-transform"
                >
                  <ZoomIn size={14} />
                  <span>放大 +10%</span>
                </button>
              </div>
            </div>

            {/* Position Adjustment Mode Toggle */}
            <div className="flex items-center justify-between bg-slate-900/90 p-3 rounded-xl border border-slate-700">
              <div>
                <div className="text-xs font-bold text-white">
                  {language === 'zh' ? '版面拖曳與微調模式' : 'Position Adjustment Mode'}
                </div>
                <div className="text-[10px] text-slate-400">
                  {language === 'zh' ? '開啟後可在畫面上直接拖曳位置或用雙指縮放' : 'Drag position or pinch to zoom directly on board'}
                </div>
              </div>
              <button
                onClick={() => dispatch({ type: 'TOGGLE_VISIBILITY', field: 'isAdjustmentMode' })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95 ${
                  state.isAdjustmentMode
                    ? 'bg-emerald-600 text-white shadow-emerald-900/40'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {state.isAdjustmentMode ? '已開啟' : '關閉'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* LINEUP IMPORT MODAL (Supports both lineup and bench!) */}
      <LineupImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        language={language}
        currentPlayers={editingTeamKey === 'away' ? state.awayTeam.lineup : state.homeTeam.lineup}
        onImport={(newLineup, newBench, newPitcher) => {
          const targetKey = editingTeamKey;
          const currentTeam = targetKey === 'away' ? state.awayTeam : state.homeTeam;
          const updatedBench = newBench !== undefined ? newBench : currentTeam.bench;
          const newTeam = { 
            ...currentTeam, 
            lineup: newLineup, 
            bench: updatedBench,
            ...(newPitcher ? { pitcher: newPitcher } : {})
          };
          dispatch({ type: 'APPLY_TEAM_CONFIG', team: targetKey, config: newTeam });
        }}
      />

      {/* IMAGE CROPPER MODAL */}
      <ImageCropperModal
        isOpen={cropModalOpen}
        imageSrc={tempImageSrc}
        initialNoBorder={editingTeamKey === 'away' ? state.awayTeam.logoNoBorder : state.homeTeam.logoNoBorder}
        onClose={() => {
          setCropModalOpen(false);
          setTempImageSrc('');
        }}
        onCropComplete={handleCropComplete}
        language={language}
      />

      {/* WALK TYPE SELECTION MODAL (保送類型彈窗) */}
      {isWalkModalOpen && (
        <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl max-w-md w-full p-4 sm:p-5 shadow-2xl space-y-4 max-h-[90%] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
                <span>{language === 'zh' ? '選擇上壘類型' : language === 'ja' ? '出塁タイプの選択' : 'Select On-Base Type'}</span>
              </h3>
              <button 
                onClick={() => setIsWalkModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              <button
                onClick={() => handleConfirmWalk('四壞')}
                className="flex items-center justify-between p-3.5 bg-slate-800/80 hover:bg-sky-950/60 border border-slate-700 hover:border-sky-500/80 rounded-xl transition-all group text-left active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black px-2.5 py-1 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">
                    BB
                  </span>
                  <div className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">
                    {language === 'zh' ? '四壞' : language === 'ja' ? '四球' : 'Base on Balls (BB)'}
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-500 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                onClick={() => handleConfirmWalk('敬遠')}
                className="flex items-center justify-between p-3.5 bg-slate-800/80 hover:bg-blue-950/60 border border-slate-700 hover:border-blue-500/80 rounded-xl transition-all group text-left active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black px-2.5 py-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 font-mono">
                    IBB
                  </span>
                  <div className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                    {language === 'zh' ? '敬遠' : language === 'ja' ? '敬遠' : 'Intentional Walk (IBB)'}
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                onClick={() => handleConfirmWalk('觸身')}
                className="flex items-center justify-between p-3.5 bg-slate-800/80 hover:bg-cyan-950/60 border border-slate-700 hover:border-cyan-500/80 rounded-xl transition-all group text-left active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black px-2.5 py-1 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    HBP
                  </span>
                  <div className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {language === 'zh' ? '觸身' : language === 'ja' ? '死球' : 'Hit by Pitch (HBP)'}
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                onClick={() => handleConfirmWalk('失誤')}
                className="flex items-center justify-between p-3.5 bg-slate-800/80 hover:bg-amber-950/60 border border-slate-700 hover:border-amber-500/80 rounded-xl transition-all group text-left active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                    E
                  </span>
                  <div className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                    {language === 'zh' ? '失誤 (失誤上壘)' : language === 'ja' ? '失策 (失策出塁)' : 'Error (Reach on Error / E)'}
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                onClick={() => handleConfirmWalk('K+WP')}
                className="flex items-center justify-between p-3.5 bg-slate-800/80 hover:bg-orange-950/60 border border-slate-700 hover:border-orange-500/80 rounded-xl transition-all group text-left active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black px-2.5 py-1 rounded bg-orange-500/20 text-orange-300 border border-orange-500/40 font-mono">
                    K+WP
                  </span>
                  <div className="text-sm font-bold text-white group-hover:text-orange-300 transition-colors">
                    {language === 'zh' ? 'K+WP (暴投不死三振)' : language === 'ja' ? 'K+WP (暴投振り逃げ)' : 'K+WP (Wild Pitch D3K)'}
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-500 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                onClick={() => handleConfirmWalk('K+PB')}
                className="flex items-center justify-between p-3.5 bg-slate-800/80 hover:bg-purple-950/60 border border-slate-700 hover:border-purple-500/80 rounded-xl transition-all group text-left active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black px-2.5 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono">
                    K+PB
                  </span>
                  <div className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                    {language === 'zh' ? 'K+PB (捕逸不死三振)' : language === 'ja' ? 'K+PB (捕逸振り逃げ)' : 'K+PB (Passed Ball D3K)'}
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsWalkModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-colors"
              >
                {language === 'zh' ? '取消' : language === 'ja' ? 'キャンセル' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WILD PITCH / PASSED BALL MODAL (暴投/捕逸彈窗) */}
      {isWpPbModalOpen && (
        <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl max-w-md w-full p-4 sm:p-5 shadow-2xl space-y-4 max-h-[90%] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span>{language === 'zh' ? '選擇暴投 / 捕逸 / 投手犯規' : language === 'ja' ? '暴投 / 捕逸 / ボークの選択' : 'Select Wild Pitch / Passed Ball / Balk'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {language === 'zh' 
                    ? `守備：${fieldingTeam.name} | 投手：#${activePitcher.number || '--'} ${activePitcher.name} | 捕手：#${activeCatcher.number || '--'} ${activeCatcher.name}` 
                    : language === 'ja' 
                    ? `守備：${fieldingTeam.name} | 投手：#${activePitcher.number || '--'} ${activePitcher.name} | 捕手：#${activeCatcher.number || '--'} ${activeCatcher.name}` 
                    : `Fielding: ${fieldingTeam.name} | P: #${activePitcher.number || '--'} ${activePitcher.name} | C: #${activeCatcher.number || '--'} ${activeCatcher.name}`}
                </p>
              </div>
              <button 
                onClick={() => setIsWpPbModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-2.5 bg-amber-950/30 border border-amber-500/30 rounded-xl text-[11px] text-amber-200 leading-relaxed">
              {language === 'zh' 
                ? '使壘上跑者向前推進各 1 壘（三壘跑者回本壘得分）。' 
                : language === 'ja'
                ? '走者を各1塁進塁させます（三塁走者は生還）。'
                : 'Advance all runners by 1 base (runner on 3rd scores).'}
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => {
                  dispatch({ type: 'WILD_PITCH', subType: 'WP' });
                  setIsWpPbModalOpen(false);
                }}
                className="flex items-center justify-between p-3.5 bg-slate-800/80 hover:bg-orange-950/70 border-2 border-slate-700 hover:border-orange-500 rounded-xl transition-all group text-left active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black px-2.5 py-1.5 rounded-lg bg-orange-500/20 text-orange-300 border border-orange-500/50 font-mono">
                    WP
                  </span>
                  <div>
                    <div className="text-base font-black text-white group-hover:text-orange-300 transition-colors flex items-center gap-2">
                      <span>{language === 'zh' ? '暴投 (Wild Pitch)' : language === 'ja' ? '暴投 (ワイルドピッチ)' : 'Wild Pitch (WP)'}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-orange-600/30 text-orange-300 border border-orange-500/40">
                        {language === 'zh' ? `記投手：${activePitcher.name}` : `P: ${activePitcher.name}`}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-500 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>

              <button
                onClick={() => {
                  dispatch({ type: 'WILD_PITCH', subType: 'PB' });
                  setIsWpPbModalOpen(false);
                }}
                className="flex items-center justify-between p-3.5 bg-slate-800/80 hover:bg-purple-950/70 border-2 border-slate-700 hover:border-purple-500 rounded-xl transition-all group text-left active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black px-2.5 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/50 font-mono">
                    PB
                  </span>
                  <div>
                    <div className="text-base font-black text-white group-hover:text-purple-300 transition-colors flex items-center gap-2">
                      <span>{language === 'zh' ? '捕逸 (Passed Ball)' : language === 'ja' ? '捕逸 (パスボール)' : 'Passed Ball (PB)'}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-purple-600/30 text-purple-300 border border-purple-500/40">
                        {language === 'zh' ? `記捕手：${activeCatcher.name}` : `C: ${activeCatcher.name}`}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>

              <button
                onClick={() => {
                  dispatch({ type: 'WILD_PITCH', subType: 'BK' });
                  setIsWpPbModalOpen(false);
                }}
                className="flex items-center justify-between p-3.5 bg-slate-800/80 hover:bg-rose-950/70 border-2 border-slate-700 hover:border-rose-500 rounded-xl transition-all group text-left active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black px-2.5 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/50 font-mono">
                    BK
                  </span>
                  <div>
                    <div className="text-base font-black text-white group-hover:text-rose-300 transition-colors flex items-center gap-2">
                      <span>{language === 'zh' ? '投手犯規 (Balk)' : language === 'ja' ? 'ボーク (Balk)' : 'Balk (BK)'}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-rose-600/30 text-rose-300 border border-rose-500/40">
                        {language === 'zh' ? `記投手：${activePitcher.name}` : `P: ${activePitcher.name}`}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-500 group-hover:text-rose-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsWpPbModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-colors"
              >
                {language === 'zh' ? '取消' : language === 'ja' ? 'キャンセル' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OUT TYPE SELECTION MODAL (出局方式彈窗) */}
      {isOutModalOpen && (
        <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl max-w-md w-full p-4 sm:p-5 shadow-2xl space-y-4 max-h-[90%] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  <span>{language === 'zh' ? '選擇出局類型' : language === 'ja' ? 'アウト種別の選択' : 'Select Out Type'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {language === 'zh' ? `打者：第 ${battingTeam.currentBatterIndex + 1} 棒 ${activeBatter.name} | 目前：${state.outs} 出局` : language === 'ja' ? `打者：${battingTeam.currentBatterIndex + 1}番 ${activeBatter.name} | 現在：${state.outs} アウト` : `Batter: #${battingTeam.currentBatterIndex + 1} ${activeBatter.name} | Current: ${state.outs} OUT`}
                </p>
              </div>
              <button 
                onClick={() => setIsOutModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            {Boolean(state.bases[2] && state.outs < 2) && (
              <button
                onClick={() => handleConfirmOut('高飛犧牲打')}
                className="w-full p-3 bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border-2 border-emerald-500/80 rounded-xl transition-all group text-left active:scale-98 shadow-lg"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-400">
                    SF
                  </span>
                  <span className="text-xs text-emerald-400 font-bold font-mono">+1 得分 · +1 打點 · +1 OUT</span>
                </div>
                <div className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                  {language === 'zh' ? '高飛犧牲打 (三壘跑者回本壘得分)' : language === 'ja' ? '犠牲フライ (三塁走者生還)' : 'Sacrifice Fly (Runner on 3rd scores)'}
                </div>
              </button>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handleConfirmOut('高飛')}
                className="p-3 bg-slate-800/80 hover:bg-blue-950/60 border border-slate-700 hover:border-blue-500/80 rounded-xl transition-all group text-left active:scale-98"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                    FO
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">+1 OUT</span>
                </div>
                <div className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                  {language === 'zh' ? '高飛' : language === 'ja' ? 'フライ' : 'Flyout'}
                </div>
              </button>

              <button
                onClick={() => handleConfirmOut('滾地')}
                className="p-3 bg-slate-800/80 hover:bg-amber-950/60 border border-slate-700 hover:border-amber-500/80 rounded-xl transition-all group text-left active:scale-98"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    GO
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">+1 OUT</span>
                </div>
                <div className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                  {language === 'zh' ? '滾地' : language === 'ja' ? 'ゴロ' : 'Groundout'}
                </div>
              </button>

              <button
                onClick={() => handleConfirmOut('野選')}
                className="p-3 bg-slate-800/80 hover:bg-orange-950/60 border border-slate-700 hover:border-orange-500/80 rounded-xl transition-all group text-left active:scale-98"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 border border-orange-500/40">
                    FC
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">+1 OUT</span>
                </div>
                <div className="text-sm font-bold text-white group-hover:text-orange-300 transition-colors">
                  {language === 'zh' ? '野選' : language === 'ja' ? '野選' : "Fielder's Choice"}
                </div>
              </button>

              <button
                type="button"
                disabled={!(Boolean(state.bases[0]) && state.outs < 2)}
                onClick={() => handleConfirmOut('雙殺')}
                className={`p-3 border rounded-xl transition-all group text-left ${
                  !(Boolean(state.bases[0]) && state.outs < 2)
                    ? 'opacity-30 cursor-not-allowed bg-slate-900/40 border-slate-800 pointer-events-none'
                    : 'bg-slate-800/80 hover:bg-rose-950/70 border-slate-700 hover:border-rose-500/80 cursor-pointer active:scale-98'
                }`}
                title={!(Boolean(state.bases[0]) && state.outs < 2) ? (language === 'zh' ? '一壘無人或已2出局不成立雙殺' : 'Requires runner on 1st and < 2 outs') : undefined}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black px-2 py-0.5 rounded bg-rose-500/30 text-rose-300 border border-rose-500/50">
                    DP
                  </span>
                  <span className="text-[10px] text-rose-400 font-mono font-bold">+2 OUT</span>
                </div>
                <div className="text-sm font-black text-rose-200 group-hover:text-rose-100 transition-colors">
                  {language === 'zh' ? '雙殺' : language === 'ja' ? '併殺' : 'Double Play'}
                </div>
                {!(Boolean(state.bases[0]) && state.outs < 2) && (
                  <div className="text-[10px] text-rose-400 font-bold mt-1">
                    {language === 'zh' ? '（一壘無人或2出局不成立）' : language === 'ja' ? '（走者無または2死時無効）' : '(No runner on 1st or 2 outs)'}
                  </div>
                )}
              </button>

              <button
                onClick={() => handleConfirmOut('三振')}
                className="p-3 bg-slate-800/80 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/80 rounded-xl transition-all group text-left active:scale-98"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    K
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">+1 OUT</span>
                </div>
                <div className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors">
                  {language === 'zh' ? '三振' : language === 'ja' ? '三振' : 'Strikeout'}
                </div>
              </button>

              <button
                onClick={() => handleConfirmOut('出局')}
                className="p-3 bg-slate-800/80 hover:bg-slate-700/60 border border-slate-700 hover:border-slate-500 rounded-xl transition-all group text-left active:scale-98"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black px-2 py-0.5 rounded bg-slate-700 text-slate-300 border border-slate-600">
                    OUT
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">+1 OUT</span>
                </div>
                <div className="text-sm font-bold text-white group-hover:text-slate-200 transition-colors">
                  {language === 'zh' ? '一般出局' : language === 'ja' ? 'アウト' : 'Out'}
                </div>
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsOutModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg transition-colors"
              >
                {language === 'zh' ? '取消' : language === 'ja' ? 'キャンセル' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
