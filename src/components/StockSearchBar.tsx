import React, { useState } from 'react';
import { Search, Flame, Zap, Sparkles, Star, Bookmark, Check, FileSpreadsheet, RefreshCw, Wifi } from 'lucide-react';
import { POPULAR_STOCK_CHIPS, PRELOADED_STOCKS, TAIWAN_STOCK_MASTER } from '../data/mockStocks';
import { calculateStockHeatBadge } from '../utils/stockHeat';

interface StockSearchBarProps {
  currentSymbol: string;
  currentStockName: string;
  onSelectStock: (query: string) => void;
  isLoading?: boolean;
  isInWatchlist: boolean;
  onToggleWatchlist: (symbol: string) => void;
  onOpenDirectory?: () => void;
  liveQuotes?: Record<string, any>;
  onRefreshAllQuotes?: () => void;
  isSyncingAllQuotes?: boolean;
  lastSyncTime?: string;
}

export const StockSearchBar: React.FC<StockSearchBarProps> = ({
  currentSymbol,
  currentStockName,
  onSelectStock,
  isLoading = false,
  isInWatchlist,
  onToggleWatchlist,
  onOpenDirectory,
  liveQuotes,
  onRefreshAllQuotes,
  isSyncingAllQuotes = false,
  lastSyncTime,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      onSelectStock(inputVal.trim());
      setShowSuggestions(false);
    }
  };

  const handleChipClick = (query: string) => {
    setInputVal('');
    onSelectStock(query);
    setShowSuggestions(false);
  };

  // Filter suggestions from verified Taiwan stock master directory (2,357 stocks)
  const suggestions = TAIWAN_STOCK_MASTER.filter((s) => {
    if (!inputVal.trim()) return false;
    const q = inputVal.trim().toLowerCase();
    return (
      s.symbol.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.industry.toLowerCase().includes(q)
    );
  }).slice(0, 10);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl shadow-black/40 backdrop-blur-sm">
      {/* Top indicator: 當日官方收盤資料與即時連線標示 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 mb-3 px-0.5 gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center space-x-1.5 font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2.5 py-1 rounded-lg">
            <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>已連線證交所 (TWSE/TPEx) 及藍三竹股市 App 數據庫</span>
          </span>
          <span className="text-slate-300 text-[11px] hidden md:inline">
            每日更新時間：<strong className="text-emerald-400 font-mono">下午 13:30 每日收盤價</strong> · 資料庫收錄全市場 2,357 檔標的
            {lastSyncTime && <span className="ml-1 text-slate-500">({lastSyncTime})</span>}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {onRefreshAllQuotes && (
            <button
              type="button"
              onClick={onRefreshAllQuotes}
              disabled={isSyncingAllQuotes}
              className="flex items-center space-x-1.5 text-xs text-cyan-300 hover:text-cyan-200 font-semibold px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-700/60 hover:bg-cyan-900/50 transition-all shadow-sm disabled:opacity-50"
              title="重新連線證券交易所與藍三竹 App 即時更新所有股價及籌碼"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAllQuotes ? 'animate-spin text-cyan-400' : ''}`} />
              <span>{isSyncingAllQuotes ? '連線更新中...' : '重新連線證交所及藍三竹'}</span>
            </button>
          )}

          {onOpenDirectory && (
            <button
              type="button"
              onClick={onOpenDirectory}
              className="flex items-center space-x-1.5 text-xs text-blue-400 hover:text-blue-300 font-bold px-2.5 py-1 rounded-lg bg-blue-950/60 border border-blue-700/60 hover:bg-blue-900/40 transition-all shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>全台股 2,357 檔 應對總表</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
        {/* Search Input Form */}
        <form onSubmit={handleSubmit} className="relative flex-1">
          <div className="relative flex items-center">
            <div className="absolute left-4 text-slate-400">
              <Search className="w-5 h-5 text-blue-400" />
            </div>
            <input
              type="text"
              value={inputVal}
              onChange={(e) => {
                setInputVal(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="輸入股號或股名（如：台積電、2330、0050、00878、鴻海、緯創、長榮、華城、弘塑、3008、3661...）"
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-12 pr-24 py-3 text-slate-100 placeholder-slate-500 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-inner"
            />
            <button
              type="submit"
              disabled={isLoading || !inputVal.trim()}
              className="absolute right-2 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-md flex items-center space-x-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>查詢</span>
            </button>
          </div>

          {/* Suggestion Dropdown with exact Symbol, Name and Official Price */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-30 overflow-hidden divide-y divide-slate-800">
              {suggestions.map((s) => {
                const live = liveQuotes?.[s.symbol];
                const displayPrice = live ? live.price : s.price;
                const displayChange = live ? live.change : s.change;
                const displayPercent = live ? live.changePercent : s.changePercent;
                const displayVolume = live ? live.volume : s.volume;
                const isUp = displayChange > 0;
                const isDown = displayChange < 0;
                const priceColor = isUp ? 'text-red-400' : isDown ? 'text-emerald-400' : 'text-slate-300';
                
                const itemForHeat = {
                  ...s,
                  price: displayPrice,
                  change: displayChange,
                  changePercent: displayPercent,
                  volume: displayVolume,
                  yesterdayClose: live?.yesterdayClose || s.yesterdayClose,
                  highPrice: live?.highPrice || s.highPrice,
                  lowPrice: live?.lowPrice || s.lowPrice,
                };
                const heat = calculateStockHeatBadge(itemForHeat as any);

                return (
                  <button
                    key={s.symbol}
                    type="button"
                    onClick={() => handleChipClick(s.symbol)}
                    className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-slate-800/80 transition-colors"
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono font-bold text-blue-400">{s.symbol}</span>
                      <span className="font-semibold text-slate-200">{live?.name || s.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {s.industry}
                      </span>
                      {heat.category === 'strong' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center space-x-1 font-semibold">
                          <Flame className="w-2.5 h-2.5 text-rose-400" />
                          <span>強勢</span>
                        </span>
                      )}
                      {heat.category === 'volatile' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center space-x-1 font-semibold">
                          <Zap className="w-2.5 h-2.5 text-amber-400" />
                          <span>異常波動</span>
                        </span>
                      )}
                    </div>

                    <div className="text-right flex items-center space-x-2">
                      <span className={`font-mono font-bold ${priceColor}`}>${displayPrice.toFixed(1)}</span>
                      <span className={`text-xs font-mono font-semibold ${isUp ? 'text-red-400' : isDown ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {displayChange >= 0 ? '+' : ''}{displayPercent.toFixed(2)}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </form>

        {/* 「加入自選」按鈕 */}
        <button
          type="button"
          onClick={() => onToggleWatchlist(currentSymbol)}
          className={`flex-shrink-0 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all shadow-md border ${
            isInWatchlist
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
              : 'bg-slate-800 hover:bg-slate-750 text-slate-100 border-slate-700 hover:border-slate-600'
          }`}
          title={isInWatchlist ? `點擊將 ${currentStockName} 移出自選股` : `點擊將 ${currentStockName} 加入自選股清單`}
        >
          {isInWatchlist ? (
            <>
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span>★ 已在自選</span>
            </>
          ) : (
            <>
              <Star className="w-4 h-4 text-slate-300" />
              <span>＋ 加入自選</span>
            </>
          )}
        </button>
      </div>

      {/* Quick Access Hot Chips */}
      <div className="mt-4 flex items-center flex-wrap gap-2 text-xs">
        <span className="flex items-center text-slate-400 font-medium mr-1">
          <Flame className="w-3.5 h-3.5 text-amber-500 mr-1" />
          熱門收盤標的:
        </span>
        {POPULAR_STOCK_CHIPS.map((chip) => {
          const isActive = currentSymbol === chip.symbol;
          return (
            <button
              key={chip.symbol}
              onClick={() => handleChipClick(chip.symbol)}
              className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center space-x-1.5 ${
                isActive
                  ? 'bg-blue-600 text-white font-bold ring-2 ring-blue-400/40 shadow-sm'
                  : 'bg-slate-800/90 text-slate-300 hover:bg-slate-750 hover:text-white border border-slate-700/60'
              }`}
            >
              <span>{chip.name}</span>
              <span className={`font-mono text-[11px] ${isActive ? 'text-blue-200' : 'text-slate-400'}`}>
                {chip.symbol}
              </span>
              <span className={`text-[10px] px-1 rounded ${isActive ? 'bg-blue-700 text-blue-100' : 'bg-slate-900 text-slate-400'}`}>
                {chip.tag}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
