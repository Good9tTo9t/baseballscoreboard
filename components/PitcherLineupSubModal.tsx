import React from 'react';
import { X, UserCheck, AlertCircle, ArrowRightLeft } from 'lucide-react';
import { Player } from '../types';

export interface PitcherCandidate {
  player: Player;
  index: number; // 0-based index in team.lineup
}

interface PitcherLineupSubModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamName: string;
  incomingPitcher: Player | null;
  candidates: PitcherCandidate[];
  onConfirm: (lineupIndex: number | undefined) => void;
  language: 'en' | 'zh' | 'ja';
}

export const PitcherLineupSubModal: React.FC<PitcherLineupSubModalProps> = ({
  isOpen,
  onClose,
  teamName,
  incomingPitcher,
  candidates,
  onConfirm,
  language,
}) => {
  if (!isOpen || !incomingPitcher) return null;

  const isSingle = candidates.length === 1;

  const t = {
    title: language === 'zh' 
      ? (isSingle ? '更換投手 — 是否同步更改打線？' : '更換投手 — 選擇替換打線中的哪位投手')
      : language === 'ja'
      ? (isSingle ? '投手交代 — 打線の投手も変更しますか？' : '投手交代 — 打線のどの投手と交代しますか？')
      : (isSingle ? 'Pitcher Substitution — Update Lineup as Well?' : 'Pitcher Substitution — Select Lineup Pitcher to Replace'),
    incomingLabel: language === 'zh' ? '即將登板新投手' : language === 'ja' ? '新登板投手' : 'Incoming Pitcher',
    singlePrompt: language === 'zh'
      ? `打線中第 ${candidates[0].index + 1} 棒為投手「${candidates[0].player.name} #${candidates[0].player.number || '--'}」。更換投手時，是否要一併將打線中的投手替換為新投手？`
      : language === 'ja'
      ? `打線 ${candidates[0].index + 1} 番に投手「${candidates[0].player.name} #${candidates[0].player.number || '--'}」が登録されています。新投手と同時に交代しますか？`
      : `Slot #${candidates[0].index + 1} in the lineup is currently pitcher ${candidates[0].player.name} #${candidates[0].player.number || '--'}. Would you like to replace this lineup slot with the new pitcher as well?`,
    multiPrompt: language === 'zh'
      ? `打線中共有 ${candidates.length} 位選手標記為投手。更換投手時，請問要一併替換打線中的哪一位選手？`
      : language === 'ja'
      ? `打線に ${candidates.length} 名の投手が登録されています。新投手と交代する打順を選択してください。`
      : `There are ${candidates.length} pitchers currently in the batting lineup. Which slot would you like to update with the new pitcher?`,
    replaceLineupBtn: language === 'zh' 
      ? `一併更換打線投手（第 ${candidates[0]?.index + 1} 棒 → ${incomingPitcher.name}）`
      : language === 'ja'
      ? `打線の投手も同時に交代（${candidates[0]?.index + 1}番 → ${incomingPitcher.name}）`
      : `Update Lineup as Well (Slot #${candidates[0]?.index + 1} → ${incomingPitcher.name})`,
    pitcherOnlyBtn: language === 'zh' 
      ? '僅更換投手（保留打線不變）' 
      : language === 'ja' 
      ? '投手のみ交代（打線は変更しない）' 
      : 'Pitcher Only (Keep Lineup Unchanged)',
    doNotReplaceBtn: language === 'zh' 
      ? '不替換打線（僅更換投手）' 
      : language === 'ja' 
      ? '打線は交代しない（投手のみ交代）' 
      : 'Keep Lineup (Pitcher Only)',
    cancelBtn: language === 'zh' ? '取消換投' : language === 'ja' ? 'キャンセル' : 'Cancel',
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-slate-900 border-2 border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0 shadow-inner">
              <ArrowRightLeft size={20} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>{t.title}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {teamName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Incoming Pitcher Info Card */}
          <div className="bg-slate-950/70 border border-blue-500/30 rounded-xl p-3 flex items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-300 font-mono font-black text-xs flex items-center justify-center border border-blue-500/40">
                P
              </span>
              <div>
                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">
                  {t.incomingLabel}
                </span>
                <span className="text-sm sm:text-base font-black text-white">
                  {incomingPitcher.name} <span className="text-slate-400 font-mono">#{incomingPitcher.number || '--'}</span>
                </span>
              </div>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold shrink-0">
              板凳席上陣
            </span>
          </div>

          {/* Prompt Description */}
          <div className="p-3 bg-amber-950/25 border border-amber-500/30 rounded-xl text-xs sm:text-sm text-amber-200 flex items-start gap-2.5 leading-relaxed">
            <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              {isSingle ? t.singlePrompt : t.multiPrompt}
            </div>
          </div>

          {/* Selection Area */}
          {isSingle ? (
            /* Single Pitcher Candidate in Lineup */
            <div className="space-y-2.5 pt-1">
              {/* Option 1: Replace Lineup Slot */}
              <button
                onClick={() => onConfirm(candidates[0].index)}
                className="w-full p-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-950/50 flex items-center justify-between transition-all cursor-pointer border border-blue-400/40 active:scale-98 text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white shrink-0">
                    <UserCheck size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-black text-sm text-white truncate">
                      {language === 'zh' ? '一併更改打線中的投手' : language === 'ja' ? '打線の投手も一括変更' : 'Update Lineup Pitcher as Well'}
                    </div>
                    <div className="text-[11px] text-blue-100/90 truncate mt-0.5">
                      第 {candidates[0].index + 1} 棒「{candidates[0].player.name}」→「{incomingPitcher.name}」
                    </div>
                  </div>
                </div>
              </button>

              {/* Option 2: Pitcher Only (Keep Lineup) */}
              <button
                onClick={() => onConfirm(undefined)}
                className="w-full p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 font-bold text-xs sm:text-sm border border-slate-700 hover:border-slate-600 flex items-center justify-between transition-all cursor-pointer active:scale-98 text-left"
              >
                <div>
                  <div className="font-bold text-slate-200">
                    {t.pitcherOnlyBtn}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {language === 'zh' ? '僅更換投手成績與紀錄，打線名單維持原樣' : 'Only swap mound pitcher, leave batting order as is'}
                  </div>
                </div>
              </button>
            </div>
          ) : (
            /* Multiple Pitcher Candidates in Lineup */
            <div className="space-y-2.5 pt-1">
              <span className="text-xs font-bold text-slate-300 block mb-1">
                {language === 'zh' ? '請點選要替換的打線棒次：' : language === 'ja' ? '交代する打順を選択してください：' : 'Select which slot to replace:'}
              </span>

              <div className="space-y-2">
                {candidates.map((cand) => (
                  <button
                    key={cand.index}
                    onClick={() => onConfirm(cand.index)}
                    className="w-full p-3 rounded-xl bg-slate-800/90 hover:bg-blue-950/70 border-2 border-slate-700 hover:border-blue-500 text-white font-bold text-xs sm:text-sm flex items-center justify-between transition-all cursor-pointer group active:scale-98 text-left shadow-sm"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-blue-600/30 text-blue-300 font-mono font-black text-xs flex items-center justify-center border border-blue-500/40 shrink-0">
                        {cand.index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-black text-white group-hover:text-blue-300 transition-colors truncate">
                          第 {cand.index + 1} 棒：#{cand.player.number || '--'} {cand.player.name}
                          <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-normal">
                            {cand.player.position || 'P'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 group-hover:text-blue-200/80 transition-colors mt-0.5">
                          替換為 → #{incomingPitcher.number || '--'} {incomingPitcher.name}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold shrink-0 shadow">
                      {language === 'zh' ? '替換此位' : 'Select'}
                    </span>
                  </button>
                ))}
              </div>

              {/* Option: Do not replace any lineup slot */}
              <button
                onClick={() => onConfirm(undefined)}
                className="w-full p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 font-bold text-xs border border-slate-700/70 hover:border-slate-600 flex items-center justify-center transition-all cursor-pointer active:scale-98 mt-2"
              >
                {t.doNotReplaceBtn}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            {t.cancelBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
