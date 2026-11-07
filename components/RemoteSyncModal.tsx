import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Smartphone,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Zap,
  Users,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Eye,
  Edit3,
  UserX,
  Laptop,
  Tv,
} from 'lucide-react';
import { ConnectionStatus, ConnectedClientInfo, RemoteRole } from '../hooks/usePeerSync';

interface RemoteSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  onRegenerateRoomCode: () => void;
  onChangeRoomCode?: (newCode: string) => void;
  connectionStatus: ConnectionStatus;
  connectedClientsCount: number;
  connectedClients: ConnectedClientInfo[];
  defaultRole: RemoteRole;
  onChangeDefaultRole: (role: RemoteRole) => void;
  onKickClient: (clientId: string) => void;
  onChangeClientRole: (clientId: string, role: RemoteRole) => void;
  onUnblockAll?: () => void;
  language: 'en' | 'zh' | 'ja';
}

export const RemoteSyncModal: React.FC<RemoteSyncModalProps> = ({
  isOpen,
  onClose,
  roomCode,
  onRegenerateRoomCode,
  onChangeRoomCode,
  connectionStatus,
  connectedClientsCount,
  connectedClients,
  defaultRole,
  onChangeDefaultRole,
  onKickClient,
  onChangeClientRole,
  onUnblockAll,
  language,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [manualJoinCode, setManualJoinCode] = useState('');
  const [activeTab, setActiveTab] = useState<'qr' | 'devices'>('qr');

  // Generate mobile remote URL
  const mobileUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?mode=remote&room=${encodeURIComponent(roomCode.toLowerCase())}`
    : `?mode=remote&room=${roomCode}`;

  useEffect(() => {
    if (!isOpen || !mobileUrl) return;
    QRCode.toDataURL(mobileUrl, {
      width: 280,
      margin: 1.5,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code', err));
  }, [isOpen, mobileUrl]);

  if (!isOpen) return null;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(mobileUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback
    }
  };

  const getDeviceIcon = (client: ConnectedClientInfo) => {
    if (client.clientType === 'obs') {
      return <Tv size={18} className="text-purple-400" />;
    }
    const n = client.name.toLowerCase();
    if (n.includes('mac') || n.includes('windows') || n.includes('linux')) {
      return <Laptop size={18} className="text-blue-400" />;
    }
    return <Smartphone size={18} className="text-emerald-400" />;
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-blue-950/40 to-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Smartphone size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  {language === 'zh' ? '手機遠端遙控與連線管理' : language === 'ja' ? '遠隔操作と権限管理' : 'Remote Control & Permissions'}
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded-full">
                  {language === 'zh' ? '即時同步' : language === 'ja' ? '同期中' : 'Live Sync'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {language === 'zh'
                  ? '手機即時操控記分板，主機可隨時控制權限或解除連線'
                  : 'Manage connected remote controllers and permission roles'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab switcher: QR Code vs Device Management */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 pt-2 gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('qr')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'qr'
                ? 'bg-slate-900 text-blue-400 border-blue-500 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/40'
            }`}
          >
            <Smartphone size={15} />
            <span>{language === 'zh' ? '連線 QR Code / 代碼' : 'QR Code & Link'}</span>
          </button>
          <button
            onClick={() => setActiveTab('devices')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'devices'
                ? 'bg-slate-900 text-blue-400 border-blue-500 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/40'
            }`}
          >
            <Users size={15} />
            <span>{language === 'zh' ? '已連線裝置與權限' : 'Connected Devices'}</span>
            {connectedClients.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-black rounded-full bg-emerald-500 text-slate-950">
                {connectedClients.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Status Badge */}
          <div className={`p-3 rounded-xl border flex items-center justify-between ${
            connectedClientsCount > 0
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : connectionStatus === 'connected'
              ? 'bg-blue-950/30 border-blue-500/30 text-blue-200'
              : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
          }`}>
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                {connectedClientsCount > 0 ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </>
                ) : (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                  </>
                )}
              </span>
              <span className="text-xs sm:text-sm font-bold">
                {connectedClientsCount > 0
                  ? `目前共有 ${connectedClientsCount} 台裝置連線中`
                  : '等待手機或外部裝置掃描連線中...'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-black/40 text-slate-300">
              <Zap size={14} className="text-yellow-400" />
              <span>{language === 'zh' ? '即時連線' : 'Live'}</span>
            </div>
          </div>

          {activeTab === 'qr' ? (
            /* QR Code & Code Section */
            <div className="flex flex-col sm:flex-row items-center gap-5 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              {/* QR Code */}
              <div className="p-2 bg-white rounded-xl shadow-lg shrink-0 flex items-center justify-center">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Remote Control QR Code"
                    className="w-44 h-44 sm:w-48 sm:h-48 rounded-lg object-contain"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs">
                    載入 QR Code 中...
                  </div>
                )}
              </div>

              {/* Instruction & Room Code */}
              <div className="flex-1 flex flex-col justify-between space-y-3 w-full">
                <div>
                  <span className="text-xs text-slate-400 font-medium block mb-1">
                    步驟 1：使用手機相機掃描 QR Code，或輸入房間代碼
                  </span>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="bg-slate-900 border border-slate-700 px-3.5 py-2 rounded-lg font-mono text-xl font-black text-yellow-400 tracking-widest select-all">
                      {roomCode}
                    </div>
                    <button
                      onClick={handleCopyCode}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
                      title="複製代碼"
                    >
                      {copiedCode ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                      <span>{copiedCode ? '已複製' : '代碼'}</span>
                    </button>
                    <button
                      onClick={onRegenerateRoomCode}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg border border-slate-700 transition-colors cursor-pointer"
                      title="重新生成新房間代碼"
                    >
                      <RefreshCw size={16} />
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-400 font-medium block mb-1">
                    步驟 2：也可以複製連結發送給隊友或裁判
                  </span>
                  <button
                    onClick={handleCopyUrl}
                    className="w-full py-2 px-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-blue-200 border border-blue-500/40 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {copiedUrl ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                    <span>{copiedUrl ? '已成功複製遙控連結！' : '一鍵複製手機遙控網址'}</span>
                  </button>
                </div>

                <div>
                  <a
                    href={mobileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink size={14} />
                    <span>在此電腦另開新分頁測試遙控器</span>
                  </a>
                </div>
              </div>
            </div>
          ) : null}

          {/* Join from Another PC or Switch Room */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Laptop size={16} className="text-cyan-400" />
                <span className="text-xs font-bold text-white">
                  {language === 'zh' ? '在另一台電腦加入此賽事 / 手動輸入代碼' : 'Join Match from Another PC'}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {language === 'zh'
                ? '若要在另一台電腦上同步顯示或操作本賽況，可於該電腦開啟遙控連結，或在下方輸入主機的 6 碼房間代碼：'
                : 'To control from another PC, open the remote URL on that PC or enter a room code below:'}
            </p>
            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <input
                type="text"
                value={manualJoinCode}
                onChange={(e) => setManualJoinCode(e.target.value.toUpperCase())}
                placeholder={language === 'zh' ? '輸入 6 碼房間代碼 (如 ABC123)' : 'Enter Room Code'}
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl font-mono text-sm font-bold text-yellow-400 placeholder:text-slate-600 uppercase tracking-wider"
                maxLength={10}
              />
              <button
                type="button"
                onClick={() => {
                  if (!manualJoinCode.trim()) return;
                  const targetCode = manualJoinCode.trim().toUpperCase();
                  const targetUrl = `${window.location.origin}${window.location.pathname}?mode=remote&room=${targetCode.toLowerCase()}`;
                  window.open(targetUrl, '_blank');
                }}
                disabled={!manualJoinCode.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Smartphone size={14} />
                <span>{language === 'zh' ? '另開新分頁遙控' : 'Open Remote'}</span>
              </button>
              {onChangeRoomCode && (
                <button
                  type="button"
                  onClick={() => {
                    if (!manualJoinCode.trim()) return;
                    onChangeRoomCode(manualJoinCode.trim().toUpperCase());
                    setManualJoinCode('');
                  }}
                  disabled={!manualJoinCode.trim()}
                  className="px-4 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 disabled:opacity-40 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RefreshCw size={14} />
                  <span>{language === 'zh' ? '切換主控台房間' : 'Switch Room'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Device & Permission Management (Always visible or in devices tab) */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-4">
            {/* Top row: Default role setting for new devices */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-blue-400 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-white block">
                    新連線裝置預設權限
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    新掃碼連入的使用者初始角色
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => onChangeDefaultRole('editor')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    defaultRole === 'editor'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Edit3 size={13} />
                  <span>編輯者 (可操作)</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeDefaultRole('viewer')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    defaultRole === 'viewer'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Eye size={13} />
                  <span>閱覽者 (唯讀)</span>
                </button>
              </div>
            </div>

            {/* Connected devices list */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <Users size={15} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-300">
                    連線中的裝置列表 ({connectedClients.length})
                  </span>
                </div>
                {onUnblockAll && (
                  <button
                    onClick={onUnblockAll}
                    className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    title="重置被封鎖的名單"
                  >
                    重設黑名單
                  </button>
                )}
              </div>

              {connectedClients.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/30 text-slate-400 text-xs space-y-1">
                  <p className="font-semibold text-slate-300">目前尚無其他裝置連線</p>
                  <p className="text-[11px] text-slate-500">
                    掃描上方 QR Code 或輸入房間代碼加入後，裝置將自動顯示在此處，主機可隨時變更其權限或強制解除遙控。
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {connectedClients.map((client) => {
                    const isViewer = client.role === 'viewer';
                    return (
                      <div
                        key={client.id}
                        className="p-3 bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors shadow-sm"
                      >
                        {/* Device info */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                            {getDeviceIcon(client)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white truncate max-w-[160px] sm:max-w-[220px]">
                                {client.name}
                              </span>
                              <span className="font-mono text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 shrink-0">
                                #{client.id.slice(-5)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                {client.transport === 'webrtc' ? '⚡ P2P 直連' : '☁️ 雲端同步'}
                              </span>
                              <span>•</span>
                              <span className={isViewer ? 'text-amber-400 font-semibold' : 'text-blue-400 font-semibold'}>
                                {isViewer ? '唯讀閱覽' : '完整控制'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions: Role switcher & Kick button */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {/* Role Toggle */}
                          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                            <button
                              type="button"
                              onClick={() => onChangeClientRole(client.id, 'editor')}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                                !isViewer
                                  ? 'bg-blue-600 text-white shadow'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                              title="給予編輯者權限（可修改球數、比分、更換打線等）"
                            >
                              <Edit3 size={11} />
                              <span>編輯者</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onChangeClientRole(client.id, 'viewer')}
                              className={`px-2.5 py-1 text-[11px] font-bold rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                                isViewer
                                  ? 'bg-amber-600 text-white shadow'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                              title="設為閱覽者（僅供查看記分板，無法按鈕操作）"
                            >
                              <Eye size={11} />
                              <span>閱覽者</span>
                            </button>
                          </div>

                          {/* Kick / Disconnect Button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`確定要解除「${client.name}」的遠端遙控連線嗎？`)) {
                                onKickClient(client.id);
                              }
                            }}
                            className="px-2.5 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-rose-100 border border-rose-800/60 hover:border-rose-700 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-sm"
                            title="解除此裝置的遠端遙控權限並斷開連線"
                          >
                            <UserX size={13} />
                            <span>解除遙控</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-between items-center shrink-0">
          <div className="text-[11px] text-slate-500">
            主機具備最高管理權限，可即時踢除連線或調整權限
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
