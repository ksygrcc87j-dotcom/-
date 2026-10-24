import React, { useState } from 'react';
import {
  Zap,
  Flame,
  TrendingUp,
  TrendingDown,
  Volume2,
  ArrowRight,
  X,
  Activity,
  ShieldAlert,
  Play,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { StockData } from '../types/stock';

export interface SurgeAlertEvent {
  id: string;
  symbol: string;
  name: string;
  industry: string;
  direction: 'up' | 'down';
  currentPrice: number;
  price5MinAgo: number;
  fiveMinChangePct: number; // e.g., +2.68 or -2.35 (must be |pct| > 2.0)
  currentVolume: number;    // 當日成交量 (張)
  avgVolume5d: number;      // 5日均量 (張)
  volumeMultiple: number;   // 成交量 / 5日均量 倍數 (must be > 3.0)
  majorNetLots: number;     // 主力大單淨買賣超 (張)
  triggeredAt: string;
  isSimulated?: boolean;
}

/**
 * Evaluates whether a StockData object meets the Short-Term Surge criteria:
 * 1) 5-minute price fluctuation |ΔP_5min| > 2.0%
 * 2) Current volume > 3.0x of 5-day average volume
 */
export function evaluateStockSurge(stock: StockData): SurgeAlertEvent | null {
  const ticks = stock.intradayTicks || [];
  const currentPrice = stock.price;

  // Determine price ~5 minutes ago from intraday ticks (or fallback to open/recent tick)
  const lookbackIdx = Math.max(0, ticks.length - 4);
  const refTick = ticks[lookbackIdx];
  const price5MinAgo = refTick ? refTick.price : stock.openPrice || stock.yesterdayClose;

  if (!price5MinAgo || price5MinAgo <= 0) return null;

  const fiveMinChangePct = Number((((currentPrice - price5MinAgo) / price5MinAgo) * 100).toFixed(2));

  // Derive 5-day average volume from turnoverRate vs turnoverRate5dAvg
  const ratioFromTurnover =
    stock.turnoverRate5dAvg > 0 ? stock.turnoverRate / stock.turnoverRate5dAvg : 1;
  const rawAvgVol5d =
    ratioFromTurnover > 0
      ? Math.round(stock.volume / ratioFromTurnover)
      : Math.round(stock.volume * 0.65);
  const avgVolume5d = Math.max(500, rawAvgVol5d);
  const volumeMultiple = Number((stock.volume / avgVolume5d).toFixed(2));

  // Strict check: |5-min fluctuation| > 2% AND volume > 3x 5-day average volume
  if (Math.abs(fiveMinChangePct) > 2.0 && volumeMultiple >= 3.0) {
    const majorNetLots =
      (stock.orderFlow?.superLargeNet ?? 0) + (stock.orderFlow?.largeNet ?? 0);

    return {
      id: `surge-${stock.symbol}-${stock.lastUpdated || 'now'}`,
      symbol: stock.symbol,
      name: stock.name,
      industry: stock.industry,
      direction: fiveMinChangePct >= 0 ? 'up' : 'down',
      currentPrice,
      price5MinAgo: Number(price5MinAgo.toFixed(2)),
      fiveMinChangePct,
      currentVolume: stock.volume,
      avgVolume5d,
      volumeMultiple,
      majorNetLots,
      triggeredAt: stock.lastUpdated || '13:25:18',
    };
  }

  return null;
}

interface ShortTermSurgeMonitorProps {
  currentStock: StockData;
  surgeEvents: SurgeAlertEvent[];
  onSelectStock: (symbol: string) => void;
  onDismissEvent: (id: string) => void;
  onSimulateCurrentStockSurge: (direction: 'up' | 'down') => void;
  isMonitoringEnabled: boolean;
  onToggleMonitoring: () => void;
}

export const ShortTermSurgeMonitor: React.FC<ShortTermSurgeMonitorProps> = ({
  currentStock,
  surgeEvents,
  onSelectStock,
  onDismissEvent,
  onSimulateCurrentStockSurge,
  isMonitoringEnabled,
  onToggleMonitoring,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  return (
    <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-slate-950 via-slate-900/95 to-slate-950 shadow-2xl shadow-amber-950/20 overflow-hidden">
      {/* Monitor Header Bar */}
      <div className="px-3.5 sm:px-5 py-3 bg-gradient-to-r from-rose-950/60 via-slate-900 to-amber-950/50 border-b border-slate-800/90 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center space-x-2.5">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-300 shadow-inner">
            <Zap className="w-4 h-4 fill-amber-400/40 animate-pulse" />
            {isMonitoringEnabled && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-slate-950 animate-ping" />
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs sm:text-sm font-black tracking-wide text-white flex items-center">
                短線暴衝警示監控雷達
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                觸發條件：5分鐘波動 &gt; 2% 且 成交量 &gt; 5日均量 3倍
              </span>
              {surgeEvents.length > 0 && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-sm shadow-rose-500/50 animate-pulse">
                  {surgeEvents.length} 檔暴衝觸發中
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              即時掃描盤中 5 分鐘急拉/急殺且爆出 5 日均量 3 倍以上之異常動能標的，捕捉主力點火瞬間。
            </p>
          </div>
        </div>

        {/* Action Controls: Simulate Surge & Toggle Monitor */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onSimulateCurrentStockSurge('up')}
            title={`模擬 ${currentStock.name} (${currentStock.symbol}) 5分鐘急拉 >2% 且爆量 >3倍均量`}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-rose-600/25 hover:bg-rose-600/40 text-rose-200 border border-rose-500/50 text-[11px] font-bold transition-all cursor-pointer shadow-sm"
          >
            <Play className="w-3 h-3 fill-rose-400 text-rose-400" />
            <span>實測 {currentStock.name} 急拉暴衝</span>
          </button>

          <button
            type="button"
            onClick={() => onSimulateCurrentStockSurge('down')}
            title={`模擬 ${currentStock.name} (${currentStock.symbol}) 5分鐘急殺 >2% 且爆量 >3倍均量`}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-200 border border-emerald-500/40 text-[11px] font-bold transition-all cursor-pointer"
          >
            <TrendingDown className="w-3 h-3 text-emerald-400" />
            <span>實測爆量急殺</span>
          </button>

          <button
            type="button"
            onClick={onToggleMonitoring}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
              isMonitoringEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {isMonitoringEnabled ? '● 監控開啟中' : '○ 監控已暫停'}
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
            title={isExpanded ? '收合警示卡片' : '展開警示卡片'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* High-Visibility Surge Alert Cards Grid */}
      {isExpanded && (
        <div className="p-3.5 sm:p-4">
          {surgeEvents.length === 0 ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-4 rounded-xl bg-slate-900/70 border border-slate-800 text-xs text-slate-400">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-amber-400" />
                <span>
                  目前暫無標的同時觸發「5分鐘波動 &gt; 2%」與「成交量 &gt; 5日均量 3倍」。可點擊上方按鈕實測暴衝警示效果。
                </span>
              </div>
              <span className="font-mono text-[11px] text-slate-500">
                雷達掃描頻率：每筆即時 Tick 自動比對
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {surgeEvents.map((ev) => {
                const isUp = ev.direction === 'up';
                const isSelected = ev.symbol === currentStock.symbol;

                return (
                  <div
                    key={ev.id}
                    onClick={() => onSelectStock(ev.symbol)}
                    className={`group relative rounded-2xl p-4 border-2 transition-all cursor-pointer select-none overflow-hidden ${
                      isUp
                        ? 'bg-gradient-to-br from-rose-950/85 via-slate-900/95 to-amber-950/70 border-rose-500/80 hover:border-amber-400 shadow-xl shadow-rose-950/50'
                        : 'bg-gradient-to-br from-emerald-950/85 via-slate-900/95 to-teal-950/70 border-emerald-500/80 hover:border-teal-400 shadow-xl shadow-emerald-950/50'
                    } ${isSelected ? 'ring-2 ring-amber-400' : ''}`}
                  >
                    {/* Top Row: Surge Badge + Timestamp + Dismiss */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wide shadow-md ${
                            isUp
                              ? 'bg-gradient-to-r from-rose-600 to-amber-500 text-white'
                              : 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white'
                          }`}
                        >
                          {isUp ? (
                            <Flame className="w-3.5 h-3.5 fill-white" />
                          ) : (
                            <ShieldAlert className="w-3.5 h-3.5" />
                          )}
                          <span>{isUp ? '短線急拉暴衝' : '短線爆量急殺'}</span>
                        </span>

                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950/80 text-slate-300 border border-slate-800">
                          {ev.triggeredAt}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDismissEvent(ev.id);
                        }}
                        title="關閉此警示卡片"
                        className="p-1 rounded-lg bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Stock Name, Symbol & Current Price */}
                    <div className="flex items-baseline justify-between mb-3">
                      <div className="flex items-baseline space-x-2">
                        <span className="text-base sm:text-lg font-black text-white tracking-tight">
                          {ev.name}
                        </span>
                        <span className="font-mono text-xs font-bold text-amber-300">
                          {ev.symbol}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800/90 text-slate-300 border border-slate-700">
                          {ev.industry}
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span
                          className={`text-lg sm:text-xl font-black ${
                            isUp ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          ${ev.currentPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Dual Highlighted Trigger Threshold Badges (5分鐘波動 > 2% & 量能 > 5日均量 3倍) */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div
                        className={`p-2.5 rounded-xl border ${
                          isUp
                            ? 'bg-rose-500/15 border-rose-500/40'
                            : 'bg-emerald-500/15 border-emerald-500/40'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-300 mb-0.5">
                          <span>5分鐘價格波動</span>
                          <span className="font-mono text-[9px] px-1 rounded bg-slate-950/70 text-amber-300">
                            &gt;2% 達標
                          </span>
                        </div>
                        <div
                          className={`font-mono text-sm sm:text-base font-black flex items-center ${
                            isUp ? 'text-rose-300' : 'text-emerald-300'
                          }`}
                        >
                          {isUp ? (
                            <TrendingUp className="w-4 h-4 mr-1 shrink-0" />
                          ) : (
                            <TrendingDown className="w-4 h-4 mr-1 shrink-0" />
                          )}
                          {ev.fiveMinChangePct >= 0 ? '+' : ''}
                          {ev.fiveMinChangePct.toFixed(2)}%
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          5分前基準: ${ev.price5MinAgo.toFixed(2)}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl border bg-amber-500/15 border-amber-500/40">
                        <div className="flex items-center justify-between text-[10px] text-slate-300 mb-0.5">
                          <span>相對 5日均量倍數</span>
                          <span className="font-mono text-[9px] px-1 rounded bg-slate-950/70 text-amber-300">
                            &gt;3x 達標
                          </span>
                        </div>
                        <div className="font-mono text-sm sm:text-base font-black text-amber-300 flex items-center">
                          <Volume2 className="w-4 h-4 mr-1 shrink-0 text-amber-400" />
                          {ev.volumeMultiple.toFixed(2)} 倍
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          現量 {ev.currentVolume.toLocaleString()} / 均量 {ev.avgVolume5d.toLocaleString()}張
                        </div>
                      </div>
                    </div>

                    {/* Footer: Major Order Flow & Quick Inspect Link */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                      <div className="font-mono">
                        <span className="text-slate-400">主力大單淨流向：</span>
                        <span
                          className={`font-bold ${
                            ev.majorNetLots >= 0 ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {ev.majorNetLots >= 0 ? '+' : ''}
                          {ev.majorNetLots.toLocaleString()} 張
                        </span>
                      </div>

                      <span className="inline-flex items-center font-bold text-amber-300 group-hover:translate-x-0.5 transition-transform">
                        <span>立即鎖定診斷</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
