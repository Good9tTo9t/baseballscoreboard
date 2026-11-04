import React, { useRef, useEffect, useState, forwardRef } from 'react';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import { GameState, ActionType, Team, Player } from '../types';
import { getPitcherCount } from '../reducer';
import { Diamond } from './Diamond';
import { Timer, Plus, Minus, GripVertical, ArrowDown, ArrowUp, RotateCcw } from 'lucide-react';
import { AutoScalingText } from './AutoScalingText';
import { AutoCondenseText } from './AutoCondenseText';
import {
  DndContext, 
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

interface ScoreboardDisplayProps {
  state: GameState;
  dispatch: React.Dispatch<ActionType>;
  language?: 'en' | 'zh' | 'ja';
  isVerticalFullscreen?: boolean;
  isObsMode?: boolean;
}

export const formatAtBatChinese = (rawAb: string, lang: 'en' | 'zh' | 'ja' = 'zh'): { label: string; style: string; rbi?: number } => {
    let ab = (rawAb || '').trim();
    let rbi: number | undefined = undefined;

    // Extract RBI if present in parentheses e.g. "一安(1)", "二安(2)", "全壘打(3)", "高飛(1)", "四球(1)"
    // Supports both half-width () and full-width （）
    const rbiMatch = ab.match(/[\(（]\s*(\d+)\s*[\)）]/);
    if (rbiMatch) {
        rbi = parseInt(rbiMatch[1], 10);
        ab = ab.replace(/[\(（]\s*\d+\s*[\)）]/, '').trim();
    }

    // 1. 安打 -> 綠色 (Green)
    if (ab === '1B' || ab === '一安' || ab === '安' || ab === '安打' || ab === '中安' || ab === '左安' || ab === '右安' || ab === '一壘打' || ab === '一壘安打' || ab === '內安' || ab === '內野安打' || ab.toLowerCase() === 'single') {
        return { 
            label: lang === 'en' ? '1B' : lang === 'ja' ? '安打' : '一安', 
            style: 'text-emerald-300 bg-emerald-950/80 border-emerald-500/70 font-bold',
            rbi
        };
    }
    if (ab === '2B' || ab === '二安' || ab === '二壘打' || ab === '二壘安打' || ab.toLowerCase() === 'double') {
        return { 
            label: lang === 'en' ? '2B' : lang === 'ja' ? '二塁打' : '二安', 
            style: 'text-emerald-300 bg-emerald-950/80 border-emerald-500/70 font-bold',
            rbi
        };
    }
    if (ab === '3B' || ab === '三安' || ab === '三壘打' || ab === '三壘安打' || ab.toLowerCase() === 'triple') {
        return { 
            label: lang === 'en' ? '3B' : lang === 'ja' ? '三塁打' : '三安', 
            style: 'text-emerald-300 bg-emerald-950/80 border-emerald-500/70 font-bold',
            rbi
        };
    }

    // 2. 全壘打 -> 黃色 (Yellow)
    if (ab === 'HR' || ab === '全壘打' || ab === '全' || ab === '本壘打' || ab.toLowerCase() === 'homerun') {
        return { 
            label: lang === 'en' ? 'HR' : lang === 'ja' ? '本塁打' : '全壘打', 
            style: 'text-yellow-300 bg-yellow-950/90 border-yellow-400 font-black shadow-[0_0_10px_rgba(250,204,21,0.3)]',
            rbi: rbi !== undefined ? rbi : 1
        };
    }
    if (ab === '場內全' || ab === '場內全壘打' || ab === 'IPHR') {
        return {
            label: lang === 'en' ? 'IPHR' : lang === 'ja' ? 'ランニング本塁打' : '場內全',
            style: 'text-yellow-300 bg-yellow-950/90 border-yellow-400 font-black shadow-[0_0_10px_rgba(250,204,21,0.3)]',
            rbi: rbi !== undefined ? rbi : 1
        };
    }

    // 3. 犧牲打 -> 藍綠色 (Teal)
    if (ab === 'SF' || ab === '高飛犧牲打' || ab === '高飛犧' || ab === '犧飛') {
        return { 
            label: lang === 'en' ? 'SF' : lang === 'ja' ? '犠飛' : '犧飛', 
            style: 'text-teal-300 bg-teal-950/80 border-teal-500/70 font-bold',
            rbi: rbi ?? 1
        };
    }
    if (ab === 'SAC' || ab === '犧牲短打' || ab === '犧打' || ab === 'SH') {
        return {
            label: lang === 'en' ? 'SAC' : lang === 'ja' ? '犠打' : '犧打',
            style: 'text-teal-300 bg-teal-950/80 border-teal-500/70 font-bold',
            rbi
        };
    }

    // 4. 四 死 -> 藍色 (Blue)
    if (ab === 'BB' || ab === '四球' || ab === '四壞' || ab === '保送' || ab === '敬遠' || ab === 'IBB') {
        return { 
            label: lang === 'en' ? (ab === '敬遠' || ab === 'IBB' ? 'IBB' : 'BB') : lang === 'ja' ? (ab === '敬遠' || ab === 'IBB' ? '敬遠' : '四球') : (ab === '敬遠' || ab === 'IBB' ? '敬遠' : '四壞'), 
            style: 'text-sky-300 bg-blue-950/80 border-blue-500/70 font-bold',
            rbi
        };
    }
    if (ab === 'HBP' || ab === '觸身' || ab === '死球') {
        return { 
            label: lang === 'en' ? 'HBP' : lang === 'ja' ? '死球' : '觸身', 
            style: 'text-sky-300 bg-blue-950/80 border-blue-500/70 font-bold',
            rbi
        };
    }

    // 5. 不死 -> 紫色 (Purple)
    if (ab === 'K+WP' || ab === 'K/WP' || ab === 'K+PB' || ab === 'K/PB' || ab === 'D3K' || ab === '不死三振' || ab === '不死') {
        return { 
            label: lang === 'en' ? 'D3K' : lang === 'ja' ? '振逃' : '不死', 
            style: 'text-purple-300 bg-purple-950/80 border-purple-500/70 font-black',
            rbi
        };
    }

    // 6. 三振 雙殺 -> 紅色 (Red)
    if (ab === 'K' || ab === '三振' || ab === '見三振' || ab === 'SO' || ab === 'ꓘ') {
        return { 
            label: lang === 'en' ? 'K' : lang === 'ja' ? '三振' : '三振', 
            style: 'text-rose-300 bg-rose-950/80 border-rose-500/70 font-bold',
            rbi
        };
    }
    if (ab === '雙殺' || ab === 'DP' || ab === '雙殺打' || ab === '併殺' || ab === 'GDP' || ab === 'GIDP') {
        return { 
            label: lang === 'en' ? 'DP' : lang === 'ja' ? '併殺' : '雙殺', 
            style: 'text-rose-300 bg-rose-950/80 border-rose-500/70 font-bold',
            rbi
        };
    }

    // 7. 滾地 高飛 失誤 -> 灰色 (Gray)
    if (ab === '失誤' || ab === 'E' || ab === 'ROE' || ab === '失誤上壘' || ab === 'エラー') {
        return { 
            label: lang === 'en' ? 'E' : lang === 'ja' ? '失策' : '失誤', 
            style: 'text-slate-200 bg-slate-800/90 border-slate-600 font-bold',
            rbi
        };
    }
    if (ab === '高飛' || ab === 'FO' || ab === '飛球' || ab === '平飛' || ab === '內飛' || ab === '界外飛' || ab === '左飛' || ab === '中飛' || ab === '右飛' || ab === '捕飛' || ab === '一飛' || ab === '二飛' || ab === '三飛' || ab === '游飛') {
        return { 
            label: lang === 'en' ? 'FO' : lang === 'ja' ? '飛球' : '高飛', 
            style: 'text-slate-200 bg-slate-800/90 border-slate-600 font-bold',
            rbi
        };
    }
    if (ab === '滾地' || ab === 'GO' || ab === '投滾' || ab === '捕滾' || ab === '一滾' || ab === '二滾' || ab === '三滾' || ab === '游滾') {
        return { 
            label: lang === 'en' ? 'GO' : lang === 'ja' ? 'ゴロ' : '滾地', 
            style: 'text-slate-200 bg-slate-800/90 border-slate-600 font-bold',
            rbi
        };
    }
    if (ab === '野選' || ab === 'FC') {
        return { 
            label: lang === 'en' ? 'FC' : lang === 'ja' ? '野選' : '野選', 
            style: 'text-orange-300 bg-orange-950/80 border-orange-500/70 font-bold',
            rbi
        };
    }
    if (ab === '妨礙打擊' || ab === 'CI') {
        return {
            label: lang === 'en' ? 'CI' : lang === 'ja' ? '打撃妨害' : '妨礙打擊',
            style: 'text-sky-300 bg-blue-950/80 border-blue-500/70 font-bold',
            rbi
        };
    }
    if (ab === '妨礙守備' || ab === 'OBS') {
        return {
            label: lang === 'en' ? 'OBS' : lang === 'ja' ? '守備妨害' : '妨礙守備',
            style: 'text-rose-300 bg-rose-950/80 border-rose-500/70 font-bold',
            rbi
        };
    }
    if (ab === 'OUT' || ab === '出局') {
        return { 
            label: lang === 'en' ? 'OUT' : lang === 'ja' ? '凡退' : '出局', 
            style: 'text-slate-200 bg-slate-800/90 border-slate-600 font-medium',
            rbi
        };
    }

    return { 
        label: ab, 
        style: 'text-slate-200 bg-slate-800/90 border-slate-600',
        rbi 
    };
};

// Simple Audio Context Helper
const playBeep = (freq: number, duration: number, type: 'sine' | 'square' | 'triangle' = 'sine') => {
  try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.value = freq;
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      
      // Fade out
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration);
      
      osc.stop(ctx.currentTime + duration);
  } catch (e) {
      console.error("Audio playback failed", e);
  }
};

// Helper for Score Animation
const AnimatedScore = ({ score, color, sizeClass, disableScale, style }: { score: number, color?: string, sizeClass?: string, disableScale?: boolean, style?: React.CSSProperties }) => {
    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        setAnimate(true);
        const timer = setTimeout(() => setAnimate(false), 500); // 500ms flash
        return () => clearTimeout(timer);
    }, [score]);

    return (
        <div 
          className={`flex items-center justify-center w-full h-full ${sizeClass || 'text-[5rem] sm:text-[9rem] lg:text-[12rem] xl:text-[17rem]'} font-bold text-center cursor-pointer select-none transition-all drop-shadow-lg leading-none rounded-lg ${animate ? (disableScale ? 'scale-110' : 'scale-150') + ' duration-150 z-50' : 'duration-300'}`}
          style={{ 
             color: animate ? '#fde047' : 'white', // Yellow flash
             textShadow: animate ? `0 0 40px ${color || '#fde047'}` : 'none',
             ...style
          }}
        >
          {score}
        </div>
    );
};

// Helper for Indicator Animation (Ball/Strike/Out)
interface AnimatedIndicatorProps {
  active: boolean;
  colorClass: string;
  shadowClass: string;
  baseClass: string;
  disableAnimation?: boolean;
  disableGlow?: boolean;
}


const TeamLogo = ({ team, isActive }: { team: Team, isActive?: boolean }) => {
    const hasNoBorder = Boolean(team.logoNoBorder && team.logoUrl);
    return (
        <div className="relative shrink-0 w-10 h-10 sm:w-16 sm:h-16 lg:w-20 lg:h-20">
            {isActive && <div className={`absolute inset-[-2px] ${hasNoBorder ? 'rounded-lg' : 'rounded-full'} border-2 border-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.6)] animate-[pulse_2s_ease-in-out_infinite] z-20 pointer-events-none`}></div>}
            <div 
                className={`w-full h-full flex items-center justify-center overflow-hidden z-10 ${
                    hasNoBorder
                        ? 'bg-transparent'
                        : `rounded-full bg-slate-800 border-2 shadow-lg ${isActive ? 'border-blue-400' : 'border-slate-700 shadow-black/20'}`
                }`} 
                style={hasNoBorder ? undefined : { backgroundColor: team.color }}
            >
                {team.logoUrl ? (
                    <img 
                        src={team.logoUrl} 
                        alt={team.name} 
                        className={`w-full h-full ${hasNoBorder ? 'object-contain drop-shadow-md' : 'object-cover'}`} 
                    />
                ) : (
                    <span className="text-white font-bold text-xl sm:text-3xl drop-shadow-md">{team.name.charAt(0)}</span>
                )}
            </div>
        </div>
    );
};

const getTextColorForBg = (hexColor?: string) => {
  if (!hexColor) return '#ffffff';
  const hex = hexColor.replace('#', '');
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 140 ? '#0f172a' : '#ffffff';
  }
  if (hex.length >= 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 140 ? '#0f172a' : '#ffffff';
  }
  return '#ffffff';
};

interface SortablePlayerItemProps {
  p: Player; 
  idx: number; 
  activeBatterId: string | undefined; 
  isCurrentBatter?: boolean;
  isAway: boolean; 
  isBench?: boolean; 
  state?: any; 
  dispatch?: any; 
  scaleMode?: 'large' | 'medium' | 'compact';
  teamColor?: string;
}

const SortablePlayerItem: React.FC<SortablePlayerItemProps> = ({ 
  p, 
  idx, 
  activeBatterId, 
  isCurrentBatter,
  isAway, 
  isBench, 
  scaleMode = 'medium',
  teamColor
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: p.id });

    const isActive = !isBench && (isCurrentBatter !== undefined ? isCurrentBatter : (Boolean(activeBatterId) && activeBatterId === p.id));

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 0,
        opacity: isDragging ? 0.5 : 1,
    };

    const isLarge = scaleMode === 'large';
    const isCompact = scaleMode === 'compact';

    const rowPadding = isLarge ? "px-2.5 py-0.5 sm:py-1" : isCompact ? "px-2 py-0" : "px-2.5 py-0.5";
    const orderTextSize = isLarge ? "text-xs sm:text-sm font-black w-4 sm:w-5" : isCompact ? "text-[9px] w-3" : "text-[10px] sm:text-xs w-3.5";
    const nameTextSize = isLarge ? "text-xs sm:text-base lg:text-lg font-black" : isCompact ? "text-[10px] font-bold" : "text-xs sm:text-sm font-bold";
    const numberTextSize = isLarge ? "text-xs sm:text-sm font-semibold" : isCompact ? "text-[8px]" : "text-[9px] sm:text-[10px]";
    const posTextSize = isLarge ? "text-xs sm:text-sm font-mono font-bold" : isCompact ? "text-[9px] font-mono font-bold" : "text-[10px] sm:text-xs font-mono font-bold";

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            {...attributes} 
            {...listeners} 
            className={`flex-1 min-h-0 w-full flex justify-between items-center ${rowPadding} rounded-none transition-colors cursor-grab active:cursor-grabbing ${
                isActive ? "bg-blue-600/40 ring-1.5 ring-blue-400 shadow-md text-white font-black" : "hover:bg-slate-800/40 text-slate-200"
            }`}
        >
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-1 overflow-hidden">
                {!isBench && (
                    <span className={`${orderTextSize} font-mono shrink-0 ${
                        isActive ? "text-blue-300 font-black" : "text-slate-400"
                    }`}>
                        {idx + 1}.
                    </span>
                )}
                <div className="flex-1 min-w-0 overflow-hidden flex items-center">
                    <AutoCondenseText 
                        text={p.name} 
                        className={`${nameTextSize} leading-tight ${
                            isActive ? "text-white font-black" : "text-slate-200"
                        }`} 
                        align="left" 
                    />
                    {p.number && (
                        <span className={`ml-1 ${numberTextSize} shrink-0 ${
                            isActive ? "text-blue-200 font-bold" : "text-slate-400"
                        }`}>
                            #{p.number}
                        </span>
                    )}
                </div>
            </div>

            {/* Position Display - neutral color, not standing out */}
            <span className={`${posTextSize} shrink-0 ml-1.5 text-slate-400 font-mono`}>
                {p.position || (isBench ? 'BN' : 'DH')}
            </span>
        </div>
    );
};

const AnimatedIndicator: React.FC<AnimatedIndicatorProps> = ({ active, colorClass, shadowClass, baseClass, disableAnimation = false, disableGlow = false }) => {
    return (
        <div 
            key={active ? "active" : "inactive"}
            className={`${baseClass} ${active ? `${colorClass} ${disableGlow ? "" : shadowClass} border-transparent ${disableAnimation ? "" : "animate-pop-in"}` : "bg-slate-900 border-slate-600"} transition-colors duration-200`} 
        />
    );
};

const LineupColumn = ({ 
    team, 
    isAway, 
    state, 
    dispatch,
    borderClass = "border-r-2 border-slate-800",
    isObs = false,
    language = 'zh'
}: { 
    team: Team, 
    isAway: boolean, 
    state: GameState, 
    dispatch: React.Dispatch<ActionType>,
    borderClass?: string,
    isObs?: boolean,
    language?: 'en' | 'zh' | 'ja'
}) => {
    const isTeamPitching = isAway ? !state.isTop : state.isTop;
    const isTeamBatting = isAway ? state.isTop : !state.isTop;
    const activeBatterId = isTeamBatting ? team.lineup[team.currentBatterIndex]?.id : undefined;
    const isLineupMode = state.displayMode === 'lineup';
    
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const {active, over} = event;
        
        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        if (activeId === overId) return;

        const teamKey = isAway ? 'away' : 'home';

        // Check if active is in lineup or bench
        const activeInLineupIdx = team.lineup.findIndex(p => p.id === activeId);
        const activeInBenchIdx = team.bench.findIndex(p => p.id === activeId);

        // Check if over is in lineup or bench
        const overInLineupIdx = team.lineup.findIndex(p => p.id === overId);
        const overInBenchIdx = team.bench.findIndex(p => p.id === overId);

        // Case 1: Reorder within Lineup
        if (activeInLineupIdx !== -1 && overInLineupIdx !== -1) {
            dispatch({
                type: 'REORDER_LINEUP',
                team: teamKey,
                startIndex: activeInLineupIdx,
                endIndex: overInLineupIdx
            });
        }
        // Case 2: Reorder within Bench
        else if (activeInBenchIdx !== -1 && overInBenchIdx !== -1) {
            dispatch({
                type: 'REORDER_BENCH',
                team: teamKey,
                startIndex: activeInBenchIdx,
                endIndex: overInBenchIdx
            });
        }
        // Case 3: Move from Bench to Lineup
        else if (activeInBenchIdx !== -1 && overInLineupIdx !== -1) {
            dispatch({
                type: 'MOVE_TO_LINEUP',
                team: teamKey,
                index: activeInBenchIdx
            });
            // After moving, we might want to reorder, but MOVE_TO_LINEUP usually appends.
            // For simplicity, we just move it.
        }
        // Case 4: Move from Lineup to Bench
        else if (activeInLineupIdx !== -1 && overInBenchIdx !== -1) {
            dispatch({
                type: 'MOVE_TO_BENCH',
                team: teamKey,
                index: activeInLineupIdx
            });
        }
    };

    const totalItems = team.lineup.length + 1;
    const isFewPlayers = totalItems <= 10;
    const scaleMode: 'large' | 'medium' | 'compact' = 
        totalItems <= 10 ? 'large' : 
        totalItems <= 13 ? 'medium' : 'compact';

    return (
        <div className={`flex-1 flex flex-col h-full bg-slate-950 ${borderClass} relative min-h-0`}>
            {/* Header (Aligned perfectly with center score strip: h-[72px] sm:h-[88px] lg:h-[100px] border-b-2 border-slate-600) */}
            <div className="h-[72px] sm:h-[88px] lg:h-[100px] p-2.5 sm:p-3 border-b-2 border-slate-600 flex items-center gap-2.5 relative overflow-hidden shrink-0">
                 <div className="absolute inset-0 opacity-20" style={{ backgroundColor: team.color }}></div>
                 <TeamLogo team={team} />
                 <div className="flex flex-col relative z-10 min-w-0 flex-1 overflow-hidden">
                     {isObs && (
                         <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                             {isAway ? (language === 'zh' ? '客隊先發打線' : 'AWAY LINEUP') : (language === 'zh' ? '主隊先發打線' : 'HOME LINEUP')}
                         </span>
                     )}
                     <AutoScalingText text={team.name} className="text-2xl sm:text-3xl lg:text-4xl font-black leading-none" align="left" />
                 </div>
            </div>

            <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToVerticalAxis]}
            >
                {/* Lineup List (100% fitted vertically without scrolling, edges touch borders directly) */}
                <div className={`flex-1 flex flex-col py-1 min-h-0 overflow-hidden justify-between px-0`}>
                    <SortableContext 
                        items={team.lineup.map(p => p.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {team.lineup.map((p, idx) => (
                            <SortablePlayerItem 
                                key={p.id}
                                p={p}
                                idx={idx}
                                activeBatterId={activeBatterId}
                                isCurrentBatter={isTeamBatting && idx === team.currentBatterIndex}
                                isAway={isAway}
                                state={state}
                                dispatch={dispatch}
                                isBench={false}
                                scaleMode={scaleMode}
                                teamColor={team.baseColor || team.color}
                            />
                        ))}
                    </SortableContext>

                    {/* Pitcher Row (Fitted dynamically in column with AutoCondenseText) */}
                    <div className={`flex-1 min-h-0 flex justify-between items-center ${scaleMode === 'large' ? "px-2.5 py-0.5 sm:py-1" : scaleMode === 'compact' ? "px-2 py-0" : "px-2.5 py-0.5"} rounded-none transition-colors border-t border-slate-700/60 ${isTeamPitching ? "bg-blue-600/35 ring-1.5 ring-blue-400 shadow-md" : "hover:bg-slate-700/50"}`}>
                        <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-1 overflow-hidden">
                            <span className={`${scaleMode === 'large' ? "text-xs sm:text-sm font-black w-4 sm:w-5" : scaleMode === 'compact' ? "text-[9px] w-3" : "text-[10px] sm:text-xs w-3.5"} text-slate-400 font-mono shrink-0`}>
                                P.
                            </span>
                            <div className="flex-1 min-w-0 overflow-hidden flex items-center">
                                <AutoCondenseText 
                                    text={team.pitcher.name} 
                                    className={`${scaleMode === 'large' ? "text-xs sm:text-base lg:text-lg font-black" : scaleMode === 'compact' ? "text-[10px] font-bold" : "text-xs sm:text-sm font-bold"} leading-tight text-slate-200`} 
                                    align="left" 
                                />
                                {team.pitcher.number && <span className={`ml-1 ${scaleMode === 'large' ? "text-xs sm:text-sm text-slate-400 font-semibold" : "text-[9px] sm:text-[10px] text-slate-400"} shrink-0`}>#{team.pitcher.number}</span>}
                            </div>
                        </div>
                    </div>
                </div>

                    {/* Bench List */}
                    {!isLineupMode && (
                        <div className="mt-4">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 px-1 border-t border-slate-800 pt-2">Bench</div>
                            <SortableContext 
                                items={team.bench.map(p => p.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="flex flex-col gap-1">
                                    {team.bench.map((p, idx) => (
                                        <SortablePlayerItem 
                                            key={p.id}
                                            p={p}
                                            idx={idx}
                                            activeBatterId={activeBatterId}
                                            isAway={isAway}
                                            state={state}
                                            dispatch={dispatch}
                                            isBench={true}
                                        />
                                    ))}
                                    {team.bench.length === 0 && (
                                        <div className="text-center text-slate-700 text-[10px] py-4 border border-dashed border-slate-800 rounded">
                                            Empty Bench
                                        </div>
                                    )}
                                </div>
                            </SortableContext>
                        </div>
                    )}
            </DndContext>
        </div>
    );
};

export const ScoreboardDisplay = forwardRef<HTMLDivElement, ScoreboardDisplayProps>(({ state, dispatch, language = 'zh', isVerticalFullscreen = false, isObsMode = false }, ref) => {
  const [showInningControls, setShowInningControls] = useState(false);
  const [showScoreControlsHome, setShowScoreControlsHome] = useState(false);
  const [showScoreControlsAway, setShowScoreControlsAway] = useState(false);
  const [showKAnimation, setShowKAnimation] = useState(false);
  const [showUmpireControls, setShowUmpireControls] = useState(false);
  const umpireTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ignoreUmpireClickRef = useRef(false);

  const handleInningMouseDown = () => {
    ignoreUmpireClickRef.current = false;
    umpireTimerRef.current = setTimeout(() => {
        setShowUmpireControls(true);
        setShowInningControls(false);
        ignoreUmpireClickRef.current = true;
    }, 600);
  };

  const handleInningMouseUp = () => {
    if (umpireTimerRef.current) clearTimeout(umpireTimerRef.current);
  };

  const handleInningClick = (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      if (ignoreUmpireClickRef.current) return;
      if (showUmpireControls) {
          setShowUmpireControls(false);
          return;
      }
      setShowInningControls(!showInningControls);
      setShowScoreControlsHome(false);
      setShowScoreControlsAway(false);
      if (!showInningControls) {
          dispatch({type: 'NEXT_INNING'});
      }
  };

  
  const isMountedRef = useRef(false);
  const prevStrikeoutTriggerRef = useRef(state.strikeoutAnimationTrigger || 0);

  useEffect(() => {
    // Avoid running animations on initial app open / component mount
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      prevStrikeoutTriggerRef.current = state.strikeoutAnimationTrigger || 0;
      return;
    }

    const currentTrigger = state.strikeoutAnimationTrigger || 0;
    if (currentTrigger > prevStrikeoutTriggerRef.current) {
      setShowKAnimation(true);
    }
    prevStrikeoutTriggerRef.current = currentTrigger;
  }, [state.strikeoutAnimationTrigger]);

  // Dedicated auto-dismiss for K animation so it never stays stuck on screen
  useEffect(() => {
    if (!showKAnimation) return;
    const timer = setTimeout(() => {
      setShowKAnimation(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [showKAnimation]);

  // Safety auto-dismiss for non-locked animations (e.g. HR) to avoid getting stuck
  useEffect(() => {
    if (!state.animation || state.animation.isLocked) return;
    const timer = setTimeout(() => {
      dispatch({ type: 'SET_ANIMATION', animation: null });
    }, 6000);
    return () => clearTimeout(timer);
  }, [state.animation, dispatch]);
  
  const [awaySettledKey, setAwaySettledKey] = useState('');
  const [homeSettledKey, setHomeSettledKey] = useState('');
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ignoreTimerClickRef = useRef(false);

  // Score Interaction Refs
  const scoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ignoreScoreClickRef = useRef(false);

  // Broadcast Pinch Scaling Refs
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef<number>(1);

  // Audio Effects for Timer
  useEffect(() => {
    if (!state.isTimerRunning) return;
    
    if (state.timer === 8) {
        playBeep(800, 0.2, 'sine'); // Warning beep
    } else if (state.timer === 0) {
        playBeep(300, 0.8, 'square'); // Time up buzzer
    }
  }, [state.timer, state.isTimerRunning]);

  // Timer Click Logic
  const handleTimerMouseDown = () => {
    ignoreTimerClickRef.current = false;
    timerRef.current = setTimeout(() => {
      dispatch({ type: 'SET_TIMER', value: 20 }); 
      if (state.isTimerRunning) dispatch({ type: 'TOGGLE_TIMER' }); 
      ignoreTimerClickRef.current = true;
    }, 800);
  };

  const handleTimerMouseUp = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleTimerClick = () => {
    if (!ignoreTimerClickRef.current) {
        dispatch({ type: 'TOGGLE_TIMER' });
    }
    ignoreTimerClickRef.current = false;
  };

  // Score Logic
  const handleScoreMouseDown = (team: 'home' | 'away') => {
    ignoreScoreClickRef.current = false;
    scoreTimerRef.current = setTimeout(() => {
        dispatch({ type: 'ADD_SCORE', team, amount: 1 });
        if (team === 'home') setShowScoreControlsHome(false);
        else setShowScoreControlsAway(false);
        ignoreScoreClickRef.current = true;
    }, 500); 
  };

  const handleScoreMouseUp = () => {
      if (scoreTimerRef.current) {
          clearTimeout(scoreTimerRef.current);
          scoreTimerRef.current = null;
      }
  };

  const handleScoreClick = (e: React.MouseEvent, team: 'home' | 'away') => {
      e.stopPropagation();
      if (ignoreScoreClickRef.current) {
          ignoreScoreClickRef.current = false;
          return;
      }
      if (team === 'home') {
          setShowScoreControlsHome(!showScoreControlsHome);
          setShowScoreControlsAway(false);
          setShowInningControls(false);
      } else {
          setShowScoreControlsAway(!showScoreControlsAway);
          setShowScoreControlsHome(false);
          setShowInningControls(false);
      }
  };
  
  const handleScoreMouseLeave = () => {
      handleScoreMouseUp();
      setTimeout(() => {
          setShowScoreControlsHome(false);
          setShowScoreControlsAway(false);
      }, 3000);
  };

  // Global click listener to close popovers
  useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
          // If clicking inside a popover or its trigger, don't close it here.
          // The click handlers on the triggers will handle toggling.
          // But to keep it simple, we can just let the triggers stopPropagation.
          setShowInningControls(false);
          setShowScoreControlsHome(false);
          setShowScoreControlsAway(false);
      };
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleBallClick = () => dispatch({ type: 'INCREMENT_BALL' });
  const handleStrikeClick = () => dispatch({ type: 'INCREMENT_STRIKE' });
  const handleOutClick = () => {
    dispatch({ type: 'INCREMENT_OUT' });
    dispatch({ type: 'INCREMENT_PLAYER_STAT', role: 'pitcher' });
  };
  const handleBatterClick = () => dispatch({ type: 'NEXT_BATTER' });
  const handlePitcherStatClick = () => dispatch({ type: 'INCREMENT_PLAYER_STAT', role: 'pitcher' });

  const activeBaseColor = state.isTop 
    ? (state.awayTeam.baseColor || state.awayTeam.color) 
    : (state.homeTeam.baseColor || state.homeTeam.color);

  const awayRole = state.isTop ? 'AT BAT' : 'PITCHING';
  const homeRole = state.isTop ? 'PITCHING' : 'AT BAT';
  const isAwayVisible = awayRole === 'AT BAT' ? state.showBatterInfo : state.showPitcherInfo;
  const isHomeVisible = homeRole === 'AT BAT' ? state.showBatterInfo : state.showPitcherInfo;

  useEffect(() => {
    if (!isAwayVisible) setAwaySettledKey('');
  }, [isAwayVisible]);

  useEffect(() => {
    if (!isHomeVisible) setHomeSettledKey('');
  }, [isHomeVisible]);

  // --- RENDER FUNCTIONS (Avoid Components to fix remount issues) ---

  const renderDefaultView = () => {
      if (isObsMode && state.meta.broadcastVisible === false) {
        return null;
      }
      const awayPlayer = state.isTop ? state.awayTeam.lineup[state.awayTeam.currentBatterIndex] || { name: 'Batter', number: '', stat: '0-0' } : state.awayTeam.pitcher;
      const homePlayer = state.isTop ? state.homeTeam.pitcher : state.homeTeam.lineup[state.homeTeam.currentBatterIndex] || { name: 'Batter', number: '', stat: '0-0' };

      const currentAwayKey = `${awayPlayer.name}-${awayPlayer.number}`;
      const currentHomeKey = `${homePlayer.name}-${homePlayer.number}`;

      const isAwayNameSettled = isAwayVisible && awaySettledKey === currentAwayKey;
      const isHomeNameSettled = isHomeVisible && homeSettledKey === currentHomeKey;

      return (
        <div className={`bg-slate-900 border-2 border-slate-700 rounded-xl overflow-hidden shadow-2xl relative font-display text-white w-full mx-auto flex flex-col h-full max-h-none`}>
        
        {/* Top Section */}
        <div className={isVerticalFullscreen ? "flex flex-col flex-1 min-h-0" : "flex flex-row flex-1 min-h-0"}>
          
          {/* LEFT: Away Team */}
          <div className={isVerticalFullscreen ? "flex-1 w-full shrink-0 border-b-2 border-slate-700 relative group overflow-hidden order-1" : "flex-none w-[35%] shrink-0 border-r-2 border-slate-700 relative group overflow-hidden"}>
             <div className="absolute inset-0 opacity-20 transition-colors duration-500" style={{ backgroundColor: state.awayTeam.color }}></div>
            
            <div className="flex h-full relative z-10 p-2 sm:p-4 lg:p-5 flex-col justify-between">
                <div className="flex justify-start items-stretch gap-2 sm:gap-3">
                  <div className="shrink-0 relative flex items-center justify-center">
                     <TeamLogo team={state.awayTeam} isActive={state.isTop} />
                  </div>
                  
                  <div className="flex flex-col items-start justify-center h-10 sm:h-16 lg:h-20 min-w-0 flex-1 py-1">
                     <AutoScalingText text={state.awayTeam.name} className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white tracking-tight drop-shadow-sm leading-tight" align="left" />
                  </div>
                </div>
                
                {/* Score Area */}
                <div 
                   className="flex-1 flex items-center justify-center relative group/score px-2 sm:px-8"
                   onMouseDown={() => handleScoreMouseDown('away')}
                   onMouseUp={handleScoreMouseUp}
                   onMouseLeave={handleScoreMouseLeave}
                   onTouchStart={() => handleScoreMouseDown('away')}
                   onTouchEnd={handleScoreMouseUp}
                   onClick={(e) => handleScoreClick(e, 'away')}
                >
                   <AnimatedScore score={state.awayTeam.score} color={state.awayTeam.color} />
                   
                   {/* Popover Controls for Score */}
                   {showScoreControlsAway && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-2 bg-slate-900/95 p-2 rounded border-2 border-slate-500 shadow-2xl z-50 animate-in fade-in zoom-in duration-200">
                          <button className="p-3 bg-white/10 hover:bg-white/20 rounded text-green-400" onClick={(e) => { e.stopPropagation(); dispatch({type: 'ADD_SCORE', team: 'away', amount: 1})}}><Plus size={24}/></button>
                          <button className="p-3 bg-white/10 hover:bg-white/20 rounded text-red-400" onClick={(e) => { e.stopPropagation(); dispatch({type: 'ADD_SCORE', team: 'away', amount: -1})}}><Minus size={24}/></button>
                      </div>
                   )}
                </div>
                
                <div 
                    className="mt-auto text-sm text-slate-300 border-t border-white/20 pt-2 sm:pt-3 flex justify-between items-end cursor-pointer hover:bg-white/5 rounded px-2 transition-colors overflow-hidden min-h-[60px] sm:min-h-[72px]"
                    onClick={awayRole === 'AT BAT' ? handleBatterClick : handlePitcherStatClick}
                >
                   <div className="flex flex-col overflow-hidden h-full justify-between flex-1 min-w-0 mr-2">
                      <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest ${awayRole === 'AT BAT' ? 'text-green-400' : 'text-red-400'}`}>{awayRole}</span>
                      <AnimatePresence mode="wait">
                        {isAwayVisible && (
                          <motion.div 
                            key={`${awayPlayer.name}-${awayPlayer.number}`}
                            initial={{ x: -100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -100, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            onAnimationComplete={() => { if (isAwayVisible) setAwaySettledKey(currentAwayKey); }}
                            className="flex flex-col overflow-hidden flex-1 justify-end w-full min-w-0"
                          >
                             <AutoScalingText text={`${state.isTop ? state.awayTeam.currentBatterIndex + 1 + '. ' : ''}${awayPlayer.name} #${awayPlayer.number}`} className="text-2xl sm:text-3xl lg:text-4xl text-white font-semibold font-display leading-none" align="left" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                   </div>
                   {isAwayVisible && isAwayNameSettled && (awayRole === 'AT BAT' ? state?.showPlayerStat : state.showCount) && (
                     <span className="text-2xl sm:text-3xl lg:text-4xl font-display text-yellow-500 leading-none shrink-0 ml-1">
                       {awayPlayer.stat}
                     </span>
                   )}
                </div>
            </div>
          </div>

          {/* CENTER: Info */}
          <div className={isVerticalFullscreen ? "flex-1 w-full shrink-0 bg-slate-800 flex flex-col relative border-b-2 border-slate-700 order-2" : "flex-none w-[30%] shrink-0 bg-slate-800 flex flex-col relative border-r-2 border-slate-700 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]"}>
            
            {/* Top: Inning & Timer */}
            <div className="h-14 sm:h-20 lg:h-24 border-b border-slate-600 flex items-center justify-between px-3 bg-slate-800/80 shrink-0">
               <div 
                  className="relative flex items-center space-x-3 cursor-pointer hover:bg-slate-700/50 px-2 py-1 rounded transition-colors group" 
                  onMouseDown={handleInningMouseDown}
                  onMouseUp={handleInningMouseUp}
                  onMouseLeave={handleInningMouseUp}
                  onTouchStart={handleInningMouseDown}
                  onTouchEnd={handleInningMouseUp}
                  onClick={handleInningClick}
               >
                 <div className="flex flex-col gap-1.5">
                    <div className={`w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent ${state.isTop ? 'border-b-[12px] border-b-yellow-400' : 'border-b-[12px] border-b-slate-700'}`}></div>
                    <div className={`w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent ${!state.isTop ? 'border-t-[12px] border-t-yellow-400' : 'border-t-[12px] border-t-slate-700'}`}></div>
                 </div>
                 <span className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-none select-none text-slate-200">
                   {state.inning}
                 </span>

                 {showInningControls && (
                    <div className="absolute top-1/2 left-full ml-2 transform -translate-y-1/2 flex flex-col gap-1 bg-slate-900 p-1 rounded border-2 border-slate-600 shadow-xl z-50">
                        <button className="p-1 hover:bg-white/20 rounded" onClick={(e) => { e.stopPropagation(); dispatch({type: 'NEXT_INNING'}) }}><Plus size={16}/></button>
                        <button className="p-1 hover:bg-white/20 rounded" onClick={(e) => { e.stopPropagation(); dispatch({type: 'PREVIOUS_HALF_INNING'}) }}><Minus size={16}/></button>
                    </div>
                 )}
                 {showUmpireControls && (
                    <div className="absolute top-full left-0 mt-2 grid grid-cols-2 gap-2 bg-slate-900 p-3 rounded-lg border-2 border-slate-600 shadow-2xl z-50 w-64 animate-in zoom-in-95 duration-200">
                        <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-2 rounded shadow text-sm" onClick={(e) => { e.stopPropagation(); dispatch({type: 'BATTER_OUT'}); setShowUmpireControls(false); }}>OUT</button>
                        <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-2 rounded shadow text-sm" onClick={(e) => { e.stopPropagation(); dispatch({type: 'SINGLE'}); setShowUmpireControls(false); }}>1B</button>
                        <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-2 rounded shadow text-sm" onClick={(e) => { e.stopPropagation(); dispatch({type: 'DOUBLE'}); setShowUmpireControls(false); }}>2B</button>
                        <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-2 rounded shadow text-sm" onClick={(e) => { e.stopPropagation(); dispatch({type: 'TRIPLE'}); setShowUmpireControls(false); }}>3B</button>
                        <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-2 rounded shadow text-sm" onClick={(e) => { e.stopPropagation(); dispatch({type: 'WALK'}); setShowUmpireControls(false); }}>BB</button>
                        <button className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-2 rounded shadow text-sm" onClick={(e) => {
                          e.stopPropagation();
                          const team = state.isTop ? state.awayTeam : state.homeTeam;
                          const batter = team.lineup[team.currentBatterIndex];
                          const pName = batter ? (batter.number ? `${batter.name} #${batter.number}` : batter.name) : '';
                          
                          const runnersOnBase = state.bases.filter(Boolean).length;
                          let animationType: 'homerun' | '2-run-homer' | '3-run-homer' | 'grand-slam' = 'homerun';
                          if (runnersOnBase === 1) animationType = '2-run-homer';
                          else if (runnersOnBase === 2) animationType = '3-run-homer';
                          else if (runnersOnBase === 3) animationType = 'grand-slam';

                          dispatch({ 
                            type: 'SET_ANIMATION', 
                            animation: { 
                              type: animationType,
                              playerName: pName,
                              teamName: team.name,
                              teamColor: team.color,
                              isLocked: false, 
                              isExiting: false 
                            } 
                          }); 
                          dispatch({type: 'HOME_RUN'}); 
                          setShowUmpireControls(false); 
                          setTimeout(() => { dispatch({ type: 'SET_ANIMATION', animation: null }) }, 5000); 
                        }}>HR</button>
                        <button className="col-span-2 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-2 rounded shadow text-sm flex justify-center items-center gap-1 mt-1" onClick={(e) => { e.stopPropagation(); dispatch({type: 'UNDO'}); setShowUmpireControls(false); }}><RotateCcw size={14}/> Undo</button>
                    </div>
                 )}
               </div>
               
               {/* Timer */}
               {state.showTimer && (<div 
                  className={`flex items-center space-x-1 px-2 py-1 rounded border-2 cursor-pointer select-none active:scale-95 transition-all ${state.timer <= 8 && state.isTimerRunning ? 'bg-red-900/80 border-red-500 animate-pulse' : 'bg-black/40 border-slate-600/50'}`}
                  onMouseDown={handleTimerMouseDown}
                  onMouseUp={handleTimerMouseUp}
                  onMouseLeave={handleTimerMouseUp}
                  onTouchStart={handleTimerMouseDown}
                  onTouchEnd={handleTimerMouseUp}
                  onClick={handleTimerClick}
               >
                    <Timer size={20} className={state.isTimerRunning ? "text-green-400 animate-spin" : "text-slate-400"} />
                    <span className={`text-3xl sm:text-4xl lg:text-5xl font-display font-bold w-[40px] sm:w-[50px] lg:w-[70px] text-center ${state.timer <= 8 ? 'text-white' : 'text-yellow-400'}`}>
                      {state.timer}
                    </span>
               </div>)}
            </div>

            {/* Middle: Bases & Counts */}
            <div className={isVerticalFullscreen ? "flex-1 flex flex-row items-center justify-evenly w-full relative min-h-0" : "flex-1 flex flex-col items-center justify-evenly w-full relative min-h-0"}>
                <AnimatePresence>
                  {showKAnimation && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none backdrop-blur-sm bg-black/20"
                    >
                      <div className="relative flex items-center justify-center">
                        <span 
                          className="text-[140px] sm:text-[200px] lg:text-[240px] font-black font-rammetto leading-none" 
                          style={{ 
                            color: state.isTop ? state.homeTeam.color : state.awayTeam.color,
                            WebkitTextStroke: '4px white',
                            filter: `drop-shadow(0 0 40px ${state.isTop ? state.homeTeam.color : state.awayTeam.color})`
                          }}
                        >
                          K
                        </span>
                        <motion.div 
                          initial={{ opacity: 1, scale: 0.5 }}
                          animate={{ opacity: 0, scale: 1.5 }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className="absolute w-[150px] h-[150px] sm:w-[200px] sm:h-[200px] lg:w-[250px] lg:h-[250px] border-[8px] rounded-full" 
                          style={{ borderColor: state.isTop ? state.homeTeam.color : state.awayTeam.color }}
                        />
                        <motion.div 
                          initial={{ opacity: 1, scale: 0.2 }}
                          animate={{ opacity: 0, scale: 2 }}
                          transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                          className="absolute w-[150px] h-[150px] sm:w-[200px] sm:h-[200px] lg:w-[250px] lg:h-[250px] border-[4px] border-white rounded-full" 
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className={isVerticalFullscreen ? "order-2 w-1/2 flex justify-start shrink-0 transform scale-[0.85] origin-left pl-4" : "order-1 w-auto flex justify-center shrink-0 transform scale-[0.85] lg:scale-100 origin-center"}>
                   <Diamond 
                      bases={state.bases} 
                      onToggle={(idx) => dispatch({type: 'TOGGLE_BASE', baseIndex: idx})}
                      className="" 
                      activeColor={activeBaseColor}
                   />
                </div>

                <div className={isVerticalFullscreen ? "order-1 w-1/2 flex justify-end shrink-0 pr-2" : "order-2 w-full flex justify-center shrink-0"}>
                    <div className="flex flex-col space-y-2 items-start">
                        {/* Balls */}
                        <div className="flex items-center gap-3 sm:gap-4 cursor-pointer group" onClick={handleBallClick}>
                            <span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-500 group-hover:text-white transition-colors w-8 sm:w-10 text-center">B</span>
                            <div className="flex space-x-2 sm:space-x-3">
                                {[0, 1, 2].map(i => (
                                    <AnimatedIndicator 
                                        key={i}
                                        active={i < state.balls} 
                                        colorClass="bg-led-green" 
                                        shadowClass="shadow-[0_0_20px_#00ff41]" 
                                        baseClass="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-full border-2"
                                    />
                                ))}
                            </div>
                        </div>
                        {/* Strikes */}
                        <div className="flex items-center gap-3 sm:gap-4 cursor-pointer group" onClick={handleStrikeClick}>
                            <span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-500 group-hover:text-white transition-colors w-8 sm:w-10 text-center">S</span>
                            <div className="flex space-x-2 sm:space-x-3">
                                {[0, 1].map(i => (
                                    <AnimatedIndicator 
                                        key={i}
                                        active={i < state.strikes} 
                                        colorClass="bg-led-yellow" 
                                        shadowClass="shadow-[0_0_20px_#ffcc00]" 
                                        baseClass="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-full border-2"
                                    />
                                ))}
                            </div>
                        </div>
                        {/* Outs */}
                        <div className="flex items-center gap-3 sm:gap-4 cursor-pointer group" onClick={handleOutClick}>
                            <span className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-500 group-hover:text-white transition-colors w-8 sm:w-10 text-center">O</span>
                            <div className="flex space-x-2 sm:space-x-3">
                                {[0, 1].map(i => (
                                    <AnimatedIndicator 
                                        key={i}
                                        active={i < state.outs} 
                                        colorClass="bg-led-red" 
                                        shadowClass="shadow-[0_0_20px_#ff3b30]" 
                                        baseClass="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-full border-2"
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          </div>

          {/* RIGHT: Home Team */}
          <div className={isVerticalFullscreen ? "flex-1 w-full shrink-0 border-t-2 border-slate-700 relative group overflow-hidden order-3" : "flex-none w-[35%] shrink-0 relative group overflow-hidden"}>
             <div className="absolute inset-0 opacity-20 transition-colors duration-500" style={{ backgroundColor: state.homeTeam.color }}></div>

             <div className="flex h-full p-2 sm:p-4 lg:p-5 flex-col justify-between text-right relative z-10">
                <div className="flex justify-end items-stretch gap-2 sm:gap-3">
                   <div className="flex flex-col items-end justify-center h-10 sm:h-16 lg:h-20 min-w-0 flex-1 py-1">
                      <AutoScalingText text={state.homeTeam.name} className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white tracking-tight drop-shadow-sm leading-tight" align="right" />
                   </div>
                   
                   <div className="shrink-0 relative flex items-center justify-center">
                      <TeamLogo team={state.homeTeam} isActive={!state.isTop} />
                   </div>
                </div>
                
                {/* Score Area */}
                <div 
                   className="flex-1 flex items-center justify-center relative group/score px-2 sm:px-8"
                   onMouseDown={() => handleScoreMouseDown('home')}
                   onMouseUp={handleScoreMouseUp}
                   onMouseLeave={handleScoreMouseLeave}
                   onTouchStart={() => handleScoreMouseDown('home')}
                   onTouchEnd={handleScoreMouseUp}
                   onClick={(e) => handleScoreClick(e, 'home')}
                >
                   <AnimatedScore score={state.homeTeam.score} color={state.homeTeam.color} />
                   
                   {showScoreControlsHome && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col gap-2 bg-slate-900/95 p-2 rounded border-2 border-slate-500 shadow-2xl z-50 animate-in fade-in zoom-in duration-200">
                          <button className="p-3 bg-white/10 hover:bg-white/20 rounded text-green-400" onClick={(e) => { e.stopPropagation(); dispatch({type: 'ADD_SCORE', team: 'home', amount: 1})}}><Plus size={24}/></button>
                          <button className="p-3 bg-white/10 hover:bg-white/20 rounded text-red-400" onClick={(e) => { e.stopPropagation(); dispatch({type: 'ADD_SCORE', team: 'home', amount: -1})}}><Minus size={24}/></button>
                      </div>
                   )}
                </div>
                
                 <div 
                    className="mt-auto text-sm text-slate-300 border-t border-white/20 pt-2 sm:pt-3 flex justify-between items-end flex-row-reverse cursor-pointer hover:bg-white/5 rounded px-2 transition-colors overflow-hidden min-h-[60px] sm:min-h-[72px]"
                    onClick={homeRole === 'AT BAT' ? handleBatterClick : handlePitcherStatClick}
                 >
                   <div className="flex flex-col overflow-hidden h-full justify-between flex-1 min-w-0 ml-2">
                      <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest text-right ${homeRole === 'AT BAT' ? 'text-green-400' : 'text-red-400'}`}>{homeRole}</span>
                      <AnimatePresence mode="wait">
                        {isHomeVisible && (
                          <motion.div 
                            key={`${homePlayer.name}-${homePlayer.number}`}
                            initial={{ x: 100, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 100, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            onAnimationComplete={() => { if (isHomeVisible) setHomeSettledKey(currentHomeKey); }}
                            className="flex flex-col overflow-hidden flex-1 justify-end w-full min-w-0"
                          >
                             <AutoScalingText text={`${!state.isTop ? state.homeTeam.currentBatterIndex + 1 + '. ' : ''}${homePlayer.name} #${homePlayer.number}`} className="text-2xl sm:text-3xl lg:text-4xl text-white font-semibold font-display leading-none" align="right" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                   </div>
                   {isHomeVisible && isHomeNameSettled && (homeRole === 'AT BAT' ? state?.showPlayerStat : state.showCount) && (
                     <span className="text-2xl sm:text-3xl lg:text-4xl font-display text-yellow-500 leading-none shrink-0 mr-1">
                       {homePlayer.stat}
                     </span>
                   )}
                </div>
            </div>
          </div>

        </div>

      </div>
      )
  };

  const renderObsLineupView = () => {
    if (state.meta.broadcastVisible === false) {
      return null;
    }

    return (
      <div 
        key={state.meta.broadcastAnimKey || 'obs-lineup'}
        className="w-full h-full flex flex-row justify-between items-center px-4 sm:px-8 lg:px-14 py-6 sm:py-8 lg:py-10 bg-transparent overflow-hidden select-none pointer-events-auto"
      >
        {/* Left: Away Starting Lineup Card */}
        <motion.div 
          initial={{ x: -140, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="w-[32%] sm:w-[28%] lg:w-[25%] min-w-[260px] max-w-[420px] h-full flex flex-col rounded-2xl border-2 border-slate-700/80 bg-slate-950/92 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden shrink-0"
        >
          <LineupColumn 
            team={state.awayTeam} 
            isAway={true} 
            state={state} 
            dispatch={dispatch} 
            borderClass="border-none" 
            isObs={true}
            language={language}
          />
        </motion.div>

        {/* Center: Transparent Gap / Interval between Left and Right Lineups */}
        <div className="flex-1 min-w-[12%] h-full pointer-events-none" />

        {/* Right: Home Starting Lineup Card */}
        <motion.div 
          initial={{ x: 140, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="w-[32%] sm:w-[28%] lg:w-[25%] min-w-[260px] max-w-[420px] h-full flex flex-col rounded-2xl border-2 border-slate-700/80 bg-slate-950/92 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden shrink-0"
        >
          <LineupColumn 
            team={state.homeTeam} 
            isAway={false} 
            state={state} 
            dispatch={dispatch} 
            borderClass="border-none" 
            isObs={true}
            language={language}
          />
        </motion.div>
      </div>
    );
  };

  const renderLineupView = () => {
    if (isObsMode) {
      return renderObsLineupView();
    }
    const awayBatter: Partial<Player> = state.awayTeam.lineup[state.awayTeam.currentBatterIndex] || { name: '---', number: '', stat: '---', position: 'DH' };
    const homeBatter: Partial<Player> = state.homeTeam.lineup[state.homeTeam.currentBatterIndex] || { name: '---', number: '', stat: '---', position: 'DH' };
    const awayPitcher: Partial<Player> = state.awayTeam.pitcher || { name: '---', number: '', stat: '---', position: 'P' };
    const homePitcher: Partial<Player> = state.homeTeam.pitcher || { name: '---', number: '', stat: '---', position: 'P' };

    const batterIndex = state.isTop ? state.awayTeam.currentBatterIndex : state.homeTeam.currentBatterIndex;
    const batter = state.isTop ? awayBatter : homeBatter;
    const pitcher = state.isTop ? homePitcher : awayPitcher;
    const activeBaseColor = state.isTop 
      ? (state.awayTeam.baseColor || state.awayTeam.color || '#facc15')
      : (state.homeTeam.baseColor || state.homeTeam.color || '#facc15');

    const maxInnings = Math.max(9, state.awayTeam.inningScores.length, state.homeTeam.inningScores.length);
    const inningsArray = Array.from({ length: maxInnings }, (_, i) => i + 1);
    const awayRuns = state.awayTeam.inningScores.reduce((sum, score) => sum + (score || 0), 0);
    const homeRuns = state.homeTeam.inningScores.reduce((sum, score) => sum + (score || 0), 0);

    return (
        <div className={`w-full h-full bg-slate-900 border-2 border-slate-700 rounded-xl overflow-hidden shadow-2xl flex font-display text-white ${isVerticalFullscreen ? "flex-col" : "flex-row"}`}>
            
            {/* Left: Away Lineup (23% width, safely inset) */}
            <div className={isVerticalFullscreen ? "flex-1 w-full shrink-0 min-w-0 border-b-2 border-slate-700 order-2" : "flex-none w-[23%] shrink-0 h-full min-w-0 border-r-2 border-slate-700 order-1"}>
                <LineupColumn team={state.awayTeam} isAway={true} state={state} dispatch={dispatch} />
            </div>

            {/* Center: Simplified Scoreboard (54% width, ample space for bases) */}
            <div className={isVerticalFullscreen ? "flex-1 w-full shrink-0 flex flex-col bg-slate-800 min-w-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] order-1" : "flex-none w-[54%] shrink-0 h-full flex flex-col bg-slate-800 min-w-0 border-x-2 border-slate-900 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] order-2"}>
                {/* Score Strip */}
                <div className="h-[72px] sm:h-[88px] lg:h-[100px] bg-slate-950 flex border-b-2 border-slate-600 shrink-0">
                    {/* Away Score */}
                    <div 
                        className="flex-1 flex items-center justify-center text-5xl lg:text-7xl font-bold relative overflow-hidden cursor-pointer hover:brightness-110 transition-all" 
                        style={{ backgroundColor: state.awayTeam.color }}
                        onMouseDown={() => handleScoreMouseDown('away')}
                        onMouseUp={handleScoreMouseUp}
                        onMouseLeave={handleScoreMouseLeave}
                        onTouchStart={() => handleScoreMouseDown('away')}
                        onTouchEnd={handleScoreMouseUp}
                        onClick={(e) => handleScoreClick(e, 'away')}
                    >
                         {/* Deeper score background overlay matching broadcast mode */}
                         <div className="absolute inset-0 bg-black/45 pointer-events-none"></div>
                         <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/35 pointer-events-none"></div>
                         <div className="z-10"><AnimatedScore score={state.awayTeam.score} color="#ffffff" sizeClass="text-5xl sm:text-6xl lg:text-7xl font-black drop-shadow-md" /></div>
                         {showScoreControlsAway && (
                            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 flex gap-2 bg-slate-900/95 p-2 rounded border-2 border-slate-500 shadow-2xl z-50 animate-in fade-in zoom-in duration-200">
                                <button className="p-2 bg-white/10 hover:bg-white/20 rounded text-green-400" onClick={(e) => { e.stopPropagation(); dispatch({type: 'ADD_SCORE', team: 'away', amount: 1})}}><Plus size={20}/></button>
                                <button className="p-2 bg-white/10 hover:bg-white/20 rounded text-red-400" onClick={(e) => { e.stopPropagation(); dispatch({type: 'ADD_SCORE', team: 'away', amount: -1})}}><Minus size={20}/></button>
                            </div>
                         )}
                    </div>

                    {/* Center: Inning & Integrated Pitch Timer (No separate timer row!) */}
                    <div 
                        className="w-28 sm:w-32 lg:w-36 bg-slate-900 flex flex-col items-center justify-center border-x-2 border-slate-700 cursor-pointer hover:bg-slate-800 transition-colors relative py-1 px-1"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowInningControls(true);
                            setShowScoreControlsHome(false);
                            setShowScoreControlsAway(false);
                            dispatch({type: 'NEXT_INNING'});
                        }}
                    >
                        <div className="flex items-center gap-1.5 sm:gap-2 select-none leading-none">
                            <span className="text-[11px] sm:text-xs font-bold text-yellow-400 leading-none select-none">
                                {state.isTop ? '▲' : '▼'}
                            </span>
                            <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-100 font-mono leading-none select-none">
                                {state.inning}
                            </span>
                        </div>

                        {/* Integrated Pitch Timer */}
                        {state.showTimer && (
                            <div 
                                className={`flex items-center gap-1 px-2 py-0.5 rounded border mt-1 cursor-pointer select-none active:scale-95 transition-all ${
                                    state.timer <= 8 && state.isTimerRunning 
                                        ? 'bg-rose-950/90 border-rose-500 text-rose-300 animate-pulse' 
                                        : 'bg-black/60 border-slate-700 text-yellow-400'
                                }`}
                                onMouseDown={(e) => { e.stopPropagation(); handleTimerMouseDown(); }}
                                onMouseUp={(e) => { e.stopPropagation(); handleTimerMouseUp(); }}
                                onMouseLeave={handleTimerMouseUp}
                                onTouchStart={(e) => { e.stopPropagation(); handleTimerMouseDown(); }}
                                onTouchEnd={(e) => { e.stopPropagation(); handleTimerMouseUp(); }}
                                onClick={(e) => { e.stopPropagation(); handleTimerClick(); }}
                                title="投球計時器 (點擊暫停/開始，長按重設)"
                            >
                                <Timer size={11} className={state.isTimerRunning ? "text-green-400 animate-spin" : "text-slate-400"} />
                                <span className="text-xs sm:text-sm font-bold font-mono min-w-[18px] text-center">
                                    {state.timer}
                                </span>
                            </div>
                        )}

                        {showInningControls && (
                            <div className="absolute top-full mt-2 flex gap-2 bg-slate-900/95 p-2 rounded border-2 border-slate-500 shadow-2xl z-50 animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
                                <button className="p-2 bg-white/10 hover:bg-white/20 rounded text-green-400" onClick={(e) => { e.stopPropagation(); dispatch({type: 'NEXT_INNING'}) }}><Plus size={20}/></button>
                                <button className="p-2 bg-white/10 hover:bg-white/20 rounded text-red-400" onClick={(e) => { e.stopPropagation(); dispatch({type: 'PREVIOUS_HALF_INNING'}) }}><Minus size={20}/></button>
                            </div>
                        )}
                    </div>

                    {/* Home Score */}
                    <div 
                        className="flex-1 flex items-center justify-center text-5xl lg:text-7xl font-bold relative overflow-hidden cursor-pointer hover:brightness-110 transition-all" 
                        style={{ backgroundColor: state.homeTeam.color }}
                        onMouseDown={() => handleScoreMouseDown('home')}
                        onMouseUp={handleScoreMouseUp}
                        onMouseLeave={handleScoreMouseLeave}
                        onTouchStart={() => handleScoreMouseDown('home')}
                        onTouchEnd={handleScoreMouseUp}
                        onClick={(e) => handleScoreClick(e, 'home')}
                    >
                         {/* Deeper score background overlay matching broadcast mode */}
                         <div className="absolute inset-0 bg-black/45 pointer-events-none"></div>
                         <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/35 pointer-events-none"></div>
                         <div className="z-10"><AnimatedScore score={state.homeTeam.score} color="#ffffff" sizeClass="text-5xl sm:text-6xl lg:text-7xl font-black drop-shadow-md" /></div>
                          {showScoreControlsHome && (
                            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 flex gap-2 bg-slate-900/95 p-2 rounded border-2 border-slate-500 shadow-2xl z-50 animate-in fade-in zoom-in duration-200">
                                <button className="p-2 bg-white/10 hover:bg-white/20 rounded text-green-400" onClick={(e) => { e.stopPropagation(); dispatch({type: 'ADD_SCORE', team: 'home', amount: 1})}}><Plus size={20}/></button>
                                <button className="p-2 bg-white/10 hover:bg-white/20 rounded text-red-400" onClick={(e) => { e.stopPropagation(); dispatch({type: 'ADD_SCORE', team: 'home', amount: -1})}}><Minus size={20}/></button>
                            </div>
                         )}
                    </div>
                </div>

                {/* AT BAT & PITCHING (Fixed Left = Away Team, Fixed Right = Home Team) */}
                <div className="flex bg-slate-900 border-b-2 border-slate-700 shrink-0 text-white min-h-[76px] sm:min-h-[84px] lg:min-h-[92px]">
                    {/* Fixed Left Box: Away Team */}
                    <div className="flex-1 flex flex-col justify-between py-2 px-3 sm:px-4 border-r-2 border-slate-700 min-w-0">
                        {/* Top: Role & Team Name vs Stat */}
                        <div className="flex items-center justify-between min-w-0">
                            <span className="font-bold tracking-widest text-[11px] sm:text-xs flex items-center gap-1.5" style={{ color: state.awayTeam.color }}>
                                <span>{state.isTop ? (language === 'zh' ? '打擊' : language === 'ja' ? '打撃' : 'AT BAT') : (language === 'zh' ? '投球' : language === 'ja' ? '投球' : 'PITCHING')}</span>
                                <span className="text-white/40">· {state.awayTeam.name}</span>
                            </span>
                            {(state.isTop ? (state?.showPlayerStat ?? true) : (state.showCount ?? true)) && (
                                <span className="text-sm sm:text-base font-mono text-yellow-400 font-black shrink-0 ml-1">
                                    {state.isTop ? `AVG: ${awayBatter.stat || '.000'}` : `P: ${getPitcherCount(awayPitcher)}`}
                                </span>
                            )}
                        </div>

                        {/* Middle: Player Name & Number */}
                        <div className="flex items-center gap-1.5 min-w-0 my-0.5">
                            <div className="flex-1 min-w-0 overflow-hidden">
                                <AutoCondenseText 
                                    text={state.isTop 
                                        ? `${state.awayTeam.currentBatterIndex + 1}. ${awayBatter.name}`
                                        : awayPitcher.name || '---'
                                    } 
                                    className="text-lg sm:text-xl lg:text-2xl font-black text-white" 
                                    align="left" 
                                />
                            </div>
                            {(state.isTop ? awayBatter.number : awayPitcher.number) && (
                                <span className="text-sm sm:text-base text-slate-300 font-bold shrink-0">
                                    #{state.isTop ? awayBatter.number : awayPitcher.number}
                                </span>
                            )}
                        </div>

                        {/* Bottom: Underneath Batter (At-Bats) OR Underneath Pitcher (Stats) */}
                        <div className="flex items-center min-w-0 h-5 sm:h-6 overflow-visible">
                            {state.isTop ? (
                                /* Batter At-Bats (Max 4 latest) */
                                <div className="flex items-center gap-1 sm:gap-1.5 overflow-visible">
                                    {((awayBatter.atBats || []).length === 0) ? (
                                        <span className="text-[11px] sm:text-xs text-slate-400 font-mono font-bold leading-none">
                                            {language === 'zh' ? '首打席' : language === 'ja' ? '初打席' : '1st AB'}
                                        </span>
                                    ) : (
                                        (awayBatter.atBats || []).slice(-4).map((ab, idx) => {
                                             const item = formatAtBatChinese(ab, language);
                                             return (
                                                 <div 
                                                     key={idx} 
                                                     className="relative inline-flex items-center shrink-0 my-0"
                                                 >
                                                     <span 
                                                         className={`text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded border ${item.style} shadow-sm font-bold tracking-tight shrink-0 h-[18px] sm:h-[19px] flex items-center justify-center leading-none`}
                                                     >
                                                         {item.label}
                                                     </span>
                                                     {item.rbi !== undefined && item.rbi > 0 && (
                                                         <span 
                                                             className="absolute -top-1 -right-1 min-w-[12px] h-[12px] px-0.5 rounded-[2px] bg-red-600 text-white font-mono font-black text-[8px] leading-none flex items-center justify-center shadow border border-red-300 z-10 select-none pointer-events-none"
                                                             title={`打點: ${item.rbi}`}
                                                         >
                                                             {item.rbi}
                                                         </span>
                                                     )}
                                                 </div>
                                             );
                                         })
                                     )}
                                </div>
                            ) : (
                                /* Pitcher Stats: 打者, 三振, 用球數 */
                                <div className="flex items-center gap-2 sm:gap-2.5 text-xs sm:text-sm text-slate-200 font-mono leading-none">
                                    <span className="flex items-center gap-1">
                                        <span className="text-xs sm:text-sm text-slate-400 font-bold">{language === 'zh' ? '打者' : language === 'ja' ? '打者' : 'BF'}</span>
                                        <span className="text-sm sm:text-base text-yellow-400 font-bold">
                                            {(() => {
                                                const prevBf = (state.awayTeam.pitcherHistory || []).reduce((acc, p) => acc + (p.battersFaced || 0), 0);
                                                const totalOppAtBats = state.homeTeam.lineup.reduce((acc, p) => acc + (p.atBats?.length || 0), 0);
                                                const isPitchingNow = !state.isTop;
                                                const calculated = Math.max(0, totalOppAtBats - prevBf) + (isPitchingNow ? 1 : 0);
                                                return (typeof awayPitcher.battersFaced === 'number' && awayPitcher.battersFaced > 0)
                                                    ? awayPitcher.battersFaced
                                                    : calculated;
                                            })()}
                                        </span>
                                    </span>
                                    <span className="text-slate-600">·</span>
                                    <span className="flex items-center gap-1">
                                        <span className="text-xs sm:text-sm text-slate-400 font-bold">{language === 'zh' ? '三振' : language === 'ja' ? '奪三振' : 'K'}</span>
                                        <span className="text-sm sm:text-base text-rose-400 font-bold">{awayPitcher.strikeouts ?? 0}</span>
                                    </span>
                                    <span className="text-slate-600">·</span>
                                    <span className="flex items-center gap-1">
                                        <span className="text-xs sm:text-sm text-slate-400 font-bold">{language === 'zh' ? '用球' : language === 'ja' ? '球数' : 'NP'}</span>
                                        <span className="text-sm sm:text-base text-sky-300 font-bold">
                                            {getPitcherCount(awayPitcher)}
                                        </span>
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Fixed Right Box: Home Team */}
                    <div className="flex-1 flex flex-col justify-between py-2 px-3 sm:px-4 min-w-0">
                        {/* Top: Role & Team Name vs Stat */}
                        <div className="flex items-center justify-between min-w-0">
                            <span className="font-bold tracking-widest text-[11px] sm:text-xs flex items-center gap-1.5" style={{ color: state.homeTeam.color }}>
                                <span>{!state.isTop ? (language === 'zh' ? '打擊' : language === 'ja' ? '打撃' : 'AT BAT') : (language === 'zh' ? '投球' : language === 'ja' ? '投球' : 'PITCHING')}</span>
                                <span className="text-white/40">· {state.homeTeam.name}</span>
                            </span>
                            {(!state.isTop ? (state?.showPlayerStat ?? true) : (state.showCount ?? true)) && (
                                <span className="text-sm sm:text-base font-mono text-yellow-400 font-black shrink-0 ml-1">
                                    {!state.isTop ? `AVG: ${homeBatter.stat || '.000'}` : `P: ${getPitcherCount(homePitcher)}`}
                                </span>
                            )}
                        </div>

                        {/* Middle: Player Name & Number */}
                        <div className="flex items-center gap-1.5 min-w-0 my-0.5">
                            <div className="flex-1 min-w-0 overflow-hidden">
                                <AutoCondenseText 
                                    text={!state.isTop 
                                        ? `${state.homeTeam.currentBatterIndex + 1}. ${homeBatter.name}`
                                        : homePitcher.name || '---'
                                    } 
                                    className="text-lg sm:text-xl lg:text-2xl font-black text-white" 
                                    align="left" 
                                />
                            </div>
                            {(!state.isTop ? homeBatter.number : homePitcher.number) && (
                                <span className="text-sm sm:text-base text-slate-300 font-bold shrink-0">
                                    #{!state.isTop ? homeBatter.number : homePitcher.number}
                                </span>
                            )}
                        </div>

                        {/* Bottom: Underneath Batter (At-Bats) OR Underneath Pitcher (Stats) */}
                        <div className="flex items-center min-w-0 h-5 sm:h-6 overflow-visible">
                            {!state.isTop ? (
                                /* Batter At-Bats (Max 4 latest) */
                                <div className="flex items-center gap-1 sm:gap-1.5 overflow-visible">
                                    {((homeBatter.atBats || []).length === 0) ? (
                                         <span className="text-[11px] sm:text-xs text-slate-400 font-mono font-bold leading-none">
                                             {language === 'zh' ? '首打席' : language === 'ja' ? '初打席' : '1st AB'}
                                         </span>
                                    ) : (
                                         (homeBatter.atBats || []).slice(-4).map((ab, idx) => {
                                              const item = formatAtBatChinese(ab, language);
                                              return (
                                                  <div 
                                                      key={idx} 
                                                      className="relative inline-flex items-center shrink-0 my-0"
                                                 >
                                                      <span 
                                                          className={`text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded border ${item.style} shadow-sm font-bold tracking-tight shrink-0 h-[18px] sm:h-[19px] flex items-center justify-center leading-none`}
                                                     >
                                                         {item.label}
                                                     </span>
                                                     {item.rbi !== undefined && item.rbi > 0 && (
                                                         <span 
                                                             className="absolute -top-1 -right-1 min-w-[12px] h-[12px] px-0.5 rounded-[2px] bg-red-600 text-white font-mono font-black text-[8px] leading-none flex items-center justify-center shadow border border-red-300 z-10 select-none pointer-events-none"
                                                             title={`打點: ${item.rbi}`}
                                                         >
                                                             {item.rbi}
                                                         </span>
                                                     )}
                                                 </div>
                                             );
                                         })
                                     )}
                                </div>
                            ) : (
                                /* Pitcher Stats: 打者, 三振, 用球數 */
                                <div className="flex items-center gap-2 sm:gap-2.5 text-xs sm:text-sm text-slate-200 font-mono leading-none">
                                    <span className="flex items-center gap-1">
                                        <span className="text-xs sm:text-sm text-slate-400 font-bold">{language === 'zh' ? '打者' : language === 'ja' ? '打者' : 'BF'}</span>
                                        <span className="text-sm sm:text-base text-yellow-400 font-bold">
                                            {(() => {
                                                const prevBf = (state.homeTeam.pitcherHistory || []).reduce((acc, p) => acc + (p.battersFaced || 0), 0);
                                                const totalOppAtBats = state.awayTeam.lineup.reduce((acc, p) => acc + (p.atBats?.length || 0), 0);
                                                const isPitchingNow = state.isTop;
                                                const calculated = Math.max(0, totalOppAtBats - prevBf) + (isPitchingNow ? 1 : 0);
                                                return (typeof homePitcher.battersFaced === 'number' && homePitcher.battersFaced > 0)
                                                    ? homePitcher.battersFaced
                                                    : calculated;
                                            })()}
                                        </span>
                                    </span>
                                    <span className="text-slate-600">·</span>
                                    <span className="flex items-center gap-1">
                                        <span className="text-xs sm:text-sm text-slate-400 font-bold">{language === 'zh' ? '三振' : language === 'ja' ? '奪三振' : 'K'}</span>
                                        <span className="text-sm sm:text-base text-rose-400 font-bold">{homePitcher.strikeouts ?? 0}</span>
                                    </span>
                                    <span className="text-slate-600">·</span>
                                    <span className="flex items-center gap-1">
                                        <span className="text-xs sm:text-sm text-slate-400 font-bold">{language === 'zh' ? '用球' : language === 'ja' ? '球数' : 'NP'}</span>
                                        <span className="text-sm sm:text-base text-sky-300 font-bold">
                                            {getPitcherCount(homePitcher)}
                                        </span>
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Middle: Bases & Counts (No overflow, scaled gracefully) */}
                <div className="flex-1 flex flex-row items-center justify-center w-full relative min-h-0 px-2 sm:px-4 overflow-hidden">
                    <div className="w-1/2 flex items-center justify-end shrink-0 pr-3 sm:pr-6 border-r border-slate-700/50">
                       <div className="flex items-center justify-center origin-right scale-[0.72] sm:scale-[0.82] lg:scale-[0.9] xl:scale-95">
                          <Diamond 
                             bases={state.bases} 
                             onToggle={(idx) => dispatch({type: 'TOGGLE_BASE', baseIndex: idx})}
                             className="shrink-0" 
                             activeColor={activeBaseColor}
                          />
                       </div>
                    </div>
                    <div className="w-1/2 flex items-center justify-start shrink-0 pl-3 sm:pl-6">
                        <div className="flex flex-col space-y-2 lg:space-y-3 items-start">
                            {/* Balls */}
                            <div className="flex items-center gap-2 sm:gap-3 cursor-pointer group" onClick={handleBallClick}>
                                <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-500 group-hover:text-white transition-colors w-5 sm:w-6 text-center">B</span>
                                <div className="flex space-x-1.5 sm:space-x-2">
                                    {[0, 1, 2].map(i => (
                                        <AnimatedIndicator 
                                            key={i}
                                            active={i < state.balls} 
                                            colorClass="bg-led-green" 
                                            shadowClass="shadow-[0_0_20px_#00ff41]" 
                                            baseClass="w-4 h-4 sm:w-5 sm:h-5 lg:w-7 lg:h-7 rounded-full border-2"
                                        />
                                    ))}
                                </div>
                            </div>
                            {/* Strikes */}
                            <div className="flex items-center gap-2 sm:gap-3 cursor-pointer group" onClick={handleStrikeClick}>
                                <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-500 group-hover:text-white transition-colors w-5 sm:w-6 text-center">S</span>
                                <div className="flex space-x-1.5 sm:space-x-2">
                                    {[0, 1].map(i => (
                                        <AnimatedIndicator 
                                            key={i}
                                            active={i < state.strikes} 
                                            colorClass="bg-led-yellow" 
                                            shadowClass="shadow-[0_0_20px_#ffcc00]" 
                                            baseClass="w-4 h-4 sm:w-5 sm:h-5 lg:w-7 lg:h-7 rounded-full border-2"
                                        />
                                    ))}
                                </div>
                            </div>
                            {/* Outs */}
                            <div className="flex items-center gap-2 sm:gap-3 cursor-pointer group" onClick={handleOutClick}>
                                <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-500 group-hover:text-white transition-colors w-5 sm:w-6 text-center">O</span>
                                <div className="flex space-x-1.5 sm:space-x-2">
                                    {[0, 1].map(i => (
                                        <AnimatedIndicator 
                                            key={i}
                                            active={i < state.outs} 
                                            colorClass="bg-led-red" 
                                            shadowClass="shadow-[0_0_20px_#ff3b30]" 
                                            baseClass="w-4 h-4 sm:w-5 sm:h-5 lg:w-7 lg:h-7 rounded-full border-2"
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom: 9-inning Linescore and RHE */}
                <div className="bg-slate-950 border-t-2 border-slate-700 shrink-0 overflow-x-auto p-2 lg:p-4 text-white">
                    <table className="w-full text-center font-display border-collapse text-xs lg:text-sm">
                        <thead>
                            <tr className="text-slate-500 border-b border-slate-800">
                                <th className="text-left font-normal py-1 pl-2 w-16">TEAM</th>
                                {inningsArray.map(i => (
                                    <th key={i} className={`font-normal w-6 lg:w-8 py-1 ${i === state.inning ? 'text-yellow-400 font-bold' : ''}`}>{i}</th>
                                ))}
                                <th className="font-normal w-8 lg:w-10 py-1 ml-2 text-white/50">R</th>
                                <th className="font-normal w-8 lg:w-10 py-1 text-white/50">H</th>
                                <th className="font-normal w-8 lg:w-10 py-1 text-white/50">E</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-slate-800/50">
                                <td className="text-left py-1 pl-2 font-bold truncate max-w-[60px] lg:max-w-[80px]" style={{ color: state.awayTeam.color }}>{state.awayTeam.name}</td>
                                {inningsArray.map(i => (
                                    <td key={`away-${i}`} className="py-1">
                                        {state.awayTeam.inningScores[i - 1] !== undefined ? state.awayTeam.inningScores[i - 1] : (i === state.inning && state.isTop ? '0' : '-')}
                                    </td>
                                ))}
                                <td className="font-bold text-yellow-400 py-1">{awayRuns}</td>
                                <td className="py-1">{state.awayTeam.hits}</td>
                                <td className="py-1">{state.awayTeam.errors}</td>
                            </tr>
                            <tr>
                                <td className="text-left py-1 pl-2 font-bold truncate max-w-[60px] lg:max-w-[80px]" style={{ color: state.homeTeam.color }}>{state.homeTeam.name}</td>
                                {inningsArray.map(i => (
                                    <td key={`home-${i}`} className="py-1">
                                        {state.homeTeam.inningScores[i - 1] !== undefined ? state.homeTeam.inningScores[i - 1] : (i === state.inning && !state.isTop ? '0' : '-')}
                                    </td>
                                ))}
                                <td className="font-bold text-yellow-400 py-1">{homeRuns}</td>
                                <td className="py-1">{state.homeTeam.hits}</td>
                                <td className="py-1">{state.homeTeam.errors}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Right: Home Lineup (23% width, safely inset) */}
            <div className={isVerticalFullscreen ? "flex-1 w-full shrink-0 min-w-0 border-t-2 border-slate-700 order-3" : "flex-none w-[23%] shrink-0 h-full min-w-0 border-l-2 border-slate-700 order-3"}>
                <LineupColumn team={state.homeTeam} isAway={false} state={state} dispatch={dispatch} />
            </div>

        </div>
    )
  };
  const renderObsRHEView = () => {
    const maxInnings = Math.max(9, state.awayTeam.inningScores.length, state.homeTeam.inningScores.length);
    const inningsArray = Array.from({ length: maxInnings }, (_, i) => i + 1);

    const awayRuns = state.awayTeam.inningScores.reduce((sum, score) => sum + (score || 0), 0);
    const homeRuns = state.homeTeam.inningScores.reduce((sum, score) => sum + (score || 0), 0);

    let highlightInning = state.inning;
    let highlightIsAway = state.isTop;
    if (state.outs === 0) {
      if (!state.isTop) {
        highlightInning = state.inning;
        highlightIsAway = true;
      } else if (state.inning > 1) {
        highlightInning = state.inning - 1;
        highlightIsAway = false;
      } else {
        highlightInning = 1;
        highlightIsAway = true;
      }
    }

    const dueUpTeam = state.isTop ? state.awayTeam : state.homeTeam;

    const renderObsTeamRow = (team: Team, runs: number, isBottomBorder: boolean) => {
      const hasNoBorder = Boolean(team.logoNoBorder && team.logoUrl);
      return (
        <tr key={team.name} className={isBottomBorder ? "border-b border-slate-800/80" : ""}>
          <td className="text-left py-2.5 pl-3 pr-3 flex items-center gap-2 shrink-0">
            <div 
              className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center shrink-0 overflow-hidden ${
                hasNoBorder ? 'bg-transparent' : 'rounded-full bg-slate-800 shadow-md'
              }`} 
              style={hasNoBorder ? undefined : { backgroundColor: team.color }}
            >
              {team.logoUrl ? (
                <img 
                  src={team.logoUrl} 
                  alt={`${team.name} Logo`} 
                  className={`w-full h-full ${hasNoBorder ? 'object-contain drop-shadow-md' : 'object-cover'}`} 
                />
              ) : (
                <span className="text-sm sm:text-base text-white font-bold">{team.name.substring(0, 1)}</span>
              )}
            </div>
            <span className="text-sm sm:text-base font-black tracking-wide whitespace-nowrap max-w-[100px] sm:max-w-[125px] truncate">
              {team.name}
            </span>
          </td>
          {inningsArray.map(i => {
            const score = team.inningScores[i - 1];
            const isHighlightedInning = i === highlightInning && ((team.name === state.awayTeam.name && highlightIsAway) || (team.name === state.homeTeam.name && !highlightIsAway));
            return (
              <td key={i} className={`py-2 px-1.5 sm:px-2 font-mono text-sm sm:text-base ${isHighlightedInning ? 'text-yellow-400 font-black animate-pulse drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]' : 'text-slate-300'}`}>
                {score !== null && score !== undefined ? score : '-'}
              </td>
            );
          })}
          <td className="py-2 pl-3 pr-2 font-mono font-black text-yellow-400 text-lg sm:text-xl">{runs}</td>
          <td className="py-2 px-2 font-mono font-bold text-white text-base sm:text-lg">{team.hits}</td>
          <td className="py-2 px-2 font-mono font-bold text-slate-300 text-base sm:text-lg">{team.errors}</td>
        </tr>
      );
    };

    const obsRHEVariants: Variants = {
      initial: { y: 120, opacity: 0 },
      animate: { 
        y: 0, 
        opacity: 1, 
        transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } 
      },
      exit: { 
        y: 120, 
        opacity: 0, 
        transition: { duration: 0.40, ease: [0.32, 0, 0.67, 0] as const } 
      }
    };

    return (
      <div 
        className="w-full h-full flex flex-col justify-end items-center pb-8 sm:pb-12 px-4 sm:px-8 bg-transparent overflow-hidden select-none pointer-events-auto no-scrollbar"
      >
        <AnimatePresence mode="wait">
          {state.meta.broadcastVisible !== false && (
            <motion.div 
              key={`obs-rhe-${state.meta.broadcastAnimKey || 0}`}
              variants={obsRHEVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-fit max-w-[96vw] flex flex-row items-stretch bg-slate-950/92 backdrop-blur-xl border-2 border-slate-700/80 rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden font-display text-white mx-auto"
            >
              {/* Left/Middle: 1-9 & RHE Table */}
              <div className="flex-none min-w-0 flex flex-col justify-center py-2 px-3 sm:px-4">
                <table className="text-center border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-400 text-xs sm:text-sm">
                      <th className="text-left font-semibold pb-1.5 pl-3 pr-3">TEAM</th>
                      {inningsArray.map(i => (
                        <th key={i} className="font-mono font-medium pb-1.5 px-1.5 sm:px-2 w-7 sm:w-8.5">{i}</th>
                      ))}
                      <th className="font-bold text-yellow-400 pb-1.5 pl-3 pr-2 w-8 sm:w-10">R</th>
                      <th className="font-bold text-white pb-1.5 px-2 w-8 sm:w-10">H</th>
                      <th className="font-bold text-white pb-1.5 px-2 w-8 sm:w-10">E</th>
                    </tr>
                  </thead>
                  <tbody className="text-base sm:text-lg font-bold">
                    {renderObsTeamRow(state.awayTeam, awayRuns, true)}
                    {renderObsTeamRow(state.homeTeam, homeRuns, false)}
                  </tbody>
                </table>
              </div>

              {/* Right: Due Up (3 batters stacked vertically beside RHE) */}
              <div className="w-[200px] sm:w-[225px] flex flex-col justify-between py-2 px-3 bg-slate-900/60 border-l-2 border-slate-700/80 shrink-0">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-700/60 pb-1 mb-1">
                  <div className="flex items-center gap-1.5 text-xs font-black tracking-wider text-yellow-400">
                    <span>DUE UP</span>
                    <span className="text-yellow-400/60 text-[10px]">▶▶</span>
                  </div>
                  <span 
                    className="text-[10px] font-bold px-2 py-0.5 rounded text-white uppercase tracking-wider truncate max-w-[85px]"
                    style={{ backgroundColor: dueUpTeam.color }}
                  >
                    {dueUpTeam.name}
                  </span>
                </div>

                {/* 3 Batters stacked vertically */}
                <div className="flex-1 flex flex-col justify-around gap-0.5 min-h-0">
                  {[0, 1, 2].map((offset) => {
                    const bIdx = (dueUpTeam.currentBatterIndex + offset) % (dueUpTeam.lineup.length || 1);
                    const batter = dueUpTeam.lineup[bIdx];
                    if (!batter) return (
                      <div key={offset} className="text-xs text-slate-500 font-mono py-0.5">---</div>
                    );
                    return (
                      <div key={offset} className="flex items-center gap-1.5 text-xs py-0.5 min-w-0">
                        <span className="font-mono text-slate-400 font-bold text-[11px] w-3.5 shrink-0">
                          {bIdx + 1}.
                        </span>
                        <span className="font-bold text-white text-xs sm:text-sm tracking-wide truncate max-w-[95px] sm:max-w-[110px]">
                          {batter.name}
                        </span>
                        <div className="flex items-center gap-1 shrink-0 font-mono ml-auto">
                          {batter.number && (
                            <span className="text-[11px] font-bold text-slate-300">
                              #{batter.number}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 px-1 py-0.2 rounded bg-slate-800 border border-slate-700 font-semibold">
                            {batter.position || 'DH'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderRHEView = () => {
    if (isObsMode) {
      return renderObsRHEView();
    }
    const maxInnings = Math.max(9, state.awayTeam.inningScores.length, state.homeTeam.inningScores.length);
    const inningsArray = Array.from({ length: maxInnings }, (_, i) => i + 1);

    const getBatter = (team: Team, offset: number) => {
      if (team.lineup.length === 0) return null;
      const index = (team.currentBatterIndex + offset) % team.lineup.length;
      return team.lineup[index];
    };

    const battingTeam = state.isTop ? state.awayTeam : state.homeTeam;
    
    const awayRuns = state.awayTeam.inningScores.reduce((sum, score) => sum + (score || 0), 0);
    const homeRuns = state.homeTeam.inningScores.reduce((sum, score) => sum + (score || 0), 0);

    // In between-innings mode (RHE view), when outs === 0, the highlighted score should be the score of the PREVIOUS half-inning
    let highlightInning = state.inning;
    let highlightIsAway = state.isTop;
    if (state.outs === 0) {
      if (!state.isTop) {
        // Mid-inning break: bottom of inning with 0 outs -> previous half-inning was top of current inning (away team)
        highlightInning = state.inning;
        highlightIsAway = true;
      } else if (state.inning > 1) {
        // Inning break: top of inning N with 0 outs -> previous half-inning was bottom of inning N - 1 (home team)
        highlightInning = state.inning - 1;
        highlightIsAway = false;
      } else {
        // 1st inning top with 0 outs: game beginning, keep 1st inning top
        highlightInning = 1;
        highlightIsAway = true;
      }
    }

    const renderTeamRow = (team: Team, runs: number, isBottomBorder: boolean) => {
      const hasNoBorder = Boolean(team.logoNoBorder && team.logoUrl);
      return (
        <tr key={team.name} className={isBottomBorder ? "border-b border-slate-800/50" : ""}>
          <td className="text-left py-3 sm:py-4 pl-4 flex items-center gap-3">
            <div 
              className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shrink-0 overflow-hidden ${
                hasNoBorder ? 'bg-transparent' : 'rounded-full bg-slate-800 shadow-md'
              }`} 
              style={hasNoBorder ? undefined : { backgroundColor: team.color }}
            >
              {team.logoUrl ? (
                <img 
                  src={team.logoUrl} 
                  alt={`${team.name} Logo`} 
                  className={`w-full h-full ${hasNoBorder ? 'object-contain drop-shadow-md' : 'object-cover'}`} 
                />
              ) : (
                <span className="text-lg sm:text-xl text-white font-bold">{team.name.substring(0, 1)}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <AutoScalingText text={team.name} className="text-2xl sm:text-3xl font-bold" align="left" />
            </div>
          </td>
        {inningsArray.map(i => {
          const score = team.inningScores[i - 1];
          const isHighlightedInning = i === highlightInning && ((team.name === state.awayTeam.name && highlightIsAway) || (team.name === state.homeTeam.name && !highlightIsAway));
          return (
            <td key={i} className={`py-3 sm:py-4 ${isHighlightedInning ? 'text-yellow-400 animate-pulse drop-shadow-[0_0_8px_rgba(250,204,21,0.8)] font-black' : 'text-slate-300'}`}>
              {score !== null && score !== undefined ? score : '-'}
            </td>
          );
        })}
        <td className="py-3 sm:py-4 pl-4 text-yellow-400">{runs}</td>
        <td className="py-3 sm:py-4 text-white">{team.hits}</td>
        <td className="py-3 sm:py-4 text-white">{team.errors}</td>
      </tr>
    );
  };

    return (
      <div className="w-full h-full bg-slate-900 border-2 border-slate-700 rounded-xl overflow-hidden shadow-2xl flex flex-col font-display text-white p-3 sm:p-5 lg:p-6 no-scrollbar">
        {/* Game Info Header */}
        <div 
          className="grid items-center mb-3 px-4 sm:px-6 py-2.5 sm:py-3 bg-slate-800/50 rounded-xl border-2 border-slate-700 shadow-inner shrink-0"
          style={{ gridTemplateColumns: `repeat(${state.meta.gameInfos?.length || 1}, minmax(0, 1fr))` }}
        >
          {state.meta.gameInfos?.map((info, idx) => {
            // Apply different styles based on position to mimic the original look
            let textClass = "text-lg lg:text-xl font-bold text-slate-400 truncate";
            if (idx === 0) textClass = "text-lg lg:text-xl text-yellow-500 uppercase tracking-widest font-black truncate";
            else if (idx === Math.floor((state.meta.gameInfos.length - 1) / 2)) textClass = "text-2xl lg:text-3xl font-black text-white tracking-tighter truncate";
            
            return (
              <div key={idx} className="flex justify-center">
                <span className={textClass}>{info}</span>
              </div>
            );
          })}
        </div>

        {/* Scoreboard Table */}
        <div className="w-full overflow-x-auto overflow-y-hidden no-scrollbar mb-3 sm:mb-4 flex-1 min-h-0 flex flex-col justify-center">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-700 text-slate-400 text-lg lg:text-xl">
                <th className="text-left font-normal pb-2 sm:pb-3 pl-4 w-1/4">TEAM</th>
                {inningsArray.map(i => (
                  <th key={i} className="font-normal pb-2 sm:pb-3 w-12">{i}</th>
                ))}
                <th className="font-bold text-white pb-2 sm:pb-3 pl-4 w-16">R</th>
                <th className="font-bold text-white pb-2 sm:pb-3 w-16">H</th>
                <th className="font-bold text-white pb-2 sm:pb-3 w-16">E</th>
              </tr>
            </thead>
            <tbody className="text-2xl sm:text-3xl lg:text-4xl font-bold">
              <>
                {renderTeamRow(state.awayTeam, awayRuns, true)}
                {renderTeamRow(state.homeTeam, homeRuns, false)}
              </>
            </tbody>
          </table>
        </div>

        {/* Next 3 Batters */}
        <div className="mt-auto bg-slate-950/50 rounded-xl p-3 sm:p-4.5 border-2 border-slate-800 flex items-center shrink-0">
          <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-yellow-500 mr-6 sm:mr-8 shrink-0 flex items-center gap-2">
            DUE UP <span className="text-yellow-400/50">{'>>>'}</span>
          </div>
          <div className="flex-1 flex justify-around items-center">
            {[0, 1, 2].map(offset => {
              const batterIndex = (battingTeam.currentBatterIndex + offset) % battingTeam.lineup.length;
              const batter = battingTeam.lineup[batterIndex];
              if (!batter) return null;
              return (
                <div key={offset} className="flex flex-col items-center min-w-0 flex-1">
                  <div className="text-base sm:text-lg lg:text-xl text-slate-400 mb-0.5">#{batter.number}</div>
                  <AutoScalingText text={batter.name} className="text-xl sm:text-2xl lg:text-3xl font-bold text-white" align="center" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderBroadcastView = () => {
    const getPlayerText = (player) => {
      const hasNumber = "number" in player && player.number;
      const numberStyle = state.meta.broadcastPlayerNumberStyle || "normal";
      if (!hasNumber || numberStyle === "hidden") return player.name;
      return `${player.name} #${player.number}`;
    };

    const getPlayerContent = (player) => {
      const hasNumber = "number" in player && player.number;
      const numberStyle = state.meta.broadcastPlayerNumberStyle || "normal";
      if (!hasNumber || numberStyle === "hidden") return player.name;
      return (
        <span>
          {player.name}
          <span className={numberStyle === "gray" ? "text-slate-400 ml-1.5" : "ml-1.5"}>
            #{player.number}
          </span>
        </span>
      );
    };
    const isAwayBatter = state.isTop;
    const awayPlayer = isAwayBatter ? (state.awayTeam.lineup[state.awayTeam.currentBatterIndex] || { name: 'UNKNOWN', number: '00' }) : (state.awayTeam.pitcher || { name: 'UNKNOWN', stat: '0' });
    const homePlayer = !state.isTop ? (state.homeTeam.lineup[state.homeTeam.currentBatterIndex] || { name: 'UNKNOWN', number: '00' }) : (state.homeTeam.pitcher || { name: 'UNKNOWN', stat: '0' });
    
    const activeBaseColor = state.isTop ? (state.awayTeam.baseColor || state.awayTeam.color) : (state.homeTeam.baseColor || state.homeTeam.color);

    const currentAwayKey = `${awayPlayer.name}-${'number' in awayPlayer ? awayPlayer.number : ''}`;
    const currentHomeKey = `${homePlayer.name}-${'number' in homePlayer ? homePlayer.number : ''}`;

    const isAwayVisible = isAwayBatter ? state.showBatterInfo : state.showPitcherInfo;
    const isHomeVisible = !isAwayBatter ? state.showBatterInfo : state.showPitcherInfo;
    const showAwayPlayer = true;
    const showHomePlayer = true;

    const pitcher = state.isTop ? (state.homeTeam.pitcher || { name: 'UNKNOWN', stat: '0' }) : (state.awayTeam.pitcher || { name: 'UNKNOWN', stat: '0' });

    const handleDrag = (e: React.MouseEvent | React.TouchEvent) => {
      if (!state.isAdjustmentMode) return;
      e.preventDefault();
      e.stopPropagation();
      window.getSelection()?.removeAllRanges();
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      const startX = clientX;
      const startY = clientY;
      const startMarginX = state.meta.broadcastMarginX ?? 20;
      const startMarginY = state.meta.broadcastMarginY ?? 20;

      // Find effective container scale (supports scaled 1920x1080 preview)
      const targetEl = e.currentTarget as HTMLElement;
      const containerEl = targetEl.closest('.broadcast-container') || targetEl.parentElement;
      const containerRect = containerEl?.getBoundingClientRect();
      const containerScale = containerRect && containerRect.width > 0 && containerEl?.clientWidth
        ? (containerRect.width / containerEl.clientWidth)
        : 1;

      const onMove = (moveEvent: MouseEvent | TouchEvent) => {
        const moveClientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
        const moveClientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
        
        const deltaX = (moveClientX - startX) / containerScale;
        const deltaY = (moveClientY - startY) / containerScale;
        
        dispatch({ type: 'UPDATE_META', field: 'broadcastMarginX', value: Math.round(startMarginX + deltaX) });
        dispatch({ type: 'UPDATE_META', field: 'broadcastMarginY', value: Math.max(0, Math.round(startMarginY - deltaY)) }); // Subtract because bottom is anchored
      };

      const onUp = () => {
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('touchend', onUp);
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('touchend', onUp);
    };

    const handleBroadcastTouchStart = (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        pinchStartDistRef.current = dist;
        pinchStartScaleRef.current = state.meta.broadcastScale ?? 1;
      } else if (e.touches.length === 1 && state.isAdjustmentMode) {
        handleDrag(e);
      }
    };

    const handleBroadcastTouchMove = (e: React.TouchEvent) => {
      if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
        e.preventDefault();
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const factor = dist / pinchStartDistRef.current;
        const newScale = Math.max(0.3, Math.min(2.5, Number((pinchStartScaleRef.current * factor).toFixed(2))));
        dispatch({ type: 'UPDATE_META', field: 'broadcastScale', value: newScale });
      }
    };

    const handleBroadcastTouchEnd = () => {
      pinchStartDistRef.current = null;
    };

    const handleScale = (e: React.WheelEvent) => {
      if (!state.isAdjustmentMode) return;
      e.preventDefault();
      const currentScale = state.meta.broadcastScale ?? 1;
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      const newScale = Math.max(0.3, Math.min(2.5, Number((currentScale + delta).toFixed(2))));
      dispatch({ type: 'UPDATE_META', field: 'broadcastScale', value: newScale });
    };

    // Calculate strict minimum heights to ensure content never breaks (破圖) when pulling up
    const minTeamRowHeight = Math.max(
      50,
      (state.meta.broadcastLogoSize ?? 40) + 10,
      (state.meta.broadcastScoreSize ?? 30) + 12,
      (state.meta.broadcastTeamNameSize ?? 24) + 12,
      Math.ceil(((state.meta.broadcastInningSize ?? 24) + 52) / 2)
    );
    const minPlayerRowHeight = Math.max(
      36,
      (state.meta.broadcastPlayerNameSize ?? 20) + 12,
      (state.meta.broadcastTimerSize ?? 24) + 10
    );

    const awayPlayerHeight = Math.max(minPlayerRowHeight, state.meta.broadcastPlayerRowHeight ?? 50);
    const homePlayerHeight = Math.max(minPlayerRowHeight, state.meta.broadcastPlayerRowHeight ?? 50);
    const teamRowHeight = Math.max(minTeamRowHeight, state.meta.broadcastTeamRowHeight ?? 72);
    const pitchInfoHeight = 0;
    const showBroadcastTimer = state.showTimer && (state.meta.broadcastShowTimer ?? false);
    const showBroadcastPitchCount = state.meta.broadcastShowPitchCount ?? false;

    const effectiveA = showAwayPlayer ? awayPlayerHeight : 0;
    const effectiveH = showHomePlayer ? homePlayerHeight : 0;

    const scorebugCardVariants: Variants = {
      initial: { x: -600, opacity: 1 },
      animate: { 
        x: 0, 
        opacity: 1, 
        transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } 
      },
      exit: { 
        x: -600, 
        opacity: 1, 
        transition: { duration: 0.36, delay: 0.52, ease: [0.32, 0, 0.67, 0] as const } 
      }
    };

    const rightColVariants: Variants = {
      initial: { x: -160, opacity: 1 },
      animate: { 
        x: 0, 
        opacity: 1, 
        transition: { duration: 0.50, delay: 0.55, ease: [0.16, 1, 0.3, 1] as const } 
      },
      exit: { 
        x: -160, 
        opacity: 1, 
        transition: { duration: 0.28, delay: 0, ease: [0.32, 0, 0.67, 0] as const } 
      }
    };

    const awayPlayerRowVariants: Variants = {
      initial: { y: awayPlayerHeight, opacity: 1 },
      animate: { 
        y: 0, 
        opacity: 1, 
        transition: { duration: 0.36, delay: 0.32, ease: [0.16, 1, 0.3, 1] as const } 
      },
      exit: { 
        y: awayPlayerHeight, 
        opacity: 1, 
        transition: { duration: 0.26, delay: 0.24, ease: [0.32, 0, 0.67, 0] as const } 
      }
    };

    const homePlayerRowVariants: Variants = {
      initial: { y: -homePlayerHeight, opacity: 1 },
      animate: { 
        y: 0, 
        opacity: 1, 
        transition: { duration: 0.36, delay: 0.36, ease: [0.16, 1, 0.3, 1] as const } 
      },
      exit: { 
        y: -homePlayerHeight, 
        opacity: 1, 
        transition: { duration: 0.26, delay: 0.24, ease: [0.32, 0, 0.67, 0] as const } 
      }
    };

    return (
      <div 
        className="w-full h-full relative pointer-events-none overflow-hidden select-none broadcast-container"
        onTouchStart={handleBroadcastTouchStart}
        onTouchMove={handleBroadcastTouchMove}
        onTouchEnd={handleBroadcastTouchEnd}
      >
        {/* Mobile-Friendly Floating Broadcast Scaler: Always visible on mobile or adjustment mode, hidden in OBS overlay */}
        {!isObsMode && (
          <div className="absolute top-3 right-3 z-50 flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 px-2.5 py-1.5 rounded-xl shadow-2xl backdrop-blur-md text-xs font-bold text-white pointer-events-auto">
            <span className="text-slate-400 text-[10px] hidden sm:inline">{language === 'en' ? 'Scale' : language === 'zh' ? '縮放' : 'サイズ'}:</span>
            <button 
              onClick={() => dispatch({ type: 'UPDATE_META', field: 'broadcastScale', value: Math.max(0.3, Number(((state.meta.broadcastScale ?? 1) - 0.1).toFixed(2))) })}
              className="w-7 h-7 bg-slate-800 hover:bg-slate-700 active:bg-blue-600 rounded-lg flex items-center justify-center text-sm font-black border border-slate-600 active:scale-95 transition-transform"
              title="Scale down -10%"
            >
              -
            </button>
            <span className="min-w-[42px] text-center text-yellow-400 font-mono text-xs font-bold">
              {Math.round((state.meta.broadcastScale ?? 1) * 100)}%
            </span>
            <button 
              onClick={() => dispatch({ type: 'UPDATE_META', field: 'broadcastScale', value: Math.min(2.5, Number(((state.meta.broadcastScale ?? 1) + 0.1).toFixed(2))) })}
              className="w-7 h-7 bg-slate-800 hover:bg-slate-700 active:bg-blue-600 rounded-lg flex items-center justify-center text-sm font-black border border-slate-600 active:scale-95 transition-transform"
              title="Scale up +10%"
            >
              +
            </button>
            <button 
              onClick={() => dispatch({ type: 'UPDATE_META', field: 'broadcastScale', value: 1.0 })}
              className="px-2 py-1 text-[10px] text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-600 ml-0.5 active:scale-95"
              title="Reset 100%"
            >
              100%
            </button>
            <button
              onClick={() => dispatch({ type: 'TOGGLE_VISIBILITY', field: 'isAdjustmentMode' })}
              className={`px-2 py-1 text-[10px] rounded border transition-colors ml-1 ${
                state.isAdjustmentMode 
                  ? 'bg-blue-600 text-white border-blue-400 shadow-sm' 
                  : 'text-slate-400 hover:text-white bg-slate-800 border-slate-600'
              }`}
              title={language === 'zh' ? '版面位置拖曳調整' : 'Position Drag Mode'}
            >
              {language === 'zh' ? (state.isAdjustmentMode ? '拖曳中' : '拖曳') : 'Drag'}
            </button>
          </div>
        )}

        {/* Stable outer wrapper for positioning and scale (prevents Framer Motion transform collision) */}
        <div 
          className="absolute origin-bottom-left select-none pointer-events-auto"
          style={{ 
            left: `${state.meta.broadcastMarginX ?? 20}px`,
            bottom: `${state.meta.broadcastMarginY ?? 20}px`,
            transform: `scale(${state.meta.broadcastScale ?? 1})`,
            transformOrigin: 'bottom left',
            zIndex: 40,
          }}
          onMouseDown={handleDrag}
          onTouchStart={handleDrag}
          onWheel={handleScale}
        >
          {/* Main broadcast overlay card with choreographed entrance animation */}
          <AnimatePresence mode="wait">
            {state.meta.broadcastVisible !== false && (
              <motion.div 
                key={`broadcast-scorebug-${state.meta.broadcastAnimKey ?? 0}`}
                variants={scorebugCardVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className={`bg-gradient-to-br from-cyan-950/30 via-slate-900/50 to-teal-950/30 backdrop-blur-xl border border-white/20 text-white font-display shadow-2xl shadow-black/50 overflow-hidden flex flex-col ${state.isAdjustmentMode && !isObsMode ? 'cursor-move ring-4 ring-blue-500 ring-offset-4 ring-offset-transparent' : ''}`} 
                style={{ 
                  width: `${state.meta.broadcastWidth ?? 450}px`,
                }}
              >
          {/* Width Resizer */}
          {state.isAdjustmentMode && (
            <div 
              className="absolute right-0 top-0 bottom-0 w-6 cursor-ew-resize z-50 hover:bg-blue-500/50 touch-none"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.getSelection()?.removeAllRanges();
                document.body.style.userSelect = 'none';
                document.body.style.webkitUserSelect = 'none';
                const startX = e.clientX;
                const startWidth = state.meta.broadcastWidth ?? 450;
                const onMove = (moveEvent: MouseEvent) => {
                  const newWidth = Math.max(300, startWidth + (moveEvent.clientX - startX) / (state.meta.broadcastScale ?? 1));
                  dispatch({ type: 'UPDATE_META', field: 'broadcastWidth', value: newWidth });
                };
                const onUp = () => {
                  document.body.style.userSelect = '';
                  document.body.style.webkitUserSelect = '';
                  window.removeEventListener('mousemove', onMove);
                  window.removeEventListener('mouseup', onUp);
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const touch = e.touches[0];
                const startX = touch.clientX;
                const startWidth = state.meta.broadcastWidth ?? 450;
                const onTouchMove = (moveEvent: TouchEvent) => {
                  if (!moveEvent.touches[0]) return;
                  const newWidth = Math.max(300, startWidth + (moveEvent.touches[0].clientX - startX) / (state.meta.broadcastScale ?? 1));
                  dispatch({ type: 'UPDATE_META', field: 'broadcastWidth', value: newWidth });
                };
                const onTouchEnd = () => {
                  window.removeEventListener('touchmove', onTouchMove);
                  window.removeEventListener('touchend', onTouchEnd);
                };
                window.addEventListener('touchmove', onTouchMove, { passive: false });
                window.addEventListener('touchend', onTouchEnd);
              }}
            />
          )}
          {/* Column Resizer */}
          {state.isAdjustmentMode && (
            <div 
              className="absolute top-0 bottom-0 w-6 cursor-ew-resize z-50 hover:bg-blue-500/50 touch-none"
              style={{ right: `${(state.meta.broadcastRightColumnWidth ?? 150) - 8}px` }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.getSelection()?.removeAllRanges();
                document.body.style.userSelect = 'none';
                document.body.style.webkitUserSelect = 'none';
                const startX = e.clientX;
                const startWidth = state.meta.broadcastRightColumnWidth ?? 150;
                const onMove = (moveEvent: MouseEvent) => {
                  const newWidth = Math.max(100, startWidth - (moveEvent.clientX - startX) / (state.meta.broadcastScale ?? 1));
                  dispatch({ type: 'UPDATE_META', field: 'broadcastRightColumnWidth', value: newWidth });
                };
                const onUp = () => {
                  document.body.style.userSelect = '';
                  document.body.style.webkitUserSelect = '';
                  window.removeEventListener('mousemove', onMove);
                  window.removeEventListener('mouseup', onUp);
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const touch = e.touches[0];
                const startX = touch.clientX;
                const startWidth = state.meta.broadcastRightColumnWidth ?? 150;
                const onTouchMove = (moveEvent: TouchEvent) => {
                  if (!moveEvent.touches[0]) return;
                  const newWidth = Math.max(100, startWidth - (moveEvent.touches[0].clientX - startX) / (state.meta.broadcastScale ?? 1));
                  dispatch({ type: 'UPDATE_META', field: 'broadcastRightColumnWidth', value: newWidth });
                };
                const onTouchEnd = () => {
                  window.removeEventListener('touchmove', onTouchMove);
                  window.removeEventListener('touchend', onTouchEnd);
                };
                window.addEventListener('touchmove', onTouchMove, { passive: false });
                window.addEventListener('touchend', onTouchEnd);
              }}
            />
          )}
          
          {/* Corner Scaler: Positioned at Top-Right to align directly with bottom-left anchor origin */}
          {state.isAdjustmentMode && (
            <div 
              className="absolute right-0 top-0 w-8 h-8 cursor-ne-resize z-50 bg-blue-500/90 rounded-bl-xl flex items-center justify-center shadow-lg active:bg-blue-600 touch-none group"
              title={language === 'zh' ? '往右上拖曳放大 / 往左下拖曳縮小' : 'Drag towards top-right to scale'}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.getSelection()?.removeAllRanges();
                document.body.style.userSelect = 'none';
                document.body.style.webkitUserSelect = 'none';
                const startX = e.clientX;
                const startY = e.clientY;
                const startScale = state.meta.broadcastScale ?? 1;
                const onMove = (moveEvent: MouseEvent) => {
                  const deltaX = moveEvent.clientX - startX;
                  const deltaY = -(moveEvent.clientY - startY); // Moving up decreases clientY, so invert to positive
                  const delta = (deltaX + deltaY) / 2;
                  const newScale = Math.max(0.2, Math.min(3, Number((startScale + delta * 0.005).toFixed(2))));
                  dispatch({ type: 'UPDATE_META', field: 'broadcastScale', value: newScale });
                };
                const onUp = () => {
                  document.body.style.userSelect = '';
                  document.body.style.webkitUserSelect = '';
                  window.removeEventListener('mousemove', onMove);
                  window.removeEventListener('mouseup', onUp);
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const touch = e.touches[0];
                const startX = touch.clientX;
                const startY = touch.clientY;
                const startScale = state.meta.broadcastScale ?? 1;
                const onTouchMove = (moveEvent: TouchEvent) => {
                  if (!moveEvent.touches[0]) return;
                  const deltaX = moveEvent.touches[0].clientX - startX;
                  const deltaY = -(moveEvent.touches[0].clientY - startY);
                  const delta = (deltaX + deltaY) / 2;
                  const newScale = Math.max(0.2, Math.min(3, Number((startScale + delta * 0.005).toFixed(2))));
                  dispatch({ type: 'UPDATE_META', field: 'broadcastScale', value: newScale });
                };
                const onTouchEnd = () => {
                  window.removeEventListener('touchmove', onTouchMove);
                  window.removeEventListener('touchend', onTouchEnd);
                };
                window.addEventListener('touchmove', onTouchMove, { passive: false });
                window.addEventListener('touchend', onTouchEnd);
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-white transform rotate-0"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
            </div>
          )}

          {/* Broadcast Home Run Animation */}
          {state.animation && (
            <div 
              className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none overflow-hidden bg-black/80 backdrop-blur-sm"
              style={{ animation: state.animation.isLocked ? 'none' : state.animation.isExiting ? 'fadeOut 0.5s ease-in-out forwards' : 'fadeOut 0.5s ease-in-out 4.5s forwards' }}
            >
              <div 
                className="relative flex flex-col items-center justify-center w-full h-full"
                style={{ animation: state.animation.isLocked ? 'none' : state.animation.isExiting ? 'outroContainer 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards' : 'outroContainer 0.5s cubic-bezier(0.4, 0, 0.2, 1) 4.5s forwards' }}
              >
                <div 
                  className="absolute rounded-full mix-blend-screen"
                  style={{
                    backgroundColor: animTeamColor,
                    animation: 'expandCircle 1s cubic-bezier(0.1, 0.8, 0.3, 1) forwards'
                  }}
                />
                <div 
                  className="relative z-10 flex flex-col items-center w-full px-4"
                  style={{ animation: 'shiftDownBroadcast 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 1.2s forwards' }}
                >
                  <div className="absolute bottom-[100%] mb-1 w-full flex justify-center">
                    <div className="overflow-hidden w-full max-w-xl">
                      <div 
                        className="w-full px-4"
                        style={{ animation: 'revealUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 1.4s both' }}
                      >
                        <AutoScalingText 
                          text={animTeamName && animPlayerName ? `${animTeamName} | ${animPlayerName}` : (animTeamName || animPlayerName)}
                          content={
                            <span className="inline-flex items-center justify-center gap-2.5 text-xl font-bold text-white/90 uppercase tracking-wide">
                              {animTeamName && <span>{animTeamName}</span>}
                              {animTeamName && animPlayerName && <span className="opacity-50 font-light shrink-0">|</span>}
                              {animPlayerName && <span>{animPlayerName}</span>}
                            </span>
                          }
                          align="center"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div 
                    className="flex flex-col items-center uppercase tracking-tighter text-center w-full"
                    style={{
                      fontFamily: '"LINE Seed JP", sans-serif',
                      fontWeight: 800,
                      animation: 'popScale 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both'
                    }}
                  >
                    <div className="w-full max-w-lg px-2">
                      <AutoScalingText
                        text={
                          state.animation.type === 'homerun' ? (language === 'zh' ? '陽春砲' : language === 'ja' ? 'ソロホームラン' : 'HOMERUN!') :
                          state.animation.type === '2-run-homer' ? (language === 'zh' ? '兩分砲' : language === 'ja' ? '2ランホームラン' : '2-RUN HOMER!') :
                          state.animation.type === '3-run-homer' ? (language === 'zh' ? '三分砲' : language === 'ja' ? '3ランホームラン' : '3-RUN HOMER!') :
                          (language === 'zh' ? '滿貫砲' : language === 'ja' ? '満塁ホームラン' : 'GRAND SLAM!')
                        }
                        content={
                          <span className={`text-4xl whitespace-nowrap break-keep leading-none select-none inline-block ${
                            state.animation.type === 'homerun' ? 'text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]' :
                            state.animation.type === '2-run-homer' ? 'text-yellow-200 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]' :
                            state.animation.type === '3-run-homer' ? 'text-orange-400 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]' :
                            'text-transparent bg-clip-text bg-gradient-to-b from-red-600 via-red-500 to-yellow-400 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]'
                          }`}>
                            {state.animation.type === 'homerun' && (language === 'zh' ? '陽春砲' : language === 'ja' ? 'ソロホームラン' : 'HOMERUN!')}
                            {state.animation.type === '2-run-homer' && (language === 'zh' ? '兩分砲' : language === 'ja' ? '2ランホームラン' : '2-RUN HOMER!')}
                            {state.animation.type === '3-run-homer' && (language === 'zh' ? '三分砲' : language === 'ja' ? '3ランホームラン' : '3-RUN HOMER!')}
                            {state.animation.type === 'grand-slam' && (language === 'zh' ? '滿貫砲' : language === 'ja' ? '満塁ホームラン' : 'GRAND SLAM!')}
                          </span>
                        }
                        align="center"
                      />
                    </div>
                    {(language === 'zh' || language === 'ja') && (
                      <div className="w-full max-w-xs px-2 mt-1">
                        <AutoScalingText
                          text={
                            state.animation.type === 'homerun' ? 'SOLO HOME RUN' :
                            state.animation.type === '2-run-homer' ? '2-RUN HOME RUN' :
                            state.animation.type === '3-run-homer' ? '3-RUN HOME RUN' :
                            'GRAND SLAM'
                          }
                          content={
                            <span className={`text-lg tracking-widest opacity-90 whitespace-nowrap break-keep select-none inline-block ${
                              state.animation.type === 'homerun' ? 'text-white' :
                              state.animation.type === '2-run-homer' ? 'text-yellow-200' :
                              state.animation.type === '3-run-homer' ? 'text-orange-400' :
                              'text-transparent bg-clip-text bg-gradient-to-b from-red-600 via-red-500 to-yellow-400'
                            }`}>
                              {state.animation.type === 'homerun' && 'SOLO HOME RUN'}
                              {state.animation.type === '2-run-homer' && '2-RUN HOME RUN'}
                              {state.animation.type === '3-run-homer' && '3-RUN HOME RUN'}
                              {state.animation.type === 'grand-slam' && 'GRAND SLAM'}
                            </span>
                          }
                          align="center"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Top Section (Left Column + Right Column) */}
          <div className="flex w-full relative overflow-hidden">
            
            {/* Left Column (Teams + Players) - Solid layer z-20 so Right column emerges from underneath */}
            <div className="flex flex-col flex-1 min-w-0 relative z-20 bg-slate-900 shadow-2xl">
              
              {/* Away Player Row (Top) - Slides UP from team row */}
              {showAwayPlayer && (
                <motion.div 
                  variants={awayPlayerRowVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="bg-slate-800/80 px-2 flex items-center gap-2 text-xl font-bold uppercase overflow-hidden shrink-0 min-h-0 relative z-10"
                  style={{ height: `${awayPlayerHeight}px` }}
                >
                  {/* Top Resizer */}
                  {state.isAdjustmentMode && (
                    <div 
                      className="absolute left-0 right-0 top-[-8px] h-4 cursor-ns-resize z-50 hover:bg-blue-500/50"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.getSelection()?.removeAllRanges();
                        document.body.style.userSelect = 'none';
                        document.body.style.webkitUserSelect = 'none';
                        const startY = e.clientY;
                        const startHeight = awayPlayerHeight;
                        const scale = state.meta.broadcastScale ?? 1;
                        const onMove = (moveEvent: MouseEvent) => {
                          const deltaY = moveEvent.clientY - startY;
                          const deltaH = -deltaY / scale;
                          const newHeight = Math.max(minPlayerRowHeight, Math.min(150, startHeight + deltaH));
                          dispatch({ type: 'UPDATE_META', field: 'broadcastPlayerRowHeight', value: newHeight });
                        };
                        const onUp = () => {
                          document.body.style.userSelect = '';
                          document.body.style.webkitUserSelect = '';
                          window.removeEventListener('mousemove', onMove);
                          window.removeEventListener('mouseup', onUp);
                        };
                        window.addEventListener('mousemove', onMove);
                        window.addEventListener('mouseup', onUp);
                      }}
                    />
                  )}
                  {isAwayBatter ? (
                    <span className="shrink-0 text-slate-400 font-bold inline-block text-center w-[1.125rem]">{state.awayTeam.currentBatterIndex + 1}.</span>
                  ) : (
                    <span className="shrink-0 text-slate-400 font-bold inline-block text-center w-[1.125rem]">P</span>
                  )}
                  <AnimatePresence mode="wait">
                    {isAwayVisible && (
                    <motion.div
                      key={currentAwayKey}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.3 }}
                      className="flex-1 min-w-0 flex items-center h-full justify-between gap-2"
                    >
                      <div className="flex-1 min-w-0 overflow-hidden flex items-center">
                        <AutoCondenseText 
                          className="leading-tight py-0.5 whitespace-nowrap font-bold inline-block" 
                          style={{ fontSize: `${state.meta.broadcastPlayerNameSize ?? 20}px` }} 
                        >
                          {getPlayerContent(awayPlayer)}
                        </AutoCondenseText>
                      </div>
                      {isAwayBatter && state.showTimer && (showBroadcastTimer || state.isAdjustmentMode) && (
                        <div 
                          className={`font-display shrink-0 ${state.isAdjustmentMode ? 'cursor-pointer' : ''} ${state.timer <= 8 && state.isTimerRunning && showBroadcastTimer ? 'text-red-500 animate-pulse' : 'text-yellow-400'} ${!showBroadcastTimer ? 'opacity-30' : ''}`}
                          style={{ fontSize: `${state.meta.broadcastTimerSize ?? 24}px` }}
                          onClick={(e) => {
                            if (state.isAdjustmentMode) {
                              e.stopPropagation();
                              dispatch({ type: 'UPDATE_META', field: 'broadcastShowTimer', value: !showBroadcastTimer });
                            }
                          }}
                          title={state.isAdjustmentMode ? "Toggle timer in broadcast mode" : undefined}
                        >
                          {state.timer}
                        </div>
                      )}
                      {!isAwayBatter && (showBroadcastPitchCount || state.isAdjustmentMode) && (
                        <div 
                          className={`font-display text-lg shrink-0 ${state.isAdjustmentMode ? 'cursor-pointer' : ''} text-slate-300 font-bold ${!showBroadcastPitchCount ? 'opacity-30' : ''}`}
                          onClick={(e) => {
                            if (state.isAdjustmentMode) {
                              e.stopPropagation();
                              dispatch({ type: 'UPDATE_META', field: 'broadcastShowPitchCount', value: !showBroadcastPitchCount });
                            }
                          }}
                          title={state.isAdjustmentMode ? "Toggle pitch count in broadcast mode" : undefined}
                        >
                          P:{'stat' in awayPlayer ? awayPlayer.stat.replace('P: ', '') : '0'}
                        </div>
                      )}
                    </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {/* Teams & Inning Row - Core solid anchor layer (z-30) */}
              <div 
                className="flex shrink-0 relative z-30 shadow-md"
              >
                {/* Teams */}
                <div className={`flex flex-col flex-1 min-w-0`}>
                  {/* Away */}
                  <div 
                    className="flex relative overflow-hidden shrink-0 min-h-0"
                    style={{ height: `${teamRowHeight}px`, backgroundColor: state.awayTeam.color }}
                  >
                    {/* Darker team background tone and subtle, smaller gradient */}
                    <div className="absolute inset-0 bg-black/25 pointer-events-none"></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-white/8 via-transparent to-black/25 pointer-events-none"></div>
                    <div className="flex-1 px-2 flex items-center gap-3 min-w-0 relative z-10 h-full">
                      <div 
                        className={`overflow-hidden flex items-center justify-center shrink-0 transition-all ${
                          state.awayTeam.logoNoBorder && state.awayTeam.logoUrl
                            ? 'bg-transparent'
                            : 'rounded-full border border-white/20 bg-slate-800'
                        }`}
                        style={{ width: `${state.meta.broadcastLogoSize ?? 40}px`, height: `${state.meta.broadcastLogoSize ?? 40}px` }}
                      >
                        {state.awayTeam.logoUrl ? (
                          <img 
                            src={state.awayTeam.logoUrl} 
                            alt="Away Logo" 
                            className={`w-full h-full ${state.awayTeam.logoNoBorder ? 'object-contain drop-shadow-md' : 'object-cover'}`} 
                          />
                        ) : (
                          <div 
                            className="w-full h-full rounded-full flex items-center justify-center font-bold text-white uppercase" 
                            style={{ backgroundColor: state.awayTeam.color, fontSize: `${(state.meta.broadcastLogoSize ?? 40) * 0.5}px` }}
                          >
                            {state.awayTeam.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden flex items-center">
                        <AutoCondenseText 
                          className="font-bold tracking-wider uppercase leading-tight py-0.5 whitespace-nowrap inline-block" 
                          style={{ fontSize: `${state.meta.broadcastTeamNameSize ?? 24}px` }}
                        >
                          {state.awayTeam.name}
                        </AutoCondenseText>
                      </div>
                    </div>
                    <div 
                      className={`bg-black/40 border-l border-black/50 px-2 flex items-center justify-center text-3xl font-black font-display text-yellow-400 shrink-0 relative z-10 cursor-pointer hover:bg-white/20 transition-colors h-full`}
                      style={{ width: `${state.meta.broadcastScoreWidth ?? 72}px` }}
                      onMouseDown={() => handleScoreMouseDown('away')}
                      onMouseUp={handleScoreMouseUp}
                      onMouseLeave={handleScoreMouseLeave}
                      onTouchStart={() => handleScoreMouseDown('away')}
                      onTouchEnd={handleScoreMouseUp}
                      onClick={(e) => handleScoreClick(e, 'away')}
                    >
                      {/* Score Width Resizer */}
                      {state.isAdjustmentMode && (
                        <div 
                          className="absolute left-[-8px] top-0 bottom-0 w-4 cursor-ew-resize z-50 hover:bg-blue-500/50"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.getSelection()?.removeAllRanges();
                            document.body.style.userSelect = 'none';
                            document.body.style.webkitUserSelect = 'none';
                            const startX = e.clientX;
                            const startWidth = state.meta.broadcastScoreWidth ?? 72;
                            const scale = state.meta.broadcastScale ?? 1;
                            const onMove = (moveEvent: MouseEvent) => {
                              const deltaX = moveEvent.clientX - startX;
                              const deltaW = -deltaX / scale;
                              const newWidth = Math.max(40, startWidth + deltaW);
                              dispatch({ type: 'UPDATE_META', field: 'broadcastScoreWidth', value: newWidth });
                            };
                            const onUp = () => {
                              document.body.style.userSelect = '';
                              document.body.style.webkitUserSelect = '';
                              window.removeEventListener('mousemove', onMove);
                              window.removeEventListener('mouseup', onUp);
                            };
                            window.addEventListener('mousemove', onMove);
                            window.addEventListener('mouseup', onUp);
                          }}
                        />
                      )}
                      <AnimatedScore score={state.awayTeam.score} color="#facc15" sizeClass="" style={{ fontSize: `${state.meta.broadcastScoreSize ?? 30}px` }} disableScale={true} />
                      {showScoreControlsAway && (
                        <div className={`absolute right-full mr-2 top-1/2 -translate-y-1/2 flex gap-2 bg-slate-900/95 p-2 rounded border-2 border-slate-500 shadow-2xl z-50 animate-in fade-in zoom-in duration-200`}>
                            <button className="p-2 bg-white/10 hover:bg-white/20 rounded text-green-400" onClick={(e) => { e.stopPropagation(); dispatch({type: 'ADD_SCORE', team: 'away', amount: 1})}}><Plus size={20}/></button>
                            <button className="p-2 bg-white/10 hover:bg-white/20 rounded text-red-400" onClick={(e) => { e.stopPropagation(); dispatch({type: 'ADD_SCORE', team: 'away', amount: -1})}}><Minus size={20}/></button>
                        </div>
                      )}
                    </div>
                    {/* Divider Resizer between Away and Home */}
                    {state.isAdjustmentMode && (
                      <div 
                        className="absolute left-0 right-0 bottom-[-6px] h-3 cursor-ns-resize z-50 hover:bg-blue-500/50"
                        title="Drag to resize team row height"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          window.getSelection()?.removeAllRanges();
                          document.body.style.userSelect = 'none';
                          document.body.style.webkitUserSelect = 'none';
                          const startY = e.clientY;
                          const startHeight = teamRowHeight;
                          const scale = state.meta.broadcastScale ?? 1;
                          const onMove = (moveEvent: MouseEvent) => {
                            const deltaY = moveEvent.clientY - startY;
                            const deltaH = deltaY / scale;
                            const newHeight = Math.max(minTeamRowHeight, Math.min(180, startHeight + deltaH));
                            dispatch({ type: 'UPDATE_META', field: 'broadcastTeamRowHeight', value: newHeight });
                          };
                          const onUp = () => {
                            document.body.style.userSelect = '';
                            document.body.style.webkitUserSelect = '';
                            window.removeEventListener('mousemove', onMove);
                            window.removeEventListener('mouseup', onUp);
                          };
                          window.addEventListener('mousemove', onMove);
                          window.addEventListener('mouseup', onUp);
                        }}
                      />
                    )}
                  </div>
                  {/* Vertical Center Divider */}
                  
                  {/* Home */}
                  <div 
                    className="flex relative overflow-hidden shrink-0"
                    style={{ height: `${teamRowHeight}px`, backgroundColor: state.homeTeam.color }}
                  >
                    {/* Darker team background tone and subtle, smaller gradient */}
                    <div className="absolute inset-0 bg-black/25 pointer-events-none"></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-white/8 via-transparent to-black/25 pointer-events-none"></div>
                    {/* Team Row Resizer */}
                    {state.isAdjustmentMode && (
                      <div 
                        className="absolute left-0 right-0 bottom-[-8px] h-4 cursor-ns-resize z-50 hover:bg-blue-500/50"
                        title="Drag to resize team row height"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          window.getSelection()?.removeAllRanges();
                          document.body.style.userSelect = 'none';
                          document.body.style.webkitUserSelect = 'none';
                          const startY = e.clientY;
                          const startHeight = teamRowHeight;
                          const scale = state.meta.broadcastScale ?? 1;
                          const onMove = (moveEvent: MouseEvent) => {
                            const deltaY = moveEvent.clientY - startY;
                            const deltaH = deltaY / scale;
                            const newHeight = Math.max(minTeamRowHeight, Math.min(180, startHeight + deltaH));
                            dispatch({ type: 'UPDATE_META', field: 'broadcastTeamRowHeight', value: newHeight });
                          };
                          const onUp = () => {
                            document.body.style.userSelect = '';
                            document.body.style.webkitUserSelect = '';
                            window.removeEventListener('mousemove', onMove);
                            window.removeEventListener('mouseup', onUp);
                          };
                          window.addEventListener('mousemove', onMove);
                          window.addEventListener('mouseup', onUp);
                        }}
                      />
                    )}
                    
                    <div className="flex-1 p-2 flex items-center gap-3 min-w-0 relative z-10">
                      <div 
                        className={`overflow-hidden flex items-center justify-center shrink-0 transition-all ${
                          state.homeTeam.logoNoBorder && state.homeTeam.logoUrl
                            ? 'bg-transparent'
                            : 'rounded-full border border-white/20 bg-slate-800'
                        }`}
                        style={{ width: `${state.meta.broadcastLogoSize ?? 40}px`, height: `${state.meta.broadcastLogoSize ?? 40}px` }}
                      >
                        {state.homeTeam.logoUrl ? (
                          <img 
                            src={state.homeTeam.logoUrl} 
                            alt="Home Logo" 
                            className={`w-full h-full ${state.homeTeam.logoNoBorder ? 'object-contain drop-shadow-md' : 'object-cover'}`} 
                          />
                        ) : (
                          <div 
                            className="w-full h-full rounded-full flex items-center justify-center font-bold text-white uppercase" 
                            style={{ backgroundColor: state.homeTeam.color, fontSize: `${(state.meta.broadcastLogoSize ?? 40) * 0.5}px` }}
                          >
                            {state.homeTeam.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden flex items-center">
                        <AutoCondenseText 
                          className="font-bold tracking-wider uppercase leading-tight py-0.5 whitespace-nowrap inline-block" 
                          style={{ fontSize: `${state.meta.broadcastTeamNameSize ?? 24}px` }}
                        >
                          {state.homeTeam.name}
                        </AutoCondenseText>
                      </div>
                    </div>
                    <div 
                      className={`bg-black/40 border-l border-black/50 px-2 flex items-center justify-center text-3xl font-black font-display text-yellow-400 shrink-0 relative z-10 cursor-pointer hover:bg-white/20 transition-colors h-full`}
                      style={{ width: `${state.meta.broadcastScoreWidth ?? 72}px` }}
                      onMouseDown={() => handleScoreMouseDown('home')}
                      onMouseUp={handleScoreMouseUp}
                      onMouseLeave={handleScoreMouseLeave}
                      onTouchStart={() => handleScoreMouseDown('home')}
                      onTouchEnd={handleScoreMouseUp}
                      onClick={(e) => handleScoreClick(e, 'home')}
                    >
                      <AnimatedScore score={state.homeTeam.score} color="#facc15" sizeClass="" style={{ fontSize: `${state.meta.broadcastScoreSize ?? 30}px` }} disableScale={true} />
                      {showScoreControlsHome && (
                        <div className={`absolute right-full mr-2 top-1/2 -translate-y-1/2 flex gap-2 bg-slate-900/95 p-2 rounded border-2 border-slate-500 shadow-2xl z-50 animate-in fade-in zoom-in duration-200`}>
                            <button className="p-2 bg-white/10 hover:bg-white/20 rounded text-green-400" onClick={(e) => { e.stopPropagation(); dispatch({type: 'ADD_SCORE', team: 'home', amount: 1})}}><Plus size={20}/></button>
                            <button className="p-2 bg-white/10 hover:bg-white/20 rounded text-red-400" onClick={(e) => { e.stopPropagation(); dispatch({type: 'ADD_SCORE', team: 'home', amount: -1})}}><Minus size={20}/></button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* Inning */}
                <div 
                  className="p-2 flex flex-col items-center justify-center gap-2 shrink-0 relative bg-slate-700/50 border-l border-white/10 shadow-[-1px_0_0_rgba(0,0,0,0.5)]"
                  style={{ width: `${state.meta.broadcastInningWidth ?? 56}px` }}
                >
                  {state.isAdjustmentMode && (
                    <div 
                      className="absolute left-[-8px] top-0 bottom-0 w-4 cursor-ew-resize z-50 hover:bg-blue-500/50"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.getSelection()?.removeAllRanges();
                        document.body.style.userSelect = 'none';
                        document.body.style.webkitUserSelect = 'none';
                        const startX = e.clientX;
                        const startWidth = state.meta.broadcastInningWidth ?? 56;
                        const scale = state.meta.broadcastScale ?? 1;
                        const onMove = (moveEvent: MouseEvent) => {
                          const deltaX = moveEvent.clientX - startX;
                          const deltaW = -deltaX / scale;
                          const newWidth = Math.max(30, startWidth + deltaW);
                          dispatch({ type: 'UPDATE_META', field: 'broadcastInningWidth', value: newWidth });
                        };
                        const onUp = () => {
                          document.body.style.userSelect = '';
                          document.body.style.webkitUserSelect = '';
                          window.removeEventListener('mousemove', onMove);
                          window.removeEventListener('mouseup', onUp);
                        };
                        window.addEventListener('mousemove', onMove);
                        window.addEventListener('mouseup', onUp);
                      }}
                    />
                  )}
                  <div className={`w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[12px] ${state.isTop ? 'border-b-yellow-400' : 'border-b-slate-600'}`} />
                  <div className="font-black font-display" style={{ fontSize: `${state.meta.broadcastInningSize ?? 24}px` }}>{state.inning}</div>
                  <div className={`w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px] ${!state.isTop ? 'border-t-yellow-400' : 'border-t-slate-600'}`} />
                </div>
              </div>

              {/* Home Player Row (Bottom) - Slides DOWN from team row */}
              {showHomePlayer && (
                <motion.div 
                  variants={homePlayerRowVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="bg-slate-800/80 px-2 flex items-center gap-2 text-xl font-bold uppercase overflow-hidden shrink-0 min-h-0 relative z-10"
                  style={{ height: `${homePlayerHeight}px` }}
                >
                  {/* Bottom Resizer */}
                  {state.isAdjustmentMode && (
                    <div 
                      className="absolute left-0 right-0 bottom-[-8px] h-4 cursor-ns-resize z-50 hover:bg-blue-500/50"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.getSelection()?.removeAllRanges();
                        document.body.style.userSelect = 'none';
                        document.body.style.webkitUserSelect = 'none';
                        const startY = e.clientY;
                        const startHeight = homePlayerHeight;
                        const startMarginY = state.meta.broadcastMarginY ?? 20;
                        const scale = state.meta.broadcastScale ?? 1;
                        const onMove = (moveEvent: MouseEvent) => {
                          const deltaY = moveEvent.clientY - startY;
                          const deltaH = deltaY / scale;
                          const newHeight = Math.max(minPlayerRowHeight, Math.min(150, startHeight + deltaH));
                          const actualDeltaH = newHeight - startHeight;
                          dispatch({ type: 'UPDATE_META', field: 'broadcastPlayerRowHeight', value: newHeight });
                          dispatch({ type: 'UPDATE_META', field: 'broadcastMarginY', value: Math.max(0, startMarginY - actualDeltaH * scale) });
                        };
                        const onUp = () => {
                          document.body.style.userSelect = '';
                          document.body.style.webkitUserSelect = '';
                          window.removeEventListener('mousemove', onMove);
                          window.removeEventListener('mouseup', onUp);
                        };
                        window.addEventListener('mousemove', onMove);
                        window.addEventListener('mouseup', onUp);
                      }}
                    />
                  )}
                  {!isAwayBatter ? (
                    <span className="shrink-0 text-slate-400 font-bold inline-block text-center w-[1.125rem]">{state.homeTeam.currentBatterIndex + 1}.</span>
                  ) : (
                    <span className="shrink-0 text-slate-400 font-bold inline-block text-center w-[1.125rem]">P</span>
                  )}
                  <AnimatePresence mode="wait">
                    {isHomeVisible && (
                    <motion.div
                      key={currentHomeKey}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.3 }}
                      className="flex-1 min-w-0 flex items-center h-full justify-between gap-2"
                    >
                      <div className="flex-1 min-w-0 overflow-hidden flex items-center">
                        <AutoCondenseText 
                          className="leading-tight py-0.5 whitespace-nowrap font-bold inline-block" 
                          style={{ fontSize: `${state.meta.broadcastPlayerNameSize ?? 20}px` }} 
                        >
                          {getPlayerContent(homePlayer)}
                        </AutoCondenseText>
                      </div>
                      {!isAwayBatter && state.showTimer && (showBroadcastTimer || state.isAdjustmentMode) && (
                        <div 
                          className={`font-display shrink-0 ${state.isAdjustmentMode ? 'cursor-pointer' : ''} ${state.timer <= 8 && state.isTimerRunning && showBroadcastTimer ? 'text-red-500 animate-pulse' : 'text-yellow-400'} ${!showBroadcastTimer ? 'opacity-30' : ''}`}
                          style={{ fontSize: `${state.meta.broadcastTimerSize ?? 24}px` }}
                          onClick={(e) => {
                            if (state.isAdjustmentMode) {
                              e.stopPropagation();
                              dispatch({ type: 'UPDATE_META', field: 'broadcastShowTimer', value: !showBroadcastTimer });
                            }
                          }}
                          title={state.isAdjustmentMode ? "Toggle timer in broadcast mode" : undefined}
                        >
                          {state.timer}
                        </div>
                      )}
                      {isAwayBatter && (showBroadcastPitchCount || state.isAdjustmentMode) && (
                        <div 
                          className={`font-display text-lg shrink-0 ${state.isAdjustmentMode ? 'cursor-pointer' : ''} text-slate-300 font-bold ${!showBroadcastPitchCount ? 'opacity-30' : ''}`}
                          onClick={(e) => {
                            if (state.isAdjustmentMode) {
                              e.stopPropagation();
                              dispatch({ type: 'UPDATE_META', field: 'broadcastShowPitchCount', value: !showBroadcastPitchCount });
                            }
                          }}
                          title={state.isAdjustmentMode ? "Toggle pitch count in broadcast mode" : undefined}
                        >
                          P:{'stat' in homePlayer ? homePlayer.stat.replace('P: ', '') : '0'}
                        </div>
                      )}
                    </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
              
            </div>

            {/* Right Column (Count & Diamond) - Slides out from lowest layer (z-0) with constant opacity */}
            <motion.div 
              variants={rightColVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="px-2 flex flex-col items-center shrink-0 relative h-full bg-blue-950/50 backdrop-blur-md border-l border-white/10 shadow-[-1px_0_0_rgba(0,0,0,0.5)] z-0"
              style={{ width: `${state.meta.broadcastRightColumnWidth ?? 150}px` }}
            >
                            <AnimatePresence>
                {showKAnimation && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none backdrop-blur-sm bg-black/20"
                  >
                    <div className="relative flex items-center justify-center">
                      <span 
                        className="text-[80px] font-black font-rammetto leading-none" 
                        style={{ 
                          color: state.isTop ? state.homeTeam.color : state.awayTeam.color,
                          WebkitTextStroke: '2px white',
                          filter: `drop-shadow(0 0 30px ${state.isTop ? state.homeTeam.color : state.awayTeam.color})`
                        }}
                      >
                        K
                      </span>
                      <motion.div 
                        initial={{ opacity: 1, scale: 0.5 }}
                        animate={{ opacity: 0, scale: 1.5 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="absolute w-[90px] h-[90px] border-[4px] rounded-full" 
                        style={{ borderColor: state.isTop ? state.homeTeam.color : state.awayTeam.color }}
                      />
                      <motion.div 
                        initial={{ opacity: 1, scale: 0.2 }}
                        animate={{ opacity: 0, scale: 2 }}
                        transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                        className="absolute w-[90px] h-[90px] border-[2px] border-white rounded-full" 
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Diamond (Top Half) */}
              <div 
                className="flex items-center justify-center w-full shrink-0"
                style={{ height: `${effectiveA + teamRowHeight}px` }}
              >
                 <div style={{ transform: 'scale(0.35)', transformOrigin: 'center' }}>
                   <Diamond 
                      bases={state.bases} 
                      onToggle={(idx) => dispatch({type: 'TOGGLE_BASE', baseIndex: idx})}
                      className="" 
                      activeColor={activeBaseColor}
                      disableScale={true}
                   />
                 </div>
              </div>

              {/* Count (Bottom Half) */}
              <div 
                className="flex flex-col justify-center items-center w-full px-2 shrink-0 overflow-hidden min-h-0"
                style={{ 
                  height: `${teamRowHeight + effectiveH}px`
                }}
              >
                  <div 
                    className="flex flex-col justify-center items-start my-auto transition-all"
                    style={{ gap: `${Math.max(0, state.meta.broadcastCountGap ?? 2)}px` }}
                  >
                      {/* Balls */}
                      <div className="flex items-center gap-1.5 cursor-pointer group" onClick={handleBallClick}>
                          <span className="text-base sm:text-lg font-bold text-slate-500 group-hover:text-white transition-colors w-4 text-center leading-none">B</span>
                          <div className="flex space-x-1 items-center">
                              {[0, 1, 2].map(i => (
                                  <AnimatedIndicator 
                                      key={i}
                                      active={i < state.balls} 
                                      colorClass="bg-led-green" 
                                      shadowClass="shadow-[0_0_10px_#00ff41]" 
                                      baseClass="w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full border-2"
                                      disableAnimation={true}
                                      disableGlow={true}
                                  />
                              ))}
                          </div>
                      </div>
                      {/* Strikes */}
                      <div 
                        className="flex items-center gap-1.5 cursor-pointer group" 
                        style={{ marginTop: (state.meta.broadcastCountGap ?? 2) < 0 ? `${state.meta.broadcastCountGap}px` : undefined }}
                        onClick={handleStrikeClick}
                      >
                          <span className="text-base sm:text-lg font-bold text-slate-500 group-hover:text-white transition-colors w-4 text-center leading-none">S</span>
                          <div className="flex space-x-1 items-center">
                              {[0, 1].map(i => (
                                  <AnimatedIndicator 
                                      key={i}
                                      active={i < state.strikes} 
                                      colorClass="bg-led-yellow" 
                                      shadowClass="shadow-[0_0_10px_#ffcc00]" 
                                      baseClass="w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full border-2"
                                      disableAnimation={true}
                                      disableGlow={true}
                                  />
                              ))}
                          </div>
                      </div>
                      {/* Outs */}
                      <div 
                        className="flex items-center gap-1.5 cursor-pointer group" 
                        style={{ marginTop: (state.meta.broadcastCountGap ?? 2) < 0 ? `${state.meta.broadcastCountGap}px` : undefined }}
                        onClick={handleOutClick}
                      >
                          <span className="text-base sm:text-lg font-bold text-slate-500 group-hover:text-white transition-colors w-4 text-center leading-none">O</span>
                          <div className="flex space-x-1 items-center">
                              {[0, 1].map(i => (
                                  <AnimatedIndicator 
                                      key={i}
                                      active={i < state.outs} 
                                      colorClass="bg-led-red" 
                                      shadowClass="shadow-[0_0_10px_#ff3b30]" 
                                      baseClass="w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full border-2"
                                      disableAnimation={true}
                                      disableGlow={true}
                                  />
                              ))}
                          </div>
                      </div>
                  </div>
              </div>
            </motion.div>

          </div>


            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
    );
  };

  const activeAnimation = state.animation;
  const currentTeamForAnim = state.isTop ? state.awayTeam : state.homeTeam;
  const currentBatterForAnim = currentTeamForAnim.lineup[currentTeamForAnim.currentBatterIndex];
  const defaultPlayerNameForAnim = currentBatterForAnim 
    ? (currentBatterForAnim.number ? `${currentBatterForAnim.name} #${currentBatterForAnim.number}` : currentBatterForAnim.name)
    : (language === 'zh' ? '當前打者' : 'Current Batter');

  const animTeamName = activeAnimation?.teamName || currentTeamForAnim.name || '';
  const animPlayerName = activeAnimation?.playerName || defaultPlayerNameForAnim;
  const animTeamColor = activeAnimation?.teamColor || currentTeamForAnim.color || '#3b82f6';

  return (
    <div ref={ref} className="w-full h-full relative">
        {state.displayMode === 'lineup' ? renderLineupView() : 
         state.displayMode === 'rhe' ? renderRHEView() : 
         state.displayMode === 'broadcast' ? renderBroadcastView() :
         renderDefaultView()}
        
        {/* Home Run Animation Overlay (Full Screen for non-broadcast) */}
        {state.displayMode !== 'broadcast' && state.animation && (
          <div 
            className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none overflow-hidden bg-black/70 backdrop-blur-md"
            style={{ animation: state.animation.isLocked ? 'none' : state.animation.isExiting ? 'fadeOut 0.5s ease-in-out forwards' : 'fadeOut 0.5s ease-in-out 4.5s forwards' }}
          >
            <div 
              className="relative flex flex-col items-center justify-center w-full h-full"
              style={{ animation: state.animation.isLocked ? 'none' : state.animation.isExiting ? 'outroContainer 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards' : 'outroContainer 0.5s cubic-bezier(0.4, 0, 0.2, 1) 4.5s forwards' }}
            >
              {/* Expanding circle */}
              <div 
                key={`bubble-local-${state.animation.bubbleKey || 0}`}
                className="absolute rounded-full mix-blend-screen"
                style={{
                  backgroundColor: animTeamColor,
                  animation: 'expandCircle 1s cubic-bezier(0.1, 0.8, 0.3, 1) forwards'
                }}
              />
              
              <div 
                className="relative z-10 flex flex-col items-center w-full max-w-4xl px-6"
                style={{ animation: 'shiftDownFullscreen 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 1.2s forwards' }}
              >
                <div className="absolute bottom-[100%] mb-2 w-full flex justify-center">
                  <div className="overflow-hidden w-full">
                    <div 
                      className="w-full px-4"
                      style={{ animation: 'revealUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 1.4s both' }}
                    >
                      <AutoScalingText 
                        text={animTeamName && animPlayerName ? `${animTeamName} | ${animPlayerName}` : (animTeamName || animPlayerName)}
                        content={
                          <span className="inline-flex items-center justify-center gap-4 text-3xl md:text-5xl font-bold text-white/90 uppercase tracking-wide">
                            {animTeamName && <span>{animTeamName}</span>}
                            {animTeamName && animPlayerName && <span className="opacity-50 font-light shrink-0">|</span>}
                            {animPlayerName && <span>{animPlayerName}</span>}
                          </span>
                        }
                        align="center"
                      />
                    </div>
                  </div>
                </div>
                
                <div 
                  className="flex flex-col items-center uppercase tracking-tighter text-center w-full"
                  style={{
                    fontFamily: '"LINE Seed JP", sans-serif',
                    fontWeight: 800,
                    animation: 'popScale 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both'
                  }}
                >
                  <div className="w-full max-w-5xl px-4">
                    <AutoScalingText
                      text={
                        state.animation.type === 'homerun' ? (language === 'zh' ? '陽春砲' : language === 'ja' ? 'ソロホームラン' : 'HOMERUN!') :
                        state.animation.type === '2-run-homer' ? (language === 'zh' ? '兩分砲' : language === 'ja' ? '2ランホームラン' : '2-RUN HOMER!') :
                        state.animation.type === '3-run-homer' ? (language === 'zh' ? '三分砲' : language === 'ja' ? '3ランホームラン' : '3-RUN HOMER!') :
                        (language === 'zh' ? '滿貫砲' : language === 'ja' ? '満塁ホームラン' : 'GRAND SLAM!')
                      }
                      content={
                        <span className={`text-6xl sm:text-8xl md:text-[10rem] xl:text-[12rem] whitespace-nowrap break-keep leading-none select-none inline-block ${
                          state.animation.type === 'homerun' ? 'text-white drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]' :
                          state.animation.type === '2-run-homer' ? 'text-yellow-200 drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]' :
                          state.animation.type === '3-run-homer' ? 'text-orange-400 drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]' :
                          'text-transparent bg-clip-text bg-gradient-to-b from-red-600 via-red-500 to-yellow-400 drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]'
                        }`}>
                          {state.animation.type === 'homerun' && (language === 'zh' ? '陽春砲' : language === 'ja' ? 'ソロホームラン' : 'HOMERUN!')}
                          {state.animation.type === '2-run-homer' && (language === 'zh' ? '兩分砲' : language === 'ja' ? '2ランホームラン' : '2-RUN HOMER!')}
                          {state.animation.type === '3-run-homer' && (language === 'zh' ? '三分砲' : language === 'ja' ? '3ランホームラン' : '3-RUN HOMER!')}
                          {state.animation.type === 'grand-slam' && (language === 'zh' ? '滿貫砲' : language === 'ja' ? '満塁ホームラン' : 'GRAND SLAM!')}
                        </span>
                      }
                      align="center"
                    />
                  </div>
                  {(language === 'zh' || language === 'ja') && (
                    <div className="w-full max-w-2xl px-4 mt-2 md:mt-4">
                      <AutoScalingText
                        text={
                          state.animation.type === 'homerun' ? 'SOLO HOME RUN' :
                          state.animation.type === '2-run-homer' ? '2-RUN HOME RUN' :
                          state.animation.type === '3-run-homer' ? '3-RUN HOME RUN' :
                          'GRAND SLAM'
                        }
                        content={
                          <span className={`text-2xl sm:text-3xl md:text-5xl tracking-widest opacity-90 whitespace-nowrap break-keep select-none inline-block ${
                            state.animation.type === 'homerun' ? 'text-white' :
                            state.animation.type === '2-run-homer' ? 'text-yellow-200' :
                            state.animation.type === '3-run-homer' ? 'text-orange-400' :
                            'text-transparent bg-clip-text bg-gradient-to-b from-red-600 via-red-500 to-yellow-400'
                          }`}>
                            {state.animation.type === 'homerun' && 'SOLO HOME RUN'}
                            {state.animation.type === '2-run-homer' && '2-RUN HOME RUN'}
                            {state.animation.type === '3-run-homer' && '3-RUN HOME RUN'}
                            {state.animation.type === 'grand-slam' && 'GRAND SLAM'}
                          </span>
                        }
                        align="center"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <style>{`
          @keyframes slamIn {
            0% { transform: scale(3) translateY(-50px) rotate(-10deg); opacity: 0; filter: blur(10px); }
            100% { transform: scale(1) translateY(0) rotate(-5deg); opacity: 1; filter: blur(0); }
          }
          @keyframes slide-down {
            0% { transform: translateY(-50px) skewX(-12deg); opacity: 0; }
            100% { transform: translateY(0) skewX(-12deg); opacity: 1; }
          }
          .animate-slide-down {
            animation: slide-down 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
          }
          @keyframes flashBg {
            0% { opacity: 0.1; }
            100% { opacity: 0.5; }
          }
          @keyframes slideInLeft {
            0% { transform: translateX(-100vw) skewX(-12deg); opacity: 0; }
            100% { transform: translateX(0) skewX(-12deg); opacity: 1; }
          }
          @keyframes slideInRight {
            0% { transform: translateX(100vw) skewX(-12deg); opacity: 0; }
            100% { transform: translateX(0) skewX(-12deg); opacity: 1; }
          }
          @keyframes pan-bg {
            0% { background-position: 0 0; }
            100% { background-position: 100px 100px; }
          }
          .animate-pan-bg {
            animation: pan-bg 2s linear infinite;
          }
          @keyframes hrProgressSvg {
            from { stroke-dashoffset: 0; }
            to { stroke-dashoffset: 213.6; }
          }
          @keyframes shiftDownBroadcast {
            0% { transform: translateY(0); }
            100% { transform: translateY(16px); }
          }
          @keyframes shiftDownFullscreen {
            0% { transform: translateY(0); }
            100% { transform: translateY(40px); }
          }
          @keyframes expandCircle {
            0% { width: 0; height: 0; opacity: 0.8; }
            100% { width: 150vw; height: 150vw; opacity: 0; }
          }
          @keyframes revealUp {
            0% { transform: translateY(100%); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
          @keyframes popScale {
            0% { transform: scale(0.5); opacity: 0; }
            70% { transform: scale(1.1); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes slideRightOut {
            0% { transform: translateX(-101%); }
            100% { transform: translateX(0); }
          }
          @keyframes fadeOut {
            0% { opacity: 1; }
            100% { opacity: 0; }
          }
          @keyframes outroContainer {
            0% { opacity: 1; transform: scale(1); filter: blur(0); }
            100% { opacity: 0; transform: scale(0.9); filter: blur(8px); }
          }
        `}</style>
    </div>
  );
});