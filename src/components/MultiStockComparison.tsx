import React, { useState } from 'react';
import { 
  ArrowUpDown, 
  ExternalLink, 
  CheckCircle2, 
  Layers, 
  Sparkles, 
  ShieldCheck, 
  TrendingUp, 
  BarChart3, 
  DollarSign, 
  Activity 
} from 'lucide-react';
import { StockData } from '../types/stock';
import { PRELOADED_STOCKS, getOrGenerateStockData } from '../data/mockStocks';

interface MultiStockComparisonProps {
  watchlistSymbols: string[];
  currentSymbol: string;
  onSelectStock: (symbol: string) => void;
  liveQuotes?: Record<string, any>;
}

export const MultiStockComparison: React.FC<MultiStockComparisonProps> = ({
  watchlistSymbols,
  currentSymbol,
  onSelectStock,
  liveQuotes,
}) => {
  const [filterCategory, setFilterCategory] = useState<'all' | 'chips' | 'financial' | 'valuation'>('all');

  // Ensure we compare at least 4 stocks (combine watchlist with famous stocks if watchlist has fewer)
  const symbolsToCompare = Array.from(new Set([...watchlistSymbols, '2330', '2317', '2454', '2603'])).slice(0, 8);
  const stockList: StockData[] = symbolsToCompare.map((sym) => {
    const base = PRELOADED_STOCKS[sym] || getOrGenerateStockData(sym);
    const live = liveQuotes?.[sym];
    if (live) {
      return {
        ...base,
        name: live.name || base.name,
        price: live.price,
        yesterdayClose: live.yesterdayClose,
        change: live.change,
        changePercent: live.changePercent,
        openPrice: live.openPrice,
        highPrice: live.highPrice,
        lowPrice: live.lowPrice,
        volume: live.volume,
      };
    }
    return base;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <span className="text-xs px-2 py-0.5 rounded font-black bg-gradient-to-r from-amber-500 to-orange-500 text-white tracking-wider">
            NEW
          </span>
          <h3 className="text-base sm:text-lg font-bold text-slate-100 flex items-center space-x-2">
            <span>多檔標的 同步對照表</span>
            <span className="text-xs text-slate-400 font-normal">（參考三竹智選股旗艦對照功能）</span>
          </h3>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'all' as const, label: '全部核心指標' },
            { id: 'chips' as const, label: '籌碼大單' },
            { id: 'financial' as const, label: '財務營收' },
            { id: 'valuation' as const, label: '位階量化' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterCategory(tab.id)}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                filterCategory === tab.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse font-mono">
          <thead>
            <tr className="bg-slate-950/90 border-b border-slate-800 text-slate-400">
              <th className="py-3 px-4 font-bold min-w-[140px] sticky left-0 bg-slate-950 z-10 shadow-sm border-r border-slate-800">
                比較項目 (收盤資料)
              </th>
              {stockList.map((s) => (
                <th
                  key={s.symbol}
                  onClick={() => onSelectStock(s.symbol)}
                  className={`py-3 px-4 min-w-[150px] cursor-pointer hover:bg-slate-800/80 transition-colors ${
                    s.symbol === currentSymbol ? 'bg-blue-950/40 border-b-2 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-slate-100 font-sans">{s.name}</div>
                      <div className="text-[11px] text-blue-400 font-bold">{s.symbol}</div>
                    </div>
                    {s.symbol === currentSymbol && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-600 text-white font-sans">
                        當前檢視
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {/* ROW: 當日收盤價 */}
            <tr className="hover:bg-slate-850/40">
              <td className="py-2.5 px-4 font-bold text-slate-300 sticky left-0 bg-slate-900 border-r border-slate-800 z-10">
                今日收盤價
              </td>
              {stockList.map((s) => (
                <td key={s.symbol} className="py-2.5 px-4">
                  <span className={`text-sm font-bold ${s.change >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    ${s.price.toFixed(2)}
                  </span>
                </td>
              ))}
            </tr>

            {/* ROW: 收盤漲跌幅 */}
            <tr className="hover:bg-slate-850/40">
              <td className="py-2.5 px-4 font-bold text-slate-300 sticky left-0 bg-slate-900 border-r border-slate-800 z-10">
                收盤漲跌幅
              </td>
              {stockList.map((s) => (
                <td key={s.symbol} className="py-2.5 px-4">
                  <span className={`px-2 py-0.5 rounded font-bold text-xs ${s.change >= 0 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {s.change >= 0 ? '+' : ''}{s.changePercent.toFixed(2)}%
                  </span>
                </td>
              ))}
            </tr>

            {/* ROW: 總量 & 估量比 */}
            <tr className="hover:bg-slate-850/40">
              <td className="py-2.5 px-4 font-bold text-slate-300 sticky left-0 bg-slate-900 border-r border-slate-800 z-10">
                總量 / 估量比
              </td>
              {stockList.map((s) => (
                <td key={s.symbol} className="py-2.5 px-4 text-slate-300">
                  <span className="font-bold text-amber-400">{s.volume.toLocaleString()} 張</span>
                  <span className="text-[10px] text-slate-500 ml-1.5">({s.volumeRatio || 1.0}x)</span>
                </td>
              ))}
            </tr>

            {/* ROW: 股價位階評估 */}
            {(filterCategory === 'all' || filterCategory === 'valuation') && (
              <tr className="hover:bg-slate-850/40">
                <td className="py-2.5 px-4 font-bold text-slate-300 sticky left-0 bg-slate-900 border-r border-slate-800 z-10">
                  股價位階評估
                </td>
                {stockList.map((s) => (
                  <td key={s.symbol} className="py-2.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                      {s.valuationScore}% · {s.stageLabel}
                    </span>
                  </td>
                ))}
              </tr>
            )}

            {/* ROW: 大小單大單買比 */}
            {(filterCategory === 'all' || filterCategory === 'chips') && (
              <tr className="hover:bg-slate-850/40">
                <td className="py-2.5 px-4 font-bold text-slate-300 sticky left-0 bg-slate-900 border-r border-slate-800 z-10">
                  大單買比 vs 賣比
                </td>
                {stockList.map((s) => (
                  <td key={s.symbol} className="py-2.5 px-4">
                    <span className="text-red-400 font-bold">{s.largeOrderBuyRatio}%</span>
                    <span className="text-slate-500 mx-1">/</span>
                    <span className="text-emerald-400">{s.largeOrderSellRatio}%</span>
                  </td>
                ))}
              </tr>
            )}

            {/* ROW: 特大單買賣超 */}
            {(filterCategory === 'all' || filterCategory === 'chips') && (
              <tr className="hover:bg-slate-850/40">
                <td className="py-2.5 px-4 font-bold text-slate-300 sticky left-0 bg-slate-900 border-r border-slate-800 z-10">
                  特大單買賣超
                </td>
                {stockList.map((s) => (
                  <td key={s.symbol} className={`py-2.5 px-4 font-bold ${s.orderFlow.superLargeNet >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {s.orderFlow.superLargeNet >= 0 ? '+' : ''}{s.orderFlow.superLargeNet.toLocaleString()} 張
                  </td>
                ))}
              </tr>
            )}

            {/* ROW: 主力囤貨張數 */}
            {(filterCategory === 'all' || filterCategory === 'chips') && (
              <tr className="hover:bg-slate-850/40">
                <td className="py-2.5 px-4 font-bold text-slate-300 sticky left-0 bg-slate-900 border-r border-slate-800 z-10">
                  主力囤貨 (近20日)
                </td>
                {stockList.map((s) => (
                  <td key={s.symbol} className={`py-2.5 px-4 font-bold ${s.majorAccumulation >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {s.majorAccumulation >= 0 ? '+' : ''}{s.majorAccumulation.toLocaleString()} 張
                  </td>
                ))}
              </tr>
            )}

            {/* ROW: 主力均價成本線 */}
            {(filterCategory === 'all' || filterCategory === 'chips') && (
              <tr className="hover:bg-slate-850/40">
                <td className="py-2.5 px-4 font-bold text-slate-300 sticky left-0 bg-slate-900 border-r border-slate-800 z-10">
                  主力成本均價
                </td>
                {stockList.map((s) => (
                  <td key={s.symbol} className="py-2.5 px-4 font-bold text-amber-400">
                    ${s.majorCost.toFixed(1)}
                  </td>
                ))}
              </tr>
            )}

            {/* ROW: 每股盈餘 (EPS) */}
            {(filterCategory === 'all' || filterCategory === 'financial') && (
              <tr className="hover:bg-slate-850/40">
                <td className="py-2.5 px-4 font-bold text-slate-300 sticky left-0 bg-slate-900 border-r border-slate-800 z-10">
                  近四季 EPS
                </td>
                {stockList.map((s) => (
                  <td key={s.symbol} className="py-2.5 px-4 font-bold text-emerald-400">
                    ${s.eps.toFixed(2)} 元
                  </td>
                ))}
              </tr>
            )}

            {/* ROW: 本益比 (P/E) */}
            {(filterCategory === 'all' || filterCategory === 'financial') && (
              <tr className="hover:bg-slate-850/40">
                <td className="py-2.5 px-4 font-bold text-slate-300 sticky left-0 bg-slate-900 border-r border-slate-800 z-10">
                  本益比 (P/E)
                </td>
                {stockList.map((s) => (
                  <td key={s.symbol} className="py-2.5 px-4 font-bold text-cyan-400">
                    {s.pe} 倍
                  </td>
                ))}
              </tr>
            )}

            {/* ROW: 每股淨值 (NAV) */}
            {(filterCategory === 'all' || filterCategory === 'financial') && (
              <tr className="hover:bg-slate-850/40">
                <td className="py-2.5 px-4 font-bold text-slate-300 sticky left-0 bg-slate-900 border-r border-slate-800 z-10">
                  每股淨值 (P/B)
                </td>
                {stockList.map((s) => (
                  <td key={s.symbol} className="py-2.5 px-4 text-slate-300">
                    ${s.bookValue.toFixed(1)} <span className="text-[10px] text-slate-500">({s.pb}x)</span>
                  </td>
                ))}
              </tr>
            )}

            {/* ROW: 最新營收 YoY */}
            {(filterCategory === 'all' || filterCategory === 'financial') && (
              <tr className="hover:bg-slate-850/40">
                <td className="py-2.5 px-4 font-bold text-slate-300 sticky left-0 bg-slate-900 border-r border-slate-800 z-10">
                  最新營收年增率 (YoY)
                </td>
                {stockList.map((s) => (
                  <td key={s.symbol} className={`py-2.5 px-4 font-bold ${s.revenueYoY >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {s.revenueYoY >= 0 ? '+' : ''}{s.revenueYoY}%
                  </td>
                ))}
              </tr>
            )}

            {/* ROW: 阿法值 (Alpha, α) */}
            {(filterCategory === 'all' || filterCategory === 'valuation') && (
              <tr className="hover:bg-slate-850/40">
                <td className="py-2.5 px-4 font-bold text-slate-300 sticky left-0 bg-slate-900 border-r border-slate-800 z-10">
                  阿法值 (Alpha)
                </td>
                {stockList.map((s) => (
                  <td key={s.symbol} className={`py-2.5 px-4 font-bold ${s.alpha >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {s.alpha >= 0 ? '+' : ''}{s.alpha}%
                  </td>
                ))}
              </tr>
            )}

            {/* ROW: 貝塔值 (Beta, β) */}
            {(filterCategory === 'all' || filterCategory === 'valuation') && (
              <tr className="hover:bg-slate-850/40">
                <td className="py-2.5 px-4 font-bold text-slate-300 sticky left-0 bg-slate-900 border-r border-slate-800 z-10">
                  貝塔值 (Beta)
                </td>
                {stockList.map((s) => (
                  <td key={s.symbol} className="py-2.5 px-4 font-bold text-amber-400">
                    {s.beta}
                  </td>
                ))}
              </tr>
            )}

            {/* ROW: 今日周轉率 */}
            {(filterCategory === 'all' || filterCategory === 'chips') && (
              <tr className="hover:bg-slate-850/40">
                <td className="py-2.5 px-4 font-bold text-slate-300 sticky left-0 bg-slate-900 border-r border-slate-800 z-10">
                  周轉率 (%)
                </td>
                {stockList.map((s) => (
                  <td key={s.symbol} className="py-2.5 px-4 font-bold text-slate-300">
                    {s.turnoverRate.toFixed(2)}%
                  </td>
                ))}
              </tr>
            )}

            {/* ROW: 法人動態 */}
            {(filterCategory === 'all' || filterCategory === 'chips') && (
              <tr className="hover:bg-slate-850/40">
                <td className="py-2.5 px-4 font-bold text-slate-300 sticky left-0 bg-slate-900 border-r border-slate-800 z-10">
                  外資 / 投信動態
                </td>
                {stockList.map((s) => (
                  <td key={s.symbol} className="py-2.5 px-4 text-xs font-sans">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${s.foreignStreak > 0 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      外資{s.foreignStreak > 0 ? `連${s.foreignStreak}買` : `連${Math.abs(s.foreignStreak)}賣`}
                    </span>
                  </td>
                ))}
              </tr>
            )}

            {/* ROW: 切換動作 */}
            <tr className="bg-slate-950/50">
              <td className="py-3 px-4 font-bold text-slate-400 sticky left-0 bg-slate-950 border-r border-slate-800 z-10">
                深入檢視
              </td>
              {stockList.map((s) => (
                <td key={s.symbol} className="py-3 px-4">
                  <button
                    onClick={() => onSelectStock(s.symbol)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs font-sans transition-colors flex items-center space-x-1"
                  >
                    <span>完整摘要</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
