import { LineupImportModal } from './LineupImportModal';
import { PitcherLineupSubModal, PitcherCandidate } from './PitcherLineupSubModal';


import React, { useRef, useEffect, useState } from 'react';
import { GameState, ActionType, Player, Team, PitchInfo, GameMeta } from '../types';
import { getPitcherCount } from '../reducer';
import { Play, Pause, RotateCcw, Eye, EyeOff, User, Trash2, Plus, PenTool, Tv, LayoutTemplate, Square, Image as ImageIcon, RefreshCw, ArrowDown, ArrowUp, GripVertical, Settings, Check, CircleDot, ChevronDown, ChevronUp, ChevronRight, X, Flame, FileSpreadsheet, Smartphone } from 'lucide-react';
import { ImageCropperModal } from './ImageCropperModal';
import { 
  DndContext, 
  closestCenter, 
  PointerSensor, 
  TouchSensor,
  useSensor, 
  useSensors, 
  DragEndEvent 
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  verticalListSortingStrategy, 
  useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

interface ControlsProps {
  state: GameState;
  dispatch: React.Dispatch<ActionType>;
  language?: 'en' | 'zh' | 'ja';
  onOpenRecordModal?: () => void;
}

const SortablePlayerRow = ({ 
  player, 
  idx, 
  isLineup, 
  isCurrentBatter, 
  onUpdate, 
  onMove, 
  onRemove,
  onSetPitcher,
  language,
  selectedPosId,
  selectedPlayerId,
  onRowClick,
  onPosClick,
  onPosDoubleClick,
  onPosBlur,
  isPosEditing
}: { 
  player: Player; 
  idx: number; 
  isLineup: boolean; 
  isCurrentBatter: boolean;
  onUpdate: (field: keyof Player, value: string) => void;
  onMove: () => void;
  onRemove: () => void;
  onSetPitcher: () => void;
  language: 'en' | 'zh' | 'ja';
  key?: any;
  selectedPosId?: string | null;
  selectedPlayerId?: string | null;
  onRowClick?: (id: string) => void;
  onPosClick?: (id: string) => void;
  onPosDoubleClick?: (id: string) => void;
  onPosBlur?: () => void;
  isPosEditing?: boolean;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: player.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`flex items-center gap-1 text-xs p-1 rounded border min-w-max transition-colors ${isDragging ? 'opacity-50 bg-blue-50 border-blue-200' : selectedPlayerId === player.id ? 'bg-indigo-100 border-indigo-400' : isCurrentBatter ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-transparent hover:bg-gray-100'}`}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.closest('.cursor-grab')) return;
        onRowClick?.(player.id);
      }}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-gray-500 hover:text-gray-800 transition-colors shrink-0">
        <GripVertical size={14} />
      </div>
      {!isLineup ? null : <span className="w-4 shrink-0 text-gray-400 font-mono text-[10px] text-right">{idx + 1}</span>}
      <input 
        className={`w-8 shrink-0 border rounded px-1 text-center font-bold text-slate-900 bg-white ${selectedPosId === player.id ? 'ring-2 ring-blue-500' : ''} ${!isPosEditing ? 'cursor-pointer select-none' : ''}`} 
        value={player.position || ''} 
        placeholder="Pos" 
        onChange={(e) => onUpdate('position', e.target.value)}
        readOnly={!isPosEditing}
        onClick={() => onPosClick?.(player.id)}
        onDoubleClick={() => onPosDoubleClick?.(player.id)}
        onBlur={() => onPosBlur?.()}
      />
      <input 
        className="w-8 shrink-0 border rounded px-1 text-center text-slate-900 bg-white" 
        value={player.number} 
        placeholder="#" 
        onChange={(e) => onUpdate('number', e.target.value)} 
      />
      <input 
        className="w-24 shrink-0 border rounded px-1 text-slate-900 bg-white" 
        value={player.name} 
        placeholder="Name" 
        onChange={(e) => onUpdate('name', e.target.value)} 
      />
      <input 
        className="w-12 shrink-0 border rounded px-1 text-center text-slate-900 bg-white" 
        value={player.stat} 
        placeholder="Avg" 
        onChange={(e) => onUpdate('stat', e.target.value)} 
      />
      <button 
        onClick={onMove} 
        className={`shrink-0 p-1 ${isLineup ? 'text-blue-400 hover:text-blue-600' : 'text-green-600 hover:text-green-700'}`} 
        title={isLineup ? (language === 'zh' ? "移至板凳" : language === 'en' ? "To Bench" : "ベンチへ") : (language === 'zh' ? "移至打線" : language === 'en' ? "To Lineup" : "打順へ")}
      >
        {isLineup ? <ArrowDown size={14} /> : <ArrowUp size={14} />}
      </button>
      <button 
        onClick={onSetPitcher} 
        className="shrink-0 p-1 text-purple-400 hover:text-purple-600" 
        title={language === 'en' ? 'Set as Pitcher' : language === 'zh' ? '設為投手' : '投手に設定'}
      >
        <CircleDot size={14} />
      </button>
      <button onClick={onRemove} className="shrink-0 p-1 text-red-400 hover:text-red-600" title={language === 'zh' ? '移除' : language === 'ja' ? '削除' : 'Remove'}>
        <Trash2 size={14} />
      </button>
    </div>
  );
};


const InningsAndRHEEditor: React.FC<{ state: GameState, dispatch: React.Dispatch<ActionType>, language?: 'en' | 'zh' | 'ja' }> = ({ state, dispatch, language = 'zh' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxInnings = Math.max(state.awayTeam.inningScores.length, state.homeTeam.inningScores.length);
  const innings = Array.from({ length: maxInnings }, (_, i) => i);

  const handleScoreChange = (teamKey: 'away' | 'home', idx: number, val: string) => {
    const team = state[teamKey + 'Team' as 'awayTeam' | 'homeTeam'];
    const newScores = [...team.inningScores];
    newScores[idx] = val === '' ? null : (parseInt(val) || 0);
    dispatch({ type: 'UPDATE_TEAM', team: teamKey, data: { inningScores: newScores } });
  };

  const handleAddInning = () => {
    dispatch({ type: 'UPDATE_TEAM', team: 'away', data: { inningScores: [...state.awayTeam.inningScores, null] } });
    dispatch({ type: 'UPDATE_TEAM', team: 'home', data: { inningScores: [...state.homeTeam.inningScores, null] } });
  };

  const handleDeleteInning = (idx: number) => {
    if (confirm(language === 'en' ? 'Delete this inning?' : language === 'zh' ? '確定要刪除這局嗎？' : 'このイニングを削除しますか？')) {
      const awayScores = [...state.awayTeam.inningScores];
      const homeScores = [...state.homeTeam.inningScores];
      awayScores.splice(idx, 1);
      homeScores.splice(idx, 1);
      dispatch({ type: 'UPDATE_TEAM', team: 'away', data: { inningScores: awayScores } });
      dispatch({ type: 'UPDATE_TEAM', team: 'home', data: { inningScores: homeScores } });
    }
  };

  const handleStatChange = (teamKey: 'away' | 'home', field: 'hits' | 'errors', val: number) => {
    dispatch({ type: 'UPDATE_TEAM', team: teamKey, data: { [field]: val } });
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm mt-4 overflow-hidden transition-all">
      <button
        type="button"
        onClick={() => setIsExpanded(prev => !prev)}
        className="w-full p-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Square size={14} className="text-emerald-600 shrink-0" />
          <span className="font-bold text-xs sm:text-sm text-gray-800 uppercase tracking-wide truncate">
            {language === 'en' ? 'Innings & RHE Configuration' : language === 'zh' ? '局數與 RHE 設定' : 'イニングとRHE設定'}
          </span>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold shrink-0">
            {maxInnings} {language === 'zh' ? '局' : 'INN'}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
            H: {state.awayTeam.hits}-{state.homeTeam.hits} / E: {state.awayTeam.errors}-{state.homeTeam.errors}
          </span>
          {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </button>

      {isExpanded && (
        <div className="p-3 border-t border-slate-100">
          <div className="flex gap-4 min-w-0 overflow-x-auto pb-4">
            {/* Team Labels & RHE */}
            <div className="flex flex-col gap-2 shrink-0 border-r pr-4">
              <div className="h-6"></div> {/* Spacer for inning numbers */}
              <div className="flex items-center justify-between gap-4 h-8">
                 <span className="font-bold text-xs" style={{ color: state.awayTeam.color }}>{state.awayTeam.name}</span>
                 <div className="flex gap-2">
                    <div className="flex items-center gap-1"><span className="text-xs font-bold text-slate-500">H</span><input type="number" className="w-10 border rounded px-1 text-xs text-slate-900 font-bold bg-white" value={state.awayTeam.hits} onChange={(e) => handleStatChange('away', 'hits', parseInt(e.target.value) || 0)} /></div>
                    <div className="flex items-center gap-1"><span className="text-xs font-bold text-slate-500">E</span><input type="number" className="w-10 border rounded px-1 text-xs text-slate-900 font-bold bg-white" value={state.awayTeam.errors} onChange={(e) => handleStatChange('away', 'errors', parseInt(e.target.value) || 0)} /></div>
                 </div>
              </div>
              <div className="flex items-center justify-between gap-4 h-8">
                 <span className="font-bold text-xs" style={{ color: state.homeTeam.color }}>{state.homeTeam.name}</span>
                 <div className="flex gap-2">
                    <div className="flex items-center gap-1"><span className="text-xs font-bold text-slate-500">H</span><input type="number" className="w-10 border rounded px-1 text-xs text-slate-900 font-bold bg-white" value={state.homeTeam.hits} onChange={(e) => handleStatChange('home', 'hits', parseInt(e.target.value) || 0)} /></div>
                    <div className="flex items-center gap-1"><span className="text-xs font-bold text-slate-500">E</span><input type="number" className="w-10 border rounded px-1 text-xs text-slate-900 font-bold bg-white" value={state.homeTeam.errors} onChange={(e) => handleStatChange('home', 'errors', parseInt(e.target.value) || 0)} /></div>
                 </div>
              </div>
            </div>

            {/* Innings */}
            {innings.map(idx => (
              <div key={idx} className="flex flex-col gap-2 items-center shrink-0">
                <div className="h-6 flex items-center justify-between w-full">
                  <span className="text-xs font-bold text-slate-500 w-full text-center">{idx + 1}</span>
                  <button onClick={() => handleDeleteInning(idx)} className="text-red-400 hover:text-red-600 p-0.5"><Trash2 size={10} /></button>
                </div>
                <input 
                  className="w-10 h-8 border rounded px-1 text-center text-sm font-bold text-slate-900 bg-white" 
                  value={state.awayTeam.inningScores[idx] === null || state.awayTeam.inningScores[idx] === undefined ? '' : state.awayTeam.inningScores[idx]}
                  onChange={(e) => handleScoreChange('away', idx, e.target.value)}
                />
                <input 
                  className="w-10 h-8 border rounded px-1 text-center text-sm font-bold text-slate-900 bg-white" 
                  value={state.homeTeam.inningScores[idx] === null || state.homeTeam.inningScores[idx] === undefined ? '' : state.homeTeam.inningScores[idx]}
                  onChange={(e) => handleScoreChange('home', idx, e.target.value)}
                />
              </div>
            ))}
            
            {/* Add Inning */}
            <div className="flex flex-col items-center justify-center shrink-0 pl-2">
              <button 
                onClick={handleAddInning}
                className="w-8 h-full min-h-[80px] flex items-center justify-center border-2 border-dashed rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors"
                title="Add Inning"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const TeamEditor: React.FC<{ teamKey: 'home' | 'away', state: GameState, dispatch: React.Dispatch<ActionType>, language?: 'en' | 'zh' | 'ja' }> = ({ teamKey, state, dispatch, language = 'zh' }) => {
  const globalTeam = state[teamKey === 'home' ? 'homeTeam' : 'awayTeam'];
  const [draft, setDraft] = React.useState<Team>(globalTeam);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState('');
  
  const [selectedPosId, setSelectedPosId] = useState<string | null>(null);
  const [editingPosId, setEditingPosId] = useState<string | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const [isLineupOpen, setIsLineupOpen] = useState(true);
  const [isBenchOpen, setIsBenchOpen] = useState(false);

  const handlePosClick = (id: string) => {
    if (editingPosId === id) return;
    if (selectedPosId && selectedPosId !== id) {
      const getPlayerLoc = (pid: string) => {
        let idx = draft.lineup.findIndex(p => p.id === pid);
        if (idx >= 0) return { list: 'lineup' as const, idx };
        idx = draft.bench.findIndex(p => p.id === pid);
        if (idx >= 0) return { list: 'bench' as const, idx };
        return null;
      };

      const loc1 = getPlayerLoc(selectedPosId);
      const loc2 = getPlayerLoc(id);

      if (loc1 && loc2) {
        const newDraft = { ...draft, lineup: [...draft.lineup], bench: [...draft.bench] };
        const p1Pos = newDraft[loc1.list][loc1.idx].position;
        const p2Pos = newDraft[loc2.list][loc2.idx].position;
        
        newDraft[loc1.list][loc1.idx] = { ...newDraft[loc1.list][loc1.idx], position: p2Pos };
        newDraft[loc2.list][loc2.idx] = { ...newDraft[loc2.list][loc2.idx], position: p1Pos };
        
        setDraft(newDraft);
      }
      setSelectedPosId(null);
    } else {
      setSelectedPosId(selectedPosId === id ? null : id);
    }
  };

  
  const handleRowClick = (id: string) => {
    if (selectedPlayerId && selectedPlayerId !== id) {
      const getPlayerLoc = (pid: string) => {
        let idx = draft.lineup.findIndex(p => p.id === pid);
        if (idx >= 0) return { list: 'lineup' as const, idx };
        idx = draft.bench.findIndex(p => p.id === pid);
        if (idx >= 0) return { list: 'bench' as const, idx };
        return null;
      };
      
      const loc1 = getPlayerLoc(selectedPlayerId);
      const loc2 = getPlayerLoc(id);

      if (loc1 && loc2) {
        const newDraft = { ...draft, lineup: [...draft.lineup], bench: [...draft.bench] };
        const p1 = newDraft[loc1.list][loc1.idx];
        const p2 = newDraft[loc2.list][loc2.idx];
        
        if (loc1.list !== loc2.list) {
          if (loc1.list === 'lineup') {
            newDraft.lineup[loc1.idx] = { ...p2, position: 'PH' };
            newDraft.bench[loc2.idx] = { ...p1, position: 'BN' };
          } else {
            newDraft.lineup[loc2.idx] = { ...p1, position: 'PH' };
            newDraft.bench[loc1.idx] = { ...p2, position: 'BN' };
          }
        } else {
          newDraft[loc1.list][loc1.idx] = p2;
          newDraft[loc2.list][loc2.idx] = p1;
        }
        
        setDraft(newDraft);
      }
      setSelectedPlayerId(null);
    } else {
      setSelectedPlayerId(selectedPlayerId === id ? null : id);
    }
  };

  const handlePosDoubleClick = (id: string) => {
    setSelectedPosId(null);
    setEditingPosId(id);
  };

  const [isSavedRecently, setIsSavedRecently] = useState(false);

  // Sync score and currentBatterIndex from global to draft so game progress doesn't get overwritten
  React.useEffect(() => {
    setDraft(prev => ({
      ...prev,
      score: globalTeam.score,
      currentBatterIndex: globalTeam.currentBatterIndex
    }));
  }, [globalTeam.score, globalTeam.currentBatterIndex]);

  // When global team reset occurs or team config changes externally, sync draft
  React.useEffect(() => {
    setDraft(globalTeam);
  }, [state.meta.settingsVersion]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempImageSrc(reader.result as string);
        setCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = ''; // Reset input
  };

  const handleCropComplete = (croppedImage: string, noBorder?: boolean) => {
    setDraft(prev => ({ 
      ...prev, 
      logoUrl: croppedImage,
      logoNoBorder: Boolean(noBorder)
    }));
    setCropModalOpen(false);
    setTempImageSrc('');
  };

  const updateDraft = (field: keyof Team, value: any) => {
    setDraft(prev => ({ ...prev, [field]: value }));
  };

  const updatePitcher = (field: keyof Player, value: any) => {
    setDraft(prev => {
      const newPitcher = { ...prev.pitcher, [field]: value };
      if (field === 'stat') {
        const num = parseInt(String(value || '').replace(/[^0-9]/g, ''), 10);
        if (!isNaN(num)) newPitcher.pitchCount = num;
      } else if (field === 'pitchCount') {
        newPitcher.stat = String(value);
      }
      return { ...prev, pitcher: newPitcher };
    });
  };

  const updateLineupPlayer = (index: number, field: keyof Player, value: string) => {
    setDraft(prev => {
      const newLineup = [...prev.lineup];
      newLineup[index] = { ...newLineup[index], [field]: value };
      return { ...prev, lineup: newLineup };
    });
  };

  const updateBenchPlayer = (index: number, field: keyof Player, value: string) => {
    setDraft(prev => {
      const newBench = [...prev.bench];
      newBench[index] = { ...newBench[index], [field]: value };
      return { ...prev, bench: newBench };
    });
  };

  const addLineupPlayer = () => {
    setDraft(prev => ({
      ...prev,
      lineup: [...prev.lineup, { id: Math.random().toString(36).substr(2, 9), name: '', number: '', stat: '', position: '' }]
    }));
  };

  const addBenchPlayer = () => {
    setDraft(prev => ({
      ...prev,
      bench: [...prev.bench, { id: Math.random().toString(36).substr(2, 9), name: '', number: '', stat: '', position: '' }]
    }));
  };

  const removeLineupPlayer = (index: number) => {
    setDraft(prev => ({
      ...prev,
      lineup: prev.lineup.filter((_, i) => i !== index)
    }));
  };

  const removeBenchPlayer = (index: number) => {
    setDraft(prev => ({
      ...prev,
      bench: prev.bench.filter((_, i) => i !== index)
    }));
  };

  const moveToBench = (index: number) => {
    setDraft(prev => {
      const player = prev.lineup[index];
      return {
        ...prev,
        lineup: prev.lineup.filter((_, i) => i !== index),
        bench: [...prev.bench, player]
      };
    });
  };

  const moveToLineup = (index: number) => {
    setDraft(prev => {
      const player = prev.bench[index];
      return {
        ...prev,
        bench: prev.bench.filter((_, i) => i !== index),
        lineup: [...prev.lineup, { ...player, position: 'PH' }]
      };
    });
  };

  const setAsPitcher = (player: Player) => {
    setDraft(prev => ({
      ...prev,
      pitcher: { 
        ...prev.pitcher, 
        name: player.name, 
        number: player.number 
      }
    }));
  };

  const handleSubmit = () => {
    dispatch({ type: 'APPLY_TEAM_CONFIG', team: teamKey, config: draft });
    setIsSavedRecently(true);
    setTimeout(() => setIsSavedRecently(false), 2000);
  };

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
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeInLineupIdx = draft.lineup.findIndex(p => p.id === activeId);
    const activeInBenchIdx = draft.bench.findIndex(p => p.id === activeId);
    
    const overInLineupIdx = draft.lineup.findIndex(p => p.id === overId);
    const overInBenchIdx = draft.bench.findIndex(p => p.id === overId);

    if (activeInLineupIdx !== -1 && overInLineupIdx !== -1) {
      setDraft(prev => ({
        ...prev,
        lineup: arrayMove(prev.lineup, activeInLineupIdx, overInLineupIdx)
      }));
    } else if (activeInBenchIdx !== -1 && overInBenchIdx !== -1) {
      setDraft(prev => ({
        ...prev,
        bench: arrayMove(prev.bench, activeInBenchIdx, overInBenchIdx)
      }));
    }
  };

  return (
    <div 
      className={`p-3 rounded border min-w-0 overflow-hidden box-border ${teamKey === 'away' ? 'bg-blue-50/50 border-blue-200' : 'bg-red-50/50 border-red-200'}`}
    >
      <div className="flex flex-col gap-2 mb-2 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
           <div className="flex items-center gap-1 shrink-0">
             <div className="flex flex-col gap-1">
               <div className="flex items-center gap-1" title={language === 'en' ? 'Team Color' : language === 'zh' ? '隊伍色' : 'チーム色'}>
                 <input type="color" className="w-6 h-6 rounded cursor-pointer border-none p-0 shrink-0" value={draft.color} onChange={(e) => updateDraft('color', e.target.value)} />
                 <span className="text-[9px] text-gray-500 font-bold leading-none w-8">{language === 'en' ? 'TEAM' : language === 'zh' ? '隊伍' : 'チーム'}</span>
               </div>
               <div className="flex items-center gap-1" title={language === 'en' ? 'Base Color' : language === 'zh' ? '壘包色' : 'ベース色'}>
                 <input type="color" className="w-6 h-6 rounded cursor-pointer border-none p-0 shrink-0" value={draft.baseColor || '#facc15'} onChange={(e) => updateDraft('baseColor', e.target.value)} />
                 <span className="text-[9px] text-gray-500 font-bold leading-none w-8">{language === 'en' ? 'BASE' : language === 'zh' ? '壘包' : 'ベース'}</span>
               </div>
             </div>
             <label className="cursor-pointer bg-white border rounded p-1 hover:bg-gray-50 h-full flex items-center justify-center shrink-0" title="Upload Logo">
               {draft.logoUrl ? (
                 <img src={draft.logoUrl} alt="Logo" className={`w-4 h-4 ${draft.logoNoBorder ? 'object-contain' : 'object-cover rounded-full'}`} />
               ) : (
                 <ImageIcon size={16} className="text-gray-500" />
               )}
               <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
             </label>
           </div>
           
           <div className="flex flex-col gap-1 flex-1 min-w-[100px]">
               <div className="flex items-center justify-between border-2 border-slate-400 bg-white rounded text-black overflow-hidden shadow-sm">
                  <button className="px-2 py-1 hover:bg-gray-100 text-black font-bold border-r-2 border-slate-200 flex-1" onClick={() => dispatch({type: 'ADD_SCORE', team: teamKey, amount: -1})}>-</button>
                  <span className="font-mono font-bold text-black text-base min-w-[1.2rem] text-center px-1">{globalTeam.score}</span>
                  <button className="px-2 py-1 hover:bg-gray-100 text-black font-bold border-l-2 border-slate-200 flex-1" onClick={() => dispatch({type: 'ADD_SCORE', team: teamKey, amount: 1})}>+</button>
               </div>
               <div className="flex gap-1 w-full min-w-0">
                 <button 
                   onClick={() => {
                     if (confirm(language === 'en' ? 'Reset this team?' : language === 'zh' ? '確定要重置此隊伍的陣容與設定嗎？' : 'このチームのラインナップと設定をリセットしますか？')) {
                       dispatch({ type: 'RESET_TEAM', team: teamKey });
                     }
                   }} 
                   className="bg-red-600 hover:bg-red-700 text-white flex items-center justify-center py-1 px-1.5 rounded shadow shrink-0"
                   title={language === 'en' ? 'Reset Team' : language === 'zh' ? '重置隊伍' : 'チームリセット'}
                 >
                   <RotateCcw size={12} />
                 </button>
                 <button 
                   onClick={handleSubmit} 
                   className={`${isSavedRecently ? 'bg-emerald-500' : 'bg-green-600 hover:bg-green-700'} text-white text-[11px] font-bold py-1 px-1 rounded shadow flex-1 whitespace-nowrap overflow-hidden text-ellipsis text-center min-w-0 transition-colors active:scale-95`}
                 >
                   {isSavedRecently ? '已更新 ✓' : (language === 'en' ? 'Update Info' : language === 'zh' ? '更新資訊' : '情報更新')}
                 </button>
               </div>
           </div>
        </div>
        
        <div className="flex flex-col gap-1 min-w-0 w-full">
            <input 
              className="w-full border-2 border-slate-300 p-1.5 rounded text-sm font-bold text-black bg-white box-border min-w-0" 
              value={draft.name}
              onChange={(e) => updateDraft('name', e.target.value)}
              placeholder="Team (Abbr)"
            />
            {draft.logoUrl && (
              <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-700 select-none py-0.5">
                <input 
                  type="checkbox"
                  checked={Boolean(draft.logoNoBorder)}
                  onChange={(e) => updateDraft('logoNoBorder', e.target.checked)}
                  className="w-3.5 h-3.5 text-blue-600 rounded cursor-pointer"
                />
                <span>{language === 'zh' ? '無邊框與底色模式 (透明PNG)' : language === 'ja' ? '枠線・背景なし (透明PNG)' : 'No border mode (transparent PNG)'}</span>
              </label>
            )}
        </div>
      </div>
      
      {/* Pitcher Editor */}
      <div className="bg-orange-50/80 p-2.5 rounded border border-orange-200 mt-2 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-xs text-orange-800 flex items-center gap-1.5">
              <PenTool size={12}/> {language === 'zh' ? '當前投手' : language === 'en' ? 'Current Pitcher' : '現在の投手'}
            </h4>
          </div>
          <div className="flex flex-col gap-2 min-w-0 w-full">
              <div className="grid grid-cols-2 gap-2 w-full min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[11px] text-slate-600 font-semibold shrink-0 w-8 text-right">
                      {language === 'zh' ? '背號' : language === 'en' ? 'No.' : '背番号'}
                    </span>
                    <input 
                      className="flex-1 min-w-0 border rounded px-2 py-1 text-sm text-slate-900 bg-white font-medium text-center" 
                      value={draft.pitcher.number} 
                      onChange={(e) => updatePitcher('number', e.target.value)} 
                      placeholder="#" 
                      title={language === 'zh' ? '背號' : language === 'en' ? 'Number' : '背番号'} 
                    />
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[11px] text-slate-600 font-semibold shrink-0 w-8 text-right">
                      {language === 'zh' ? '球數' : language === 'en' ? 'Pitches' : '球数'}
                    </span>
                    <input 
                      className="flex-1 min-w-0 border rounded px-2 py-1 text-sm text-slate-900 bg-white font-medium text-center" 
                      value={draft.pitcher.stat} 
                      onChange={(e) => updatePitcher('stat', e.target.value)} 
                      placeholder="P: 0" 
                      title={language === 'zh' ? '投球數' : language === 'en' ? 'Pitch Count' : '投球数'} 
                    />
                  </div>
              </div>
              <div className="flex items-center gap-1.5 w-full min-w-0">
                <span className="text-[11px] text-slate-600 font-semibold shrink-0 w-8 text-right">
                  {language === 'zh' ? '姓名' : language === 'en' ? 'Name' : '名前'}
                </span>
                <input 
                  className="flex-1 min-w-0 border rounded px-2.5 py-1 text-sm text-slate-900 bg-white font-medium" 
                  value={draft.pitcher.name} 
                  onChange={(e) => updatePitcher('name', e.target.value)} 
                  placeholder={language === 'zh' ? '投手姓名' : language === 'en' ? 'Pitcher Name' : '投手名'} 
                  title={language === 'zh' ? '姓名' : language === 'en' ? 'Name' : '名前'} 
                />
              </div>
          </div>
      </div>

      {/* Lineup Editor */}
      <div className="bg-white rounded border shadow-sm mt-2 overflow-hidden">
        <div 
          onClick={() => setIsLineupOpen(prev => !prev)}
          className="flex justify-between items-center p-2.5 bg-slate-50/70 hover:bg-slate-100/70 cursor-pointer select-none border-b transition-colors"
        >
          <div className="flex items-center gap-2">
            {isLineupOpen ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
            <h4 className="font-bold text-xs sm:text-sm text-gray-700">{draft.name} 打線 (Lineup)</h4>
            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">{draft.lineup.length}</span>
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={addLineupPlayer} 
              className="text-xs flex items-center bg-blue-600 hover:bg-blue-700 text-white font-medium px-2 py-1 rounded shadow-sm transition-colors active:scale-95"
            >
              <Plus size={12} className="mr-1" /> 新增
            </button>
          </div>
        </div>
        {isLineupOpen && (
          <div className="p-2.5">
            <div className="text-[10px] text-gray-400 italic mb-1.5">拖曳左側圖示可重新排序</div>
            <DndContext 
              sensors={sensors} 
              collisionDetection={closestCenter} 
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <div className="space-y-1 max-h-48 overflow-y-auto overflow-x-auto pr-1">
                <SortableContext items={draft.lineup.map(p => p.id)} strategy={verticalListSortingStrategy}>
                  {draft.lineup.map((player, idx) => (
                    <SortablePlayerRow 
                      key={player.id}
                      player={player}
                      idx={idx}
                      isLineup={true}
                      isCurrentBatter={idx === globalTeam.currentBatterIndex && ((state.isTop && teamKey === 'away') || (!state.isTop && teamKey === 'home'))}
                      language={language as "en" | "zh" | "ja"}
                      onUpdate={(field, value) => updateLineupPlayer(idx, field, value)}
                      onMove={() => moveToBench(idx)}
                      onRemove={() => removeLineupPlayer(idx)}
                      onSetPitcher={() => setAsPitcher(player)}
                      selectedPosId={selectedPosId}
                      selectedPlayerId={selectedPlayerId}
                      onRowClick={handleRowClick}
                      onPosClick={handlePosClick}
                      onPosDoubleClick={handlePosDoubleClick}
                      onPosBlur={() => setEditingPosId(null)}
                      isPosEditing={editingPosId === player.id}
                    />
                  ))}
                </SortableContext>
              </div>
            </DndContext>
          </div>
        )}
      </div>

      {/* Bench Editor */}
      <div className="bg-slate-50 rounded border shadow-sm mt-2 overflow-hidden">
        <div 
          onClick={() => setIsBenchOpen(prev => !prev)}
          className="flex justify-between items-center p-2.5 bg-slate-100/80 hover:bg-slate-200/60 cursor-pointer select-none border-b transition-colors"
        >
          <div className="flex items-center gap-2">
            {isBenchOpen ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
            <h4 className="font-bold text-xs sm:text-sm text-slate-700">{draft.name} 板凳 (Bench)</h4>
            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full font-bold">{draft.bench.length}</span>
          </div>
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={addBenchPlayer} 
              className="text-xs flex items-center bg-slate-600 hover:bg-slate-700 text-white font-medium px-2 py-1 rounded shadow-sm transition-colors active:scale-95"
            >
              <Plus size={12} className="mr-1" /> 新增
            </button>
          </div>
        </div>
        {isBenchOpen && (
          <div className="p-2.5">
            <DndContext 
              sensors={sensors} 
              collisionDetection={closestCenter} 
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <div className="space-y-1 max-h-40 overflow-y-auto overflow-x-auto pr-1">
                <SortableContext items={draft.bench.map(p => p.id)} strategy={verticalListSortingStrategy}>
                  {draft.bench.map((player, idx) => (
                    <SortablePlayerRow 
                      key={player.id}
                      player={player}
                      idx={idx}
                      isLineup={false}
                      isCurrentBatter={false}
                      language={language as "en" | "zh" | "ja"}
                      onUpdate={(field, value) => updateBenchPlayer(idx, field, value)}
                      onMove={() => moveToLineup(idx)}
                      onRemove={() => removeBenchPlayer(idx)}
                      onSetPitcher={() => setAsPitcher(player)}
                      selectedPosId={selectedPosId}
                      selectedPlayerId={selectedPlayerId}
                      onRowClick={handleRowClick}
                      onPosClick={handlePosClick}
                      onPosDoubleClick={handlePosDoubleClick}
                      onPosBlur={() => setEditingPosId(null)}
                      isPosEditing={editingPosId === player.id}
                    />
                  ))}
                </SortableContext>
                {draft.bench.length === 0 && <div className="text-center text-slate-400 text-[10px] py-2">板凳區目前沒有球員</div>}
              </div>
            </DndContext>
          </div>
        )}
      </div>

      {/* Paste Import Button below Bench */}
      <div className="mt-2">
        <button 
          onClick={() => setImportModalOpen(true)}
          className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded shadow flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <PenTool size={14} />
          {language === 'en' ? 'Paste Import Lineup' : language === 'zh' ? '貼上匯入' : '貼付インポート'}
        </button>
      </div>

      <LineupImportModal 
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        language={language}
        currentPlayers={draft.lineup}
        onImport={(newLineup, newBench, newPitcher) => {
          const updatedBench = newBench !== undefined ? newBench : draft.bench;
          const newDraft = { 
            ...draft, 
            lineup: newLineup, 
            bench: updatedBench,
            ...(newPitcher ? { pitcher: newPitcher } : {})
          };
          setDraft(newDraft);
          dispatch({ type: 'APPLY_TEAM_CONFIG', team: teamKey, config: newDraft });
        }}
      />

      <ImageCropperModal
        isOpen={cropModalOpen}
        imageSrc={tempImageSrc}
        initialNoBorder={draft.logoNoBorder}
        onClose={() => {
          setCropModalOpen(false);
          setTempImageSrc('');
        }}
        onCropComplete={handleCropComplete}
        language={language as "en" | "zh" | "ja"}
      />
    </div>
  );
};

export const ScoreboardControls: React.FC<ControlsProps> = ({ state, dispatch, language = 'zh', onOpenRecordModal }) => {
  const [activeTab, setActiveTab] = useState<'controls' | 'info'>('controls');
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [isFontSizesOpen, setIsFontSizesOpen] = useState(true);
  const [isDimensionsOpen, setIsDimensionsOpen] = useState(false);
  const [isGameInfoOpen, setIsGameInfoOpen] = useState(false);
  const [isWalkModalOpen, setIsWalkModalOpen] = useState(false);
  const [isOutModalOpen, setIsOutModalOpen] = useState(false);
  const [isWpPbModalOpen, setIsWpPbModalOpen] = useState(false);

  const [pitcherSubModalState, setPitcherSubModalState] = useState<{
    isOpen: boolean;
    benchIndex: number;
    teamKey: 'home' | 'away';
    teamName: string;
    incomingPitcher: Player | null;
    candidates: PitcherCandidate[];
  }>({
    isOpen: false,
    benchIndex: -1,
    teamKey: 'home',
    teamName: '',
    incomingPitcher: null,
    candidates: []
  });

  const [hrState, setHrState] = React.useState<'idle' | 'playing' | 'locked' | 'exiting'>('idle');
  const hrTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const hrLockTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const hrBubbleIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const activeBatterTeam = state.isTop ? 'away' : 'home';
  const activePitcherTeam = state.isTop ? 'home' : 'away';
  const activeBatterTeamObj = state.isTop ? state.awayTeam : state.homeTeam;
  const activePitcherTeamObj = state.isTop ? state.homeTeam : state.awayTeam;
  
  const activeBatter = activeBatterTeamObj.lineup[activeBatterTeamObj.currentBatterIndex] || null;
  const activePitcher = activePitcherTeamObj.pitcher;
  const activeCatcher = activePitcherTeamObj.lineup.find(p => p.position === 'C' || p.position === '捕手' || p.position === '2') || { name: '捕手', number: '' };

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

  React.useEffect(() => {
     if (!state.animation && hrState !== 'idle') {
         setHrState('idle');
         if (hrTimeoutRef.current) clearTimeout(hrTimeoutRef.current);
         if (hrBubbleIntervalRef.current) clearInterval(hrBubbleIntervalRef.current);
     }
  }, [state.animation, hrState]);

  const endHr = (immediate: boolean = false) => {
    if (hrLockTimeoutRef.current) {
        clearTimeout(hrLockTimeoutRef.current);
        hrLockTimeoutRef.current = null;
    }
    if (hrTimeoutRef.current) clearTimeout(hrTimeoutRef.current);
    if (hrBubbleIntervalRef.current) clearInterval(hrBubbleIntervalRef.current);
    if (immediate) {
        setHrState('idle');
        dispatch({ type: 'SET_ANIMATION', animation: null });
    } else {
        setHrState('exiting');
        dispatch({ type: 'EXIT_HR_ANIMATION' });
        hrTimeoutRef.current = setTimeout(() => {
            setHrState('idle');
            dispatch({ type: 'SET_ANIMATION', animation: null });
        }, 500);
    }
  };

  const handleHrMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (hrState === 'locked') {
       endHr(false);
       return;
    }
    if (hrState === 'exiting') {
       return;
    }
    if (hrState === 'playing') {
       hrLockTimeoutRef.current = setTimeout(() => {
           setHrState('locked');
           dispatch({ type: 'LOCK_HR_ANIMATION' });
           if (hrTimeoutRef.current) clearTimeout(hrTimeoutRef.current);
           hrBubbleIntervalRef.current = setInterval(() => {
               dispatch({ type: 'TRIGGER_HR_BUBBLE' });
           }, 3000);
       }, 500);
       return;
    }

    setHrState('playing');
    const team = state.isTop ? state.awayTeam : state.homeTeam;
    const batter = team.lineup[team.currentBatterIndex];
    const playerName = batter ? (batter.number ? `${batter.name} #${batter.number}` : batter.name) : (language === 'zh' ? '未知打者' : 'Unknown Batter');
    const runnersOnBase = state.bases.filter(Boolean).length;
    let animationType: 'homerun' | '2-run-homer' | '3-run-homer' | 'grand-slam' = 'homerun';
    if (runnersOnBase === 1) animationType = '2-run-homer';
    else if (runnersOnBase === 2) animationType = '3-run-homer';
    else if (runnersOnBase === 3) animationType = 'grand-slam';
    
    dispatch({ 
      type: 'SET_ANIMATION', 
      animation: {
        type: animationType,
        playerName,
        teamName: team.name,
        teamColor: team.color
      }
    });
    dispatch({ type: 'HOME_RUN' });

    hrLockTimeoutRef.current = setTimeout(() => {
        setHrState('locked');
        dispatch({ type: 'LOCK_HR_ANIMATION' });
        if (hrTimeoutRef.current) clearTimeout(hrTimeoutRef.current);
        hrBubbleIntervalRef.current = setInterval(() => {
            dispatch({ type: 'TRIGGER_HR_BUBBLE' });
        }, 3000);
    }, 500);

    hrTimeoutRef.current = setTimeout(() => {
        setHrState('idle');
        dispatch({ type: 'SET_ANIMATION', animation: null });
    }, 5000);
  };

  const handleHrMouseUp = () => {
    if (hrLockTimeoutRef.current) {
        clearTimeout(hrLockTimeoutRef.current);
        hrLockTimeoutRef.current = null;
    }
  };

  const handleHrDoubleClick = () => {
     endHr(true);
  };

  const handleConfirmWalk = (walkType: '四球' | '四壞' | '觸身' | '不死三振' | '敬遠' | 'K+WP' | 'K+PB' | '失誤') => {
    if (walkType === '不死三振' || walkType === 'K+WP' || walkType === 'K+PB') {
      dispatch({ type: 'WALK', walkType });
      dispatch({ type: 'TRIGGER_K' });
    } else {
      dispatch({ type: 'WALK', walkType });
    }
    setIsWalkModalOpen(false);
  };

  const handleConfirmOut = (outType: '高飛' | '滾地' | '野選' | '雙殺' | '三振' | '出局' | '高飛犧牲打' | '犧牲短打') => {
    if (outType === '高飛犧牲打' && state.outs < 2) {
      dispatch({ type: 'SAC_FLY' });
    } else if (outType === '犧牲短打' && state.outs < 2) {
      dispatch({ type: 'SAC_BUNT' });
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

  const handleSubstitutePitcher = (benchIndex: number) => {
    const benchPlayer = activePitcherTeamObj.bench[benchIndex];
    if (!benchPlayer) return;

    // Check if there are pitchers in the batting lineup of this team
    const isPitcher = (p: Player) => {
      const pos = (p.position || '').trim().toUpperCase();
      const isPosP = pos === 'P' || pos === '1' || pos === '投手' || pos === '投';
      const matchesCurrentPitcher = Boolean(
        (activePitcherTeamObj.pitcher?.id && p.id && p.id === activePitcherTeamObj.pitcher.id) ||
        (activePitcherTeamObj.pitcher?.name && p.name && p.name.trim() === activePitcherTeamObj.pitcher.name.trim() && p.name.trim() !== '---')
      );
      return isPosP || matchesCurrentPitcher;
    };

    const candidates: PitcherCandidate[] = activePitcherTeamObj.lineup
      .map((player, index) => ({ player, index }))
      .filter(({ player }) => isPitcher(player));

    if (candidates.length > 0) {
      setPitcherSubModalState({
        isOpen: true,
        benchIndex,
        teamKey: activePitcherTeam,
        teamName: activePitcherTeamObj.name,
        incomingPitcher: benchPlayer,
        candidates
      });
    } else {
      dispatch({
        type: 'SUBSTITUTE_PITCHER',
        team: activePitcherTeam,
        benchIndex
      });
    }
  };

  const handleConfirmPitcherSub = (lineupIndex: number | undefined) => {
    dispatch({
      type: 'SUBSTITUTE_PITCHER',
      team: pitcherSubModalState.teamKey,
      benchIndex: pitcherSubModalState.benchIndex,
      lineupIndex
    });
    setPitcherSubModalState(prev => ({ ...prev, isOpen: false }));
  };

  const handleSubstituteBatter = (benchIndex: number) => {
    const benchPlayer = activeBatterTeamObj.bench[benchIndex];
    if (!benchPlayer) return;
    dispatch({
      type: 'SWAP_LINEUP_BENCH',
      team: activeBatterTeam,
      lineupIndex: activeBatterTeamObj.currentBatterIndex,
      benchIndex
    });
  };

  const updatePitch = (field: keyof PitchInfo, value: string) => {
    dispatch({ type: 'UPDATE_PITCH', field, value });
  };
  
  const updateMeta = (field: keyof GameMeta, value: any) => {
    dispatch({ type: 'UPDATE_META', field, value });
  };



  return (
    <div className="flex flex-col min-h-full h-full bg-gray-100 relative overflow-hidden">
      <div className="flex border-b border-gray-300 bg-white shrink-0">
        <button
          className={`flex-1 py-3 text-sm font-bold uppercase transition-colors ${activeTab === 'controls' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
          onClick={() => setActiveTab('controls')}
        >
          {language === 'en' ? 'Game Controls' : language === 'zh' ? '控制台' : 'コントロール'}
        </button>
        <button
          className={`flex-1 py-3 text-sm font-bold uppercase transition-colors ${activeTab === 'info' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
          onClick={() => setActiveTab('info')}
        >
          {language === 'en' ? 'Teams & Info' : language === 'zh' ? '比賽資訊與名單' : '試合情報と名簿'}
        </button>
        {onOpenRecordModal && (
          <button
            className="py-3 px-3.5 text-sm font-bold uppercase text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center gap-1.5 shrink-0 border-l border-gray-200 cursor-pointer"
            onClick={onOpenRecordModal}
            title={language === 'zh' ? '攻守紀錄表與歷史存檔管理' : 'Game Records & Box Score'}
          >
            <FileSpreadsheet size={16} />
            <span className="hidden sm:inline">{language === 'en' ? 'Records' : language === 'zh' ? '紀錄表' : '記録表'}</span>
          </button>
        )}
      </div>

      <div className="p-4 flex-1 min-h-0 overflow-y-auto overscroll-contain touch-auto">
        <div className="grid grid-cols-1 gap-6">
        
        {activeTab === 'controls' && (
          <div className="flex flex-col gap-6">
            {/* Game State Actions */}
          <div className="space-y-3">
            <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide border-b pb-1">
              {language === 'en' ? 'Umpire Controls' : language === 'zh' ? 'Umpire Controls 裁判控制' : '審判コントロール'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            
            {/* Left Column (Count Controls) */}
            <div className="flex flex-col gap-2 h-full">
              <div className="flex flex-1 min-h-[44px]">
                <button 
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-2 rounded-l shadow flex-1 flex flex-col items-center justify-center transition-transform active:scale-95"
                  onClick={() => dispatch({ type: 'INCREMENT_BALL' })}
                  onContextMenu={(e) => { e.preventDefault(); dispatch({ type: 'DECREMENT_BALL' }); }}
                >
                  <span className="text-lg">{language === 'ja' ? 'ボール' : language === 'zh' ? '壞球' : 'BALL'}</span>
                </button>
                <button 
                  className="bg-green-700 hover:bg-green-800 text-white font-bold px-4 rounded-r shadow flex items-center justify-center transition-transform active:scale-95 border-l border-green-800 text-xl"
                  onClick={() => dispatch({ type: 'DECREMENT_BALL' })}
                  title={language === 'en' ? 'Decrease Ball' : language === 'zh' ? '減少壞球' : 'ボール-1'}
                >
                  -
                </button>
              </div>
              <div className="flex flex-1 min-h-[44px]">
                <button 
                  className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-2 rounded-l shadow flex-1 flex flex-col items-center justify-center transition-transform active:scale-95"
                  onClick={() => dispatch({ type: 'INCREMENT_STRIKE' })}
                  onContextMenu={(e) => { e.preventDefault(); dispatch({ type: 'DECREMENT_STRIKE' }); }}
                >
                  <span className="text-lg">{language === 'ja' ? 'ストライク' : language === 'zh' ? '好球' : 'STRIKE'}</span>
                </button>
                <button 
                  className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold px-4 rounded-r shadow flex items-center justify-center transition-transform active:scale-95 border-l border-yellow-700 text-xl"
                  onClick={() => dispatch({ type: 'DECREMENT_STRIKE' })}
                  title={language === 'en' ? 'Decrease Strike' : language === 'zh' ? '減少好球' : 'ストライク-1'}
                >
                  -
                </button>
              </div>
              <div className="flex flex-1 min-h-[44px]">
                <button 
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-2 rounded-l shadow flex-1 flex flex-col items-center justify-center transition-transform active:scale-95"
                  onClick={() => {
                    dispatch({ type: 'INCREMENT_OUT' });
                    dispatch({ type: 'INCREMENT_PLAYER_STAT', role: 'pitcher' });
                  }}
                  onContextMenu={(e) => { e.preventDefault(); dispatch({ type: 'DECREMENT_OUT' }); }}
                >
                  <span className="text-lg">{language === 'ja' ? 'アウト' : language === 'zh' ? '出局' : 'OUT'}</span>
                </button>
                <button 
                  className="bg-red-700 hover:bg-red-800 text-white font-bold px-4 rounded-r shadow flex items-center justify-center transition-transform active:scale-95 border-l border-red-800 text-xl"
                  onClick={() => dispatch({ type: 'DECREMENT_OUT' })}
                  title={language === 'en' ? 'Decrease Out' : language === 'zh' ? '減少出局' : 'アウト-1'}
                >
                  -
                </button>
              </div>
              <button 
                className="w-full flex-1 min-h-[44px] bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 rounded shadow transition-transform active:scale-95 text-lg"
                onClick={() => dispatch({ type: 'RESET_COUNT' })}
              >
                {language === 'en' ? 'Reset Count' : language === 'zh' ? '重置好壞球' : 'カウントリセット'}
              </button>
              
              <div className="flex gap-2 w-full flex-1 min-h-[44px]">
                <button
                  className="flex-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-semibold py-2 rounded text-xs flex items-center justify-center gap-2 border border-indigo-200 transition-transform active:scale-95"
                  onClick={() => dispatch({ type: 'PREVIOUS_BATTER' })}
                >
                  <User size={14} /> {language === 'en' ? 'Previous Batter' : language === 'zh' ? '上一位打者' : '前の打者へ'}
                </button>
                <button
                  className="flex-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-semibold py-2 rounded text-xs flex items-center justify-center gap-2 border border-indigo-200 transition-transform active:scale-95"
                  onClick={() => dispatch({ type: 'NEXT_BATTER' })}
                >
                  <User size={14} /> {language === 'en' ? 'Next Batter' : language === 'zh' ? '下一位打者' : '次の打者へ'}
                </button>
              </div>

              {/* HR & Undo */}
              <div className="flex gap-4 pt-2 items-stretch h-[60px] shrink-0">
                <div className="flex-1 flex justify-center items-center">
                  <div className="relative w-14 h-14 shrink-0 group">
                    {hrState === 'playing' && (
                        <svg className="absolute inset-[-4px] w-[64px] h-[64px] -rotate-90 pointer-events-none rounded-full" style={{ zIndex: 10 }}>
                            <circle cx="32" cy="32" r="30" stroke="transparent" strokeWidth="4" fill="none" />
                            <circle cx="32" cy="32" r="30" stroke="#a855f7" strokeWidth="4" fill="none" strokeDasharray="188.5" style={{ animation: 'hrProgressSvg 5s linear forwards' }} />
                        </svg>
                    )}
                    {hrState === 'locked' && (
                        <div className="absolute inset-[-4px] rounded-full border-4 border-purple-500 shadow-[0_0_10px_#a855f7]" style={{ zIndex: 10, pointerEvents: 'none' }} />
                    )}
                    <button
                        className={`absolute inset-0 bg-purple-600 hover:bg-purple-700 text-white font-black text-lg rounded-full shadow-lg transition-transform active:scale-95 flex items-center justify-center border-4 border-transparent ${hrState !== 'idle' ? 'animate-pulse' : ''}`}
                      onMouseDown={handleHrMouseDown}
                      onMouseUp={handleHrMouseUp}
                      onMouseLeave={handleHrMouseUp}
                      onTouchStart={handleHrMouseDown}
                      onTouchEnd={handleHrMouseUp}
                      onDoubleClick={handleHrDoubleClick}
                      title="HOME RUN (Hold to lock)"
                    >
                      HR
                    </button>
                  </div>
                </div>
                <div className="flex-1 flex">
                  <button 
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded text-xs shadow-md flex items-center justify-center gap-1 transition-transform active:scale-95"
                    onClick={() => dispatch({ type: 'UNDO' })}
                    title={language === 'en' ? 'Undo (Ctrl+Z)' : language === 'zh' ? '復原 (Ctrl+Z)' : '元に戻す (Ctrl+Z)'}
                  >
                    <RotateCcw size={14} /> {language === 'en' ? 'Undo' : language === 'zh' ? '復原' : '元に戻す'}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column (Event Controls) */}
            <div className="flex flex-col gap-2 h-full">
              <button 
                className="w-full flex-1 min-h-[44px] bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded shadow transition-transform active:scale-95 text-sm text-center"
                onClick={() => setIsOutModalOpen(true)}
              >
                {language === 'en' ? 'Batter Out' : language === 'zh' ? '打者出局' : '打者アウト'}
              </button>
              <button 
                className="w-full flex-1 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded shadow transition-transform active:scale-95 text-sm text-center"
                onClick={() => dispatch({ type: 'SINGLE' })}
              >
                {language === 'en' ? '1B / Single' : language === 'zh' ? '一壘安' : 'シングル (1B)'}
              </button>
              <button 
                className="w-full flex-1 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded shadow transition-transform active:scale-95 text-sm text-center"
                onClick={() => dispatch({ type: 'DOUBLE' })}
              >
                {language === 'en' ? '2B / Double' : language === 'zh' ? '二壘安' : 'ツーベース (2B)'}
              </button>
              <button 
                className="w-full flex-1 min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded shadow transition-transform active:scale-95 text-sm text-center"
                onClick={() => dispatch({ type: 'TRIPLE' })}
              >
                {language === 'en' ? '3B / Triple' : language === 'zh' ? '三壘安' : 'スリーベース (3B)'}
              </button>
              <div className="flex gap-2 w-full flex-1 min-h-[44px]">
                <button 
                  className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded shadow transition-transform active:scale-95 text-sm"
                  onClick={() => setIsWalkModalOpen(true)}
                >
                  {language === 'en' ? 'On-Base' : language === 'zh' ? '上壘' : '出塁'}
                </button>
                <button 
                  className="flex-[1] bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 rounded text-sm shadow-md transition-transform active:scale-95"
                  onClick={() => setIsWpPbModalOpen(true)}
                  title={language === 'en' ? 'Wild Pitch / Passed Ball' : language === 'zh' ? '暴投 / 捕逸' : '暴投 / 捕逸'}
                >
                  {language === 'en' ? 'WP / PB' : language === 'zh' ? '暴投/捕逸' : '暴投/捕逸'}
                </button>
              </div>
              
              {/* Pitch +/- & Inning */}
              <div className="flex gap-2 pt-2 items-stretch h-[60px] shrink-0">
                <div className="flex flex-col gap-1 flex-1">
                  <button 
                    className="flex-1 bg-slate-500 hover:bg-slate-600 text-white rounded text-xs font-bold shadow-sm transition-transform active:scale-95"
                    onClick={() => dispatch({ type: 'INCREMENT_PLAYER_STAT', role: 'pitcher' })}
                  >
                    {language === 'en' ? 'Pitch +1' : language === 'zh' ? '用球數+1' : '球数+1'}
                  </button>
                  <button 
                    className="flex-1 bg-slate-500 hover:bg-slate-600 text-white rounded text-xs font-bold shadow-sm transition-transform active:scale-95"
                    onClick={() => dispatch({ type: 'DECREMENT_PLAYER_STAT', role: 'pitcher' })}
                  >
                    {language === 'en' ? 'Pitch -1' : language === 'zh' ? '用球數-1' : '球数-1'}
                  </button>
                </div>
                <div className="flex-1 flex items-center gap-1 bg-white border rounded px-1.5 shrink-0">
                   <span className="text-xs font-bold text-gray-500 shrink-0">INN:</span>
                   <input 
                      type="number" 
                      className="w-8 text-center font-bold border-none outline-none text-slate-900 bg-white"
                      value={state.inning}
                      onChange={(e) => dispatch({type: 'SET_INNING', value: parseInt(e.target.value) || 1})}
                    />
                    <button 
                      className="ml-auto bg-blue-800 hover:bg-blue-900 text-white font-bold px-2 py-1.5 rounded text-[10px] transition-transform active:scale-95"
                      onClick={() => dispatch({ type: 'NEXT_INNING' })}
                      title="Next Inning (Top/Bottom)"
                    >
                      {language === 'en' ? 'Next' : language === 'zh' ? '換局' : '次へ'}
                    </button>
                </div>
              </div>
            </div>
          </div>

            {/* Current Matchup Duel & Substitutions Card (Moved below HR and Pitch Count) */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-3.5 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                  <span>{language === 'zh' ? '現正投打對決' : language === 'ja' ? '現在の対決' : 'Current Matchup'}</span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {/* Pitcher Card */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-gray-600 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: activePitcherTeamObj.color }} />
                      <span className="truncate">{activePitcherTeamObj.name} {language === 'zh' ? '投手' : language === 'ja' ? '投手' : 'Pitcher'}</span>
                    </span>
                    <span className="text-[10px] bg-gray-200 text-gray-800 font-mono font-bold px-1.5 py-0.5 rounded shrink-0 flex items-center gap-1">
                      {language === 'zh' ? '用球' : language === 'ja' ? '球数' : 'PC'}: 
                      <input
                        type="number"
                        min="0"
                        className="w-10 bg-white border border-gray-300 rounded text-center text-xs font-bold text-slate-900 px-0.5 outline-none focus:border-blue-500"
                        value={getPitcherCount(activePitcher)}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) {
                            dispatch({ type: 'SET_PITCH_COUNT', team: activePitcherTeam, value: val });
                          }
                        }}
                      />
                    </span>
                  </div>
                  <div className="font-bold text-gray-900 text-sm truncate my-0.5">
                    {activePitcher?.name || '---'} {activePitcher?.number ? `#${activePitcher.number}` : ''}
                  </div>
                  {/* Bench Substitution */}
                  <select
                    className="w-full bg-white border border-gray-300 text-gray-700 text-xs rounded px-2 py-1 mt-1 outline-none cursor-pointer hover:border-gray-400"
                    onChange={(e) => {
                      if (e.target.value !== '') {
                        handleSubstitutePitcher(parseInt(e.target.value, 10));
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>{language === 'zh' ? '換投手 (選板凳)' : language === 'ja' ? '投手交代 (ベンチ)' : 'Change Pitcher (Bench)'}</option>
                    {activePitcherTeamObj.bench.map((p, idx) => (
                      <option key={p.id || idx} value={idx}>
                        #{p.number} {p.name} ({p.position || 'P'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Batter Card */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-gray-600 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: activeBatterTeamObj.color }} />
                      <span className="truncate">{activeBatterTeamObj.name} {language === 'zh' ? `第${activeBatterTeamObj.currentBatterIndex + 1}棒` : language === 'ja' ? `${activeBatterTeamObj.currentBatterIndex + 1}番打者` : `#${activeBatterTeamObj.currentBatterIndex + 1} Batter`}</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono font-bold px-1.5 py-0.5 rounded" title="得分 (Runs)">
                        R: {activeBatter?.runs || 0}
                      </span>
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-mono font-bold px-1.5 py-0.5 rounded" title="打點 (RBI)">
                        RBI: {activeBatter?.rbi || 0}
                      </span>
                    </div>
                  </div>
                  <div className="font-bold text-gray-900 text-sm truncate my-0.5">
                    {activeBatter?.name || '---'} {activeBatter?.number ? `#${activeBatter.number}` : ''}
                  </div>
                  {/* Bench Substitution */}
                  <select
                    className="w-full bg-white border border-gray-300 text-gray-700 text-xs rounded px-2 py-1 mt-1 outline-none cursor-pointer hover:border-gray-400"
                    onChange={(e) => {
                      if (e.target.value !== '') {
                        handleSubstituteBatter(parseInt(e.target.value, 10));
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>{language === 'zh' ? '代打/代跑 (選板凳)' : language === 'ja' ? '代打/代走 (ベンチ)' : 'Pinch Hit/Run (Bench)'}</option>
                    {activeBatterTeamObj.bench.map((p, idx) => (
                      <option key={p.id || idx} value={idx}>
                        #{p.number} {p.name} ({p.position || 'BN'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

      {/* Settings & Timer */}
          <div className="space-y-3">
             <button
               type="button"
               onClick={() => setIsSettingsOpen(prev => !prev)}
               className="w-full flex items-center justify-between border-b pb-1.5 cursor-pointer select-none text-left hover:text-blue-600 transition-colors"
             >
               <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide flex items-center gap-1.5">
                 <Settings size={14} className="text-gray-500" />
                 {language === 'en' ? 'Settings & Timer' : language === 'zh' ? 'Settings & Timer 設定與計時器' : '設定とタイマー'}
               </h3>
               <div className="flex items-center gap-1 text-gray-400">
                 <span className="text-[10px] text-slate-400 font-normal">
                   {isSettingsOpen ? (language === 'zh' ? '收合' : 'Collapse') : (language === 'zh' ? '展開' : 'Expand')}
                 </span>
                 {isSettingsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
               </div>
             </button>

             {isSettingsOpen && (
               <div className="space-y-3">
             
             {/* Timer Controls */}
             <div className="bg-white p-2 rounded border shadow-sm flex flex-col space-y-2">
               <div className="flex justify-between items-center">
                 <label className="block text-xs text-gray-500 font-bold">{language === 'en' ? 'PITCH TIMER (Long Press Display to Reset)' : language === 'zh' ? 'PITCH TIMER 投球計時器 (長按重置)' : 'ピッチクロック (長押しでリセット)'}</label>
               </div>
               <div className="flex items-center space-x-2">
                  <input 
                    type="number" 
                    className="border p-1 rounded w-16 text-lg font-mono text-slate-900 bg-white"
                    value={state.timer}
                    onChange={(e) => dispatch({type: 'SET_TIMER', value: parseInt(e.target.value) || 0})}
                  />
                  <button 
                    className={`flex-1 p-2 rounded text-white flex items-center justify-center font-bold gap-2 ${state.isTimerRunning ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                    onClick={() => dispatch({type: 'TOGGLE_TIMER'})}
                    title={state.isTimerRunning ? "Pause" : "Start"}
                  >
                    {state.isTimerRunning ? <Pause size={16} /> : <Play size={16} />}
                    {state.isTimerRunning ? "STOP" : "START"}
                  </button>
                  <button 
                     className="p-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 flex-shrink-0"
                     onClick={() => dispatch({type: 'RESET_TIMER'})}
                     title="Reset Timer"
                  >
                    <RotateCcw size={16} />
                  </button>
                  <button 
                    className={`p-2 rounded flex items-center justify-center border transition-colors flex-shrink-0 ${state.showTimer ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-gray-300 text-gray-500'}`}
                    onClick={() => dispatch({type: 'TOGGLE_VISIBILITY', field: 'showTimer'})}
                    title={language === 'en' ? 'Hide Timer' : language === 'zh' ? '隱藏計時器' : 'タイマー非表示'}
                  >
                    {state.showTimer ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
               </div>
             </div>

             {/* Toggles */}
             <div className="grid grid-cols-1 gap-2">
                 {/* Display Mode Toggle */}
                 <div className={language === 'ja' ? "grid grid-cols-2 gap-1" : "flex space-x-1"}>
                   <button 
                    className={`flex-1 flex items-center justify-center space-x-1 px-2 py-2 rounded border text-xs transition-colors ${state.displayMode === 'default' ? 'bg-blue-100 border-blue-300 text-blue-800 font-bold' : 'bg-white border-gray-300 text-gray-500'}`}
                    onClick={() => dispatch({type: 'SET_DISPLAY_MODE', mode: 'default'})}
                  >
                     <LayoutTemplate size={12} />
                     <span>{language === 'en' ? 'Default' : language === 'zh' ? '預設' : '基本'}</span>
                  </button>
                  <button 
                    className={`flex-1 flex items-center justify-center space-x-1 px-2 py-2 rounded border text-xs transition-colors ${state.displayMode === 'lineup' ? 'bg-purple-100 border-purple-300 text-purple-800 font-bold' : 'bg-white border-gray-300 text-gray-500'}`}
                    onClick={() => dispatch({type: 'SET_DISPLAY_MODE', mode: 'lineup'})}
                  >
                     <User size={12} />
                     <span>{language === 'en' ? 'Lineup' : language === 'zh' ? '打線' : '打順'}</span>
                  </button>
                  <button 
                    className={`flex-1 flex items-center justify-center space-x-1 px-2 py-2 rounded border text-xs transition-colors ${state.displayMode === 'rhe' ? 'bg-emerald-100 border-emerald-300 text-emerald-800 font-bold' : 'bg-white border-gray-300 text-gray-500'}`}
                    onClick={() => dispatch({type: 'SET_DISPLAY_MODE', mode: 'rhe'})}
                  >
                     <Square size={12} />
                     <span>{language === 'en' ? 'RHE' : language === 'zh' ? '局間' : 'RHE'}</span>
                  </button>
                  <button 
                    className={`flex-1 flex items-center justify-center space-x-1 px-2 py-2 rounded border text-xs transition-colors ${state.displayMode === 'broadcast' ? 'bg-orange-100 border-orange-300 text-orange-800 font-bold' : 'bg-white border-gray-300 text-gray-500'}`}
                    onClick={() => dispatch({type: 'SET_DISPLAY_MODE', mode: 'broadcast'})}
                  >
                     <Tv size={12} />
                     <span>{language === 'en' ? 'Broadcast' : language === 'zh' ? '轉播' : '配信'}</span>
                  </button>
                 </div>

                {/* Show/Hide Player Stat Toggle */}
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    className={`flex items-center justify-center space-x-2 px-3 py-2 rounded border text-sm transition-colors ${state.showPlayerStat ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-gray-300 text-gray-500'}`}
                    onClick={() => dispatch({type: 'TOGGLE_VISIBILITY', field: 'showPlayerStat'})}
                  >
                     {state.showPlayerStat ? <Eye size={14} /> : <EyeOff size={14} />}
                     <span>{language === 'en' ? 'Hide Stats' : language === 'zh' ? '隱藏數據' : '成績非表示'}</span>
                  </button>
                  <button 
                    className={`flex items-center justify-center space-x-2 px-3 py-2 rounded border text-sm transition-colors ${state.showCount ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-gray-300 text-gray-500'}`}
                    onClick={() => dispatch({type: 'TOGGLE_VISIBILITY', field: 'showCount'})}
                  >
                     {state.showCount ? <Eye size={14} /> : <EyeOff size={14} />}
                     <span>{language === 'en' ? 'Hide Pitch Count' : language === 'zh' ? '隱藏投球數' : '球数非表示'}</span>
                  </button>
                  <button 
                    className={`flex items-center justify-center space-x-2 px-3 py-2 rounded border text-sm transition-colors ${state.showBatterInfo ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-gray-300 text-gray-500'}`}
                    onClick={() => dispatch({type: 'TOGGLE_VISIBILITY', field: 'showBatterInfo'})}
                  >
                     {state.showBatterInfo ? <Eye size={14} /> : <EyeOff size={14} />}
                     <span>{language === 'en' ? 'Hide Batter' : language === 'zh' ? '隱藏打者' : '打者非表示'}</span>
                  </button>
                  <button 
                    className={`flex items-center justify-center space-x-2 px-3 py-2 rounded border text-sm transition-colors ${state.showPitcherInfo ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-gray-300 text-gray-500'}`}
                    onClick={() => dispatch({type: 'TOGGLE_VISIBILITY', field: 'showPitcherInfo'})}
                  >
                     {state.showPitcherInfo ? <Eye size={14} /> : <EyeOff size={14} />}
                     <span>{language === 'en' ? 'Hide Pitcher' : language === 'zh' ? '隱藏投手' : '投手非表示'}</span>
                  </button>
                </div>
             </div>
             
             <div className="mt-4 pt-4 border-t w-full">
               <h4 className="font-semibold text-gray-600 text-xs uppercase mb-2">{language === 'en' ? 'Broadcast Mode Settings' : language === 'zh' ? '轉播模式設定' : '配信モード設定'}</h4>
               <div className="flex items-center gap-2 flex-wrap">
                 <button
                   onClick={() => dispatch({ type: 'TOGGLE_ADJUSTMENT_MODE' })}
                   className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors ${
                     state.isAdjustmentMode 
                       ? 'bg-blue-600 text-white shadow-inner' 
                       : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                   }`}
                 >
                   {state.isAdjustmentMode ? <Check size={16} /> : <Settings size={16} />}
                   {state.isAdjustmentMode 
                     ? (language === 'en' ? 'Finish Adjustment' : language === 'zh' ? '結束調整' : '調整終了') 
                     : (language === 'en' ? 'Adjustment Mode' : language === 'zh' ? '調整模式' : '調整モード')}
                 </button>

                 <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-orange-300 bg-orange-50 text-xs text-orange-950 shadow-xs">
                   <span className="font-medium">{language === 'zh' ? '轉播版面已啟用' : 'Broadcast Active'}</span>
                   <button
                     type="button"
                     onClick={() => {
                       dispatch({ type: 'UPDATE_META', field: 'broadcastMarginX', value: 20 });
                       dispatch({ type: 'UPDATE_META', field: 'broadcastMarginY', value: 20 });
                       dispatch({ type: 'UPDATE_META', field: 'broadcastScale', value: 1.0 });
                       dispatch({ type: 'UPDATE_META', field: 'broadcastVisible', value: true });
                     }}
                     className="px-2 py-0.5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-bold rounded shadow-xs text-xs cursor-pointer flex items-center gap-1 active:scale-95 transition-all"
                     title={language === 'zh' ? '若記分板被拖離畫面或消失，點此立即歸位至左下角預設位置' : 'Reset position if lost'}
                   >
                     <RotateCcw size={12} />
                     <span>{language === 'zh' ? '歸位記分板' : 'Reset Position'}</span>
                   </button>
                 </div>
               </div>
               {state.isAdjustmentMode && (
                  <div className="mt-3 space-y-3">
                     {/* Font Sizes Section */}
                     <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-xs">
                       <div 
                         onClick={() => setIsFontSizesOpen(prev => !prev)}
                         className="flex items-center justify-between p-2.5 bg-slate-100/90 hover:bg-slate-200/70 cursor-pointer select-none border-b transition-colors"
                       >
                         <div className="flex items-center gap-1.5 font-semibold text-slate-700 text-xs">
                           {isFontSizesOpen ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                           <span>{language === "en" ? "Font & Element Sizes" : language === "zh" ? "字體與元件大小設定" : "フォントサイズ設定"}</span>
                         </div>
                         <button
                           onClick={(e) => {
                             e.stopPropagation();
                             dispatch({ type: "UPDATE_META", field: "broadcastTeamNameSize", value: 24 });
                             dispatch({ type: "UPDATE_META", field: "broadcastPlayerNameSize", value: 20 });
                             dispatch({ type: "UPDATE_META", field: "broadcastScoreSize", value: 30 });
                             dispatch({ type: "UPDATE_META", field: "broadcastTimerSize", value: 24 });
                             dispatch({ type: "UPDATE_META", field: "broadcastInningSize", value: 24 });
                             dispatch({ type: "UPDATE_META", field: "broadcastLogoSize", value: 40 });
                             dispatch({ type: "UPDATE_META", field: "broadcastCountGap", value: 2 });
                           }}
                           className="px-2 py-0.5 text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-700 rounded flex items-center gap-1 transition-colors font-medium"
                           title={language === "en" ? "Reset all font sizes to default" : language === "zh" ? "重置全部字體與元件大小為默認" : "所有的フォントサイズをデフォルトに戻す"}
                         >
                           <RotateCcw size={10} />
                           <span>{language === "en" ? "Reset All" : language === "zh" ? "重置全部" : "全重置"}</span>
                         </button>
                       </div>

                       {isFontSizesOpen && (
                         <div className="p-2.5 space-y-2 text-xs">

                     <div className="flex items-center justify-between gap-1.5">
                        <span className="text-slate-600 whitespace-nowrap min-w-[60px]">{language === "en" ? "Logo Size" : language === "zh" ? "隊徽大小" : "ロゴサイズ"}</span>
                        <div className="flex items-center gap-1 flex-1 justify-end">
                          <input type="range" min="16" max="80" value={state.meta.broadcastLogoSize ?? 40} onChange={(e) => dispatch({ type: "UPDATE_META", field: "broadcastLogoSize", value: parseInt(e.target.value) || 16 })} className="w-14 sm:w-20 accent-blue-600" />
                          <input
                            type="number"
                            min="16"
                            max="80"
                            value={state.meta.broadcastLogoSize ?? 40}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val)) dispatch({ type: "UPDATE_META", field: "broadcastLogoSize", value: val });
                            }}
                            className="w-11 text-center font-mono text-[11px] text-slate-700 bg-white border border-slate-300 rounded px-1 py-0.5 outline-none focus:border-blue-500"
                          />
                          <button
                            onClick={() => dispatch({ type: "UPDATE_META", field: "broadcastLogoSize", value: 40 })}
                            className="px-1.5 py-0.5 text-[10px] bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded flex items-center gap-0.5 shrink-0 transition-colors"
                            title={language === "en" ? "Reset to default (40)" : language === "zh" ? "重置為默認 (40)" : "默認に戻す (40)"}
                          >
                            <RotateCcw size={9} />
                            <span>{language === "en" ? "Reset" : language === "zh" ? "重置" : "デフォルト"}</span>
                          </button>
                        </div>
                     </div>

                     <div className="flex items-center justify-between gap-1.5">
                        <span className="text-slate-600 whitespace-nowrap min-w-[60px]">{language === "en" ? "Count Spacing" : language === "zh" ? "球數間距" : "カウント間隔"}</span>
                        <div className="flex items-center gap-1 flex-1 justify-end">
                          <input type="range" min="-12" max="24" value={state.meta.broadcastCountGap ?? 2} onChange={(e) => dispatch({ type: "UPDATE_META", field: "broadcastCountGap", value: parseInt(e.target.value) || 0 })} className="w-14 sm:w-20 accent-blue-600" />
                          <input
                            type="number"
                            min="-12"
                            max="24"
                            value={state.meta.broadcastCountGap ?? 2}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val)) dispatch({ type: "UPDATE_META", field: "broadcastCountGap", value: val });
                            }}
                            className="w-11 text-center font-mono text-[11px] text-slate-700 bg-white border border-slate-300 rounded px-1 py-0.5 outline-none focus:border-blue-500"
                          />
                          <button
                            onClick={() => dispatch({ type: "UPDATE_META", field: "broadcastCountGap", value: 2 })}
                            className="px-1.5 py-0.5 text-[10px] bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded flex items-center gap-0.5 shrink-0 transition-colors"
                            title={language === "en" ? "Reset to default (2)" : language === "zh" ? "重置為默認 (2)" : "默認に戻す (2)"}
                          >
                            <RotateCcw size={9} />
                            <span>{language === "en" ? "Reset" : language === "zh" ? "重置" : "デフォルト"}</span>
                          </button>
                        </div>
                     </div>

                     <div className="flex items-center justify-between gap-1.5">
                        <span className="text-slate-600 whitespace-nowrap min-w-[60px]">{language === "en" ? "Team Name Size" : language === "zh" ? "隊名大小" : "チーム名サイズ"}</span>
                        <div className="flex items-center gap-1 flex-1 justify-end">
                          <input type="range" min="10" max="64" value={state.meta.broadcastTeamNameSize ?? 24} onChange={(e) => dispatch({ type: "UPDATE_META", field: "broadcastTeamNameSize", value: parseInt(e.target.value) || 10 })} className="w-14 sm:w-20 accent-blue-600" />
                          <input
                            type="number"
                            min="10"
                            max="64"
                            value={state.meta.broadcastTeamNameSize ?? 24}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val)) dispatch({ type: "UPDATE_META", field: "broadcastTeamNameSize", value: val });
                            }}
                            className="w-11 text-center font-mono text-[11px] text-slate-700 bg-white border border-slate-300 rounded px-1 py-0.5 outline-none focus:border-blue-500"
                          />
                          <button
                            onClick={() => dispatch({ type: "UPDATE_META", field: "broadcastTeamNameSize", value: 24 })}
                            className="px-1.5 py-0.5 text-[10px] bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded flex items-center gap-0.5 shrink-0 transition-colors"
                            title={language === "en" ? "Reset to default (24)" : language === "zh" ? "重置為默認 (24)" : "デフォルトに戻す (24)"}
                          >
                            <RotateCcw size={9} />
                            <span>{language === "en" ? "Reset" : language === "zh" ? "重置" : "デフォルト"}</span>
                          </button>
                        </div>
                     </div>

                     <div className="flex items-center justify-between gap-1.5">
                        <span className="text-slate-600 whitespace-nowrap min-w-[60px]">{language === "en" ? "Player Name Size" : language === "zh" ? "球員名大小" : "選手名サイズ"}</span>
                        <div className="flex items-center gap-1 flex-1 justify-end">
                          <input type="range" min="10" max="48" value={state.meta.broadcastPlayerNameSize ?? 20} onChange={(e) => dispatch({ type: "UPDATE_META", field: "broadcastPlayerNameSize", value: parseInt(e.target.value) || 10 })} className="w-14 sm:w-20 accent-blue-600" />
                          <input
                            type="number"
                            min="10"
                            max="48"
                            value={state.meta.broadcastPlayerNameSize ?? 20}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val)) dispatch({ type: "UPDATE_META", field: "broadcastPlayerNameSize", value: val });
                            }}
                            className="w-11 text-center font-mono text-[11px] text-slate-700 bg-white border border-slate-300 rounded px-1 py-0.5 outline-none focus:border-blue-500"
                          />
                          <button
                            onClick={() => dispatch({ type: "UPDATE_META", field: "broadcastPlayerNameSize", value: 20 })}
                            className="px-1.5 py-0.5 text-[10px] bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded flex items-center gap-0.5 shrink-0 transition-colors"
                            title={language === "en" ? "Reset to default (20)" : language === "zh" ? "重置為默認 (20)" : "デフォルトに戻す (20)"}
                          >
                            <RotateCcw size={9} />
                            <span>{language === "en" ? "Reset" : language === "zh" ? "重置" : "デフォルト"}</span>
                          </button>
                        </div>
                     </div>

                     <div className="flex items-center justify-between gap-1.5">
                        <span className="text-slate-600 whitespace-nowrap min-w-[60px]">{language === "en" ? "Score Size" : language === "zh" ? "分數大小" : "スコアサイズ"}</span>
                        <div className="flex items-center gap-1 flex-1 justify-end">
                          <input type="range" min="16" max="72" value={state.meta.broadcastScoreSize ?? 30} onChange={(e) => dispatch({ type: "UPDATE_META", field: "broadcastScoreSize", value: parseInt(e.target.value) || 16 })} className="w-14 sm:w-20 accent-blue-600" />
                          <input
                            type="number"
                            min="16"
                            max="72"
                            value={state.meta.broadcastScoreSize ?? 30}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val)) dispatch({ type: "UPDATE_META", field: "broadcastScoreSize", value: val });
                            }}
                            className="w-11 text-center font-mono text-[11px] text-slate-700 bg-white border border-slate-300 rounded px-1 py-0.5 outline-none focus:border-blue-500"
                          />
                          <button
                            onClick={() => dispatch({ type: "UPDATE_META", field: "broadcastScoreSize", value: 30 })}
                            className="px-1.5 py-0.5 text-[10px] bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded flex items-center gap-0.5 shrink-0 transition-colors"
                            title={language === "en" ? "Reset to default (30)" : language === "zh" ? "重置為默認 (30)" : "デフォルトに戻す (30)"}
                          >
                            <RotateCcw size={9} />
                            <span>{language === "en" ? "Reset" : language === "zh" ? "重置" : "デフォルト"}</span>
                          </button>
                        </div>
                     </div>

                     <div className="flex items-center justify-between gap-1.5">
                        <span className="text-slate-600 whitespace-nowrap min-w-[60px]">{language === "en" ? "Timer Size" : language === "zh" ? "計時器大小" : "タイマーサイズ"}</span>
                        <div className="flex items-center gap-1 flex-1 justify-end">
                          <input type="range" min="12" max="64" value={state.meta.broadcastTimerSize ?? 24} onChange={(e) => dispatch({ type: "UPDATE_META", field: "broadcastTimerSize", value: parseInt(e.target.value) || 12 })} className="w-14 sm:w-20 accent-blue-600" />
                          <input
                            type="number"
                            min="12"
                            max="64"
                            value={state.meta.broadcastTimerSize ?? 24}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val)) dispatch({ type: "UPDATE_META", field: "broadcastTimerSize", value: val });
                            }}
                            className="w-11 text-center font-mono text-[11px] text-slate-700 bg-white border border-slate-300 rounded px-1 py-0.5 outline-none focus:border-blue-500"
                          />
                          <button
                            onClick={() => dispatch({ type: "UPDATE_META", field: "broadcastTimerSize", value: 24 })}
                            className="px-1.5 py-0.5 text-[10px] bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded flex items-center gap-0.5 shrink-0 transition-colors"
                            title={language === "en" ? "Reset to default (24)" : language === "zh" ? "重置為默認 (24)" : "デフォルトに戻す (24)"}
                          >
                            <RotateCcw size={9} />
                            <span>{language === "en" ? "Reset" : language === "zh" ? "重置" : "デフォルト"}</span>
                          </button>
                        </div>
                     </div>

                     <div className="flex items-center justify-between gap-1.5">
                        <span className="text-slate-600 whitespace-nowrap min-w-[60px]">{language === "en" ? "Inning Size" : language === "zh" ? "局數大小" : "イニングサイズ"}</span>
                        <div className="flex items-center gap-1 flex-1 justify-end">
                          <input type="range" min="12" max="64" value={state.meta.broadcastInningSize ?? 24} onChange={(e) => dispatch({ type: "UPDATE_META", field: "broadcastInningSize", value: parseInt(e.target.value) || 12 })} className="w-14 sm:w-20 accent-blue-600" />
                          <input
                            type="number"
                            min="12"
                            max="64"
                            value={state.meta.broadcastInningSize ?? 24}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val)) dispatch({ type: "UPDATE_META", field: "broadcastInningSize", value: val });
                            }}
                            className="w-11 text-center font-mono text-[11px] text-slate-700 bg-white border border-slate-300 rounded px-1 py-0.5 outline-none focus:border-blue-500"
                          />
                          <button
                            onClick={() => dispatch({ type: "UPDATE_META", field: "broadcastInningSize", value: 24 })}
                            className="px-1.5 py-0.5 text-[10px] bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded flex items-center gap-0.5 shrink-0 transition-colors"
                            title={language === "en" ? "Reset to default (24)" : language === "zh" ? "重置為默認 (24)" : "デフォルトに戻す (24)"}
                          >
                            <RotateCcw size={9} />
                            <span>{language === "en" ? "Reset" : language === "zh" ? "重置" : "デフォルト"}</span>
                          </button>
                        </div>
                     </div>
                     <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-slate-200">
                        <span className="text-slate-600 whitespace-nowrap min-w-[60px]">{language === "en" ? "Player Number" : language === "zh" ? "球員背號" : "背番号表示"}</span>
                        <select
                          value={state.meta.broadcastPlayerNumberStyle || "normal"}
                          onChange={(e) => dispatch({ type: "UPDATE_META", field: "broadcastPlayerNumberStyle", value: e.target.value })}
                          className="w-full max-w-[120px] bg-white border border-slate-300 text-slate-700 text-[11px] rounded px-1.5 py-0.5 outline-none focus:border-blue-500"
                        >
                          <option value="normal">{language === "en" ? "Show" : language === "zh" ? "正常顯示" : "通常"}</option>
                          <option value="gray">{language === "en" ? "Gray" : language === "zh" ? "灰色顯示" : "グレー"}</option>
                          <option value="hidden">{language === "en" ? "Hidden" : language === "zh" ? "不顯示" : "非表示"}</option>
                        </select>
                     </div>

                         </div>
                       )}
                     </div>

                     {/* Layout Dimensions Section */}
                     <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-xs">
                       <div 
                         onClick={() => setIsDimensionsOpen(prev => !prev)}
                         className="flex items-center justify-between p-2.5 bg-slate-100/90 hover:bg-slate-200/70 cursor-pointer select-none border-b transition-colors"
                       >
                         <div className="flex items-center gap-1.5 font-semibold text-slate-700 text-xs">
                           {isDimensionsOpen ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
                           <span>{language === "en" ? "Board Dimensions (px)" : language === "zh" ? "版面尺寸與寬度 (px)" : "サイズ (px)"}</span>
                         </div>
                         <button
                           onClick={(e) => {
                             e.stopPropagation();
                             dispatch({ type: "UPDATE_META", field: "broadcastWidth", value: 450 });
                             dispatch({ type: "UPDATE_META", field: "broadcastTeamRowHeight", value: 72 });
                             dispatch({ type: "UPDATE_META", field: "broadcastPlayerRowHeight", value: 50 });
                             dispatch({ type: "UPDATE_META", field: "broadcastScoreWidth", value: 72 });
                             dispatch({ type: "UPDATE_META", field: "broadcastInningWidth", value: 56 });
                             dispatch({ type: "UPDATE_META", field: "broadcastRightColumnWidth", value: 150 });
                           }}
                           className="px-2 py-0.5 text-[10px] bg-slate-200 hover:bg-slate-300 text-slate-700 rounded flex items-center gap-1 transition-colors font-medium"
                           title={language === "en" ? "Reset dimensions" : language === "zh" ? "重置尺寸" : "サイズリセット"}
                         >
                           <RotateCcw size={9} />
                           <span>{language === "en" ? "Reset" : language === "zh" ? "重置" : "リセット"}</span>
                         </button>
                       </div>

                       {isDimensionsOpen && (
                         <div className="p-2.5 space-y-2 text-xs">

                        <div className="flex items-center justify-between gap-1.5">
                           <span className="text-slate-600 whitespace-nowrap min-w-[60px]">{language === "en" ? "Board Width" : language === "zh" ? "記分板寬度" : "ボード幅"}</span>
                           <div className="flex items-center gap-1 flex-1 justify-end">
                             <input type="range" min="300" max="800" value={state.meta.broadcastWidth ?? 450} onChange={(e) => dispatch({ type: "UPDATE_META", field: "broadcastWidth", value: parseInt(e.target.value) || 300 })} className="w-14 sm:w-20 accent-blue-600" />
                             <input
                               type="number"
                               min="300"
                               max="800"
                               value={state.meta.broadcastWidth ?? 450}
                               onChange={(e) => {
                                 const val = parseInt(e.target.value);
                                 if (!isNaN(val)) dispatch({ type: "UPDATE_META", field: "broadcastWidth", value: val });
                               }}
                               className="w-12 text-center font-mono text-[11px] text-slate-700 bg-white border border-slate-300 rounded px-1 py-0.5 outline-none focus:border-blue-500"
                             />
                             <button
                               onClick={() => dispatch({ type: "UPDATE_META", field: "broadcastWidth", value: 450 })}
                               className="px-1.5 py-0.5 text-[10px] bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded flex items-center gap-0.5 shrink-0 transition-colors"
                             >
                               <RotateCcw size={9} />
                               <span>{language === "en" ? "Reset" : language === "zh" ? "重置" : "デフォルト"}</span>
                             </button>
                           </div>
                        </div>

                        <div className="flex items-center justify-between gap-1.5">
                           <span className="text-slate-600 whitespace-nowrap min-w-[60px]">{language === "en" ? "Team Row Height" : language === "zh" ? "隊伍行高" : "チーム行高さ"}</span>
                           <div className="flex items-center gap-1 flex-1 justify-end">
                             <input type="range" min={minTeamRowHeight} max="150" value={Math.max(minTeamRowHeight, state.meta.broadcastTeamRowHeight ?? 72)} onChange={(e) => dispatch({ type: "UPDATE_META", field: "broadcastTeamRowHeight", value: Math.max(minTeamRowHeight, parseInt(e.target.value) || minTeamRowHeight) })} className="w-14 sm:w-20 accent-blue-600" />
                             <input
                               type="number"
                               min={minTeamRowHeight}
                               max="150"
                               value={Math.max(minTeamRowHeight, state.meta.broadcastTeamRowHeight ?? 72)}
                               onChange={(e) => {
                                 const val = parseInt(e.target.value);
                                 if (!isNaN(val)) dispatch({ type: "UPDATE_META", field: "broadcastTeamRowHeight", value: Math.max(minTeamRowHeight, val) });
                               }}
                               className="w-12 text-center font-mono text-[11px] text-slate-700 bg-white border border-slate-300 rounded px-1 py-0.5 outline-none focus:border-blue-500"
                             />
                             <button
                               onClick={() => dispatch({ type: "UPDATE_META", field: "broadcastTeamRowHeight", value: 72 })}
                               className="px-1.5 py-0.5 text-[10px] bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded flex items-center gap-0.5 shrink-0 transition-colors"
                             >
                               <RotateCcw size={9} />
                               <span>{language === "en" ? "Reset" : language === "zh" ? "重置" : "デフォルト"}</span>
                             </button>
                           </div>
                        </div>

                        <div className="flex items-center justify-between gap-1.5">
                           <span className="text-slate-600 whitespace-nowrap min-w-[60px]">{language === "en" ? "Player Row Height" : language === "zh" ? "球員行高" : "選手行高さ"}</span>
                           <div className="flex items-center gap-1 flex-1 justify-end">
                             <input type="range" min={minPlayerRowHeight} max="100" value={Math.max(minPlayerRowHeight, state.meta.broadcastPlayerRowHeight ?? 50)} onChange={(e) => dispatch({ type: "UPDATE_META", field: "broadcastPlayerRowHeight", value: Math.max(minPlayerRowHeight, parseInt(e.target.value) || minPlayerRowHeight) })} className="w-14 sm:w-20 accent-blue-600" />
                             <input
                               type="number"
                               min={minPlayerRowHeight}
                               max="100"
                               value={Math.max(minPlayerRowHeight, state.meta.broadcastPlayerRowHeight ?? 50)}
                               onChange={(e) => {
                                 const val = parseInt(e.target.value);
                                 if (!isNaN(val)) dispatch({ type: "UPDATE_META", field: "broadcastPlayerRowHeight", value: Math.max(minPlayerRowHeight, val) });
                               }}
                               className="w-12 text-center font-mono text-[11px] text-slate-700 bg-white border border-slate-300 rounded px-1 py-0.5 outline-none focus:border-blue-500"
                             />
                             <button
                               onClick={() => dispatch({ type: "UPDATE_META", field: "broadcastPlayerRowHeight", value: 50 })}
                               className="px-1.5 py-0.5 text-[10px] bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded flex items-center gap-0.5 shrink-0 transition-colors"
                             >
                               <RotateCcw size={9} />
                               <span>{language === "en" ? "Reset" : language === "zh" ? "重置" : "デフォルト"}</span>
                             </button>
                           </div>
                        </div>

                        <div className="flex items-center justify-between gap-1.5">
                           <span className="text-slate-600 whitespace-nowrap min-w-[60px]">{language === "en" ? "Score Width" : language === "zh" ? "分數欄寬" : "スコア列幅"}</span>
                           <div className="flex items-center gap-1 flex-1 justify-end">
                             <input type="range" min="30" max="150" value={state.meta.broadcastScoreWidth ?? 72} onChange={(e) => dispatch({ type: "UPDATE_META", field: "broadcastScoreWidth", value: parseInt(e.target.value) || 30 })} className="w-14 sm:w-20 accent-blue-600" />
                             <input
                               type="number"
                               min="30"
                               max="150"
                               value={state.meta.broadcastScoreWidth ?? 72}
                               onChange={(e) => {
                                 const val = parseInt(e.target.value);
                                 if (!isNaN(val)) dispatch({ type: "UPDATE_META", field: "broadcastScoreWidth", value: val });
                               }}
                               className="w-12 text-center font-mono text-[11px] text-slate-700 bg-white border border-slate-300 rounded px-1 py-0.5 outline-none focus:border-blue-500"
                             />
                             <button
                               onClick={() => dispatch({ type: "UPDATE_META", field: "broadcastScoreWidth", value: 72 })}
                               className="px-1.5 py-0.5 text-[10px] bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded flex items-center gap-0.5 shrink-0 transition-colors"
                             >
                               <RotateCcw size={9} />
                               <span>{language === "en" ? "Reset" : language === "zh" ? "重置" : "デフォルト"}</span>
                             </button>
                           </div>
                        </div>

                        <div className="flex items-center justify-between gap-1.5">
                           <span className="text-slate-600 whitespace-nowrap min-w-[60px]">{language === "en" ? "Inning Width" : language === "zh" ? "局數欄寬" : "イニング列幅"}</span>
                           <div className="flex items-center gap-1 flex-1 justify-end">
                             <input type="range" min="30" max="120" value={state.meta.broadcastInningWidth ?? 56} onChange={(e) => dispatch({ type: "UPDATE_META", field: "broadcastInningWidth", value: parseInt(e.target.value) || 30 })} className="w-14 sm:w-20 accent-blue-600" />
                             <input
                               type="number"
                               min="30"
                               max="120"
                               value={state.meta.broadcastInningWidth ?? 56}
                               onChange={(e) => {
                                 const val = parseInt(e.target.value);
                                 if (!isNaN(val)) dispatch({ type: "UPDATE_META", field: "broadcastInningWidth", value: val });
                               }}
                               className="w-12 text-center font-mono text-[11px] text-slate-700 bg-white border border-slate-300 rounded px-1 py-0.5 outline-none focus:border-blue-500"
                             />
                             <button
                               onClick={() => dispatch({ type: "UPDATE_META", field: "broadcastInningWidth", value: 56 })}
                               className="px-1.5 py-0.5 text-[10px] bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded flex items-center gap-0.5 shrink-0 transition-colors"
                             >
                               <RotateCcw size={9} />
                               <span>{language === "en" ? "Reset" : language === "zh" ? "重置" : "デフォルト"}</span>
                             </button>
                           </div>
                        </div>

                        <div className="flex items-center justify-between gap-1.5">
                           <span className="text-slate-600 whitespace-nowrap min-w-[60px]">{language === "en" ? "Right Col Width" : language === "zh" ? "右欄寬度" : "右列幅"}</span>
                           <div className="flex items-center gap-1 flex-1 justify-end">
                             <input type="range" min="80" max="300" value={state.meta.broadcastRightColumnWidth ?? 150} onChange={(e) => dispatch({ type: "UPDATE_META", field: "broadcastRightColumnWidth", value: parseInt(e.target.value) || 80 })} className="w-14 sm:w-20 accent-blue-600" />
                             <input
                               type="number"
                               min="80"
                               max="300"
                               value={state.meta.broadcastRightColumnWidth ?? 150}
                               onChange={(e) => {
                                 const val = parseInt(e.target.value);
                                 if (!isNaN(val)) dispatch({ type: "UPDATE_META", field: "broadcastRightColumnWidth", value: val });
                               }}
                               className="w-12 text-center font-mono text-[11px] text-slate-700 bg-white border border-slate-300 rounded px-1 py-0.5 outline-none focus:border-blue-500"
                             />
                             <button
                               onClick={() => dispatch({ type: "UPDATE_META", field: "broadcastRightColumnWidth", value: 150 })}
                               className="px-1.5 py-0.5 text-[10px] bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded flex items-center gap-0.5 shrink-0 transition-colors"
                             >
                               <RotateCcw size={9} />
                               <span>{language === "en" ? "Reset" : language === "zh" ? "重置" : "デフォルト"}</span>
                             </button>
                           </div>
                        </div>
                         </div>
                       )}
                     </div>
                  </div>
                )}
             </div>
               </div>
             )}
          </div>
        </div>
        </div>
        )}

        {activeTab === 'info' && (
          <div className="flex flex-col gap-6">
            {/* Bottom: Team & Lineup Config */}
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b pb-1">
                <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Team Configuration</h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => dispatch({ type: 'SWAP_TEAMS' })}
                    className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold py-1 px-2 rounded shadow transition-colors"
                  >
                    <RefreshCw size={12} /> {language === 'en' ? 'Swap Teams' : language === 'zh' ? '主客隊交換' : '攻守交替'}
                  </button>
                  <button 
                    onClick={() => dispatch({ type: 'RESET_TEAM_SETTINGS' })}
                    className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold py-1 px-2 rounded shadow transition-colors"
                  >
                    <RotateCcw size={12} /> {language === 'en' ? 'Reset Teams' : language === 'zh' ? '重置隊伍設定' : 'チーム設定リセット'}
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {state.meta.swapSides ? (
                  <>
                    <TeamEditor key="home" teamKey="home" state={state} dispatch={dispatch} language={language as 'en' | 'zh' | 'ja'} />
                    <TeamEditor key="away" teamKey="away" state={state} dispatch={dispatch} language={language as 'en' | 'zh' | 'ja'} />
                  </>
                ) : (
                  <>
                    <TeamEditor key="away" teamKey="away" state={state} dispatch={dispatch} language={language as 'en' | 'zh' | 'ja'} />
                    <TeamEditor key="home" teamKey="home" state={state} dispatch={dispatch} language={language as 'en' | 'zh' | 'ja'} />
                  </>
                )}
              </div>
            </div>

            {/* Global RHE and Innings Editor */}
            <InningsAndRHEEditor state={state} dispatch={dispatch} language={language} />

            {/* Game Info Section */}
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden mt-4">
              <button
                type="button"
                onClick={() => setIsGameInfoOpen(prev => !prev)}
                className="w-full p-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <Tv size={14} className="text-blue-600 shrink-0" />
                  <span className="font-bold text-xs sm:text-sm text-gray-800 uppercase tracking-wide">
                    {language === 'en' ? 'Game Info' : language === 'zh' ? 'Game Info 比賽資訊' : '試合情報'}
                  </span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                    {(state.meta.gameInfos || []).length}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
                    {isGameInfoOpen ? (language === 'zh' ? '收合' : 'Collapse') : (language === 'zh' ? '展開' : 'Expand')}
                  </span>
                  {isGameInfoOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {isGameInfoOpen && (
                <div className="p-3 border-t border-slate-100 flex flex-col gap-2 bg-slate-50/30">
                  {(state.meta.gameInfos || []).map((info, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 bg-white rounded border p-1 w-full shadow-xs">
                      <input 
                        className="bg-transparent text-sm text-slate-900 flex-1 outline-none px-2 min-w-0 font-medium" 
                        value={info}
                        onChange={(e) => {
                          const newInfos = [...(state.meta.gameInfos || [])];
                          newInfos[idx] = e.target.value;
                          updateMeta('gameInfos', newInfos);
                        }}
                        placeholder={language === 'en' ? 'e.g. Bottom 9th, 2 Outs' : language === 'zh' ? '例如：九局下, 2出局' : '例：9回裏, 2アウト'}
                      />
                      <button 
                        onClick={() => {
                          const newInfos = [...(state.meta.gameInfos || [])];
                          newInfos.splice(idx, 1);
                          updateMeta('gameInfos', newInfos);
                        }}
                        className="text-red-500 hover:text-red-700 p-1.5 rounded hover:bg-red-50 shrink-0 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => {
                      const newInfos = [...(state.meta.gameInfos || []), 'New Info'];
                      updateMeta('gameInfos', newInfos);
                    }}
                    className="flex items-center justify-center gap-1.5 text-sm bg-blue-50 text-blue-600 px-3 py-2 rounded border border-blue-200 hover:bg-blue-100 border-dashed font-medium transition-colors"
                  >
                    <Plus size={14} /> {language === 'zh' ? '新增資訊欄位' : 'Add Info'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </div>

      {/* WALK TYPE SELECTION MODAL */}
      {/* WALK TYPE SELECTION MODAL */}
      {isWalkModalOpen && (
        <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl max-w-md w-full p-4 sm:p-5 shadow-2xl space-y-4 max-h-[90%] overflow-y-auto text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
                  <span>{language === 'zh' ? '選擇上壘類型' : language === 'ja' ? '出塁タイプの選択' : 'Select On-Base Type'}</span>
                </h3>
              </div>
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
                className="w-full text-left p-3.5 rounded-xl bg-slate-800/90 hover:bg-sky-950/70 border border-slate-700 hover:border-sky-500 transition-all group flex items-center justify-between cursor-pointer"
              >
                <div className="font-bold text-white group-hover:text-sky-300 text-sm flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-sky-500/20 text-sky-300 rounded text-xs border border-sky-500/30 font-mono">BB</span>
                  <span>{language === 'zh' ? '四壞' : language === 'ja' ? '四球' : 'Base on Balls (BB)'}</span>
                </div>
                <ChevronRight size={18} className="text-slate-500 group-hover:text-sky-400 transition-transform group-hover:translate-x-1 shrink-0 ml-2" />
              </button>

              <button
                onClick={() => handleConfirmWalk('敬遠')}
                className="w-full text-left p-3.5 rounded-xl bg-slate-800/90 hover:bg-blue-950/70 border border-slate-700 hover:border-blue-500 transition-all group flex items-center justify-between cursor-pointer"
              >
                <div className="font-bold text-white group-hover:text-blue-300 text-sm flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs border border-blue-500/30 font-mono">IBB</span>
                  <span>{language === 'zh' ? '敬遠' : language === 'ja' ? '敬遠' : 'Intentional Walk (IBB)'}</span>
                </div>
                <ChevronRight size={18} className="text-slate-500 group-hover:text-blue-400 transition-transform group-hover:translate-x-1 shrink-0 ml-2" />
              </button>

              <button
                onClick={() => handleConfirmWalk('觸身')}
                className="w-full text-left p-3.5 rounded-xl bg-slate-800/90 hover:bg-cyan-950/70 border border-slate-700 hover:border-cyan-500 transition-all group flex items-center justify-between cursor-pointer"
              >
                <div className="font-bold text-white group-hover:text-cyan-300 text-sm flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded text-xs border border-cyan-500/30 font-mono">HBP</span>
                  <span>{language === 'zh' ? '觸身' : language === 'ja' ? '死球' : 'Hit by Pitch (HBP)'}</span>
                </div>
                <ChevronRight size={18} className="text-slate-500 group-hover:text-cyan-400 transition-transform group-hover:translate-x-1 shrink-0 ml-2" />
              </button>

              <button
                onClick={() => handleConfirmWalk('失誤')}
                className="w-full text-left p-3.5 rounded-xl bg-slate-800/90 hover:bg-amber-950/70 border border-slate-700 hover:border-amber-500 transition-all group flex items-center justify-between cursor-pointer"
              >
                <div className="font-bold text-white group-hover:text-amber-300 text-sm flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded text-xs border border-amber-500/30 font-mono">E</span>
                  <span>{language === 'zh' ? '失誤 (失誤上壘)' : language === 'ja' ? '失策 (失策出塁)' : 'Error (Reach on Error / E)'}</span>
                </div>
                <ChevronRight size={18} className="text-slate-500 group-hover:text-amber-400 transition-transform group-hover:translate-x-1 shrink-0 ml-2" />
              </button>

              <button
                onClick={() => handleConfirmWalk('K+WP')}
                className="w-full text-left p-3.5 rounded-xl bg-slate-800/90 hover:bg-orange-950/70 border border-slate-700 hover:border-orange-500 transition-all group flex items-center justify-between cursor-pointer"
              >
                <div className="font-bold text-white group-hover:text-orange-300 text-sm flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-orange-500/20 text-orange-300 rounded text-xs border border-orange-500/30 font-mono">K+WP</span>
                  <span>{language === 'zh' ? 'K+WP (暴投不死三振)' : language === 'ja' ? 'K+WP (暴投振り逃げ)' : 'K+WP (Wild Pitch D3K)'}</span>
                </div>
                <ChevronRight size={18} className="text-slate-500 group-hover:text-orange-400 transition-transform group-hover:translate-x-1 shrink-0 ml-2" />
              </button>

              <button
                onClick={() => handleConfirmWalk('K+PB')}
                className="w-full text-left p-3.5 rounded-xl bg-slate-800/90 hover:bg-purple-950/70 border border-slate-700 hover:border-purple-500 transition-all group flex items-center justify-between cursor-pointer"
              >
                <div className="font-bold text-white group-hover:text-purple-300 text-sm flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs border border-purple-500/30 font-mono">K+PB</span>
                  <span>{language === 'zh' ? 'K+PB (捕逸不死三振)' : language === 'ja' ? 'K+PB (捕逸振り逃げ)' : 'K+PB (Passed Ball D3K)'}</span>
                </div>
                <ChevronRight size={18} className="text-slate-500 group-hover:text-purple-400 transition-transform group-hover:translate-x-1 shrink-0 ml-2" />
              </button>
            </div>

            <div className="pt-1 flex justify-end">
              <button
                onClick={() => setIsWalkModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {language === 'zh' ? '取消' : language === 'ja' ? 'キャンセル' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WILD PITCH / PASSED BALL MODAL (暴投/捕逸彈窗) */}
      {isWpPbModalOpen && (
        <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl max-w-md w-full p-4 sm:p-5 shadow-2xl space-y-4 max-h-[90%] overflow-y-auto text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span>{language === 'zh' ? '選擇暴投 / 捕逸 / 投手犯規' : language === 'ja' ? '暴投 / 捕逸 / ボークの選択' : 'Select Wild Pitch / Passed Ball / Balk'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {language === 'zh' 
                    ? `守備：${activePitcherTeamObj.name} | 投手：#${activePitcher.number || '--'} ${activePitcher.name} | 捕手：#${activeCatcher.number || '--'} ${activeCatcher.name}` 
                    : language === 'ja' 
                    ? `守備：${activePitcherTeamObj.name} | 投手：#${activePitcher.number || '--'} ${activePitcher.name} | 捕手：#${activeCatcher.number || '--'} ${activeCatcher.name}` 
                    : `Fielding: ${activePitcherTeamObj.name} | P: #${activePitcher.number || '--'} ${activePitcher.name} | C: #${activeCatcher.number || '--'} ${activeCatcher.name}`}
                </p>
              </div>
              <button
                onClick={() => setIsWpPbModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => {
                  dispatch({ type: 'WILD_PITCH', subType: 'WP' });
                  setIsWpPbModalOpen(false);
                }}
                className="w-full text-left p-3.5 rounded-xl bg-slate-800/90 hover:bg-orange-950/70 border-2 border-slate-700 hover:border-orange-500 transition-all group flex items-center justify-between cursor-pointer active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black px-2.5 py-1.5 rounded-lg bg-orange-500/20 text-orange-300 border border-orange-500/40 font-mono">
                    WP
                  </span>
                  <div>
                    <div className="font-bold text-white group-hover:text-orange-300 text-sm flex items-center gap-2">
                      <span>{language === 'zh' ? '暴投 (Wild Pitch)' : language === 'ja' ? '暴投 (ワイルドピッチ)' : 'Wild Pitch (WP)'}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-orange-600/30 text-orange-300 border border-orange-500/40 font-normal">
                        {language === 'zh' ? `記投手：${activePitcher.name}` : `P: ${activePitcher.name}`}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-500 group-hover:text-orange-400 transition-transform group-hover:translate-x-1 shrink-0 ml-2" />
              </button>

              <button
                onClick={() => {
                  dispatch({ type: 'WILD_PITCH', subType: 'PB' });
                  setIsWpPbModalOpen(false);
                }}
                className="w-full text-left p-3.5 rounded-xl bg-slate-800/90 hover:bg-purple-950/70 border-2 border-slate-700 hover:border-purple-500 transition-all group flex items-center justify-between cursor-pointer active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black px-2.5 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono">
                    PB
                  </span>
                  <div>
                    <div className="font-bold text-white group-hover:text-purple-300 text-sm flex items-center gap-2">
                      <span>{language === 'zh' ? '捕逸 (Passed Ball)' : language === 'ja' ? '捕逸 (パスボール)' : 'Passed Ball (PB)'}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-purple-600/30 text-purple-300 border border-purple-500/40 font-normal">
                        {language === 'zh' ? `記捕手：${activeCatcher.name}` : `C: ${activeCatcher.name}`}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-500 group-hover:text-purple-400 transition-transform group-hover:translate-x-1 shrink-0 ml-2" />
              </button>

              <button
                onClick={() => {
                  dispatch({ type: 'WILD_PITCH', subType: 'BK' });
                  setIsWpPbModalOpen(false);
                }}
                className="w-full text-left p-3.5 rounded-xl bg-slate-800/90 hover:bg-rose-950/70 border-2 border-slate-700 hover:border-rose-500 transition-all group flex items-center justify-between cursor-pointer active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-black px-2.5 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono">
                    BK
                  </span>
                  <div>
                    <div className="font-bold text-white group-hover:text-rose-300 text-sm flex items-center gap-2">
                      <span>{language === 'zh' ? '投手犯規 (Balk)' : language === 'ja' ? 'ボーク (Balk)' : 'Balk (BK)'}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-rose-600/30 text-rose-300 border border-rose-500/40 font-normal">
                        {language === 'zh' ? `記投手：${activePitcher.name}` : `P: ${activePitcher.name}`}
                      </span>
                    </div>
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-500 group-hover:text-rose-400 transition-transform group-hover:translate-x-1 shrink-0 ml-2" />
              </button>
            </div>

            <div className="pt-1 flex justify-end border-t border-slate-800">
              <button
                onClick={() => setIsWpPbModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {language === 'zh' ? '取消' : language === 'ja' ? 'キャンセル' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OUT TYPE SELECTION MODAL */}
      {isOutModalOpen && (
        <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl max-w-md w-full p-4 sm:p-5 shadow-2xl space-y-4 max-h-[90%] overflow-y-auto text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  <span>{language === 'zh' ? '選擇出局類型' : language === 'ja' ? 'アウト種別の選択' : 'Select Out Type'}</span>
                </h3>
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
                className="w-full p-3 bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border-2 border-emerald-500/80 rounded-xl transition-all group text-left active:scale-98 shadow-lg cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-400">
                    SF (高飛犧牲打)
                  </span>
                  <span className="text-xs text-emerald-400 font-bold font-mono">+1 得分 · +1 打點 · +1 OUT</span>
                </div>
              </button>
            )}

            {Boolean((state.bases[0] || state.bases[1] || state.bases[2]) && state.outs < 2) && (
              <button
                onClick={() => handleConfirmOut('犧牲短打')}
                className="w-full p-3 bg-gradient-to-r from-amber-950/80 to-yellow-950/80 border-2 border-amber-500/80 rounded-xl transition-all group text-left active:scale-98 shadow-lg cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black px-2 py-0.5 rounded bg-amber-500/30 text-amber-300 border border-amber-400">
                    SH (犧牲短打)
                  </span>
                  <span className="text-xs text-amber-400 font-bold font-mono">
                    {state.bases[2] 
                      ? (language === 'zh' ? '+1 得分 · +1 打點 · 跑者推進 · +1 OUT' : language === 'ja' ? '+1 得点 · +1 打点 · 走者進塁 · +1 OUT' : '+1 Run · +1 RBI · Runners Advance · +1 OUT')
                      : (language === 'zh' ? '跑者推進各1壘 · +1 OUT' : language === 'ja' ? '走者各1進塁 · +1 OUT' : 'Runners Advance · +1 OUT')}
                  </span>
                </div>
              </button>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handleConfirmOut('高飛')}
                className="text-left p-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 transition-all group flex items-center justify-between cursor-pointer"
              >
                <div className="font-bold text-white group-hover:text-blue-300 text-sm flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 bg-slate-700 text-slate-300 rounded text-[10px] font-mono">FO</span>
                  <span>{language === 'zh' ? '高飛' : language === 'ja' ? 'フライ' : 'Flyout'}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">+1 OUT</span>
              </button>

              <button
                onClick={() => handleConfirmOut('滾地')}
                className="text-left p-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 transition-all group flex items-center justify-between cursor-pointer"
              >
                <div className="font-bold text-white group-hover:text-yellow-300 text-sm flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 bg-slate-700 text-slate-300 rounded text-[10px] font-mono">GO</span>
                  <span>{language === 'zh' ? '滾地' : language === 'ja' ? 'ゴロ' : 'Groundout'}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">+1 OUT</span>
              </button>

              <button
                onClick={() => handleConfirmOut('野選')}
                className="text-left p-3 rounded-xl bg-slate-800/90 hover:bg-orange-600/30 border border-slate-700 hover:border-orange-500 transition-all group flex items-center justify-between cursor-pointer"
              >
                <div className="font-bold text-white group-hover:text-orange-400 text-sm flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-300 rounded text-[10px] font-mono">FC</span>
                  <span>{language === 'zh' ? '野選' : language === 'ja' ? '野選' : 'FC'}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">+1 OUT</span>
              </button>

              <button
                type="button"
                disabled={!(Boolean(state.bases[0]) && state.outs < 2)}
                onClick={() => handleConfirmOut('雙殺')}
                className={`text-left p-3 rounded-xl border transition-all group flex items-center justify-between ${
                  !(Boolean(state.bases[0]) && state.outs < 2)
                    ? 'opacity-30 cursor-not-allowed bg-slate-900/50 border-slate-800 pointer-events-none'
                    : 'bg-slate-800/90 hover:bg-rose-600/30 border-slate-700 hover:border-rose-500 cursor-pointer active:scale-95'
                }`}
                title={!(Boolean(state.bases[0]) && state.outs < 2) ? (language === 'zh' ? '一壘無人或已2出局不成立雙殺' : 'Requires runner on 1st and < 2 outs') : undefined}
              >
                <div className="font-bold text-white group-hover:text-rose-400 text-sm flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-300 rounded text-[10px] font-mono">DP</span>
                  <span>{language === 'zh' ? '雙殺' : language === 'ja' ? '併殺' : 'Double Play'}</span>
                </div>
                <span className="text-[10px] text-rose-400 font-mono font-bold">+2 OUT</span>
              </button>

              <button
                onClick={() => handleConfirmOut('三振')}
                className="text-left p-3 rounded-xl bg-slate-800/90 hover:bg-rose-700/30 border border-slate-700 hover:border-rose-600 transition-all group flex items-center justify-between cursor-pointer"
              >
                <div className="font-bold text-white group-hover:text-rose-300 text-sm flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-300 rounded text-[10px] font-mono">K</span>
                  <span>{language === 'zh' ? '三振' : language === 'ja' ? '三振' : 'Strikeout'}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">+1 OUT</span>
              </button>

              <button
                onClick={() => handleConfirmOut('出局')}
                className="text-left p-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 transition-all group flex items-center justify-between cursor-pointer"
              >
                <div className="font-bold text-white text-sm flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 bg-slate-700 text-slate-300 rounded text-[10px] font-mono">OUT</span>
                  <span>{language === 'zh' ? '一般出局' : language === 'ja' ? 'アウト' : 'Out'}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">+1 OUT</span>
              </button>
            </div>

            <div className="pt-1 flex justify-end">
              <button
                onClick={() => setIsOutModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {language === 'zh' ? '取消' : language === 'ja' ? 'キャンセル' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PITCHER LINEUP SUBSTITUTION MODAL */}
      <PitcherLineupSubModal
        isOpen={pitcherSubModalState.isOpen}
        onClose={() => setPitcherSubModalState(prev => ({ ...prev, isOpen: false }))}
        teamName={pitcherSubModalState.teamName}
        incomingPitcher={pitcherSubModalState.incomingPitcher}
        candidates={pitcherSubModalState.candidates}
        onConfirm={handleConfirmPitcherSub}
        language={language}
      />
    </div>
  );
};
