import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  Bell, 
  ShieldCheck, 
  Share2, 
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  CheckCircle2,
  Tag,
  Activity
} from 'lucide-react';
import { StockData } from '../types/stock';

interface StockOverviewHeaderProps {
  stock: StockData;
  onGenerateAIReport: () => void;
  onOpenAlertModal: () => void;
  isGeneratingAI: boolean;
  isInWatchlist?: boolean;
  onToggleWatchlist?: (symbol: string) => void;
  activeSection?: string;
  onSelectSection?: (sectionId: string) => void;
}

export const StockOverviewHeader: React.FC<StockOverviewHeaderProps> = ({
  stock,
  onGenerateAIReport,
  onOpenAlertModal,
  isGeneratingAI,
  isInWatchlist,
  onToggleWatchlist,
  activeSection = 'summary',
  onSelectSection,
}) => {
  const isUp = stock.change > 0;
  const isDown = stock.change < 0;
  const priceColor = isUp ? 'text-red-500' : isDown ? 'text-emerald-500' : 'text-slate-200';
  const badgeBg = isUp ? 'bg-red-500/10 border-red-500/30 text-red-400' : isDown ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-300';

  const [copied, setCopied] = React.useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(
      `【三竹智選股·收盤摘要】${stock.name} (${stock.symbol}) 今日收盤價: ${stock.price} (${stock.change >= 0 ? '+' : ''}${stock.change} / ${stock.changePercent}%) | 總量: ${stock.volume}張 | 估量比: ${stock.volumeRatio || 1.0} | 股價位階: ${stock.valuationScore}% (${stock.stageLabel}) | 本益比: ${stock.pe}倍 | EPS: ${stock.eps}元`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Stage assessment badge color
  let stageColorClass = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
  if (stock.valuationScore <= 35) {
    stageColorClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
  } else if (stock.valuationScore >= 75) {
    stageColorClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  }

  const tags = stock.categoryTags || ['AI伺服器代工', '外資連買', '月營收高'];
  const marginNote = stock.marginTrading || `${stock.market}-${stock.industry}-買賣現沖`;
  const estimatedVol = stock.estimatedVolume || stock.volume;
  const volRatio = stock.volumeRatio || 0.78;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
      {/* Subtle background glow */}
      <div 
        className={`absolute -right-20 -top-20 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-20 ${
          isUp ? 'bg-red-500' : isDown ? 'bg-emerald-500' : 'bg-blue-500'
        }`}
      />

      {/* Top Banner: Mitake Signature Sub-tag and Market Category */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800/80 text-xs">
        <div className="flex items-center space-x-2 text-slate-400">
          <span className="font-mono font-bold text-blue-400">{stock.symbol}</span>
          <span className="font-bold text-slate-200">{stock.name}</span>
          <span className="text-slate-500">|</span>
          <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800 font-medium">
            {marginNote}
          </span>
        </div>

        {/* Closing status pill */}
        <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-800/60 text-emerald-300 text-[11px] font-bold">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span>今日收盤資料 (13:30 盤後正式數據)</span>
        </span>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
        {/* Left: Stock Identity & Price */}
        <div className="space-y-3">
          <div className="flex items-center flex-wrap gap-2.5">
            <span className="font-mono text-xl sm:text-2xl font-black text-blue-400 tracking-wider">
              {stock.symbol}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              {stock.name}
            </h1>

            {/* Valuation Stage Indicator */}
            <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border ${stageColorClass}`}>
              <Layers className="w-3.5 h-3.5" />
              <span>位階: {stock.valuationScore}% · {stock.stageLabel}</span>
            </div>
          </div>

          {/* Mitake Characteristic Concept Tags */}
          <div className="flex items-center flex-wrap gap-1.5">
            {tags.map((t, idx) => (
              <span
                key={idx}
                className="text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-slate-800/90 text-slate-300 border border-slate-700/80 hover:bg-slate-750"
              >
                {t}
              </span>
            ))}
          </div>

          {/* Large Price Display with Closing label */}
          <div>
            <div className="text-xs text-slate-400 font-medium mb-1">
              今日收盤價 (Closing Price):
            </div>
            <div className="flex items-baseline space-x-4 flex-wrap">
              <span className={`text-4xl sm:text-5xl font-mono font-black tracking-tight ${priceColor}`}>
                {stock.price.toFixed(2)}
              </span>

              <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-sm sm:text-base font-bold border ${badgeBg}`}>
                {isUp ? <ArrowUpRight className="w-5 h-5 text-red-500" /> : isDown ? <ArrowDownRight className="w-5 h-5 text-emerald-500" /> : null}
                <span>{stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}</span>
                <span>({stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%)</span>
              </div>

              <span className="text-xs text-slate-400 flex items-center">
                結算: <span className="font-mono text-slate-300 ml-1 font-semibold">{stock.lastUpdated} 收盤</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Quick Action Buttons & Mitake Signature 3-Stats Box */}
        <div className="space-y-3">
          {/* Mitake 3-Stats Box (總量, 估量, 估量比) */}
          <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 grid grid-cols-3 gap-3 text-center text-xs font-mono">
            <div>
              <div className="text-[10px] text-slate-400 font-sans">總量 (張)</div>
              <div className="text-sm font-bold text-slate-200 mt-0.5">{stock.volume.toLocaleString()}</div>
            </div>
            <div className="border-x border-slate-800 px-2">
              <div className="text-[10px] text-slate-400 font-sans">估量 (張)</div>
              <div className="text-sm font-bold text-slate-200 mt-0.5">{estimatedVol.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-sans">估量比</div>
              <div className="text-sm font-bold text-amber-400 mt-0.5">{volRatio.toFixed(2)}</div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-2.5">
            {onToggleWatchlist && (
              <button
                onClick={() => onToggleWatchlist(stock.symbol)}
                className={`flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all ${
                  isInWatchlist
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
              >
                <Star className={`w-4 h-4 ${isInWatchlist ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                <span>{isInWatchlist ? '已在自選' : '加自選'}</span>
              </button>
            )}

            <button
              onClick={onGenerateAIReport}
              disabled={isGeneratingAI}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isGeneratingAI ? 'animate-spin' : ''}`} />
              <span>{isGeneratingAI ? '投研報告生成中...' : 'AI 收盤投研報告'}</span>
            </button>

            <button
              onClick={onOpenAlertModal}
              className="flex items-center justify-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs sm:text-sm transition-all"
              title="設定即時推播警示"
            >
              <Bell className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">設定警示</span>
            </button>

            <button
              onClick={handleShare}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-sm transition-all"
              title="複製個股收盤摘要"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Ribbon Stats Bar */}
      <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
        <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/50">
          <div className="text-slate-400 font-medium">開盤價</div>
          <div className="font-mono text-sm font-bold text-slate-200 mt-0.5">${stock.openPrice.toFixed(2)}</div>
        </div>
        <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/50">
          <div className="text-slate-400 font-medium">今日最高價</div>
          <div className="font-mono text-sm font-bold text-red-400 mt-0.5">${stock.highPrice.toFixed(2)}</div>
        </div>
        <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/50">
          <div className="text-slate-400 font-medium">今日最低價</div>
          <div className="font-mono text-sm font-bold text-emerald-400 mt-0.5">${stock.lowPrice.toFixed(2)}</div>
        </div>
        <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/50">
          <div className="text-slate-400 font-medium">昨收價</div>
          <div className="font-mono text-sm font-bold text-slate-300 mt-0.5">${stock.yesterdayClose.toFixed(2)}</div>
        </div>
        <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/50">
          <div className="text-slate-400 font-medium">今日收盤總成交量</div>
          <div className="font-mono text-sm font-bold text-amber-400 mt-0.5">
            {stock.volume.toLocaleString()} <span className="text-[10px] text-slate-400">張</span>
          </div>
        </div>
        <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/50">
          <div className="text-slate-400 font-medium">今日收盤成交金額</div>
          <div className="font-mono text-sm font-bold text-cyan-400 mt-0.5">
            {stock.totalAmount.toFixed(1)} <span className="text-[10px] text-slate-400">億元</span>
          </div>
        </div>
      </div>
    </div>
  );
};
