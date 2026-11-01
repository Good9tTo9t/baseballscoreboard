import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, Tv, Sparkles, Sliders, Info, Eye, EyeOff, Play } from 'lucide-react';
import { GameState, ActionType } from '../types';

interface ObsOverlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'en' | 'zh' | 'ja';
  roomCode: string;
  currentDisplayMode: GameState['displayMode'];
  state?: GameState;
  dispatch?: (action: ActionType) => void;
}

export const ObsOverlayModal: React.FC<ObsOverlayModalProps> = ({
  isOpen,
  onClose,
  language,
  roomCode,
  currentDisplayMode,
  state,
  dispatch,
}) => {
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  
  // Construct OBS URL - roomCode is always included by default
  const params = new URLSearchParams();
  params.set('mode', 'obs');
  if (roomCode) {
    params.set('room', roomCode.toUpperCase());
  }
  
  const obsUrl = `${origin}${pathname}?${params.toString()}`;

  const isBroadcastVisible = state ? (state.meta.broadcastVisible !== false) : true;

  const handleToggleBroadcastVisible = () => {
    if (dispatch) {
      const nextVisible = !isBroadcastVisible;
      dispatch({
        type: 'UPDATE_META',
        field: 'broadcastVisible',
        value: nextVisible,
      });
      if (nextVisible) {
        dispatch({
          type: 'UPDATE_META',
          field: 'broadcastAnimKey',
          value: Date.now(),
        });
      }
    }
  };

  const handleReplayEntrance = () => {
    if (dispatch) {
      if (!isBroadcastVisible) {
        dispatch({ type: 'UPDATE_META', field: 'broadcastVisible', value: true });
      }
      dispatch({
        type: 'UPDATE_META',
        field: 'broadcastAnimKey',
        value: Date.now(),
      });
    }
  };

  const handleSetDisplayMode = (mode: GameState['displayMode']) => {
    if (dispatch) {
      dispatch({
        type: 'SET_DISPLAY_MODE',
        mode,
      });
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(obsUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = obsUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  const handleOpenPreview = () => {
    window.open(obsUrl, '_blank');
  };

  const t = {
    title: language === 'zh' ? 'OBS 實況透明圖層' : language === 'ja' ? 'OBS 透過オーバーレイ' : 'OBS Transparent Overlay',
    subtitle: language === 'zh' 
      ? '專為 OBS Studio / Streamlabs 設計的透明 Browser Source，無縫疊加於比賽轉播畫面！' 
      : language === 'ja' 
      ? 'OBS Studio / Streamlabs 専用の透過ブラウザソース。配信映像に重ねて即座にスコアを表示！'
      : 'Transparent Browser Source designed for OBS Studio / Streamlabs to overlay real-time scoreboards onto live video streams!',
    consoleTitle: language === 'zh' ? 'OBS 轉播即時控制台' : language === 'ja' ? 'OBS 実況リアルタイム操作盤' : 'OBS Live Broadcast Console',
    consoleDesc: language === 'zh'
      ? '遠端即時遙控 OBS 畫面！可於局間切換隱藏／顯示（開啟時自動播放開局滑入動畫），或切換版面樣式。'
      : language === 'ja'
      ? 'OBS画面を遠隔操作！イニング開始時にスコアバーを表示すると入場アニメーションが流れます。'
      : 'Live control over OBS display! Hide between innings or show to trigger half-inning start entrance animation.',
    visibilityOn: language === 'zh' ? '轉播計分板：顯示中 (ON)' : language === 'ja' ? 'スコアバー：表示中 (ON)' : 'Scorebug: Visible (ON)',
    visibilityOff: language === 'zh' ? '轉播計分板：已隱藏 (OFF)' : language === 'ja' ? 'スコアバー：非表示 (OFF)' : 'Scorebug: Hidden (OFF)',
    visibilityOnHint: language === 'zh' ? '點擊隱藏計分條（局間休息或畫面重播時使用）' : language === 'ja' ? 'クリックで非表示（イニング間休憩やリプレイ時）' : 'Click to hide scorebug during breaks',
    visibilityOffHint: language === 'zh' ? '點擊開啟顯示（將立即播放開局滑入進場動畫！）' : language === 'ja' ? 'クリックで表示（開始アニメーションが自動再生されます！）' : 'Click to show (triggers broadcast entrance animation!)',
    urlLabel: language === 'zh' ? '專屬透明圖層網址 (OBS 瀏覽器來源專用)' : language === 'ja' ? '専用透過URL (OBSブラウザソース用)' : 'OBS Browser Source URL',
    copyBtn: language === 'zh' ? '複製網址' : language === 'ja' ? 'URLをコピー' : 'Copy URL',
    copiedBtn: language === 'zh' ? '已複製！' : language === 'ja' ? 'コピー完了！' : 'Copied!',
    previewBtn: language === 'zh' ? '開新分頁預覽' : language === 'ja' ? 'プレビュー表示' : 'Preview Overlay',
    instructionsTitle: language === 'zh' ? 'OBS Studio 快速設定 4 步驟' : language === 'ja' ? 'OBS Studio 設定手順' : 'OBS Studio Setup in 4 Quick Steps',
    step1: language === 'zh' ? '在 OBS 的「來源 (Sources)」面板中，點擊「+」並新增「瀏覽器 (Browser)」' : language === 'ja' ? 'OBSの「ソース」パネルで「+」を押し、「ブラウザ」を追加します' : 'In OBS "Sources" dock, click "+" and select "Browser"',
    step2: language === 'zh' ? '將上方複製的透明圖層網址貼入「網址 (URL)」欄位' : language === 'ja' ? '上記でコピーした透過URLを「URL」項目に貼り付けます' : 'Paste the copied transparent URL into the "URL" field',
    step3: language === 'zh' ? '將寬度設為 1920、高度設為 1080（預設全景透明，字卡自動靠邊浮現）' : language === 'ja' ? '幅を 1920、高さを 1080 に設定（背景は完全透過、左下に自動配置）' : 'Set Width to 1920 and Height to 1080 (fully transparent, auto-docked to corner)',
    step4: language === 'zh' ? '點擊確定，計分板即時透明浮現在實況畫面上！無須手動綠幕去背。' : language === 'ja' ? '「OK」をクリック！グリーンバックなどの色抜き設定は不要で透過表示されます。' : 'Click OK! The scoreboard floats cleanly with 100% true alpha transparency.',
    tipNote: language === 'zh'
      ? '💡 提示：全壘打動畫 (HR)、三振特效 (K)、投手用球數與跑者狀況均會即時同步播放。若需調整比分條大小或邊距，可在本機控制台「拖曳模式」調整，或在 OBS 來源按右鍵「互動 (Interact)」即時拉伸！'
      : language === 'ja'
      ? '💡 ヒント：ホームラン演出、三振(K)アニメーション、投手の投球数もすべてリアルタイムで同期されます。'
      : '💡 Tip: Home Run & Strikeout (K) animations, pitcher count, and runners sync dynamically with zero chroma key needed!',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
              <Tv size={22} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">{t.title}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  OBS Source
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{t.subtitle}</p>
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
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          
          {/* OBS Control Console Section */}
          <div className="bg-gradient-to-br from-indigo-950/60 via-slate-800/80 to-purple-950/40 border-2 border-indigo-500/40 rounded-2xl p-4 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
                  <Sliders size={15} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-indigo-200 tracking-wide">{t.consoleTitle}</h3>
                  <p className="text-[11px] text-slate-300">{t.consoleDesc}</p>
                </div>
              </div>
            </div>

            {/* Visibility Toggle Button */}
            <div className="pt-1">
              <button
                onClick={handleToggleBroadcastVisible}
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-between transition-all duration-200 cursor-pointer shadow-lg border active:scale-[0.99] ${
                  isBroadcastVisible
                    ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white border-emerald-400/50 shadow-emerald-950/50'
                    : 'bg-gradient-to-r from-slate-800 via-rose-950/40 to-slate-800 hover:from-slate-700 hover:to-slate-700 text-slate-300 border-slate-600/70 shadow-black/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isBroadcastVisible ? 'bg-white/20 text-white' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}>
                    {isBroadcastVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-extrabold flex items-center gap-2">
                      <span>{isBroadcastVisible ? t.visibilityOn : t.visibilityOff}</span>
                    </div>
                    <div className="text-[11px] font-normal opacity-90">
                      {isBroadcastVisible ? t.visibilityOnHint : t.visibilityOffHint}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5 pl-2">
                  <span className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-full border ${
                    isBroadcastVisible
                      ? 'bg-emerald-900/60 text-emerald-200 border-emerald-400/40 animate-pulse'
                      : 'bg-rose-900/50 text-rose-200 border-rose-500/40'
                  }`}>
                    {isBroadcastVisible 
                      ? (language === 'zh' ? '點擊隱藏' : 'Hide') 
                      : (language === 'zh' ? '點擊開打進場' : 'Show with Intro')}
                  </span>
                </div>
              </button>

              {/* Replay Entrance Animation Button */}
              {isBroadcastVisible && (
                <button
                  onClick={handleReplayEntrance}
                  className="mt-2 w-full py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-400/30 transition-all cursor-pointer active:scale-98"
                  title="重新播放隊伍滑入、球員滑出、壘包球數展開的開局動畫"
                >
                  <Play size={13} className="fill-current" />
                  <span>{language === 'zh' ? '重播開局進場動畫 (隊伍→球員→壘包球數)' : 'Replay Entrance Animation (1s)'}</span>
                </button>
              )}
            </div>

            {/* Quick Live Layout Switcher */}
            {dispatch && state && (
              <div className="pt-1.5 border-t border-indigo-500/20">
                <div className="text-[11px] font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>{language === 'zh' ? '快速切換當前賽事顯示版面：' : 'Quick Layout Switch:'}</span>
                  <span className="text-[10px] text-indigo-300 font-mono">
                    {language === 'zh' ? `當前: ${state.displayMode}` : `Current: ${state.displayMode}`}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {(['broadcast', 'lineup', 'rhe', 'default'] as const).map((mode) => {
                    const isCurrent = state.displayMode === mode;
                    const labels: Record<string, string> = {
                      broadcast: language === 'zh' ? '轉播比分條' : 'Broadcast',
                      lineup: language === 'zh' ? '先發打線卡' : 'Lineup',
                      rhe: language === 'zh' ? '局間 RHE' : 'Box (RHE)',
                      default: language === 'zh' ? '經典全景板' : 'Classic',
                    };
                    return (
                      <button
                        key={mode}
                        onClick={() => handleSetDisplayMode(mode)}
                        className={`px-2 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                          isCurrent
                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-md ring-1 ring-indigo-300'
                            : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                        }`}
                      >
                        {labels[mode]}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>



          {/* Step 3: Generated URL */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Tv size={14} className="text-indigo-400" />
                <span>{t.urlLabel}</span>
              </span>
            </label>

            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <div className="flex-1 bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-2.5 font-mono text-xs text-indigo-300 overflow-x-auto whitespace-nowrap select-all shadow-inner">
                {obsUrl}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleCopy}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg cursor-pointer ${
                    isCopied 
                      ? 'bg-emerald-600 text-white scale-95 shadow-emerald-900/40' 
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/40 active:scale-95'
                  }`}
                >
                  {isCopied ? <Check size={16} /> : <Copy size={16} />}
                  <span>{isCopied ? t.copiedBtn : t.copyBtn}</span>
                </button>
                <button
                  onClick={handleOpenPreview}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors border border-slate-700 cursor-pointer"
                  title={t.previewBtn}
                >
                  <ExternalLink size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Step 4: Step-by-Step Instructions */}
          <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-400" />
              <span>{t.instructionsTitle}</span>
            </h4>
            <div className="grid grid-cols-1 gap-2 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-indigo-400 font-bold flex items-center justify-center text-[11px] shrink-0">1</span>
                <span>{t.step1}</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-indigo-400 font-bold flex items-center justify-center text-[11px] shrink-0">2</span>
                <span>{t.step2}</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-indigo-400 font-bold flex items-center justify-center text-[11px] shrink-0">3</span>
                <span>{t.step3}</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-indigo-400 font-bold flex items-center justify-center text-[11px] shrink-0">4</span>
                <span>{t.step4}</span>
              </div>
            </div>
          </div>

          {/* Helpful Tips */}
          <div className="p-3 bg-indigo-950/20 border border-indigo-900/30 rounded-xl text-xs text-indigo-200/90 leading-relaxed flex items-start gap-2">
            <Info size={16} className="text-indigo-400 shrink-0 mt-0.5" />
            <div>{t.tipNote}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            OBS Studio 28+ / Streamlabs Desktop Compatible
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            {language === 'zh' ? '關閉' : language === 'ja' ? '閉じる' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
