import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Flame, 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  ShieldCheck, 
  Star, 
  Check, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Copy, 
  Sparkles, 
  Crosshair, 
  Activity, 
  BarChart3, 
  ChevronRight, 
  Layers, 
  Compass, 
  Info,
  Clock,
  ArrowRight,
  RefreshCw,
  Award,
  PackageCheck,
  CheckCircle2,
  CalendarClock
} from 'lucide-react';
import { ScannedMomentumStock, scanDailyTop20MomentumStocks, MomentumStrategyType } from '../utils/momentumScanner';
import { getScheduleStatus, checkHasCrossedSchedule, ScheduleStatus } from '../utils/scheduledPriceUpdater';

interface DailyMomentumScannerProps {
  onSelectStock: (symbol: string) => void;
  watchlistSymbols: string[];
  onToggleWatchlist: (symbol: string) => void;
  liveQuotes?: Record<string, any>;
  lastSyncTime?: string;
  onRefreshQuotes?: (force?: boolean) => void;
  isSyncing?: boolean;
}

export const DailyMomentumScanner: React.FC<DailyMomentumScannerProps> = ({
  onSelectStock,
  watchlistSymbols,
  onToggleWatchlist,
  liveQuotes,
  lastSyncTime,
  onRefreshQuotes,
  isSyncing = false
}) => {
  const [strategyFilter, setStrategyFilter] = useState<
    'all' | 'strongLong' | 'low' | 'mid' | 'high' | MomentumStrategyType | 'accumulating' | 'highTurnover' | 'institutional'
  >('all');
  // 技術指標篩選面板狀態：『站上月線』與『KD 黃金交叉』
  const [filterAboveMa20, setFilterAboveMa20] = useState<boolean>(false);
  const [filterKdGoldenCross, setFilterKdGoldenCross] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSort, setSelectedSort] = useState<
    'powerRatio' | 'score' | 'turnover' | 'majorNet' | 'change' | 'amplitude' | 'volume'
  >('powerRatio');
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [showFormulaModal, setShowFormulaModal] = useState<boolean>(false);
  
  // Scheduled Update status state (每日收盤價 下午 13:30)
  const [scheduleState, setScheduleState] = useState<ScheduleStatus>(() => getScheduleStatus());
  const [scheduledUpdateNotice, setScheduledUpdateNotice] = useState<string | null>(null);
  const lastSlotRef = useRef<string>(scheduleState.slotKey);

  // Live timer tick for 13:30 daily closing price auto-update countdown and trigger
  useEffect(() => {
    const timer = setInterval(() => {
      const current = getScheduleStatus();
      setScheduleState(current);

      // Check if current time crossed 13:30 daily closing threshold
      const check = checkHasCrossedSchedule(lastSlotRef.current);
      if (check.shouldSync) {
        lastSlotRef.current = check.newSlotKey;
        if (onRefreshQuotes) {
          onRefreshQuotes(true);
        }
        setScheduledUpdateNotice(`已到達每日更新時間 (下午 13:30 每日收盤價)，已自動同步最新收盤股價與籌碼！`);
        setTimeout(() => setScheduledUpdateNotice(null), 8000);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [onRefreshQuotes]);

  // Scan 30 momentum stocks using current live quotes (5 high + 25 mid-low)
  const allScannedStocks = useMemo(() => {
    return scanDailyTop20MomentumStocks(liveQuotes);
  }, [liveQuotes]);

  // Filter stocks based on strategy, technical filter panel (站上月線 / KD 黃金交叉), and search term
  const filteredStocks = useMemo(() => {
    return allScannedStocks.filter(stock => {
      // Price category filter (15檔低價股 / 10檔中價股 / 5檔高價股)
      if (strategyFilter === 'low' && stock.priceCategory !== 'low') return false;
      if (strategyFilter === 'mid' && stock.priceCategory !== 'mid') return false;
      if (strategyFilter === 'high' && stock.priceCategory !== 'high') return false;

      // Indicator-specific filters (以籌碼多空比・做多為優先選擇)
      if (strategyFilter === 'strongLong' && stock.majorPowerRatio < 1.55) return false;
      if (strategyFilter === 'accumulating' && !stock.isMajorAccumulating) return false;
      if (strategyFilter === 'highTurnover' && stock.turnoverRate < 5.0) return false;

      // Strategy filter
      if (strategyFilter === 'daytrade' && stock.strategyType !== 'daytrade') return false;
      if (strategyFilter === 'swing' && stock.strategyType !== 'swing') return false;
      if (strategyFilter === 'dual' && stock.strategyType !== 'dual') return false;
      if (strategyFilter === 'institutional' && (stock.foreignNetBuyLots <= 0 && stock.trustNetBuyLots <= 0)) return false;

      // 技術面進階篩選：『站上月線』與『KD 黃金交叉』
      if (filterAboveMa20 && !stock.isAboveMa20) return false;
      if (filterKdGoldenCross && !stock.isKdGoldenCross) return false;

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.trim().toLowerCase();
        const matchSymbol = stock.symbol.toLowerCase().includes(query);
        const matchName = stock.name.toLowerCase().includes(query);
        const matchIndustry = stock.industry.toLowerCase().includes(query);
        const matchTags = stock.categoryTags.some(t => t.toLowerCase().includes(query));
        const matchKd = stock.kdStatusLabel.toLowerCase().includes(query);
        const matchMa = stock.signals.maTrend.toLowerCase().includes(query);
        if (!matchSymbol && !matchName && !matchIndustry && !matchTags && !matchKd && !matchMa) return false;
      }

      return true;
    }).sort((a, b) => {
      if (selectedSort === 'score') return b.momentumScore - a.momentumScore;
      if (selectedSort === 'turnover') return b.turnoverRate - a.turnoverRate;
      if (selectedSort === 'powerRatio') return b.majorPowerRatio - a.majorPowerRatio;
      if (selectedSort === 'majorNet') return b.majorNetLots - a.majorNetLots;
      if (selectedSort === 'change') return b.changePercent - a.changePercent;
      if (selectedSort === 'amplitude') return b.amplitude - a.amplitude;
      if (selectedSort === 'volume') return b.volume - a.volume;
      return 0;
    });
  }, [allScannedStocks, strategyFilter, filterAboveMa20, filterKdGoldenCross, searchTerm, selectedSort]);

  // Aggregate stats of the 30 stocks (15 low + 10 mid + 5 high)
  const stats = useMemo(() => {
    const total = allScannedStocks.length;
    const lowCount = allScannedStocks.filter(s => s.priceCategory === 'low').length;
    const midCount = allScannedStocks.filter(s => s.priceCategory === 'mid').length;
    const highCount = allScannedStocks.filter(s => s.priceCategory === 'high').length;
    const accumulatingCount = allScannedStocks.filter(s => s.isMajorAccumulating).length;
    const highTurnoverCount = allScannedStocks.filter(s => s.turnoverRate >= 5.0).length;
    const daytradeCount = allScannedStocks.filter(s => s.strategyType === 'daytrade').length;
    const swingCount = allScannedStocks.filter(s => s.strategyType === 'swing').length;
    const dualCount = allScannedStocks.filter(s => s.strategyType === 'dual').length;
    const aboveMa20Count = allScannedStocks.filter(s => s.isAboveMa20).length;
    const kdGoldenCrossCount = allScannedStocks.filter(s => s.isKdGoldenCross).length;
    const dualTechCount = allScannedStocks.filter(s => s.isAboveMa20 && s.isKdGoldenCross).length;
    const avgAmp = (allScannedStocks.reduce((acc, s) => acc + s.amplitude, 0) / total).toFixed(1);
    const avgTurnover = (allScannedStocks.reduce((acc, s) => acc + s.turnoverRate, 0) / total).toFixed(1);
    const avgPowerRatio = (allScannedStocks.reduce((acc, s) => acc + s.majorPowerRatio, 0) / total).toFixed(2);
    const avgBullRatioPct = (allScannedStocks.reduce((acc, s) => acc + s.bullRatioPct, 0) / total).toFixed(1);
    const strongLongCount = allScannedStocks.filter(s => s.majorPowerRatio >= 1.55).length;
    const totalMajorNet = allScannedStocks.reduce((acc, s) => acc + s.majorNetLots, 0);
    const upCount = allScannedStocks.filter(s => s.change > 0).length;

    return { 
      total, 
      lowCount,
      midCount,
      highCount, 
      accumulatingCount,
      highTurnoverCount,
      daytradeCount, 
      swingCount, 
      dualCount, 
      aboveMa20Count,
      kdGoldenCrossCount,
      dualTechCount,
      avgAmp, 
      avgTurnover,
      avgPowerRatio,
      avgBullRatioPct,
      strongLongCount,
      totalMajorNet, 
      upCount
    };
  }, [allScannedStocks]);

  // Top 3 Podium
  const podiumTop3 = allScannedStocks.slice(0, 3);

  // Copy symbol list handler
  const handleCopySymbols = () => {
    const listStr = allScannedStocks.map(s => `${s.symbol} ${s.name}`).join(', ');
    navigator.clipboard.writeText(listStr);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Scheduled Update Notification Bar */}
      {scheduledUpdateNotice && (
        <div className="bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-2xl flex items-center justify-between text-xs shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold">{scheduledUpdateNotice}</span>
          </div>
          <button 
            onClick={() => setScheduledUpdateNotice(null)}
            className="text-emerald-400 hover:text-emerald-200 font-bold ml-2 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner & Overview */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-rose-950/40 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-500/25 text-rose-200 border border-rose-500/50 flex items-center shadow-sm">
                <Flame className="w-3.5 h-3.5 mr-1 text-rose-400 animate-pulse" />
                以籌碼多空比・做多為優先選擇
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                每日嚴選 30 檔 (15檔低價股 + 10檔中價股 + 5檔高價股)
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${scheduleState.currentPhaseBadge} flex items-center`}>
                <Clock className="w-3.5 h-3.5 mr-1" />
                {scheduleState.currentPhaseTitle}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight flex flex-wrap items-center gap-2">
              <span>每日高動能飆股精選 · 籌碼多空比做多優先</span>
              <span className="text-sm font-bold text-rose-300 font-mono bg-rose-950/70 px-2.5 py-0.5 rounded-lg border border-rose-500/40">
                100% 多方主導 (多空比 &gt; 1.2x)
              </span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              核心選股邏輯修正為：<strong className="text-rose-300 underline decoration-rose-500/60 underline-offset-4">以【籌碼多空比，做多為優先選擇】</strong>（特大單+大單買盤大於賣盤，多空比 &gt; 1.0x 多方強勢控盤），並結合<strong className="text-amber-300">【高動能】</strong>、<strong className="text-cyan-300">【周轉率高】</strong>與<strong className="text-emerald-300">【主力收貨中】</strong>。嚴格配置 <strong className="text-emerald-300">15 檔低價股</strong>、<strong className="text-sky-300">10 檔中價股</strong>、<strong className="text-purple-300">5 檔高價股</strong>，共計 30 檔做多精選飆股。
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleCopySymbols}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-all shadow-sm"
              title="一鍵複製 30 檔代號與名稱 (15檔低價股+10檔中價股+5檔高價股)"
            >
              {copiedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedSuccess ? '已複製 30 檔！' : '複製 30 檔代號'}</span>
            </button>

            <button
              onClick={() => setShowFormulaModal(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-bold text-indigo-300 border border-indigo-500/30 transition-all shadow-sm"
            >
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              <span>四大指標邏輯說明</span>
            </button>

            {onRefreshQuotes && (
              <button
                onClick={() => onRefreshQuotes(true)}
                disabled={isSyncing}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? '收盤價同步中...' : '同步 13:30 收盤價'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Scheduled Update Countdown Banner (每日收盤價 下午 13:30) */}
        <div className="mt-4 p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs relative z-10">
          <div className="flex flex-wrap items-center gap-2 text-slate-300">
            <span className="flex items-center text-amber-400 font-bold">
              <CalendarClock className="w-4 h-4 mr-1 text-amber-400" />
              股價資料每日更新時間：
            </span>
            <span className="bg-emerald-950/70 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold border border-emerald-500/40 text-emerald-300">
              🕒 每日收盤價 · 下午 13:30 (台股正式收盤結算)
            </span>
            <span className="text-slate-400 text-[11px]">
              最新同步時間：{lastSyncTime || '每日 13:30 收盤價'}
            </span>
          </div>

          <div className="flex items-center space-x-3 font-mono">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">距離下次每日 13:30 更新</span>
              <span className="text-cyan-300 font-bold text-xs">{scheduleState.nextScheduleTitle}</span>
            </div>
            <div className="px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-bold text-sm tracking-wider">
              {scheduleState.countdownFormatted}
            </div>
          </div>
        </div>

        {/* 4 Core Indicator Cards — #1 Priority: 籌碼多空比 (做多優先) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-800/80 text-xs font-mono relative z-10">
          {/* 1. Power Ratio (Primary Selection Rule: 籌碼多空比・做多優先) */}
          <div className="bg-gradient-to-br from-rose-950/60 to-slate-950/90 p-3 rounded-xl border border-rose-500/50 ring-1 ring-rose-500/20">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="flex items-center text-rose-300 font-extrabold">
                <BarChart3 className="w-3.5 h-3.5 mr-1 text-rose-400" />
                1. 籌碼多空比 (做多首選)
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-bold">第一優先</span>
            </div>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <strong className="text-xl font-black text-rose-400">{stats.avgPowerRatio}x</strong>
              <span className="text-rose-200 text-[10px] font-bold">多方佔比 {stats.avgBullRatioPct}%</span>
            </div>
            <span className="text-[10px] text-rose-300 block mt-0.5">
              全數做多優先 · 強力做多(≥1.55x) {stats.strongLongCount} 檔
            </span>
          </div>

          {/* 2. Momentum */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="flex items-center text-amber-300 font-bold">
                <Flame className="w-3.5 h-3.5 mr-1 text-amber-400" />
                2. 高動能指標
              </span>
              <span className="text-[10px] text-slate-500">均分</span>
            </div>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <strong className="text-xl font-black text-amber-400">92.8</strong>
              <span className="text-slate-400 text-[10px]">/ 99分</span>
            </div>
            <span className="text-[10px] text-emerald-400 block mt-0.5">
              強攻標的 {stats.upCount} 檔 · 均幅 {stats.avgAmp}%
            </span>
          </div>

          {/* 3. Turnover Rate */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="flex items-center text-cyan-300 font-bold">
                <Zap className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                3. 周轉率指標
              </span>
              <span className="text-[10px] text-slate-500">高換手</span>
            </div>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <strong className="text-xl font-black text-cyan-400">{stats.avgTurnover}%</strong>
              <span className="text-slate-400 text-[10px]">平均周轉</span>
            </div>
            <span className="text-[10px] text-cyan-300 block mt-0.5">
              超高周轉 (≥5%) 共 {stats.highTurnoverCount} 檔
            </span>
          </div>

          {/* 4. Major Accumulation */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span className="flex items-center text-emerald-300 font-bold">
                <PackageCheck className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                4. 主力收貨中
              </span>
              <span className="text-[10px] text-slate-500">淨買超</span>
            </div>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <strong className="text-xl font-black text-emerald-400">
                +{ (stats.totalMajorNet / 1000).toFixed(1) }k
              </strong>
              <span className="text-slate-400 text-[10px]">張 鎖碼</span>
            </div>
            <span className="text-[10px] text-emerald-300 block mt-0.5">
              收貨標的 {stats.accumulatingCount} 檔 (低價{stats.lowCount}檔 · 中價{stats.midCount}檔 · 高價{stats.highCount}檔)
            </span>
          </div>
        </div>
      </div>

      {/* Podium Top 3 Spotlight Cards */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center space-x-2 text-sm font-bold text-slate-200">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>今日動能冠亞季軍 (Top 3 Momentum Leaders)</span>
          </div>
          <span className="text-xs text-slate-400">點擊卡片立即載入詳細分析</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {podiumTop3.map((stock, idx) => {
            const isRank1 = idx === 0;
            const isRank2 = idx === 1;
            const medalColor = isRank1 
              ? 'from-amber-500/20 via-slate-900 to-slate-900 border-amber-500/50 shadow-amber-950/30'
              : isRank2
              ? 'from-slate-300/15 via-slate-900 to-slate-900 border-slate-400/40'
              : 'from-amber-700/20 via-slate-900 to-slate-900 border-amber-700/40';

            const badgeTitle = isRank1 ? '🏆 今日動能總冠軍' : isRank2 ? '🥈 動能亞軍' : '🥉 動能季軍';

            return (
              <div 
                key={stock.symbol}
                onClick={() => onSelectStock(stock.symbol)}
                className={`bg-gradient-to-b ${medalColor} border rounded-2xl p-5 cursor-pointer hover:border-rose-500/60 transition-all hover:scale-[1.01] shadow-lg group relative overflow-hidden`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-950/80 border border-slate-800 text-amber-300 font-mono">
                      {badgeTitle}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${stock.priceCategoryBadge}`}>
                      {stock.priceCategory === 'high' ? '👑 高價股' : stock.priceCategory === 'mid' ? '🎯 中價股' : '🪙 低價股'}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${stock.strategyColor}`}>
                      {stock.strategyBadge}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-rose-300 block font-mono font-bold">籌碼多空比</span>
                    <strong className="text-lg font-black font-mono text-rose-400">
                      {stock.majorPowerRatio}x
                    </strong>
                  </div>
                </div>

                <div className="flex items-baseline justify-between mb-2">
                  <div>
                    <h3 className="text-xl font-black text-slate-100 group-hover:text-rose-400 transition-colors flex items-center">
                      {stock.name}
                      <span className="text-xs font-mono font-normal text-slate-400 ml-2">
                        {stock.symbol}
                      </span>
                    </h3>
                    <span className="text-xs text-slate-400">{stock.industry} · {stock.longDirectionTag}</span>
                  </div>

                  <div className="text-right">
                    <strong className={`text-2xl font-black font-mono block ${stock.change >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      ${stock.price}
                    </strong>
                    <span className={`text-xs font-mono font-bold ${stock.change >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {stock.change >= 0 ? '+' : ''}{stock.change} ({stock.changePercent >= 0 ? '+' : ''}{stock.changePercent}%)
                    </span>
                  </div>
                </div>

                {/* 4 Core Indicators Snapshot in Card (1. 籌碼多空比做多優先) */}
                <div className="grid grid-cols-4 gap-1 py-2 px-2 rounded-xl bg-slate-950/70 border border-slate-800 text-[10px] font-mono mb-3 text-center">
                  <div className="bg-rose-950/40 rounded-lg py-0.5 border border-rose-500/30">
                    <span className="text-rose-300 block font-bold">① 多空比(做多)</span>
                    <strong className="text-rose-400 font-black block">
                      {stock.majorPowerRatio}x ({stock.bullRatioPct}%)
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">② 動能評分</span>
                    <strong className="text-amber-400 truncate block">{stock.momentumScore}分</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">③ 周轉率</span>
                    <strong className="text-cyan-400 block">{stock.turnoverRate}%</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">④ 主力收貨</span>
                    <strong className="text-emerald-400 truncate block">{stock.accumulationLotsText}</strong>
                  </div>
                </div>

                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-3">
                  {stock.plan.tacticalSummary}
                </p>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800 text-rose-400 font-bold group-hover:translate-x-0.5 transition-transform">
                  <span>查看全方位籌碼與技術診斷</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Strategy & Price Tier Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            <button
              onClick={() => {
                setStrategyFilter('all');
                setFilterAboveMa20(false);
                setFilterKdGoldenCross(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                strategyFilter === 'all' && !filterAboveMa20 && !filterKdGoldenCross
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              全部做多精選 30 檔 (15低 + 10中 + 5高)
            </button>

            <button
              onClick={() => setStrategyFilter('strongLong')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${
                strategyFilter === 'strongLong'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-1 ring-rose-400/50'
                  : 'bg-slate-950 text-rose-300 hover:text-rose-200 border border-rose-500/30'
              }`}
            >
              <span>🔥 強力做多首選 ≥1.55x ({stats.strongLongCount} 檔)</span>
            </button>

            <button
              onClick={() => setStrategyFilter('low')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${
                strategyFilter === 'low'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400/40'
                  : 'bg-slate-950 text-emerald-400 hover:text-emerald-300 border border-slate-800'
              }`}
            >
              <span>🪙 低價股 ({stats.lowCount} 檔)</span>
            </button>

            <button
              onClick={() => setStrategyFilter('mid')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${
                strategyFilter === 'mid'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30 ring-1 ring-sky-400/40'
                  : 'bg-slate-950 text-sky-400 hover:text-sky-300 border border-slate-800'
              }`}
            >
              <span>🎯 中價股 ({stats.midCount} 檔)</span>
            </button>

            <button
              onClick={() => setStrategyFilter('high')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${
                strategyFilter === 'high'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-purple-400/40'
                  : 'bg-slate-950 text-purple-400 hover:text-purple-300 border border-slate-800'
              }`}
            >
              <span>👑 高價股 ({stats.highCount} 檔)</span>
            </button>

            <button
              onClick={() => setStrategyFilter('accumulating')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${
                strategyFilter === 'accumulating'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400/40'
                  : 'bg-slate-950 text-emerald-300 hover:text-emerald-200 border border-slate-800'
              }`}
            >
              <PackageCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>主力收貨中 ({stats.accumulatingCount})</span>
            </button>

            <button
              onClick={() => setStrategyFilter('highTurnover')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${
                strategyFilter === 'highTurnover'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 ring-1 ring-cyan-400/40'
                  : 'bg-slate-950 text-cyan-300 hover:text-cyan-200 border border-slate-800'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>高周轉率≥5% ({stats.highTurnoverCount})</span>
            </button>

            <button
              onClick={() => setStrategyFilter('daytrade')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${
                strategyFilter === 'daytrade'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Zap className="w-3 h-3 text-rose-400" />
              <span>適合當沖 ({stats.daytradeCount})</span>
            </button>

            <button
              onClick={() => setStrategyFilter('swing')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${
                strategyFilter === 'swing'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Activity className="w-3 h-3 text-cyan-400" />
              <span>適合波段 ({stats.swingCount})</span>
            </button>

            <button
              onClick={() => setStrategyFilter('dual')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${
                strategyFilter === 'dual'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Flame className="w-3 h-3 text-amber-400" />
              <span>當沖+波段雙強 ({stats.dualCount})</span>
            </button>
          </div>

          {/* Search & Sort */}
          <div className="flex items-center space-x-2.5 w-full md:w-auto">
            {/* Quick Search */}
            <div className="relative flex-1 md:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜尋代號/名稱/產業..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* Sort Selector */}
            <div className="flex items-center space-x-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-rose-500/40 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-rose-400" />
              <select
                value={selectedSort}
                onChange={(e: any) => setSelectedSort(e.target.value)}
                className="bg-transparent text-slate-200 text-xs font-bold focus:outline-none cursor-pointer"
              >
                <option value="powerRatio" className="bg-slate-900 text-rose-300">1. 籌碼多空比 (做多優先) 強至弱</option>
                <option value="score" className="bg-slate-900 text-slate-200">2. 動能評分高至低</option>
                <option value="turnover" className="bg-slate-900 text-slate-200">3. 周轉率高至低</option>
                <option value="majorNet" className="bg-slate-900 text-slate-200">4. 主力買超大至小</option>
                <option value="change" className="bg-slate-900 text-slate-200">今日漲幅高至低</option>
                <option value="amplitude" className="bg-slate-900 text-slate-200">日內振幅高至低</option>
                <option value="volume" className="bg-slate-900 text-slate-200">成交總量大至小</option>
              </select>
            </div>
          </div>
        </div>

        {/* 技術面進階篩選面板 (Technical Indicator Filter Panel: 站上月線 & KD 黃金交叉) */}
        <div className="pt-3 border-t border-slate-800/90 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1.5 mr-1">
              <Filter className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-xs font-bold text-slate-200">技術指標篩選面板：</span>
            </div>

            {/* 篩選按鈕 1: 站上月線 (20MA) */}
            <button
              onClick={() => setFilterAboveMa20(prev => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border ${
                filterAboveMa20
                  ? 'bg-rose-600/90 text-white border-rose-400 shadow-md shadow-rose-600/30 ring-1 ring-rose-400/50'
                  : 'bg-slate-900 text-slate-300 hover:text-white border-slate-700 hover:border-rose-500/50'
              }`}
            >
              <TrendingUp className={`w-3.5 h-3.5 ${filterAboveMa20 ? 'text-white' : 'text-rose-400'}`} />
              <span>站上月線 (股價 ≥ 20MA)</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                filterAboveMa20 ? 'bg-rose-950/80 text-rose-200' : 'bg-slate-800 text-rose-400'
              }`}>
                {stats.aboveMa20Count} 檔
              </span>
              {filterAboveMa20 && <Check className="w-3.5 h-3.5 text-white ml-0.5" />}
            </button>

            {/* 篩選按鈕 2: KD 黃金交叉 */}
            <button
              onClick={() => setFilterKdGoldenCross(prev => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border ${
                filterKdGoldenCross
                  ? 'bg-amber-600/90 text-white border-amber-400 shadow-md shadow-amber-600/30 ring-1 ring-amber-400/50'
                  : 'bg-slate-900 text-slate-300 hover:text-white border-slate-700 hover:border-amber-500/50'
              }`}
            >
              <Crosshair className={`w-3.5 h-3.5 ${filterKdGoldenCross ? 'text-white' : 'text-amber-400'}`} />
              <span>KD 黃金交叉 (K &gt; D 多方金叉)</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                filterKdGoldenCross ? 'bg-amber-950/80 text-amber-200' : 'bg-slate-800 text-amber-400'
              }`}>
                {stats.kdGoldenCrossCount} 檔
              </span>
              {filterKdGoldenCross && <Check className="w-3.5 h-3.5 text-white ml-0.5" />}
            </button>

            {/* 快捷共振篩選: 同時符合 站上月線 + KD 黃金交叉 */}
            <button
              onClick={() => {
                if (filterAboveMa20 && filterKdGoldenCross) {
                  setFilterAboveMa20(false);
                  setFilterKdGoldenCross(false);
                } else {
                  setFilterAboveMa20(true);
                  setFilterKdGoldenCross(true);
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border ${
                filterAboveMa20 && filterKdGoldenCross
                  ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white border-amber-300 shadow-md shadow-rose-600/30'
                  : 'bg-slate-900 text-amber-300 hover:text-amber-200 border-amber-500/30 hover:border-amber-400/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>雙指標共振 (站上月線 + KD黃金交叉)</span>
              <span className="px-1.5 py-0.2 rounded bg-slate-950/70 text-amber-300 text-[10px] font-mono">
                {stats.dualTechCount} 檔
              </span>
            </button>

            {(filterAboveMa20 || filterKdGoldenCross) && (
              <button
                onClick={() => {
                  setFilterAboveMa20(false);
                  setFilterKdGoldenCross(false);
                }}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors"
              >
                清除技術篩選 ✕
              </button>
            )}
          </div>

          {/* 篩選結果統計指示器 */}
          <div className="flex items-center space-x-2 text-xs font-mono shrink-0">
            <span className="text-slate-400">
              目前符合條件：
              <strong className="text-rose-400 text-sm mx-1">{filteredStocks.length}</strong>
              / {stats.total} 檔
            </span>
            {(filterAboveMa20 || filterKdGoldenCross) && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-bold">
                {[
                  filterAboveMa20 ? '站上月線' : null,
                  filterKdGoldenCross ? 'KD黃金交叉' : null,
                ].filter(Boolean).join(' + ')} 篩選啟用中
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 30 Stocks List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-[11px]">
                <th className="py-3.5 px-3 text-center w-12">排名</th>
                <th className="py-3.5 px-4 font-semibold">標的名稱 / 價位層級</th>
                <th className="py-3.5 px-3 text-right font-semibold">現價 / 漲跌幅</th>
                <th className="py-3.5 px-3 text-center font-extrabold text-rose-300 bg-rose-950/20">① 籌碼多空比 (做多優先)</th>
                <th className="py-3.5 px-3 text-center font-semibold text-amber-300">② 高動能評分</th>
                <th className="py-3.5 px-3 text-right font-semibold text-cyan-300">③ 周轉率 %</th>
                <th className="py-3.5 px-3 text-right font-semibold text-emerald-300">④ 主力收貨狀態</th>
                <th className="py-3.5 px-3 text-center font-semibold">適合策略</th>
                <th className="py-3.5 px-4 font-semibold">實戰關鍵攻防點位</th>
                <th className="py-3.5 px-3 text-center font-semibold">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredStocks.map((stock) => {
                const isWatch = watchlistSymbols.includes(stock.symbol);
                const isExpanded = expandedSymbol === stock.symbol;

                return (
                  <React.Fragment key={stock.symbol}>
                    <tr 
                      className={`transition-colors hover:bg-slate-850/80 cursor-pointer ${
                        isExpanded ? 'bg-slate-800/50' : ''
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-3 px-3 text-center font-black">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-mono ${
                          stock.rank === 1 
                            ? 'bg-amber-400 text-slate-950 font-black shadow-md shadow-amber-400/40' 
                            : stock.rank === 2
                            ? 'bg-slate-300 text-slate-950 font-bold'
                            : stock.rank === 3
                            ? 'bg-amber-700 text-white font-bold'
                            : stock.rank <= 10
                            ? 'bg-slate-800 text-rose-300'
                            : 'bg-slate-900 text-slate-400'
                        }`}>
                          {stock.rank}
                        </span>
                      </td>

                      {/* Stock Symbol & Name & Tags */}
                      <td className="py-3 px-4" onClick={() => onSelectStock(stock.symbol)}>
                        <div className="flex items-center space-x-2">
                          <strong className="text-sm font-black text-slate-100 hover:text-rose-400 transition-colors">
                            {stock.name}
                          </strong>
                          <span className="text-xs text-slate-400 font-mono">
                            {stock.symbol}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold border ${stock.priceCategoryBadge}`}>
                            {stock.priceCategory === 'high'
                              ? '👑 高價股 (5檔)'
                              : stock.priceCategory === 'mid'
                              ? '🎯 中價股 (10檔)'
                              : '🪙 低價股 (15檔)'}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                            {stock.market}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1 mt-1 font-sans">
                          {/* 月線位階標籤 */}
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-bold border ${
                              stock.isAboveMa20
                                ? 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                                : 'bg-slate-900 text-slate-400 border-slate-800'
                            }`}
                          >
                            {stock.isAboveMa20 ? `📈 站上月線 ($${stock.ma20})` : `🛡️ 月線整理 ($${stock.ma20})`}
                          </span>

                          {/* KD 指標標籤 */}
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-bold border ${
                              stock.isKdGoldenCross
                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                                : 'bg-slate-900 text-slate-400 border-slate-800'
                            }`}
                          >
                            {stock.isKdGoldenCross
                              ? `⚡ KD黃金交叉 (K${stock.kdK}>D${stock.kdD})`
                              : `⚖️ KD整理 (K${stock.kdK}/D${stock.kdD})`}
                          </span>

                          {stock.categoryTags.slice(0, 1).map((tag, tIdx) => (
                            <span 
                              key={tIdx} 
                              className="text-[10px] px-1.5 py-0.2 rounded bg-slate-950 text-slate-400 border border-slate-800"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Price & Change % */}
                      <td className="py-3 px-3 text-right" onClick={() => onSelectStock(stock.symbol)}>
                        <strong className={`text-sm font-bold block ${stock.change >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          ${stock.price}
                        </strong>
                        <span className={`text-[11px] font-bold ${stock.change >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {stock.change >= 0 ? '+' : ''}{stock.changePercent}%
                        </span>
                      </td>

                      {/* 1. Primary Indicator: 籌碼多空比 (做多優先) */}
                      <td className="py-3 px-3 text-center bg-rose-950/10" onClick={() => onSelectStock(stock.symbol)}>
                        <div className="inline-flex flex-col items-center">
                          <div className="flex items-center space-x-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-black font-mono border ${
                              stock.majorPowerRatio >= 1.65 
                                ? 'bg-rose-500/25 text-rose-300 border-rose-500/50 shadow-sm' 
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            }`}>
                              {stock.majorPowerRatio}x
                            </span>
                            <span className="text-[10px] font-bold text-rose-300">
                              {stock.longDirectionTag}
                            </span>
                          </div>
                          <div className="w-28 h-1.5 bg-emerald-950 rounded-full overflow-hidden mt-1.5 flex">
                            <div
                              className="h-full bg-rose-500"
                              style={{ width: `${stock.bullRatioPct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            多方買盤 {stock.bullRatioPct}% · {stock.powerRatioLabel}
                          </span>
                        </div>
                      </td>

                      {/* 2. Momentum Score */}
                      <td className="py-3 px-3 text-center" onClick={() => onSelectStock(stock.symbol)}>
                        <div className="inline-flex flex-col items-center">
                          <span className="text-sm font-black font-mono text-amber-400">
                            {stock.momentumScore}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {stock.momentumRating.replace('領先', '')}
                          </span>
                        </div>
                      </td>

                      {/* 3. Turnover Rate */}
                      <td className="py-3 px-3 text-right" onClick={() => onSelectStock(stock.symbol)}>
                        <strong className={`text-xs ${stock.turnoverRate >= 5.0 ? 'text-cyan-400 font-bold' : 'text-slate-300'}`}>
                          {stock.turnoverRate}%
                        </strong>
                        <span className="text-[10px] text-slate-500 block">
                          振幅 {stock.amplitude}%
                        </span>
                      </td>

                      {/* 4. Major Accumulation */}
                      <td className="py-3 px-3 text-right" onClick={() => onSelectStock(stock.symbol)}>
                        <strong className={stock.majorNetLots >= 0 ? 'text-emerald-400 block' : 'text-slate-400 block'}>
                          {stock.accumulationLotsText}
                        </strong>
                        <span className="text-[10px] text-emerald-300/80 block truncate max-w-[125px] ml-auto">
                          {stock.accumulationTag}
                        </span>
                      </td>

                      {/* Strategy Badge */}
                      <td className="py-3 px-3 text-center" onClick={() => onSelectStock(stock.symbol)}>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold border ${stock.strategyColor}`}>
                          {stock.strategyBadge}
                        </span>
                      </td>

                      {/* Tactical Key Levels */}
                      <td className="py-3 px-4 text-xs font-sans" onClick={() => onSelectStock(stock.symbol)}>
                        {stock.strategyType === 'daytrade' ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-[10px] text-slate-500">當沖防守:</span>
                              <strong className="text-emerald-400 font-mono">${stock.plan.daytradeStop}</strong>
                              <span className="text-[10px] text-slate-500">• 目標:</span>
                              <strong className="text-rose-400 font-mono">${stock.plan.daytradeTarget}</strong>
                            </div>
                            <span className="text-[10px] text-slate-400 block line-clamp-1">
                              {stock.signals.volatility}
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-1.5">
                              <span className="text-[10px] text-slate-500">波段建倉:</span>
                              <strong className="text-cyan-300 font-mono">{stock.plan.swingBuyZone}</strong>
                              <span className="text-[10px] text-slate-500">• 目標:</span>
                              <strong className="text-rose-400 font-mono">${stock.plan.swingTarget}</strong>
                            </div>
                            <span className="text-[10px] text-slate-400 block line-clamp-1">
                              {stock.signals.institutional}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleWatchlist(stock.symbol);
                            }}
                            className={`p-1.5 rounded-lg border transition-all ${
                              isWatch 
                                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' 
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-amber-400'
                            }`}
                            title={isWatch ? '已在自選股 (點擊移除)' : '加入自選股'}
                          >
                            <Star className={`w-3.5 h-3.5 ${isWatch ? 'fill-amber-400' : ''}`} />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedSymbol(isExpanded ? null : stock.symbol);
                            }}
                            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                            title="展開操盤手戰術細節"
                          >
                            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </button>

                          <button
                            onClick={() => onSelectStock(stock.symbol)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold shadow-sm flex items-center space-x-1"
                          >
                            <span>分析</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Tactical Drawer Row */}
                    {isExpanded && (
                      <tr className="bg-slate-950/90 border-b border-slate-800 animate-in fade-in duration-200">
                        <td colSpan={10} className="p-4 sm:p-5">
                          <div className="bg-slate-900 border border-slate-800/90 rounded-xl p-4 space-y-3 font-sans">
                            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                              <div className="flex items-center space-x-2">
                                <Target className="w-4 h-4 text-rose-400" />
                                <h4 className="font-bold text-slate-100 text-sm">
                                  【{stock.name} ({stock.symbol})】四大指標診斷與作戰指南
                                </h4>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${stock.strategyColor}`}>
                                  {stock.strategyBadge}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-300">
                                <span>風險報酬比 (R/R): <strong className="text-amber-400">{stock.plan.riskRewardRatio}</strong></span>
                                <span>•</span>
                                <span>月線型態: <strong className={stock.isAboveMa20 ? 'text-rose-400' : 'text-cyan-400'}>{stock.signals.maTrend}</strong></span>
                                <span>•</span>
                                <span>KD指標: <strong className={stock.isKdGoldenCross ? 'text-amber-400' : 'text-slate-400'}>{stock.kdStatusLabel}</strong></span>
                              </div>
                            </div>

                            {/* 4 Core Indicators Detail Row (1. 籌碼多空比做多優先) */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-2 px-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs font-mono">
                              <div>
                                <span className="text-rose-300 block text-[10px] font-bold">① 籌碼多空比 (做多優先)</span>
                                <strong className="text-rose-400">{stock.majorPowerRatio}x · 多方買盤 {stock.bullRatioPct}% ({stock.longDirectionTag})</strong>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[10px]">② 高動能評級</span>
                                <strong className="text-amber-400">{stock.momentumScore}分 · {stock.momentumRating}</strong>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[10px]">③ 周轉率強度</span>
                                <strong className="text-cyan-400">{stock.turnoverRate}% · {stock.turnoverLevel}</strong>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[10px]">④ 主力收貨狀態</span>
                                <strong className="text-emerald-400">{stock.accumulationTag} ({stock.accumulationLotsText})</strong>
                              </div>
                            </div>

                            {/* Dual Trading Playbook: Daytrade vs Swing */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              {/* Daytrade Tactical Box */}
                              <div className="bg-slate-950 p-3.5 rounded-xl border border-rose-500/30">
                                <span className="font-bold text-rose-300 flex items-center mb-1.5 text-xs">
                                  <Zap className="w-3.5 h-3.5 mr-1 text-rose-400" />
                                  ⚡ 當沖短打關鍵攻防點位 (Day Trading)
                                </span>
                                <div className="grid grid-cols-3 gap-2 font-mono text-[11px] mb-2">
                                  <div className="bg-slate-900 p-2 rounded-lg">
                                    <span className="text-slate-500 block text-[10px]">建議進場點</span>
                                    <strong className="text-slate-200">${stock.plan.daytradeEntry}</strong>
                                  </div>
                                  <div className="bg-slate-900 p-2 rounded-lg">
                                    <span className="text-slate-500 block text-[10px]">停損防守點</span>
                                    <strong className="text-emerald-400">${stock.plan.daytradeStop}</strong>
                                  </div>
                                  <div className="bg-slate-900 p-2 rounded-lg">
                                    <span className="text-slate-500 block text-[10px]">波段拉抬目標</span>
                                    <strong className="text-rose-400">${stock.plan.daytradeTarget}</strong>
                                  </div>
                                </div>
                                <p className="text-slate-400 text-[11px] leading-relaxed">
                                  {stock.signals.volatility}。當沖特別留意 09:30 前爆量突破分價壓力區時之跟單機會，跌破 ${stock.plan.daytradeStop} 務必果斷停損。
                                </p>
                              </div>

                              {/* Swing Tactical Box */}
                              <div className="bg-slate-950 p-3.5 rounded-xl border border-cyan-500/30">
                                <span className="font-bold text-cyan-300 flex items-center mb-1.5 text-xs">
                                  <Activity className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                                  🌊 波段鎖碼布局點位 (Swing Trading)
                                </span>
                                <div className="grid grid-cols-3 gap-2 font-mono text-[11px] mb-2">
                                  <div className="bg-slate-900 p-2 rounded-lg">
                                    <span className="text-slate-500 block text-[10px]">分批建倉區間</span>
                                    <strong className="text-cyan-300">{stock.plan.swingBuyZone}</strong>
                                  </div>
                                  <div className="bg-slate-900 p-2 rounded-lg">
                                    <span className="text-slate-500 block text-[10px]">波段防守點</span>
                                    <strong className="text-emerald-400">${stock.plan.swingStopLoss}</strong>
                                  </div>
                                  <div className="bg-slate-900 p-2 rounded-lg">
                                    <span className="text-slate-500 block text-[10px]">目標獲利點 (+12%)</span>
                                    <strong className="text-rose-400">${stock.plan.swingTarget}</strong>
                                  </div>
                                </div>
                                <p className="text-slate-400 text-[11px] leading-relaxed">
                                  {stock.signals.institutional}。{stock.signals.costPosition}。建議於主力成本附近回測量縮時分批建倉，上看目標價 ${stock.plan.swingTarget}。
                                </p>
                              </div>
                            </div>

                            {/* Full Analysis Button */}
                            <div className="pt-1 flex justify-end">
                              <button
                                onClick={() => onSelectStock(stock.symbol)}
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-md shadow-rose-600/25 flex items-center space-x-1.5"
                              >
                                <span>載入【{stock.name}】新摘要表·全盤診斷籌碼分價與能量平衡</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Methodology Formula Modal */}
      {showFormulaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4 sticky top-0 bg-slate-900 z-10">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-slate-100 text-base">
                  三竹每日 30 檔高動能篩選模型邏輯與定時更新機制
                </h3>
              </div>
              <button
                onClick={() => setShowFormulaModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300 leading-relaxed font-sans">
              {/* Timing */}
              <div className="bg-slate-950 p-3 rounded-xl border border-cyan-500/30">
                <strong className="text-cyan-300 block mb-1 font-bold flex items-center">
                  <CalendarClock className="w-4 h-4 mr-1 text-cyan-400" />
                  ★ 股價資料每日更新機制 (每日收盤價 · 下午 13:30)
                </strong>
                <p className="text-slate-400">
                  • <strong className="text-slate-200">每日更新時間：下午 13:30 (每日收盤價)</strong>：台股集中市場與櫃買中心於每日下午 13:30 正式收盤結算，系統於 13:30 定時自動更新全市場最新收盤價、當日漲跌幅、總成交量與四大核心指標。
                </p>
              </div>

              {/* Price Tier Allocation */}
              <div className="bg-slate-950 p-3 rounded-xl border border-amber-500/30">
                <strong className="text-amber-300 block mb-1 font-bold">★ 三階價位分級制度：15 檔低價股 + 10 檔中價股 + 5 檔高價股 (總計 30 檔)</strong>
                <p className="text-slate-400">
                  全面照顧各資金規模投資人，系統每日嚴格配置：<strong className="text-emerald-300">15 檔低價股</strong>（&lt; 100 元親民銅板價與高周轉轉機飆股）、<strong className="text-sky-300">10 檔中價股</strong>（100 ~ 250 元主流成長與當沖人氣王）、以及 <strong className="text-purple-300">5 檔高價股</strong>（≥ 250 元權值領頭羊：台積電、聯發科、世芯-KY、廣達、長榮）。
                </p>
              </div>

              {/* 4 Core Indicators */}
              <div className="border border-slate-800 p-3 rounded-xl space-y-3 bg-slate-950/60">
                <div>
                  <strong className="text-rose-400 block mb-1 font-bold">1. 籌碼多空比 — 做多為優先選擇 (Major Power Ratio &gt; 1.0x)</strong>
                  <p className="text-slate-400">
                    計算『(特大單買 + 大單買) / (特大單賣 + 大單賣)』，以<strong className="text-rose-300">籌碼多空比做多為第一優先選擇準則</strong>。入選 30 檔標的皆為多空比 &gt; 1.2x 之多方控盤股（&gt; 1.55x 列為🔥強力做多首選），並預設依籌碼多空比由強至弱優先排序。
                  </p>
                </div>

                <div>
                  <strong className="text-amber-400 block mb-1 font-bold">2. 高動能指標 (High Momentum Score)</strong>
                  <p className="text-slate-400">
                    綜合考量籌碼多空比做多力道、短線均線多頭排列、漲幅突破與估量放大倍數，評定 85~99 分的高動能指標。
                  </p>
                </div>

                <div>
                  <strong className="text-cyan-400 block mb-1 font-bold">3. 周轉率指標 (High Turnover Rate %)</strong>
                  <p className="text-slate-400">
                    篩選預估周轉率活絡之標的（多數達 5% ~ 18% 以上），高周轉代表市場資金換手踴躍、日內滑價低且適合當沖與短線快進快出。
                  </p>
                </div>

                <div>
                  <strong className="text-emerald-400 block mb-1 font-bold">4. 主力收貨中 (Major Accumulation)</strong>
                  <p className="text-slate-400">
                    主力大戶買賣超為淨買超（買超張數為正），外資與投信聯手買超吸籌，且股價處於主力防守成本線上方的黃金起漲區。
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowFormulaModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors"
              >
                關閉說明
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
