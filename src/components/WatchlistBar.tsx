import React from 'react';
import { X, ArrowUpRight, ArrowDownRight, Minus, Bookmark } from 'lucide-react';
import { StockData } from '../types/stock';
import { getOrGenerateStockData, PRELOADED_STOCKS } from '../data/mockStocks';

interface WatchlistBarProps {
  watchlistSymbols: string[];
  currentSymbol: string;
  onSelectStock: (symbol: string) => void;
  onRemoveFromWatchlist: (symbol: string) => void;
  onOpenQuickAdd?: () => void;
  liveQuotes?: Record<string, any>;
}

export const WatchlistBar: React.FC<WatchlistBarProps> = ({
  watchlistSymbols,
  currentSymbol,
  onSelectStock,
  onRemoveFromWatchlist,
  liveQuotes,
}) => {
  // Pre-resolve stock data for each symbol in watchlist, merged with official live/closing quotes
  const watchlistStocks: StockData[] = watchlistSymbols.map((sym) => {
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

  // Helper to compute chip strength (主力買賣超 & 籌碼多空比) for each watchlist stock
  const getChipStrength = (s: StockData) => {
    const majorBuy = (s.orderFlow?.superLargeBuy ?? 0) + (s.orderFlow?.largeBuy ?? 0);
    const majorSell = (s.orderFlow?.superLargeSell ?? 0) + (s.orderFlow?.largeSell ?? 0);
    const majorNet = (s.orderFlow?.superLargeNet ?? 0) + (s.orderFlow?.largeNet ?? 0) || (majorBuy - majorSell);
    const powerRatio = majorSell > 0 ? majorBuy / majorSell : majorBuy > 0 ? 2.0 : 1.0;
    const isBullish = majorNet > 0;
    const isBearish = majorNet < 0;
    return {
      majorNet,
      powerRatio,
      isBullish,
      isBearish,
    };
  };

  const bullishCount = watchlistStocks.filter((s) => getChipStrength(s).isBullish).length;
  const bearishCount = watchlistStocks.filter((s) => getChipStrength(s).isBearish).length;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 px-1">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Bookmark className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-slate-200">我的自選股</span>
          <span className="text-[11px] font-mono px-2 py-0.2 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
            {watchlistSymbols.length} 檔
          </span>
          <span className="text-[11px] text-slate-400 hidden lg:inline ml-1">
            （免切換即可速覽各股籌碼強弱，點擊卡片檢視完整診斷）
          </span>
        </div>

        {/* Minimalist Chip Strength Legend & Summary */}
        <div className="flex items-center space-x-3 text-[11px]">
          <div className="flex items-center space-x-2 bg-slate-950/80 border border-slate-800 px-2.5 py-1 rounded-lg">
            <span className="text-slate-400 font-medium">籌碼強弱圖示：</span>
            <span className="inline-flex items-center text-rose-400 font-semibold">
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5 stroke-[2.5]" />
              主力買超 ({bullishCount})
            </span>
            <span className="text-slate-700">|</span>
            <span className="inline-flex items-center text-emerald-400 font-semibold">
              <ArrowDownRight className="w-3.5 h-3.5 mr-0.5 stroke-[2.5]" />
              主力賣超 ({bearishCount})
            </span>
          </div>
          <div className="text-slate-400 hidden sm:flex items-center space-x-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />
            <span>今日收盤資料</span>
          </div>
        </div>
      </div>

      {/* Horizontal Scrollable Stock List */}
      <div className="flex items-center space-x-2.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
        {watchlistStocks.map((s) => {
          const isActive = s.symbol === currentSymbol;
          const isUp = s.change > 0;
          const isDown = s.change < 0;
          const priceColor = isUp ? 'text-red-400' : isDown ? 'text-emerald-400' : 'text-slate-300';
          const changeBg = isUp ? 'bg-red-500/10 text-red-400' : isDown ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-300';

          const { majorNet, powerRatio, isBullish, isBearish } = getChipStrength(s);
          const formattedNetLots = `${majorNet > 0 ? '+' : ''}${majorNet.toLocaleString()}張`;

          return (
            <div
              key={s.symbol}
              onClick={() => onSelectStock(s.symbol)}
              title={`${s.name} (${s.symbol})｜主力${isBullish ? '買超' : isBearish ? '賣超' : '持平'} ${formattedNetLots}｜籌碼多空比 ${powerRatio.toFixed(2)}x`}
              className={`group relative flex-shrink-0 cursor-pointer rounded-xl p-2.5 sm:p-3 transition-all border flex items-center space-x-2.5 select-none ${
                isActive
                  ? 'bg-blue-950/40 border-blue-500/80 ring-2 ring-blue-500/30 shadow-lg shadow-blue-500/10'
                  : 'bg-slate-950/70 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Minimalist Chip Strength Mini-Icon (籌碼強弱小圖示) */}
              <div
                className={`flex flex-col items-center justify-center w-8 h-9 rounded-lg border flex-shrink-0 transition-transform group-hover:scale-105 ${
                  isBullish
                    ? 'bg-rose-500/15 border-rose-500/35 text-rose-400 shadow-sm shadow-rose-950/50'
                    : isBearish
                    ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400 shadow-sm shadow-emerald-950/50'
                    : 'bg-slate-800/70 border-slate-700 text-slate-400'
                }`}
              >
                {isBullish ? (
                  <ArrowUpRight className="w-4 h-4 stroke-[2.75] -mb-0.5" />
                ) : isBearish ? (
                  <ArrowDownRight className="w-4 h-4 stroke-[2.75] -mb-0.5" />
                ) : (
                  <Minus className="w-3.5 h-3.5 stroke-[2.5] -mb-0.5" />
                )}
                <span className="text-[9px] font-extrabold leading-none tracking-tighter">
                  {isBullish ? '買超' : isBearish ? '賣超' : '持平'}
                </span>
              </div>

              {/* Stock Symbol, Name & Chip Net Lots / Power Ratio */}
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold text-xs sm:text-sm text-slate-100">{s.name}</span>
                  <span className="font-mono text-[11px] text-blue-400 font-semibold">{s.symbol}</span>
                </div>
                <div className="flex items-center space-x-1.5 text-[10px] mt-0.5">
                  <span
                    className={`font-mono font-semibold ${
                      isBullish
                        ? 'text-rose-400'
                        : isBearish
                        ? 'text-emerald-400'
                        : 'text-slate-400'
                    }`}
                  >
                    主力 {formattedNetLots}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-400 font-mono">
                    多空 {powerRatio.toFixed(1)}x
                  </span>
                </div>
              </div>

              {/* Price & Change */}
              <div className="text-right pl-1">
                <div className={`font-mono font-bold text-xs sm:text-sm ${priceColor}`}>
                  ${s.price.toFixed(2)}
                </div>
                <div className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold mt-0.5 inline-block ${changeBg}`}>
                  {s.change >= 0 ? '+' : ''}{s.changePercent.toFixed(2)}%
                </div>
              </div>

              {/* Remove button (X) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveFromWatchlist(s.symbol);
                }}
                title={`將 ${s.name} 移出自選`}
                className="opacity-0 group-hover:opacity-100 hover:bg-slate-700 text-slate-400 hover:text-red-400 p-1 rounded-md transition-all ml-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}

        {/* Quick Add helper if watchlist is empty or few items */}
        {watchlistStocks.length === 0 && (
          <div className="text-xs text-slate-500 py-3 px-4 italic">
            尚未加入自選股，請在下方搜尋列點擊「加入自選」按鈕。
          </div>
        )}
      </div>
    </div>
  );
};

