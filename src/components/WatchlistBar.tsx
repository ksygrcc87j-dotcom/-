import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Flame,
  Briefcase,
  ArrowLeftRight,
  Plus,
  Check,
  Save,
  Search,
  Edit3,
  RotateCcw,
  Wallet,
} from 'lucide-react';
import { StockData, UserHoldingItem } from '../types/stock';
import { getOrGenerateStockData, PRELOADED_STOCKS, TAIWAN_STOCK_MASTER } from '../data/mockStocks';

const HOLDINGS_STORAGE_KEY = 'sanzhu_user_holdings_v1';

const DEFAULT_HOLDINGS_MAP: Record<string, UserHoldingItem> = {
  '2330': { symbol: '2330', lots: 2, avgCost: 985.0, note: '核心長線持股', updatedAt: '今日已儲存' },
  '2317': { symbol: '2317', lots: 5, avgCost: 196.5, note: 'AI伺服器波段', updatedAt: '今日已儲存' },
  '2454': { symbol: '2454', lots: 1, avgCost: 1260.0, note: 'IC設計龍頭', updatedAt: '今日已儲存' },
  '2603': { symbol: '2603', lots: 4, avgCost: 202.0, note: '高殖利率航運', updatedAt: '今日已儲存' },
  '2382': { symbol: '2382', lots: 3, avgCost: 278.0, note: 'GB200主力概念', updatedAt: '今日已儲存' },
  '3231': { symbol: '3231', lots: 10, avgCost: 106.5, note: '籌碼集中低接', updatedAt: '今日已儲存' },
};

interface WatchlistBarProps {
  watchlistSymbols: string[];
  currentSymbol: string;
  onSelectStock: (symbol: string) => void;
  onRemoveFromWatchlist: (symbol: string) => void;
  onReplaceWatchlistSymbol?: (oldSymbol: string, newSymbol: string) => void;
  onAddWatchlistSymbol?: (symbol: string) => void;
  onSetWatchlistSymbols?: (symbols: string[]) => void;
  liveQuotes?: Record<string, any>;
}

export const WatchlistBar: React.FC<WatchlistBarProps> = ({
  watchlistSymbols,
  currentSymbol,
  onSelectStock,
  onRemoveFromWatchlist,
  onReplaceWatchlistSymbol,
  onAddWatchlistSymbol,
  onSetWatchlistSymbols,
  liveQuotes,
}) => {
  // User Holdings Map persisted in localStorage
  const [holdingsMap, setHoldingsMap] = useState<Record<string, UserHoldingItem>>(() => {
    try {
      const saved = localStorage.getItem(HOLDINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return { ...DEFAULT_HOLDINGS_MAP, ...parsed };
        }
      }
    } catch (e) {
      console.warn('Failed to load user holdings from localStorage', e);
    }
    return DEFAULT_HOLDINGS_MAP;
  });

  // Active editor state: which card symbol is currently being replaced/edited ('NEW' for adding a new holding)
  const [editingSlotSymbol, setEditingSlotSymbol] = useState<string | null>(null);
  const [isBatchManagerOpen, setIsBatchManagerOpen] = useState<boolean>(false);

  // Form states for single-slot replacement & holding editor
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [targetNewSymbol, setTargetNewSymbol] = useState<string>('');
  const [editLots, setEditLots] = useState<string>('1');
  const [editAvgCost, setEditAvgCost] = useState<string>('');
  const [editNote, setEditNote] = useState<string>('');
  const [saveToastMsg, setSaveToastMsg] = useState<string | null>(null);

  // Persist holdingsMap to localStorage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem(HOLDINGS_STORAGE_KEY, JSON.stringify(holdingsMap));
    } catch (e) {
      console.warn('Failed to save user holdings to localStorage', e);
    }
  }, [holdingsMap]);

  const triggerSaveFeedback = (msg: string) => {
    setSaveToastMsg(msg);
    setTimeout(() => {
      setSaveToastMsg((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  // Pre-resolve stock data for each symbol in watchlist, merged with official live/closing quotes
  const watchlistStocks: StockData[] = useMemo(() => {
    return watchlistSymbols.map((sym) => {
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
  }, [watchlistSymbols, liveQuotes]);

  // Ensure every stock in watchlistSymbols has a sensible holding entry if not yet initialized
  const getHoldingForStock = (s: StockData): UserHoldingItem => {
    const existing = holdingsMap[s.symbol];
    if (existing) return existing;
    const defaultCost = Number((s.majorCost || s.price * 0.96).toFixed(2));
    return {
      symbol: s.symbol,
      lots: 1,
      avgCost: defaultCost,
      note: '自選轉換持股',
    };
  };

  // Helper to compute chip strength (主力買賣超、籌碼多空比 & 籌碼進出熱力條指標) for each stock
  // Driven directly by real-time large-order net power: (superLargeNet + largeNet)
  const getChipStrength = (s: StockData) => {
    const superBuy = s.orderFlow?.superLargeBuy ?? 0;
    const superSell = s.orderFlow?.superLargeSell ?? 0;
    const largeBuy = s.orderFlow?.largeBuy ?? 0;
    const largeSell = s.orderFlow?.largeSell ?? 0;

    const superLargeNet = s.orderFlow?.superLargeNet ?? superBuy - superSell;
    const largeNet = s.orderFlow?.largeNet ?? largeBuy - largeSell;

    const majorBuy = superBuy + largeBuy;
    const majorSell = superSell + largeSell;
    // Core metric: 當日即時大單買賣力道 (superLargeNet + largeNet)
    const majorNet = superLargeNet + largeNet;

    const powerRatio = majorSell > 0 ? majorBuy / majorSell : majorBuy > 0 ? 2.0 : 1.0;
    const isBullish = majorNet > 0;
    const isBearish = majorNet < 0;

    const totalMajorVolume = Math.max(1, majorBuy + majorSell);
    // Net intensity ratio in [-100, +100] based on (superLargeNet + largeNet) / totalMajorVolume
    const netIntensityPct = Math.round((majorNet / totalMajorVolume) * 100);
    // Map (superLargeNet + largeNet) intensity onto [5, 95] red-green gradient thermal scale
    const buyHeatPct = Math.min(
      95,
      Math.max(5, Math.round(50 + (majorNet / totalMajorVolume) * 50))
    );
    const sellHeatPct = 100 - buyHeatPct;

    let heatLabel = '多空拉鋸';
    let heatBadgeClass = 'text-slate-300 bg-slate-800/90 border-slate-700';
    if (buyHeatPct >= 66) {
      heatLabel = '資金強勢湧入';
      heatBadgeClass = 'text-amber-300 bg-rose-500/25 border-rose-500/50 shadow-sm shadow-rose-950/60';
    } else if (buyHeatPct >= 53) {
      heatLabel = '買盤偏多溫熱';
      heatBadgeClass = 'text-rose-300 bg-rose-500/15 border-rose-500/35';
    } else if (buyHeatPct <= 34) {
      heatLabel = '大單湧現調節';
      heatBadgeClass = 'text-emerald-300 bg-emerald-500/25 border-emerald-500/50 shadow-sm shadow-emerald-950/60';
    } else if (buyHeatPct <= 47) {
      heatLabel = '賣壓相對偏重';
      heatBadgeClass = 'text-emerald-300 bg-emerald-500/15 border-emerald-500/35';
    }

    return {
      superLargeNet,
      largeNet,
      majorBuy,
      majorSell,
      majorNet,
      netIntensityPct,
      powerRatio,
      isBullish,
      isBearish,
      buyHeatPct,
      sellHeatPct,
      heatLabel,
      heatBadgeClass,
    };
  };

  // Portfolio Summary Metrics across all held stocks in watchlist
  const portfolioSummary = useMemo(() => {
    let totalMarketValue = 0;
    let totalCostValue = 0;
    let activeHoldingsCount = 0;

    watchlistStocks.forEach((s) => {
      const h = getHoldingForStock(s);
      if (h.lots > 0) {
        activeHoldingsCount += 1;
        // 1 張 = 1,000 股
        totalMarketValue += s.price * h.lots * 1000;
        totalCostValue += h.avgCost * h.lots * 1000;
      }
    });

    const totalPnL = totalMarketValue - totalCostValue;
    const totalRoiPct = totalCostValue > 0 ? (totalPnL / totalCostValue) * 100 : 0;

    return {
      activeHoldingsCount,
      totalMarketValue: Math.round(totalMarketValue),
      totalCostValue: Math.round(totalCostValue),
      totalPnL: Math.round(totalPnL),
      totalRoiPct,
    };
  }, [watchlistStocks, holdingsMap]);

  const bullishCount = watchlistStocks.filter((s) => getChipStrength(s).isBullish).length;
  const bearishCount = watchlistStocks.filter((s) => getChipStrength(s).isBearish).length;

  // Open single card slot editor (or 'NEW' to add a new stock holding)
  const handleOpenSlotEditor = (slotSym: string) => {
    if (slotSym === 'NEW') {
      const defaultCandidate =
        TAIWAN_STOCK_MASTER.find((m) => !watchlistSymbols.includes(m.symbol))?.symbol || '2308';
      const candidateStock = getOrGenerateStockData(defaultCandidate);
      const livePrice = liveQuotes?.[defaultCandidate]?.price ?? candidateStock.price;
      setEditingSlotSymbol('NEW');
      setTargetNewSymbol(defaultCandidate);
      setSearchQuery(`${defaultCandidate} ${candidateStock.name}`);
      setEditLots('1');
      setEditAvgCost(String(livePrice));
      setEditNote('新增波段持股');
      return;
    }

    const stockObj = watchlistStocks.find((s) => s.symbol === slotSym) || getOrGenerateStockData(slotSym);
    const holding = getHoldingForStock(stockObj);
    setEditingSlotSymbol(slotSym);
    setTargetNewSymbol(slotSym);
    setSearchQuery(`${slotSym} ${stockObj.name}`);
    setEditLots(String(holding.lots));
    setEditAvgCost(String(holding.avgCost));
    setEditNote(holding.note || '');
  };

  // Search autocomplete candidates from TAIWAN_STOCK_MASTER (2,357 Taiwan stocks)
  const searchCandidates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return TAIWAN_STOCK_MASTER.slice(0, 8);
    }
    const cleanCode = q.split(/\s+/)[0];
    return TAIWAN_STOCK_MASTER.filter(
      (item) =>
        item.symbol.toLowerCase().includes(cleanCode) ||
        item.name.toLowerCase().includes(q) ||
        item.industry.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [searchQuery]);

  // Select a replacement stock inside the slot editor
  const handleChooseReplacementCandidate = (sym: string) => {
    const base = PRELOADED_STOCKS[sym] || getOrGenerateStockData(sym);
    const live = liveQuotes?.[sym];
    const refPrice = live?.price ?? base.price;
    const existingHolding = holdingsMap[sym];

    setTargetNewSymbol(sym);
    setSearchQuery(`${sym} ${live?.name || base.name}`);
    setEditLots(String(existingHolding ? existingHolding.lots : Number(editLots) || 1));
    setEditAvgCost(String(existingHolding ? existingHolding.avgCost : refPrice));
  };

  // Save replacement & holding configuration
  const handleSaveSlotHolding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlotSymbol || !targetNewSymbol) return;

    const resolvedStock = PRELOADED_STOCKS[targetNewSymbol] || getOrGenerateStockData(targetNewSymbol);
    const livePrice = liveQuotes?.[targetNewSymbol]?.price ?? resolvedStock.price;
    const parsedLots = Math.max(0, Number(editLots) || 0);
    const parsedCost = Math.max(0.1, Number(editAvgCost) || livePrice);
    const nowStr = new Date().toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit' });

    // Save holding details into holdingsMap
    setHoldingsMap((prev) => ({
      ...prev,
      [targetNewSymbol]: {
        symbol: targetNewSymbol,
        lots: parsedLots,
        avgCost: Number(parsedCost.toFixed(2)),
        note: editNote.trim() || '個人持股部位',
        updatedAt: nowStr,
      },
    }));

    if (editingSlotSymbol === 'NEW') {
      if (onAddWatchlistSymbol) {
        onAddWatchlistSymbol(targetNewSymbol);
      } else if (onSetWatchlistSymbols && !watchlistSymbols.includes(targetNewSymbol)) {
        onSetWatchlistSymbols([targetNewSymbol, ...watchlistSymbols]);
      }
      triggerSaveFeedback(`已新增並儲存持股：${resolvedStock.name} (${targetNewSymbol}) ${parsedLots}張`);
    } else if (editingSlotSymbol !== targetNewSymbol) {
      // Replace old symbol with new symbol in the exact slot position
      if (onReplaceWatchlistSymbol) {
        onReplaceWatchlistSymbol(editingSlotSymbol, targetNewSymbol);
      } else if (onSetWatchlistSymbols) {
        const nextList = watchlistSymbols.map((s) => (s === editingSlotSymbol ? targetNewSymbol : s));
        onSetWatchlistSymbols(Array.from(new Set(nextList)));
      }
      // If the currently viewed stock was replaced, switch view to the new stock
      if (currentSymbol === editingSlotSymbol) {
        onSelectStock(targetNewSymbol);
      }
      triggerSaveFeedback(
        `已將原標的置換為 ${resolvedStock.name} (${targetNewSymbol}) 並儲存持股 (${parsedLots}張 @ $${parsedCost})`
      );
    } else {
      triggerSaveFeedback(`已儲存 ${resolvedStock.name} (${targetNewSymbol}) 持股設定 (${parsedLots}張 @ $${parsedCost})`);
    }

    setEditingSlotSymbol(null);
  };

  // Update holding inline in Batch Manager
  const handleBatchUpdateHolding = (sym: string, field: 'lots' | 'avgCost' | 'note', value: string) => {
    const s = watchlistStocks.find((item) => item.symbol === sym) || getOrGenerateStockData(sym);
    const current = getHoldingForStock(s);
    const updated: UserHoldingItem = {
      ...current,
      [field]:
        field === 'note'
          ? value
          : Math.max(0, Number(value) || 0),
      updatedAt: new Date().toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    };
    setHoldingsMap((prev) => ({
      ...prev,
      [sym]: updated,
    }));
  };

  // Replace symbol directly from Batch Manager row
  const handleBatchReplaceSymbol = (oldSym: string, newSym: string) => {
    const cleanSym = newSym.trim();
    const found = TAIWAN_STOCK_MASTER.find(
      (m) => m.symbol === cleanSym || m.name === cleanSym
    );
    if (!found) return;
    if (onReplaceWatchlistSymbol) {
      onReplaceWatchlistSymbol(oldSym, found.symbol);
    }
    const refPrice = liveQuotes?.[found.symbol]?.price ?? found.price;
    setHoldingsMap((prev) => ({
      ...prev,
      [found.symbol]: prev[found.symbol] || {
        symbol: found.symbol,
        lots: prev[oldSym]?.lots ?? 1,
        avgCost: refPrice,
        note: '置換儲存持股',
      },
    }));
    triggerSaveFeedback(`已置換 ${oldSym} ➔ ${found.name} (${found.symbol}) 並儲存持股`);
  };

  // Reset to default holdings
  const handleResetDefaultHoldings = () => {
    const defaultSyms = ['2330', '2317', '2454', '2603', '2382', '3231'];
    if (onSetWatchlistSymbols) {
      onSetWatchlistSymbols(defaultSyms);
    }
    setHoldingsMap(DEFAULT_HOLDINGS_MAP);
    triggerSaveFeedback('已還原預設持股組合並儲存至本機');
  };

  const targetPreviewStock = useMemo(() => {
    if (!targetNewSymbol) return null;
    const base = PRELOADED_STOCKS[targetNewSymbol] || getOrGenerateStockData(targetNewSymbol);
    const live = liveQuotes?.[targetNewSymbol];
    return live ? { ...base, price: live.price, name: live.name || base.name } : base;
  }, [targetNewSymbol, liveQuotes]);

  const isPortfolioProfitable = portfolioSummary.totalPnL >= 0;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl backdrop-blur-sm space-y-3">
      {/* Top Header Bar: Title, Portfolio Summary Badges & Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-inner">
            <Briefcase className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <span className="text-xs sm:text-sm font-extrabold text-slate-100 tracking-wide">
            我的持股與自選組合
          </span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-amber-500/30 font-semibold">
            持股 {portfolioSummary.activeHoldingsCount} 檔 / 共 {watchlistSymbols.length} 檔
          </span>

          {/* Total Portfolio Value & Unrealized P&L Summary Pill */}
          {portfolioSummary.activeHoldingsCount > 0 && (
            <div className="flex items-center space-x-2 bg-slate-950/90 border border-slate-800 px-2.5 py-1 rounded-lg text-[11px]">
              <span className="text-slate-400 inline-flex items-center">
                <Wallet className="w-3 h-3 mr-1 text-blue-400" />
                持股市值
              </span>
              <span className="font-mono font-bold text-slate-200">
                ${(portfolioSummary.totalMarketValue / 10000).toFixed(1)}萬
              </span>
              <span className="text-slate-700">|</span>
              <span className="text-slate-400">帳面損益</span>
              <span
                className={`font-mono font-extrabold ${
                  isPortfolioProfitable ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {isPortfolioProfitable ? '+' : ''}
                {portfolioSummary.totalPnL.toLocaleString()}元 (
                {isPortfolioProfitable ? '+' : ''}
                {portfolioSummary.totalRoiPct.toFixed(2)}%)
              </span>
            </div>
          )}

          {/* Auto-saved feedback toast */}
          {saveToastMsg && (
            <span className="inline-flex items-center space-x-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
              <Check className="w-3 h-3 stroke-[2.5]" />
              <span>{saveToastMsg}</span>
            </span>
          )}
        </div>

        {/* Right Controls: Add Holding, Batch Replace/Edit Holdings & Chip Strength Legend */}
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <button
            type="button"
            onClick={() => handleOpenSlotEditor('NEW')}
            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-600/25 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 font-bold transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增持股標的</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsBatchManagerOpen((v) => !v);
              setEditingSlotSymbol(null);
            }}
            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border font-bold transition-all cursor-pointer ${
              isBatchManagerOpen
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                : 'bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border-amber-500/35'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>{isBatchManagerOpen ? '收合持股置換面板' : '置換 / 儲存持股管理'}</span>
          </button>

          <div className="hidden xl:flex items-center space-x-2 bg-slate-950/80 border border-slate-800 px-2.5 py-1 rounded-lg">
            <span className="text-slate-400 font-medium">大單熱力：</span>
            <span className="inline-flex items-center text-rose-400 font-semibold">
              <ArrowUpRight className="w-3.5 h-3.5 mr-0.5 stroke-[2.5]" />
              買超 ({bullishCount})
            </span>
            <span className="text-slate-700">|</span>
            <span className="inline-flex items-center text-emerald-400 font-semibold">
              <ArrowDownRight className="w-3.5 h-3.5 mr-0.5 stroke-[2.5]" />
              賣超 ({bearishCount})
            </span>
          </div>
        </div>
      </div>

      {/* Inline Single-Slot Replacement & Holding Cost Editor Panel */}
      {editingSlotSymbol && (
        <form
          onSubmit={handleSaveSlotHolding}
          className="bg-slate-950/95 border border-blue-500/50 rounded-xl p-3.5 shadow-2xl space-y-3 animate-fadeIn"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 text-xs font-bold inline-flex items-center">
                <ArrowLeftRight className="w-3.5 h-3.5 mr-1" />
                {editingSlotSymbol === 'NEW'
                  ? '新增股票至我的持股'
                  : `置換標的或編輯持股成本（原槽位：${editingSlotSymbol}）`}
              </span>
              <span className="text-[11px] text-slate-400">
                可搜尋全台股 2,357 檔進行標的置換，並儲存您的持有張數與成本均價（自動記憶於瀏覽器本機）
              </span>
            </div>
            <button
              type="button"
              onClick={() => setEditingSlotSymbol(null)}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* Step 1: Stock Symbol Search & Replacement */}
            <div className="md:col-span-5 space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-300">
                1. 選擇或置換股票代號 / 名稱（支援 2,357 檔搜尋）
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="輸入股號或股名，例：2330、鴻海、3017..."
                  className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none"
                />
              </div>
              {/* Quick Candidate Chips */}
              <div className="flex flex-wrap gap-1 pt-0.5">
                {searchCandidates.map((cand) => {
                  const isSelected = cand.symbol === targetNewSymbol;
                  return (
                    <button
                      key={cand.symbol}
                      type="button"
                      onClick={() => handleChooseReplacementCandidate(cand.symbol)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-400 font-bold'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                      }`}
                    >
                      {cand.symbol} {cand.name} (${cand.price})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Holding Lots (持有張數) */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-300">
                2. 持有張數 (1張=1000股)
              </label>
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={editLots}
                  onChange={(e) => setEditLots(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none"
                />
                <span className="text-xs text-slate-400 shrink-0">張</span>
              </div>
              <div className="flex items-center gap-1 text-[10px]">
                {[1, 2, 5, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setEditLots(String(num))}
                    className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 font-mono"
                  >
                    {num}張
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Holding Average Cost (平均成本價) */}
            <div className="md:col-span-3 space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-300">
                3. 平均持股成本價 (元)
              </label>
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  value={editAvgCost}
                  onChange={(e) => setEditAvgCost(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none"
                />
                <span className="text-xs text-slate-400 shrink-0">元</span>
              </div>
              {targetPreviewStock && (
                <div className="flex items-center gap-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setEditAvgCost(String(targetPreviewStock.price))}
                    className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-blue-400 border border-slate-800 font-mono"
                  >
                    帶入現價 ${targetPreviewStock.price}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditAvgCost(
                        String(targetPreviewStock.majorCost || Number((targetPreviewStock.price * 0.96).toFixed(1)))
                      )
                    }
                    className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 font-mono"
                  >
                    帶入主力成本 ${targetPreviewStock.majorCost}
                  </button>
                </div>
              )}
            </div>

            {/* Step 4: Save Button */}
            <div className="md:col-span-2 flex flex-col space-y-1.5">
              <button
                type="submit"
                className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>確認置換並儲存持股</span>
              </button>
              <button
                type="button"
                onClick={() => setEditingSlotSymbol(null)}
                className="w-full py-1 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 text-[11px] border border-slate-800"
              >
                取消
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Batch Holdings Replacement & Storage Manager Panel */}
      {isBatchManagerOpen && (
        <div className="bg-slate-950/95 border border-amber-500/40 rounded-xl p-3.5 shadow-2xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-extrabold text-amber-300 flex items-center">
                <Briefcase className="w-3.5 h-3.5 mr-1.5" />
                持股清單快速置換與成本設定總表（自動儲存至瀏覽器本機）
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleResetDefaultHoldings}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[11px]"
              >
                <RotateCcw className="w-3 h-3" />
                <span>還原預設組合</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerSaveFeedback('全部持股部位與標的置換已儲存完畢');
                  setIsBatchManagerOpen(false);
                }}
                className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px]"
              >
                <Check className="w-3.5 h-3.5" />
                <span>完成並儲存</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {watchlistStocks.map((s, idx) => {
              const h = getHoldingForStock(s);
              const pnl = Math.round((s.price - h.avgCost) * h.lots * 1000);
              const roi = h.avgCost > 0 ? ((s.price - h.avgCost) / h.avgCost) * 100 : 0;
              const isProfit = pnl >= 0;

              return (
                <div
                  key={s.symbol}
                  className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 flex flex-col space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-xs text-slate-100">{s.name}</span>
                      <span className="font-mono text-xs text-blue-400 font-semibold">{s.symbol}</span>
                      <span className="font-mono text-xs text-slate-300">${s.price}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsBatchManagerOpen(false);
                          handleOpenSlotEditor(s.symbol);
                        }}
                        className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 font-bold"
                      >
                        ⇄ 置換此檔
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveFromWatchlist(s.symbol)}
                        className="text-slate-500 hover:text-rose-400 p-0.5"
                        title="刪除此持股"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px] mb-0.5">持有張數 (張)</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        value={h.lots}
                        onChange={(e) => handleBatchUpdateHolding(s.symbol, 'lots', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded px-2 py-1 font-mono text-xs text-slate-100"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] mb-0.5">平均成本 (元)</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={h.avgCost}
                        onChange={(e) => handleBatchUpdateHolding(s.symbol, 'avgCost', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded px-2 py-1 font-mono text-xs text-slate-100"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800/80 font-mono">
                    <span className="text-slate-400">
                      市值 ${Math.round(s.price * h.lots * 1000).toLocaleString()}
                    </span>
                    <span className={`font-bold ${isProfit ? 'text-rose-400' : 'text-emerald-400'}`}>
                      損益 {isProfit ? '+' : ''}
                      {pnl.toLocaleString()} ({isProfit ? '+' : ''}
                      {roi.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Horizontal Scrollable User Holdings & Watchlist Stock Cards */}
      <div className="flex items-stretch space-x-2.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
        {watchlistStocks.map((s) => {
          const isActive = s.symbol === currentSymbol;
          const isBeingEdited = editingSlotSymbol === s.symbol;
          const isUp = s.change > 0;
          const isDown = s.change < 0;
          const priceColor = isUp ? 'text-red-400' : isDown ? 'text-emerald-400' : 'text-slate-300';
          const changeBg = isUp
            ? 'bg-red-500/10 text-red-400'
            : isDown
            ? 'bg-emerald-500/10 text-emerald-400'
            : 'bg-slate-800 text-slate-300';

          const {
            superLargeNet,
            largeNet,
            majorBuy,
            majorSell,
            majorNet,
            netIntensityPct,
            powerRatio,
            isBullish,
            isBearish,
            buyHeatPct,
            sellHeatPct,
            heatLabel,
            heatBadgeClass,
          } = getChipStrength(s);
          const formattedNetLots = `${majorNet > 0 ? '+' : ''}${majorNet.toLocaleString()}張`;
          const formattedSuperNet = `${superLargeNet > 0 ? '+' : ''}${superLargeNet.toLocaleString()}`;
          const formattedLargeNet = `${largeNet > 0 ? '+' : ''}${largeNet.toLocaleString()}`;
          const buyGradId = `chip-buy-grad-${s.symbol}`;
          const sellGradId = `chip-sell-grad-${s.symbol}`;

          // Personal holding computation for this stock card
          const holding = getHoldingForStock(s);
          const hasHolding = holding.lots > 0;
          const unrealizedPnL = Math.round((s.price - holding.avgCost) * holding.lots * 1000);
          const unrealizedRoiPct =
            holding.avgCost > 0 ? ((s.price - holding.avgCost) / holding.avgCost) * 100 : 0;
          const isHoldingProfit = unrealizedPnL >= 0;

          return (
            <div
              key={s.symbol}
              onClick={() => onSelectStock(s.symbol)}
              title={`${s.name} (${s.symbol})｜持股 ${holding.lots}張 @ 成本$${holding.avgCost}｜主力${
                isBullish ? '買超' : isBearish ? '賣超' : '持平'
              } ${formattedNetLots}｜大單買盤熱度 ${buyHeatPct}% (買 ${majorBuy.toLocaleString()}張 / 賣 ${majorSell.toLocaleString()}張)`}
              className={`group relative flex-shrink-0 cursor-pointer rounded-xl p-2.5 sm:p-3 transition-all border flex flex-col justify-between space-y-2 select-none min-w-[252px] ${
                isBeingEdited
                  ? 'bg-indigo-950/50 border-amber-400 ring-2 ring-amber-400/40 shadow-lg'
                  : isActive
                  ? 'bg-blue-950/40 border-blue-500/80 ring-2 ring-blue-500/30 shadow-lg shadow-blue-500/10'
                  : 'bg-slate-950/70 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Top Row: Chip Mini-Icon, Stock Identity, Price & Swap/Remove Buttons */}
              <div className="flex items-start justify-between space-x-2">
                <div className="flex items-center space-x-2.5">
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
                      <span className="font-mono text-[11px] text-blue-400 font-semibold">
                        {s.symbol}
                      </span>
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
                </div>

                {/* Price, Change & Swap / Remove buttons */}
                <div className="flex items-start space-x-1">
                  <div className="text-right">
                    <div className={`font-mono font-bold text-xs sm:text-sm ${priceColor}`}>
                      ${s.price.toFixed(2)}
                    </div>
                    <div
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold mt-0.5 inline-block ${changeBg}`}
                    >
                      {s.change >= 0 ? '+' : ''}
                      {s.changePercent.toFixed(2)}%
                    </div>
                  </div>

                  <div className="flex flex-col space-y-0.5 pl-0.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenSlotEditor(s.symbol);
                      }}
                      title={`置換 ${s.name} 或設定持股張數/成本`}
                      className="text-slate-400 hover:text-amber-300 hover:bg-amber-500/20 p-1 rounded transition-all"
                    >
                      <ArrowLeftRight className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFromWatchlist(s.symbol);
                      }}
                      title={`將 ${s.name} 移出持股清單`}
                      className="opacity-60 group-hover:opacity-100 hover:bg-slate-700 text-slate-500 hover:text-red-400 p-1 rounded transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Middle Row: 使用者持股部位與即時損益條 (User Holding Lots, Avg Cost & Unrealized P&L) */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenSlotEditor(s.symbol);
                }}
                className="bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800/90 hover:border-amber-500/40 rounded-lg px-2 py-1.5 transition-all flex items-center justify-between text-[10px]"
                title="點擊置換此檔股票或修改持股張數與成本均價"
              >
                {hasHolding ? (
                  <>
                    <div className="flex items-center space-x-1 font-mono">
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                        持股 {holding.lots}張
                      </span>
                      <span className="text-slate-400">@${holding.avgCost}</span>
                    </div>
                    <div className="flex items-center space-x-1 font-mono">
                      <span
                        className={`font-extrabold ${
                          isHoldingProfit ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {isHoldingProfit ? '+' : ''}
                        {unrealizedPnL.toLocaleString()} ({isHoldingProfit ? '+' : ''}
                        {unrealizedRoiPct.toFixed(1)}%)
                      </span>
                      <Edit3 className="w-2.5 h-2.5 text-slate-500 group-hover:text-amber-400 ml-0.5" />
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between w-full text-slate-400">
                    <span>純自選觀察中</span>
                    <span className="text-amber-400 font-semibold inline-flex items-center">
                      <Edit3 className="w-2.5 h-2.5 mr-1" />
                      設為持股 / 置換
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom Row: 籌碼進出熱力條 (Real-time Large-Order Buy/Sell Gradient Thermal Bar: superLargeNet + largeNet) */}
              <div
                className="pt-1.5 border-t border-slate-800/80 space-y-1"
                title={`籌碼進出熱力條｜當日大單買賣力道 (特大單淨額 ${formattedSuperNet}張 + 大單淨額 ${formattedLargeNet}張 = ${formattedNetLots})｜淨流入強度 ${
                  netIntensityPct > 0 ? '+' : ''
                }${netIntensityPct}%`}
              >
                {/* Header: 籌碼進出熱力條 Title + Heat Status Badge + (superLargeNet + largeNet) Net Force */}
                <div className="flex items-center justify-between text-[10px]">
                  <span className="inline-flex items-center font-bold text-slate-300 tracking-tight">
                    <Flame
                      className={`w-3 h-3 mr-1 ${
                        isBullish
                          ? 'text-amber-400 fill-rose-500/40'
                          : isBearish
                          ? 'text-emerald-400 fill-emerald-500/30'
                          : 'text-slate-400'
                      }`}
                    />
                    籌碼進出熱力條
                  </span>
                  <div className="flex items-center space-x-1">
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded border font-bold ${heatBadgeClass}`}
                    >
                      {heatLabel}
                    </span>
                    <span
                      className={`font-mono text-[10px] font-extrabold ${
                        isBullish
                          ? 'text-rose-400'
                          : isBearish
                          ? 'text-emerald-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {formattedNetLots}
                    </span>
                  </div>
                </div>

                {/* SVG Red-Green Gradient Intensity Bar (紅綠漸變色彩強度指示) */}
                <div className="w-full h-2.5 rounded-full overflow-hidden bg-slate-950 border border-slate-800/90 shadow-inner relative">
                  <svg
                    viewBox="0 0 100 10"
                    preserveAspectRatio="none"
                    className="w-full h-full block"
                  >
                    <defs>
                      <linearGradient id={buyGradId} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#881337" />
                        <stop offset="45%" stopColor="#e11d48" />
                        <stop offset="80%" stopColor="#fb7185" />
                        <stop offset="100%" stopColor="#fbbf24" />
                      </linearGradient>
                      <linearGradient id={sellGradId} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6ee7b7" />
                        <stop offset="35%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#064e3b" />
                      </linearGradient>
                    </defs>

                    {/* Large-Order Buy Inflow Heat Segment (Left: Red-Amber Gradient) */}
                    <rect
                      x="0"
                      y="0"
                      width={buyHeatPct}
                      height="10"
                      fill={`url(#${buyGradId})`}
                    />

                    {/* Large-Order Sell Outflow Pressure Segment (Right: Green-Teal Gradient) */}
                    <rect
                      x={buyHeatPct}
                      y="0"
                      width={sellHeatPct}
                      height="10"
                      fill={`url(#${sellGradId})`}
                    />

                    {/* Subtle 25% / 50% / 75% Reference Ticks */}
                    <line
                      x1="25"
                      y1="0"
                      x2="25"
                      y2="10"
                      stroke="#0f172a"
                      strokeWidth="0.6"
                      opacity="0.45"
                    />
                    <line
                      x1="50"
                      y1="0"
                      x2="50"
                      y2="10"
                      stroke="#0f172a"
                      strokeWidth="1"
                      strokeDasharray="1.5,1"
                      opacity="0.85"
                    />
                    <line
                      x1="75"
                      y1="0"
                      x2="75"
                      y2="10"
                      stroke="#0f172a"
                      strokeWidth="0.6"
                      opacity="0.45"
                    />

                    {/* Dynamic Thermal Split Glow Marker */}
                    <rect
                      x={Math.max(0.5, Math.min(98, buyHeatPct - 0.9))}
                      y="0"
                      width="1.8"
                      height="10"
                      fill="#ffffff"
                    />
                  </svg>
                </div>

                {/* Bottom Sub-Row: Buy Heat % + (superLargeNet / largeNet) vs Sell Pressure % */}
                <div className="flex items-center justify-between text-[9px] font-mono leading-none pt-0.5">
                  <span className="text-rose-400 font-bold">
                    買熱 {buyHeatPct}%{' '}
                    <span className="text-slate-400 font-normal">
                      (特大{formattedSuperNet}/大{formattedLargeNet})
                    </span>
                  </span>
                  <span className="text-emerald-400 font-bold">賣壓 {sellHeatPct}%</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Quick Add Card at the end of the horizontal scroll */}
        <button
          type="button"
          onClick={() => handleOpenSlotEditor('NEW')}
          className="flex-shrink-0 min-w-[140px] rounded-xl border border-dashed border-slate-700 hover:border-blue-500/60 bg-slate-950/40 hover:bg-slate-900/80 p-3 flex flex-col items-center justify-center space-y-1.5 text-slate-400 hover:text-blue-300 transition-all cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
            <Plus className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold">新增或置換持股</span>
          <span className="text-[10px] text-slate-500">儲存至本機組合</span>
        </button>
      </div>
    </div>
  );
};
