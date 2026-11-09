import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: 'en' | 'zh' | 'ja';
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({ isOpen, onClose, language = 'zh' }) => {
  const [page, setPage] = useState(1);
  const totalPages = 8;

  if (!isOpen) return null;

  const nextPage = () => setPage(p => Math.min(totalPages, p + 1));
  const prevPage = () => setPage(p => Math.max(1, p - 1));

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col h-[600px] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b bg-slate-50 shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <BookOpen className="w-5 h-5" />
            {language === 'en' ? 'User Guide' : language === 'zh' ? '使用指南' : 'ユーザーガイド'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          {page === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h3 className="text-2xl font-bold text-blue-600">{language === 'en' ? '1. Introduction' : language === 'zh' ? '1. 介紹與初衷' : '1. 紹介と目的'}</h3>
              <p className="text-lg text-slate-700 leading-relaxed">
                {language === 'en' ? 'Welcome to the Baseball Scoreboard System!' : language === 'zh' ? '歡迎使用「棒球電子計分板」系統！' : '野球電子スコアボードシステムへようこそ！'}
              </p>
              <p className="text-slate-600 leading-relaxed">
                {language === 'en' ? <span>Goal: We want to provide a professional broadcast-level scoreboard for grassroots, amateur leagues, and any baseball games. No expensive hardware needed, just a PC or tablet.</span> : language === 'zh' ? <span>開發初衷：我們希望讓基層棒球、業餘聯賽，或是各類棒球比賽，都能夠輕鬆擁有專業轉播等級的計分板。不需要昂貴的硬體設備，只要有一台電腦或平板，就能呈現出高質感的比賽畫面。</span> : <span>開発の目的： 草野球、アマチュアリーグ、またはあらゆる野球の試合で、プロの放送レベルのスコアボードを簡単に利用できるようにしたいと考えています。高価なハードウェアは必要ありません。PCやタブレットだけで、高品質な試合画面を提供できます。</span>}
              </p>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mt-4">
                <h4 className="font-bold text-blue-800 mb-2">{language === 'en' ? 'Key Features' : language === 'zh' ? '基本功能概覽' : '主な機能の概要'}</h4>
                <ul className="list-disc list-inside space-y-1 text-blue-900">
                  <li>{language === 'en' ? 'Complete ball, strike, out, and inning tracking' : language === 'zh' ? '完整的好壞球、出局數、局數紀錄' : 'ボール、ストライク、アウト、イニングの完全な記録'}</li>
                  <li>{language === 'en' ? 'Support for Home/Away rosters, lineups, and fielding positions' : language === 'zh' ? '支援主客隊名單、打線與守備位置管理' : 'ホーム/アウェイのロースター、打順、守備位置の管理をサポート'}</li>
                  <li>{language === 'en' ? 'Multiple display modes (Lineup, Inning, Broadcast)' : language === 'zh' ? '多種顯示模式（名單、局間、轉播）' : '複数の表示モード（スタメン、イニング、配信モード）'}</li>
                  <li>{language === 'en' ? 'Rich animations and shortcut support' : language === 'zh' ? '豐富的動畫效果與快捷鍵支援' : '豊富なアニメーション効果とショートカット対応'}</li>
                </ul>
              </div>
            </div>
          )}

          {page === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h3 className="text-2xl font-bold text-blue-600">{language === 'en' ? '2. Rosters & Teams' : language === 'zh' ? '2. 名單與隊伍功能' : '2. ロースターとチーム機能'}</h3>
              <p className="text-slate-700">{language === 'en' ? 'Manage all team information in the lower part of the control panel:' : language === 'zh' ? '在控制台的下方，您可以完整管理兩隊的資訊：' : 'コントロールパネルの下部で両チームの情報を完全に管理できます：'}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="border p-4 rounded-lg">
                  <h4 className="font-bold text-slate-800 mb-2">{language === 'en' ? '🎨 Team Colors & Logos' : language === 'zh' ? '🎨 隊伍顏色與 Logo' : '🎨 チームカラーとロゴ'}</h4>
                  <p className="text-sm text-slate-600">{language === 'en' ? 'You can customize team colors and logos. They are applied to backgrounds and animations.' : language === 'zh' ? '您可以自訂隊伍的代表色與 Logo 網址。這些顏色會自動應用在計分板的背景、全壘打動畫、以及三振 (K) 的特效中，讓轉播更具專屬感。' : 'チームカラーとロゴのURLをカスタマイズできます。これらの色はスコアボードの背景、ホームランアニメーション、奪三振（K）エフェクトに自動的に適用され、配信をより本格的に演出します。'}</p>
                </div>
                <div className="border p-4 rounded-lg">
                  <h4 className="font-bold text-slate-800 mb-2">{language === 'en' ? '⚾ Lineup & Bench' : language === 'zh' ? '⚾ 打線與板凳' : '⚾ 打線とベンチ'}</h4>
                  <p className="text-sm text-slate-600">{language === 'en' ? 'Supports starting lineups and bench players. Use up/down arrows to easily adjust batting orders or substitute bench players.' : language === 'zh' ? '支援先發打線與板凳球員。使用上下箭頭按鈕可以輕鬆調整棒次，或是將板凳球員換上場。' : 'スタメンとベンチ入り選手をサポートします。上下の矢印ボタンを使って打順を簡単に調整したり、ベンチ選手を交代で出場させることができます。'}</p>
                </div>
                <div className="border p-4 rounded-lg">
                  <h4 className="font-bold text-slate-800 mb-2">{language === 'en' ? '🖱️ Drag & Drop Sorting' : language === 'zh' ? '🖱️ 拖曳排序 (Drag & Drop)' : '🖱️ ドラッグ＆ドロップで並べ替え'}</h4>
                  <p className="text-sm text-slate-600">{language === 'en' ? 'Besides buttons, you can drag and drop players to reorder the lineup quickly!' : language === 'zh' ? '除了按鈕，您也可以直接用滑鼠拖曳球員來改變打線順序，排棒次更快速！' : 'ボタンだけでなく、マウスで選手を直接ドラッグして打順を変更できるため、より素早く並べ替えが可能です！'}</p>
                </div>
                <div className="border p-4 rounded-lg">
                  <h4 className="font-bold text-slate-800 mb-2">{language === 'en' ? '🔄 Swap Home/Away' : language === 'zh' ? '🔄 主客隊交換' : '🔄 ホーム/アウェイ入れ替え'}</h4>
                  <p className="text-sm text-slate-600">{language === 'en' ? 'Click the Swap Teams button to easily swap home and away teams. This updates the scoreboard display and switches the edit panels in the control center for intuitive operation.' : language === 'zh' ? '點擊「Swap Teams」按鈕，可以一鍵交換主客隊。這不僅會改變計分板上的顯示位置，控制台的編輯區塊也會跟著左右交換，操作更直覺。' : '「Swap Teams」ボタンをクリックすると、ホームとアウェイをワンクリックで入れ替えられます。スコアボードの表示位置が変わるだけでなく、コントロールパネルの編集エリアも左右反転するため、直感的な操作が可能です。'}</p>
                </div>
              </div>
            </div>
          )}

          {page === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h3 className="text-2xl font-bold text-blue-600">{language === 'en' ? '3. Display Modes' : language === 'zh' ? '3. 顯示模式 (Display Modes)' : '3. 表示モード'}</h3>
              <p className="text-slate-700">{language === 'en' ? 'The system provides three display modes for different game phases:' : language === 'zh' ? '系統提供三種不同的顯示模式，適應比賽的不同階段：' : 'システムは、試合のさまざまな状況に合わせて3つの異なる表示モードを提供します：'}</p>
              
              <div className="space-y-4 mt-4">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <h4 className="font-bold text-slate-800 text-lg">{language === 'en' ? '🎛️ Default (Control Panel)' : language === 'zh' ? '🎛️ Default (控制台模式)' : '🎛️ デフォルト (コントロールパネル)'}</h4>
                  <p className="text-slate-600 mt-1">{language === 'en' ? <span>When to use: Main screen for the scorekeeper.</span> : language === 'zh' ? <span>使用時機：計分員操作時的主要畫面。</span> : <span>使用タイミング：スコアキーパーのメイン操作画面。</span>}</p>
                  <p className="text-sm text-slate-500">{language === 'en' ? 'Shows scoreboard preview on the left and full controls on the right. This is the default mode, allowing you to operate while previewing.' : language === 'zh' ? '左側顯示計分板預覽，右側為完整的控制面板。這是系統的預設模式，讓您可以一邊操作一邊確認畫面。' : '左側にスコアボードのプレビュー、右側に完全なコントロールパネルを表示します。これがデフォルトモードであり、画面を確認しながら操作できます。'}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <h4 className="font-bold text-slate-800 text-lg">{language === 'en' ? '📋 Lineup Mode' : language === 'zh' ? '📋 Lineup (先發名單模式)' : '📋 スタメンモード (Lineup)'}</h4>
                  <p className="text-slate-600 mt-1">{language === 'en' ? <span>When to use: Before the game starts.</span> : language === 'zh' ? <span>使用時機：比賽開始前。</span> : <span>使用タイミング：試合開始前。</span>}</p>
                  <p className="text-sm text-slate-500">{language === 'en' ? 'Displays the starting lineup and fielding positions for both teams.' : language === 'zh' ? '顯示兩隊完整的先發打線與守備位置，讓觀眾在賽前了解雙方陣容。' : '両チームのスタメンと守備位置をすべて表示し、試合前に両チームの陣容を視聴者に伝えます。'}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <h4 className="font-bold text-slate-800 text-lg">{language === 'en' ? '📊 Inning / RHE Mode' : language === 'zh' ? '📊 Inning / RHE (局間模式)' : '📊 RHEモード'}</h4>
                  <p className="text-slate-600 mt-1">{language === 'en' ? <span>When to use: Between half-innings.</span> : language === 'zh' ? <span>使用時機：半局結束、攻守交替時。</span> : <span>使用タイミング：イニングの合間、攻守交替時。</span>}</p>
                  <p className="text-sm text-slate-500">{language === 'en' ? 'Displays traditional line score and RHE stats.' : language === 'zh' ? '顯示傳統的九局計分板（Box Score）以及 R (得分)、H (安打)、E (失誤) 統計，讓觀眾快速掌握比賽走向。' : '伝統的な9イニングのスコアボードと R(得点)、H(安打)、E(失策) の成績を表示し、試合の展開を素早く把握できます。'}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <h4 className="font-bold text-slate-800 text-lg">{language === 'en' ? '📺 Broadcast Mode' : language === 'zh' ? '📺 Broadcast (轉播模式)' : '📺 配信モード'}</h4>
                  <p className="text-slate-600 mt-1">{language === 'en' ? <span>When to use: During gameplay.</span> : language === 'zh' ? <span>使用時機：比賽進行中。</span> : <span>使用タイミング：試合進行中。</span>}</p>
                  <p className="text-sm text-slate-500">{language === 'en' ? <span>Compact bug graphics showing current batter, pitcher, count and bases. In Adjustment Mode, you can drag, scale, and adjust borders to fit your broadcast.</span> : language === 'zh' ? <span>精簡的左下角/右下角字卡設計，顯示當前打者、投手、好壞球與壘包狀態。進入「調整模式 (Adjustment Mode)」後，可以自由拖曳位置、縮放大小，甚至調整各個區塊的邊界寬度與高度，完美契合您的轉播畫面。</span> : <span>現在の打者、投手、カウント、塁の状況を表示するコンパクトなグラフィック。「調整モード (Adjustment Mode)」に入ると、自由にドラッグ、リサイズ、さらには各セクションの境界線の幅や高さを調整でき、配信画面に完璧にフィットします。</span>}</p>
                </div>
              </div>
            </div>
          )}

          {page === 4 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h3 className="text-2xl font-bold text-blue-600">{language === 'en' ? '4. Animations' : language === 'zh' ? '4. 動畫效果 (Animations)' : '4. アニメーション'}</h3>
              <p className="text-slate-700">{language === 'en' ? 'We included professional animations to enhance the broadcast:' : language === 'zh' ? '為了增加轉播的趣味性，我們內建了多種專業的動畫特效：' : '中継を盛り上げるためにプロ仕様のアニメーションを内蔵：'}</p>
              
              <ul className="list-disc list-inside space-y-2 text-slate-600 mt-4">
                <li>{language === 'en' ? 'Home Run: ' : language === 'zh' ? '全壘打 (Home Run)：' : 'ホームラン：'}{language === 'en' ? 'Shows unique HR animations depending on the bases, styled with team colors.' : language === 'zh' ? '根據壘上人數，會顯示 Home Run、2-Run Homer、3-Run Homer 或 Grand Slam (滿貫砲) 的專屬動畫，並帶有隊伍代表色。' : '走者の数に応じて、ソロホームラン、2ランホームラン、3ランホームラン、満塁ホームランの専用アニメーションをチームカラーで表示します。'}</li>
                <li>{language === 'en' ? 'Strikeout: ' : language === 'zh' ? '三振 (Strikeout)：' : '三振：'}{language === 'en' ? 'Triggers a \'K\' animation when strike reaches 3.' : language === 'zh' ? '當好球數達到 3 時，會觸發「K」字動畫。' : 'ストライクが3に達するとKアニメーションを表示します。'}</li>
                <li>{language === 'en' ? 'On-base & Scoring: ' : language === 'zh' ? '上壘與得分：' : '出塁と得点：'}{language === 'en' ? 'Smooth transitions for base changes and score updates.' : language === 'zh' ? '壘包狀態改變與分數跳動時，都有平滑的過渡效果。' : '塁状況とスコアの更新にスムーズなトランジション。'}</li>
              </ul>
            </div>
          )}

          {page === 5 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h3 className="text-2xl font-bold text-blue-600">{language === 'en' ? '5. Shortcuts' : language === 'zh' ? '5. 快捷鍵 (Shortcuts)' : '5. ショートカット'}</h3>
              <p className="text-slate-700">{language === 'en' ? 'Supports full keyboard shortcuts for blind operation!' : language === 'zh' ? '支援完整鍵盤快捷鍵，讓計分員可以盲操作，視線不離開球場！' : 'キーボードショートカットに対応し、ブラインド操作が可能！'}</p>
              
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-4 text-sm">
                <div className="flex justify-between border-b py-1">
                  <span className="text-slate-600">{language === 'en' ? 'Ball' : language === 'zh' ? '壞球 (Ball)' : 'ボール'}</span>
                  <kbd className="bg-slate-100 px-2 rounded border font-mono">1</kbd>
                </div>
                <div className="flex justify-between border-b py-1">
                  <span className="text-slate-600">{language === 'en' ? 'Strike' : language === 'zh' ? '好球 (Strike)' : 'ストライク'}</span>
                  <kbd className="bg-slate-100 px-2 rounded border font-mono">2</kbd>
                </div>
                <div className="flex justify-between border-b py-1">
                  <span className="text-slate-600">{language === 'en' ? 'Out' : language === 'zh' ? '出局 (Out)' : 'アウト'}</span>
                  <kbd className="bg-slate-100 px-2 rounded border font-mono">3</kbd>
                </div>
                <div className="flex justify-between border-b py-1">
                  <span className="text-slate-600">{language === 'en' ? 'Undo' : language === 'zh' ? '復原 (Undo)' : '元に戻す'}</span>
                  <kbd className="bg-slate-100 px-2 rounded border font-mono">Ctrl+Z</kbd>
                </div>
                <div className="flex justify-between border-b py-1">
                  <span className="text-slate-600">{language === 'en' ? '1st Base (Hold=1B)' : language === 'zh' ? '一壘 (長按=一壘安打)' : '一塁 (長押し=単打)'}</span>
                  <kbd className="bg-slate-100 px-2 rounded border font-mono">6</kbd>
                </div>
                <div className="flex justify-between border-b py-1">
                  <span className="text-slate-600">{language === 'en' ? '2nd Base (Hold=2B)' : language === 'zh' ? '二壘 (長按=二壘安打)' : '二塁 (長押し=二塁打)'}</span>
                  <kbd className="bg-slate-100 px-2 rounded border font-mono">8</kbd>
                </div>
                <div className="flex justify-between border-b py-1">
                  <span className="text-slate-600">{language === 'en' ? '3rd Base (Hold=3B)' : language === 'zh' ? '三壘 (長按=三壘安打)' : '三塁 (長押し=三塁打)'}</span>
                  <kbd className="bg-slate-100 px-2 rounded border font-mono">4</kbd>
                </div>
                <div className="flex justify-between border-b py-1">
                  <span className="text-slate-600">{language === 'en' ? 'Home Run' : language === 'zh' ? '全壘打' : 'ホームラン'}</span>
                  <kbd className="bg-slate-100 px-2 rounded border font-mono">Enter</kbd>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">{language === 'en' ? '* You can customize keys in the Shortcuts menu.' : language === 'zh' ? '* 您可以在頂部工具列的「Shortcuts」中自訂所有鍵盤按鍵。' : '* ショートカットメニューでキーをカスタマイズできます。'}</p>
            </div>
          )}

          {page === 6 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h3 className="text-2xl font-bold text-blue-600">{language === 'en' ? '6. Projector' : language === 'zh' ? '6. 投影與延伸畫面 (Project)' : '6. プロジェクター'}</h3>
              <p className="text-slate-700">{language === 'en' ? 'Use Project feature for dual-screen setups (e.g. OBS or live screens).' : language === 'zh' ? '如果您有雙螢幕（例如連接到現場的大螢幕或轉播軟體 OBS），可以使用 Project 功能。' : 'OBSや球場スクリーンなどのデュアルスクリーン環境でProject機能を使用できます。'}</p>
              
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-4">
                <ol className="list-decimal list-inside space-y-3 text-slate-700">
                  <li>{language === 'en' ? 'Click the Open Projector or OBS button in the top bar.' : language === 'zh' ? '點擊頂部工具列的「Project」或專屬「OBS」按鈕。' : '上部ツールバーの「Project」または「OBS」ボタンをクリック。'}</li>
                  <li>{language === 'en' ? 'For OBS Studio: Click the "OBS" button to copy the 100% transparent browser source URL!' : language === 'zh' ? 'OBS 直播推薦：點擊「OBS」按鈕，可直接複製 100% 透明背景的瀏覽器來源網址，寬度設 1920、高度設 1080，無須去背即可完美疊加在比賽影片上！' : 'OBS配信：上部の「OBS」ボタンを押すと、完全背景透過の専用URLをコピーできます。幅1920・高さ1080で設定するだけで綺麗に重ね合わせ可能！'}</li>
                  <li>{language === 'en' ? 'For second monitors: Drag the Project window to your physical field screen.' : language === 'zh' ? '實體球場大螢幕：點擊「Project」彈出獨立全螢幕計分板，拖曳至第二螢幕投影。' : '球場大画面：Projectウィンドウをセカンドスクリーンにドラッグして全画面表示。'}</li>
                  <li>{language === 'en' ? 'All score actions, counts, and animations are synced in real-time!' : language === 'zh' ? '您在主控制台或手機的所有操作與全壘打動畫，都會毫秒級即時同步！' : '操作画面やスマホからのすべての操作とアニメーションがミリ秒単位で同期されます！'}</li>
                </ol>
              </div>
              
              <div className="mt-4 flex justify-center">
                <div className="w-64 h-32 bg-slate-800 rounded-lg border-4 border-slate-900 flex items-center justify-center text-white shadow-xl relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-900/50 to-purple-900/50"></div>
                  <span className="relative z-10 font-bold tracking-widest">{language === 'zh' ? 'OBS / 大螢幕' : language === 'en' ? 'OBS / Second Screen' : 'OBS / セカンドスクリーン'}</span>
                </div>
              </div>

                          </div>
          )}

          {page === 7 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h3 className="text-2xl font-bold text-blue-600">
                {language === 'en' ? '7. Mobile Remote Control' : language === 'zh' ? '7. 手機遠端遙控' : '7. スマホ遠隔操作'}
              </h3>
              <p className="text-slate-700">
                {language === 'en'
                  ? 'Use your smartphone or a second device as a wireless handheld remote for the scoreboard.'
                  : language === 'zh'
                  ? '使用您的智慧型手機或另一台裝置，直接作為大螢幕記分板的無線掌上型遙控器！'
                  : 'スマートフォン等を無線リモコンとしてスコアボードを操作できます！'}
              </p>
              
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-4">
                <ol className="list-decimal list-inside space-y-3 text-slate-700">
                  <li>
                    {language === 'zh'
                      ? '點擊頂部工具列或控制台的「手機遙控」按鈕。'
                      : 'Click the Mobile Remote button in the top toolbar or controls.'}
                  </li>
                  <li>
                    {language === 'zh'
                      ? '使用手機相機掃描畫面上的專屬 QR Code，或輸入 6 碼房間代碼。'
                      : 'Scan the displayed QR code with your phone camera, or enter the 6-character room code.'}
                  </li>
                  <li>
                    {language === 'zh'
                      ? '手機會自動進入「極簡快控模式」，提供超大好壞球、得分、出局數、打席結果按鈕與震動觸控回饋！'
                      : 'Your phone opens the tactile fast-remote pad with BSO buttons, runs, outs, and haptic feedback!'}
                  </li>
                  <li>
                    {language === 'zh'
                      ? '支援多台手機或裝置即時同步操作與即時瀏覽記分狀態。'
                      : 'Supports multiple devices with instant real-time synchronization.'}
                  </li>
                </ol>
              </div>
            </div>
          )}

          {page === 8 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 flex flex-col items-center justify-center h-64 text-center">
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Credits</h3>
              <div className="text-lg text-slate-600">
                {language === 'en' ? 'Production, Design, Ideation: ' : language === 'zh' ? '製作、設計、發想：' : '制作・デザイン・発案：'}
                <a href="https://www.instagram.com/yorunann/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold ml-1">
                  Yorunann
                </a>
              </div>
              <div className="text-lg text-slate-600">
                {language === 'en' ? 'Co-developer: ' : language === 'zh' ? '共同開發：' : '共同開発：'}
                <a href="https://github.com/Good9tTo9t" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold ml-1">
                  Good9tTo9t
                </a>
              </div>
            </div>
          )}

        </div>

        <div className="p-4 border-t bg-slate-50 flex justify-between items-center shrink-0">
          <div className="flex gap-1">
            {Array.from({ length: totalPages }).map((_, i) => (
              <div 
                key={i} 
                className={`w-2 h-2 rounded-full transition-colors ${page === i + 1 ? 'bg-blue-600' : 'bg-slate-300'}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={prevPage} 
              disabled={page === 1}
              className="w-24 py-2 flex items-center justify-center gap-1 rounded-lg font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors select-none"
            >
              <ChevronLeft className="w-4 h-4" /> {language === 'en' ? 'Prev' : language === 'zh' ? '上一頁' : '前へ'}
            </button>
            {page < totalPages ? (
              <button 
                onClick={nextPage}
                className="w-28 py-2 flex items-center justify-center gap-1 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors select-none"
              >
                {language === 'en' ? 'Next' : language === 'zh' ? '下一頁' : '次へ'} <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button 
                onClick={onClose}
                className="w-28 py-2 flex items-center justify-center gap-1 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors select-none"
              >
                {language === 'en' ? 'Get Started!' : language === 'zh' ? '開始使用！' : 'はじめる！'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
