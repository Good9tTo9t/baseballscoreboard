import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Settings as SettingsIcon, Smartphone, Check, Sparkles, Languages, Monitor, SlidersHorizontal } from 'lucide-react';

export type LanguageCode = 'en' | 'zh' | 'ja';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  consoleLanguage?: LanguageCode;
  scoreboardLanguage?: LanguageCode;
  language?: LanguageCode;
  onConsoleLanguageChange?: (lang: LanguageCode) => void;
  onScoreboardLanguageChange?: (lang: LanguageCode) => void;
  useBetaControls?: boolean;
  onToggleBetaControls?: (value: boolean) => void;
}

const LANGUAGE_OPTIONS: { code: LanguageCode; label: string; sub: string }[] = [
  { code: 'zh', label: '繁體中文', sub: 'Traditional Chinese' },
  { code: 'en', label: 'English', sub: '英文' },
  { code: 'ja', label: '日本語', sub: 'Japanese' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  consoleLanguage,
  scoreboardLanguage,
  language = 'zh',
  onConsoleLanguageChange,
  onScoreboardLanguageChange,
  useBetaControls = false,
  onToggleBetaControls
}) => {
  if (!isOpen) return null;

  const currentConsoleLang = consoleLanguage || language || 'zh';
  const currentScoreboardLang = scoreboardLanguage || language || 'zh';

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex justify-between items-center px-5 py-4 border-b bg-slate-50 shrink-0">
            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
              <SettingsIcon className="w-5 h-5 text-blue-600" />
              <span>
                {currentConsoleLang === 'en' ? 'System Settings' : currentConsoleLang === 'zh' ? '系統設定' : 'システム設定'}
              </span>
            </h2>
            <button 
              onClick={onClose} 
              className="p-1.5 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-full transition-colors cursor-pointer"
              title={currentConsoleLang === 'en' ? 'Close' : currentConsoleLang === 'zh' ? '關閉' : '閉じる'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
            {/* Language Settings Section */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <Languages className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    {currentConsoleLang === 'en' 
                      ? 'Language Settings (Independent)' 
                      : currentConsoleLang === 'zh' 
                      ? '語言設定 (控制台與計分板分開設定)' 
                      : '言語設定 (操作盤とスコアボードを個別に設定)'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {currentConsoleLang === 'en'
                      ? 'You can set console operation and scoreboard broadcast in different languages.'
                      : currentConsoleLang === 'zh'
                      ? '控制台操作介面與計分板展示畫面語言獨立分離，可依不同場合自由搭配。'
                      : '操作画面とスコアボード表示の言語を別々にカスタマイズできます。'}
                  </p>
                </div>
              </div>

              {/* 1. Console Language */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                    <span>
                      {currentConsoleLang === 'en' ? 'Console Operator Language' : currentConsoleLang === 'zh' ? '控制台操作介面語言' : '操作盤の表示言語'}
                    </span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {currentConsoleLang === 'en' ? 'Buttons & Modals' : currentConsoleLang === 'zh' ? '影響按鈕、選單與彈窗' : 'ボタン・各種メニュー'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {LANGUAGE_OPTIONS.map(opt => {
                    const isSelected = currentConsoleLang === opt.code;
                    return (
                      <button
                        key={`console-${opt.code}`}
                        type="button"
                        onClick={() => onConsoleLanguageChange && onConsoleLanguageChange(opt.code)}
                        className={`py-2 px-3 rounded-lg text-left transition-all border cursor-pointer relative flex flex-col justify-center ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-500/40'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs sm:text-sm">{opt.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <span className={`text-[10px] truncate ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                          {opt.sub}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Scoreboard Language */}
              <div className="space-y-2 pt-2 border-t border-slate-200/70">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-amber-600" />
                    <span>
                      {currentConsoleLang === 'en' ? 'Scoreboard Display Language' : currentConsoleLang === 'zh' ? '計分板顯示語言' : 'スコアボード表示言語'}
                    </span>
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {currentConsoleLang === 'en' ? 'Board & OBS Overlay' : currentConsoleLang === 'zh' ? '影響大螢幕、投影與 OBS 圖層' : '投影・OBS実況'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {LANGUAGE_OPTIONS.map(opt => {
                    const isSelected = currentScoreboardLang === opt.code;
                    return (
                      <button
                        key={`scoreboard-${opt.code}`}
                        type="button"
                        onClick={() => onScoreboardLanguageChange && onScoreboardLanguageChange(opt.code)}
                        className={`py-2 px-3 rounded-lg text-left transition-all border cursor-pointer relative flex flex-col justify-center ${
                          isSelected
                            ? 'bg-amber-600 text-white border-amber-600 shadow-sm ring-2 ring-amber-500/40'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs sm:text-sm">{opt.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <span className={`text-[10px] truncate ${isSelected ? 'text-amber-100' : 'text-slate-400'}`}>
                          {opt.sub}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Informative Tip */}
              <div className="bg-amber-50/70 border border-amber-200/70 rounded-lg p-2.5 text-[11px] text-amber-900 flex items-start gap-2">
                <span className="shrink-0 text-amber-600 font-bold">💡</span>
                <p className="leading-relaxed">
                  {currentConsoleLang === 'en'
                    ? 'Tip: You can comfortably operate in English or Traditional Chinese while broadcasting the Scoreboard in Japanese or English!'
                    : currentConsoleLang === 'zh'
                    ? '小技巧：您可以一邊使用繁體中文操作控制台，一邊將計分板設定為英文或日文進行實況轉播！'
                    : 'ヒント：日本語で操作しながら、スコアボードを英語にして実況配信や大型モニター投影を行うことも可能です！'}
                </p>
              </div>
            </div>

            {/* Beta UI Switch Section */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 transition-all hover:border-blue-300">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                        {currentConsoleLang === 'en' 
                          ? 'Touch-Friendly Console' 
                          : currentConsoleLang === 'zh' 
                          ? '新版行動友善控制台' 
                          : 'モバイル最適化コンソール'}
                      </h4>
                      <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Beta
                      </span>
                    </div>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  type="button"
                  onClick={() => onToggleBetaControls && onToggleBetaControls(!useBetaControls)}
                  className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
                    useBetaControls ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                  role="switch"
                  aria-checked={useBetaControls}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      useBetaControls ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Status Note */}
              <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">
                  {currentConsoleLang === 'en' ? 'Console Style: ' : currentConsoleLang === 'zh' ? '控制台樣式：' : 'コンソールスタイル：'}
                  <strong className={useBetaControls ? 'text-blue-600 ml-1' : 'text-slate-700 ml-1'}>
                    {useBetaControls 
                      ? (currentConsoleLang === 'en' ? 'Touch Console' : currentConsoleLang === 'zh' ? '新版觸控控制台' : '新版コンソール')
                      : (currentConsoleLang === 'en' ? 'Classic Controls' : currentConsoleLang === 'zh' ? '經典版控制台' : 'クラシック版')}
                  </strong>
                </span>
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {currentConsoleLang === 'en' ? 'Reversible anytime' : currentConsoleLang === 'zh' ? '隨時可一鍵切回舊版' : 'いつでも復帰可能'}
                </span>
              </div>
            </div>

            {/* Information card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-700 text-xs flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-slate-800 mb-1">
                  {currentConsoleLang === 'en' ? 'Safe Beta Experience' : currentConsoleLang === 'zh' ? '安心測試保證' : '安心テスト保証'}
                </h5>
                <p className="text-slate-600 leading-relaxed">
                  {currentConsoleLang === 'en'
                    ? 'The classic controls remain 100% intact. Your settings are remembered in this browser, so you can freely switch back and forth.'
                    : currentConsoleLang === 'zh'
                    ? '經典版的所有功能完全被完整保留。您的開關選擇會自動儲存在此瀏覽器中，您可以隨時切換比較，不用擔心任何功能消失。'
                    : '従来のクラシック機能は100%保持されています。ブラウザに設定が記憶されるため、いつでも自由に戻せます。'}
                </p>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-5 py-3 border-t bg-slate-50 flex justify-end items-center shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors cursor-pointer"
            >
              {currentConsoleLang === 'en' ? 'Done' : currentConsoleLang === 'zh' ? '完成' : '完了'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
