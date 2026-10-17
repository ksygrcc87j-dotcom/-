import React from 'react';
import { 
  Bell, 
  Activity, 
  Volume2, 
  VolumeX, 
  TrendingUp, 
  Zap, 
  CheckCircle2, 
  Clock
} from 'lucide-react';
import { requestNotificationPermission } from '../services/alertService';

interface HeaderProps {
  isLive: boolean;
  onToggleLive: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenAlertModal: () => void;
  onOpenAlertHistory: () => void;
  unseenAlertsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  isLive,
  onToggleLive,
  soundEnabled,
  onToggleSound,
  onOpenAlertModal,
  onOpenAlertHistory,
  unseenAlertsCount,
}) => {
  const [notifPermission, setNotifPermission] = React.useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const handleRequestPermission = async () => {
    const res = await requestNotificationPermission();
    setNotifPermission(res);
  };

  return (
    <header className="bg-slate-950 border-b border-slate-800/80 sticky top-0 z-40 backdrop-blur-md bg-opacity-95 text-slate-100">
      {/* Top micro market tape */}
      <div className="bg-slate-900/90 border-b border-slate-800/60 px-4 py-1 text-xs text-slate-400 flex items-center justify-between overflow-x-auto">
        <div className="flex items-center space-x-6 min-w-max">
          <span className="flex items-center text-slate-300 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
            台股加權指數 (TAIEX): <strong className="ml-1 text-red-400">22,865.32</strong>
            <span className="ml-1.5 text-xs text-red-400 font-semibold">+185.12 (+0.82%)</span>
            <span className="ml-2 text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700">今日收盤結算</span>
          </span>
          <span className="hidden sm:inline text-slate-400">|</span>
          <span className="hidden sm:flex items-center text-slate-300">
            櫃買指數 (TPEx): <strong className="ml-1 text-red-400">272.85</strong>
            <span className="ml-1.5 text-xs text-red-400 font-semibold">+1.65 (+0.61%)</span>
          </span>
          <span className="hidden md:inline text-slate-400">|</span>
          <span className="hidden md:flex items-center text-slate-300">
            今日總成交金額: <strong className="ml-1 text-amber-400">4,380 億元</strong>
          </span>
        </div>

        <div className="flex items-center space-x-3 text-xs text-slate-400 min-w-max pl-4">
          <span className="flex items-center text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded font-semibold">
            <Clock className="w-3 h-3 mr-1" /> 當日收盤資料 (13:30 正式結算)
          </span>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-blue-200 bg-clip-text text-transparent">
                三竹智投
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-blue-600 text-white tracking-wider shadow-sm">
                藍三竹 SANZHU
              </span>
            </div>
            <p className="text-[11px] text-cyan-300/80 hidden sm:block">
              藍三竹即時大單籌碼 · 證交所行情連線 (146+檔) · AI 投研大腦
            </p>
          </div>
        </div>

        {/* Global Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Real-time Streaming Simulation Toggle */}
          <button
            onClick={onToggleLive}
            title={isLive ? '目前為即時模擬跳動中 (點擊切換為當日正式收盤定錨)' : '目前為當日正式收盤結算資料 (點擊可開啟即時跳動)'}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              isLive
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 shadow-sm shadow-amber-500/20'
                : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-sm shadow-emerald-500/20'
            }`}
          >
            <Activity className={`w-3.5 h-3.5 ${isLive ? 'animate-pulse text-amber-400' : 'text-emerald-400'}`} />
            <span>{isLive ? '即時跳動模擬中' : '當日收盤正式數據'}</span>
          </button>

          {/* Sound Alert Toggle */}
          <button
            onClick={onToggleSound}
            title={soundEnabled ? '音效已開啟 (點擊靜音)' : '音效已靜音 (點擊開啟)'}
            className={`p-2 rounded-lg text-xs border transition-colors ${
              soundEnabled
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-blue-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Notification Permission */}
          {notifPermission !== 'granted' && (
            <button
              onClick={handleRequestPermission}
              className="hidden md:flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 border border-amber-500/40 text-amber-300 hover:bg-amber-500/20 transition-all"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>啟用推播</span>
            </button>
          )}

          {/* Alert Management Modal Button */}
          <button
            onClick={onOpenAlertModal}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-600/20"
          >
            <Bell className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">設定警示</span>
          </button>

          {/* Alert Trigger Log Button */}
          <button
            onClick={onOpenAlertHistory}
            className="relative p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            title="查看即時推播警示紀錄"
          >
            <Bell className="w-4 h-4" />
            {unseenAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                {unseenAlertsCount > 9 ? '9+' : unseenAlertsCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
