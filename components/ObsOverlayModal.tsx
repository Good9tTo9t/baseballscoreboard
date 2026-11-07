import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, Tv, Sparkles, Sliders, Info, Eye, EyeOff, Play, Layers, Users, Table, LayoutTemplate, Link2 } from 'lucide-react';
import { GameState, ActionType } from '../types';
import { encodeMatchData } from '../utils/matchCodec';

interface ObsOverlayModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'en' | 'zh' | 'ja';
  roomCode: string;
  currentDisplayMode: GameState['displayMode'];
  state?: GameState;
  dispatch?: (action: ActionType) => void;
}

type CardKey = 'broadcast' | 'lineup' | 'rhe' | 'default' | 'sync';

interface GraphicCardDef {
  key: CardKey;
  cardParam?: string;
  titleZh: string;
  titleEn: string;
  titleJa: string;
  descZh: string;
  descEn: string;
  descJa: string;
  badgeZh: string;
  badgeEn: string;
  badgeJa: string;
  badgeColor: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  recommendedSize: string;
}

const GRAPHIC_CARDS: GraphicCardDef[] = [
  {
    key: 'broadcast',
    cardParam: 'broadcast',
    titleZh: '轉播比分條 (Scorebug)',
    titleEn: 'Broadcast Scorebug',
    titleJa: '実況スコアバー',
    descZh: '比賽常態專用透明計分條（左下角浮現），含用球數、打席、局數、壘包、開局滑入動畫與即時全壘打/三振特效。',
    descEn: 'On-air lower-left scorebug with pitcher count, outs, bases, opening entrance motion, and HR/K animations.',
    descJa: '試合常時表示用の透過スコアバー（左下配置）。球数・アウト・塁状況・開始アニメ・HR演出対応。',
    badgeZh: '推薦比賽常駐',
    badgeEn: 'Recommended Live',
    badgeJa: '推奨・試合常時',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    icon: Tv,
    recommendedSize: '1920 × 1080',
  },
  {
    key: 'lineup',
    cardParam: 'lineup',
    titleZh: '先發打序名單卡 (Starting Lineup)',
    titleEn: 'Starting Lineup Card',
    titleJa: 'スタメンオーダー表',
    descZh: '雙方先發打線完整名單字卡，顯示棒次、姓名、背號與守位，適合賽前、攻守交換或介紹先發陣容時疊加。',
    descEn: 'Full 1-9 batting order card with positions and jersey numbers. Great for pre-game or half-inning introductions.',
    descJa: '両チームの1〜9番スタメン一覧表。打順・背番号・守備位置を表示。試合前やイニング間に最適。',
    badgeZh: '賽前 / 換局名單',
    badgeEn: 'Pre-game / Lineup',
    badgeJa: '試合前・スタメン',
    badgeColor: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    icon: Users,
    recommendedSize: '1920 × 1080',
  },
  {
    key: 'rhe',
    cardParam: 'rhe',
    titleZh: '局間攻守分數盒卡 (Inning Box / RHE)',
    titleEn: 'Inning Boxscore & RHE Card',
    titleJa: 'イニング得点表 (RHE)',
    descZh: '1~9 局逐局比分板與 R/H/E 總覽盒卡，清晰呈現雙方各局得失分及失誤狀況，適合攻守交替與局間休息。',
    descEn: '1-9 inning linescore box with R/H/E totals. Clean review card during breaks or post-game analysis.',
    descJa: '1〜9回の各イニング得点とR・H・Eまとめ表。イニング間の攻守交代や試合振り返りに。',
    badgeZh: '局間休息盒卡',
    badgeEn: 'Inning Breaks',
    badgeJa: 'イニング間得点',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    icon: Table,
    recommendedSize: '1920 × 1080',
  },
  {
    key: 'default',
    cardParam: 'default',
    titleZh: '經典全景大計分板 (Classic Board)',
    titleEn: 'Classic Full Stadium Scoreboard',
    titleJa: 'クラシックスコアボード',
    descZh: '傳統全螢幕球場計分大看板，大鐘與外野看台式經典版面，資訊最完整。',
    descEn: 'Traditional full stadium scoreboard layout with big clock and comprehensive field stats.',
    descJa: '球場風クラシックフルスクリーン大看板。大時計・総合スコアの定番デザイン。',
    badgeZh: '全景大看板',
    badgeEn: 'Full Board',
    badgeJa: '全体ボード',
    badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    icon: LayoutTemplate,
    recommendedSize: '1920 × 1080',
  },
  {
    key: 'sync',
    cardParam: undefined,
    titleZh: '主控動態連動源 (Sync with Controller)',
    titleEn: 'Controller Follower (Dynamic Sync)',
    titleJa: '操作盤連動ソース',
    descZh: '隨主控台切換的通用來源（控制台切換打線時此來源即時切為打線，切換比分條即切為比分條）。',
    descEn: 'All-in-one source that automatically mirrors whichever layout the main controller selects.',
    descJa: '操作盤で選択した画面にリアルタイムで自動同期する全自動ソース。',
    badgeZh: '隨主控切換',
    badgeEn: 'Follows Remote',
    badgeJa: '手動切替連動',
    badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    icon: Link2,
    recommendedSize: '1920 × 1080',
  },
];

export const ObsOverlayModal: React.FC<ObsOverlayModalProps> = ({
  isOpen,
  onClose,
  language,
  roomCode,
  currentDisplayMode,
  state,
  dispatch,
}) => {
  const [selectedCard, setSelectedCard] = useState<CardKey>('broadcast');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';

  // Construct URL for any given card
  const getCardUrl = (cardParam?: string) => {
    const params = new URLSearchParams();
    params.set('mode', 'obs');
    if (roomCode) {
      params.set('room', roomCode.toUpperCase());
    }
    if (cardParam) {
      params.set('card', cardParam);
    }
    if (state) {
      const matchData = encodeMatchData(state);
      if (matchData) {
        params.set('d', matchData);
      }
    }
    return `${origin}${pathname}?${params.toString()}`;
  };

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

  const handleCopyCardUrl = async (card: GraphicCardDef) => {
    const url = getCardUrl(card.cardParam);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedKey(card.key);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiedKey(card.key);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  const handleOpenPreview = (cardParam?: string) => {
    const url = getCardUrl(cardParam);
    window.open(url, '_blank');
  };

  const currentDef = GRAPHIC_CARDS.find((c) => c.key === selectedCard) || GRAPHIC_CARDS[0];
  const activeUrl = getCardUrl(currentDef.cardParam);

  const t = {
    title: language === 'zh' ? 'OBS 轉播字卡獨立來源' : language === 'ja' ? 'OBS 透過字カード独立ソース' : 'OBS Dedicated Graphic Sources',
    subtitle: language === 'zh' 
      ? '每個字卡擁有專屬獨立網址！可同時在 OBS 加入多個瀏覽器來源（如比分條與打序卡），彼此獨立顯示、互不衝突！' 
      : language === 'ja' 
      ? '各字カードに専用URLを発行！OBSでスコアバーとスタメンカードを同時に追加しても競合せず個別表示できます。'
      : 'Each graphic card has its own dedicated URL! Add multiple browser sources in OBS simultaneously without collision.',
    dedicatedCardsHeader: language === 'zh' ? '選擇字卡並獲取專屬網址' : language === 'ja' ? '字カード専用URLの取得' : 'Select Card & Copy URL',
    consoleTitle: language === 'zh' ? 'OBS 轉播即時控制台' : language === 'ja' ? 'OBS 実況リアルタイム操作盤' : 'OBS Live Broadcast Console',
    consoleDesc: language === 'zh'
      ? '遠端即時遙控 OBS 畫面！可於局間切換隱藏／顯示（開啟時自動播放開局滑入動畫），或切換版面樣式。'
      : language === 'ja'
      ? 'OBS画面を遠隔操作！イニング開始時にスコアバーを表示すると入場アニメーションが流れます。'
      : 'Live control over OBS display! Hide between innings or show to trigger half-inning start entrance animation.',
    visibilityOn: language === 'zh' ? '轉播計分條：顯示中 (ON)' : language === 'ja' ? 'スコアバー：表示中 (ON)' : 'Scorebug: Visible (ON)',
    visibilityOff: language === 'zh' ? '轉播計分條：已隱藏 (OFF)' : language === 'ja' ? 'スコアバー：非表示 (OFF)' : 'Scorebug: Hidden (OFF)',
    visibilityOnHint: language === 'zh' ? '點擊隱藏計分條（局間休息或畫面重播時使用）' : language === 'ja' ? 'クリックで非表示（イニング間休憩やリプレイ時）' : 'Click to hide scorebug during breaks',
    visibilityOffHint: language === 'zh' ? '點擊開啟顯示（將立即播放開局滑入進場動畫！）' : language === 'ja' ? 'クリックで表示（開始アニメーションが自動再生されます！）' : 'Click to show (triggers broadcast entrance animation!)',
    copyBtn: language === 'zh' ? '複製專屬網址' : language === 'ja' ? '専用URLコピー' : 'Copy Card URL',
    copiedBtn: language === 'zh' ? '已複製！' : language === 'ja' ? 'コピー完了！' : 'Copied!',
    previewBtn: language === 'zh' ? '開新分頁預覽' : language === 'ja' ? 'プレビュー表示' : 'Preview',
    instructionsTitle: language === 'zh' ? 'OBS Studio 多字卡設定說明' : language === 'ja' ? 'OBS Studio マルチソース設定' : 'OBS Studio Multi-Source Setup',
    step1: language === 'zh' ? '在 OBS 的「來源 (Sources)」面板中，點擊「+」新增「瀏覽器 (Browser)」' : language === 'ja' ? 'OBSの「ソース」パネルで「+」を押し、「ブラウザ」を追加します' : 'In OBS "Sources", click "+" and add "Browser"',
    step2: language === 'zh' ? '將欲顯示字卡的專屬 URL 貼入「網址 (URL)」欄位（例如比分條、打序卡）' : language === 'ja' ? '表示したいカードの専用URLを貼り付けます（スコアバーやスタメン表など）' : 'Paste the dedicated Card URL into the "URL" field',
    step3: language === 'zh' ? '寬度設為 1920、高度設為 1080（全域透明，字卡自動靠指定錨點完美浮現）' : language === 'ja' ? '幅を 1920、高さを 1080 に設定（完全透過・自動レイアウト）' : 'Set Width to 1920 and Height to 1080 (transparent alpha layer)',
    step4: language === 'zh' ? '若需同時疊加兩個字卡（如比分條＋打序卡），只需再新增第二個瀏覽器來源並貼上該卡專屬網址即可！' : language === 'ja' ? '複数カードを重ねる場合は、ブラウザソースをもう1つ追加して別URLを貼るだけ！' : 'To show two cards simultaneously, simply add a 2nd Browser source with its own URL!',
    tipNote: language === 'zh'
      ? '💡 提示：每個字卡都有專屬獨立來源，即便主播在控制台切換畫面，鎖定該字卡的 OBS 來源依然保持顯示該字卡，再也不用擔心同時顯示多個字卡時互相打架！'
      : language === 'ja'
      ? '💡 各字カードは独立URLのため、OBS上でスコアバーとオーダー表を同時に表示しても干渉しません。'
      : '💡 Tip: Dedicated card URLs stay locked to their respective graphics even when switching scenes, allowing multiple overlay sources to run peacefully side-by-side!',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-white"
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
                  OBS Multi-Card
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  v3.4.13
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
          
          {/* Card Selection Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={14} className="text-indigo-400" />
                <span>{t.dedicatedCardsHeader}</span>
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                Room: <span className="text-emerald-400 font-bold">#{roomCode}</span>
              </span>
            </div>

            {/* Graphic Cards Selector Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {GRAPHIC_CARDS.map((card) => {
                const isSelected = selectedCard === card.key;
                const IconComponent = card.icon;
                const title = language === 'zh' ? card.titleZh.split(' (')[0] : language === 'ja' ? card.titleJa : card.titleEn;
                const badge = language === 'zh' ? card.badgeZh : language === 'ja' ? card.badgeJa : card.badgeEn;
                
                return (
                  <button
                    key={card.key}
                    type="button"
                    onClick={() => setSelectedCard(card.key)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      isSelected
                        ? 'bg-gradient-to-br from-indigo-900/60 to-slate-900 border-indigo-400 ring-2 ring-indigo-400/30 shadow-lg shadow-indigo-950/50'
                        : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        <IconComponent size={15} />
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${card.badgeColor}`}>
                        {badge}
                      </span>
                    </div>

                    <div>
                      <div className="font-bold text-xs truncate text-white">{title}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {card.cardParam ? `card=${card.cardParam}` : 'sync'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Card Spotlight Box */}
            <div className="bg-slate-950/90 border border-indigo-500/30 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
                    <currentDef.icon size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white flex items-center gap-2">
                      <span>{language === 'zh' ? currentDef.titleZh : language === 'ja' ? currentDef.titleJa : currentDef.titleEn}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${currentDef.badgeColor}`}>
                        {language === 'zh' ? currentDef.badgeZh : language === 'ja' ? currentDef.badgeJa : currentDef.badgeEn}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {language === 'zh' ? currentDef.descZh : language === 'ja' ? currentDef.descJa : currentDef.descEn}
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 font-mono bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                  {language === 'zh' ? '建議畫布：' : 'Canvas: '} <span className="text-slate-200 font-bold">{currentDef.recommendedSize}</span>
                </div>
              </div>

              {/* URL Display with Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch gap-2 pt-1">
                <div className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2.5 font-mono text-xs text-indigo-300 overflow-x-auto whitespace-nowrap select-all shadow-inner">
                  {activeUrl}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleCopyCardUrl(currentDef)}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg cursor-pointer ${
                      copiedKey === currentDef.key
                        ? 'bg-emerald-600 text-white scale-95 shadow-emerald-900/40' 
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/40 active:scale-95'
                    }`}
                  >
                    {copiedKey === currentDef.key ? <Check size={16} /> : <Copy size={16} />}
                    <span>{copiedKey === currentDef.key ? t.copiedBtn : t.copyBtn}</span>
                  </button>
                  <button
                    onClick={() => handleOpenPreview(currentDef.cardParam)}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors border border-slate-700 cursor-pointer"
                    title={t.previewBtn}
                  >
                    <ExternalLink size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* All Cards Quick Copy Table (for quick setup of multiple OBS browser sources) */}
          <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Link2 size={14} className="text-cyan-400" />
                <span>{language === 'zh' ? '多字卡專屬來源一覽 (可分別加入 OBS)' : 'All Dedicated Browser Sources'}</span>
              </h4>
              <span className="text-[11px] text-slate-400">
                {language === 'zh' ? '點擊右側按鈕快速複製' : 'Click to copy each'}
              </span>
            </div>

            <div className="space-y-2">
              {GRAPHIC_CARDS.map((card) => {
                const url = getCardUrl(card.cardParam);
                const isCopied = copiedKey === card.key;
                const title = language === 'zh' ? card.titleZh : language === 'ja' ? card.titleJa : card.titleEn;
                const IconComponent = card.icon;

                return (
                  <div
                    key={card.key}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
                        <IconComponent size={14} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-200 truncate">{title}</div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">{url}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 justify-end">
                      <button
                        onClick={() => handleCopyCardUrl(card)}
                        className={`px-3 py-1.5 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer ${
                          isCopied
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        {isCopied ? <Check size={13} /> : <Copy size={13} />}
                        <span>{isCopied ? (language === 'zh' ? '已複製' : 'Copied') : (language === 'zh' ? '複製' : 'Copy')}</span>
                      </button>
                      <button
                        onClick={() => handleOpenPreview(card.cardParam)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg border border-slate-700 cursor-pointer"
                        title={t.previewBtn}
                      >
                        <ExternalLink size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* OBS Control Console Section */}
          <div className="bg-gradient-to-br from-indigo-950/60 via-slate-800/80 to-purple-950/40 border border-indigo-500/40 rounded-2xl p-4 shadow-xl space-y-3.5">
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
                  <span>{language === 'zh' ? '快速切換主控台賽事版面：' : 'Quick Layout Switch:'}</span>
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

          {/* Step-by-Step Instructions */}
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
            OBS Studio 28+ / Streamlabs Desktop Compatible • v3.4.13
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
