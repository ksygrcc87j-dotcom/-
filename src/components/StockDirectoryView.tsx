import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ArrowUpDown, 
  Star, 
  Check, 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  Layers, 
  Sparkles, 
  FileSpreadsheet,
  Filter,
  RefreshCw,
  Flame,
  Zap,
  Volume2,
  Activity,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { StockData, StockMasterItem } from '../types/stock';
import { calculateStockHeatBadge, HeatCategory, StockHeatBadgeInfo } from '../utils/stockHeat';
export type { StockMasterItem };

interface StockDirectoryViewProps {
  masterStocks: StockMasterItem[];
  currentSymbol: string;
  watchlistSymbols: string[];
  onSelectStock: (symbol: string) => void;
  onToggleWatchlist: (symbol: string) => void;
  liveQuotes?: Record<string, any>;
  onRefreshAll?: () => void;
  isSyncing?: boolean;
  lastSyncTime?: string;
}

export const StockDirectoryView: React.FC<StockDirectoryViewProps> = ({
  masterStocks,
  currentSymbol,
  watchlistSymbols,
  onSelectStock,
  onToggleWatchlist,
  liveQuotes,
  onRefreshAll,
  isSyncing = false,
  lastSyncTime,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('全部');
  const [selectedHeatFilter, setSelectedHeatFilter] = useState<HeatCategory>('all');
  const [selectedMarket, setSelectedMarket] = useState<'全部' | '上市' | '上櫃'>('全部');
  const [sortField, setSortField] = useState<'symbol' | 'price' | 'changePercent' | 'volume' | 'heat'>('heat');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Available unique industries
  const industries = useMemo(() => {
    const set = new Set(masterStocks.map((s) => s.industry).filter(Boolean));
    return ['全部', ...Array.from(set)];
  }, [masterStocks]);

  // Merge with any real-time live quotes if available and compute heat badges
  const mergedStocksWithHeat = useMemo(() => {
    return masterStocks.map((stock) => {
      const live = liveQuotes?.[stock.symbol];
      const merged: StockMasterItem = live
        ? {
            ...stock,
            price: live.price,
            yesterdayClose: live.yesterdayClose,
            change: live.change,
            changePercent: live.changePercent,
            openPrice: live.openPrice,
            highPrice: live.highPrice,
            lowPrice: live.lowPrice,
            volume: live.volume,
          }
        : stock;

      const heat = calculateStockHeatBadge(merged);
      return {
        ...merged,
        heat,
      };
    });
  }, [masterStocks, liveQuotes]);

  // Statistics for quick market and heat counts
  const statistics = useMemo(() => {
    let strong = 0;
    let volatile = 0;
    let volume = 0;
    let listed = 0;
    let otc = 0;
    mergedStocksWithHeat.forEach((s) => {
      if (s.heat.category === 'strong') strong++;
      else if (s.heat.category === 'volatile') volatile++;
      else if (s.heat.category === 'volume') volume++;

      if (s.market === '上市') listed++;
      else if (s.market === '上櫃') otc++;
    });
    return { strong, volatile, volume, listed, otc, total: mergedStocksWithHeat.length };
  }, [mergedStocksWithHeat]);

  // Reset page helper when filters change
  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleIndustryChange = (ind: string) => {
    setSelectedIndustry(ind);
    setCurrentPage(1);
  };

  const handleHeatChange = (h: HeatCategory) => {
    setSelectedHeatFilter(h);
    setCurrentPage(1);
  };

  const handleMarketChange = (m: '全部' | '上市' | '上櫃') => {
    setSelectedMarket(m);
    setCurrentPage(1);
  };

  // Filter and sort stocks
  const filteredStocks = useMemo(() => {
    return mergedStocksWithHeat
      .filter((s) => {
        const matchesSearch =
          s.symbol.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
          s.name.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
          s.industry.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
          s.heat.label.includes(searchTerm.trim()) ||
          s.heat.subLabel.includes(searchTerm.trim());

        const matchesIndustry = selectedIndustry === '全部' || s.industry === selectedIndustry;
        const matchesHeat = selectedHeatFilter === 'all' || s.heat.category === selectedHeatFilter;
        const matchesMarket = selectedMarket === '全部' || s.market === selectedMarket;

        return matchesSearch && matchesIndustry && matchesHeat && matchesMarket;
      })
      .sort((a, b) => {
        if (sortField === 'heat') {
          return sortOrder === 'asc' ? a.heat.score - b.heat.score : b.heat.score - a.heat.score;
        }

        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (sortField === 'symbol') {
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }

        return sortOrder === 'asc' ? valA - valB : valB - valA;
      });
  }, [mergedStocksWithHeat, searchTerm, selectedIndustry, selectedHeatFilter, selectedMarket, sortField, sortOrder]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredStocks.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedStocks = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredStocks.slice(start, start + pageSize);
  }, [filteredStocks, safeCurrentPage, pageSize]);

  const handleSortToggle = (field: 'symbol' | 'price' | 'changePercent' | 'volume' | 'heat') => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder(field === 'symbol' ? 'asc' : 'desc');
    }
    setCurrentPage(1);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden space-y-4 p-4 sm:p-6">
      {/* Directory Title Banner */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400">
                <FileSpreadsheet className="w-5 h-5 text-blue-400" />
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-100 flex items-center space-x-2">
                <span>台股全股號·股名·官方收盤價 應對總表</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono font-bold">
                  全市場 {masterStocks.length} 檔收錄
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              根據台灣證券交易所 (TWSE) 與證券櫃檯買賣中心 (TPEx) 官方全市場 OpenAPI 及藍三竹股市 App 權威資料庫，全數校正收錄 {masterStocks.length} 檔台股上市與上櫃股票之正確股號、股名、官方收盤價、昨收價、漲跌金額、當日漲跌幅、成交量與籌碼熱度。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/50 border border-emerald-800/50">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-300 font-semibold">100% 官方收盤價校準</span>
              {lastSyncTime && <span className="text-slate-400 text-[11px]">({lastSyncTime})</span>}
            </div>
            {onRefreshAll && (
              <button
                type="button"
                onClick={onRefreshAll}
                disabled={isSyncing}
                className="px-2.5 py-1 rounded-lg bg-cyan-950/70 border border-cyan-700/70 text-cyan-300 hover:text-cyan-200 text-xs font-semibold flex items-center space-x-1.5 transition-all disabled:opacity-50 shadow-sm"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-cyan-400' : ''}`} />
                <span>{isSyncing ? '連線更新中...' : '重新連線證交所及藍三竹'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search within Directory */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="在全台股總表中快速搜尋（輸入股號如 2330、6488、0050 或股名如 聯發科、長榮、鈊象...）"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
          />
        </div>

        {/* Sort Controls */}
        <div className="flex items-center space-x-2 overflow-x-auto text-xs">
          <span className="text-slate-400 whitespace-nowrap">排序：</span>
          <button
            onClick={() => handleSortToggle('heat')}
            className={`px-3 py-1.5 rounded-lg border flex items-center space-x-1 font-semibold transition-all ${
              sortField === 'heat'
                ? 'bg-rose-600/30 text-rose-300 border-rose-500/50'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3 h-3 text-rose-400" />
            <span>依熱度</span>
            <ArrowUpDown className="w-3 h-3" />
          </button>

          <button
            onClick={() => handleSortToggle('price')}
            className={`px-3 py-1.5 rounded-lg border flex items-center space-x-1 font-semibold transition-all ${
              sortField === 'price'
                ? 'bg-blue-600/30 text-blue-300 border-blue-500/50'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <span>依股價</span>
            <ArrowUpDown className="w-3 h-3" />
          </button>

          <button
            onClick={() => handleSortToggle('changePercent')}
            className={`px-3 py-1.5 rounded-lg border flex items-center space-x-1 font-semibold transition-all ${
              sortField === 'changePercent'
                ? 'bg-blue-600/30 text-blue-300 border-blue-500/50'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <span>依漲跌幅</span>
            <ArrowUpDown className="w-3 h-3" />
          </button>

          <button
            onClick={() => handleSortToggle('volume')}
            className={`px-3 py-1.5 rounded-lg border flex items-center space-x-1 font-semibold transition-all ${
              sortField === 'volume'
                ? 'bg-blue-600/30 text-blue-300 border-blue-500/50'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <span>依成交量</span>
            <ArrowUpDown className="w-3 h-3" />
          </button>

          <button
            onClick={() => handleSortToggle('symbol')}
            className={`px-3 py-1.5 rounded-lg border flex items-center space-x-1 font-semibold transition-all ${
              sortField === 'symbol'
                ? 'bg-blue-600/30 text-blue-300 border-blue-500/50'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <span>依股號</span>
            <ArrowUpDown className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Market Category and Heat Filter Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
        {/* Market Category Selector */}
        <div className="flex items-center space-x-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800/80">
          <button
            onClick={() => handleMarketChange('全部')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              selectedMarket === '全部'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            全部市場 ({statistics.total})
          </button>
          <button
            onClick={() => handleMarketChange('上市')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              selectedMarket === '上市'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            上市股票 ({statistics.listed})
          </button>
          <button
            onClick={() => handleMarketChange('上櫃')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              selectedMarket === '上櫃'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            上櫃股票 ({statistics.otc})
          </button>
        </div>

        {/* Real-time Heat Filter Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800">
          <span className="text-xs text-slate-400 font-semibold flex items-center space-x-1 mr-1 flex-shrink-0">
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>即時熱度：</span>
          </span>
          <button
            onClick={() => handleHeatChange('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              selectedHeatFilter === 'all'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => handleHeatChange('strong')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-1 ${
              selectedHeatFilter === 'strong'
                ? 'bg-rose-600 text-white shadow-[0_0_12px_rgba(244,63,94,0.35)] ring-1 ring-rose-400'
                : 'bg-rose-950/40 text-rose-400 hover:bg-rose-900/40 border border-rose-800/40'
            }`}
          >
            <Flame className="w-3 h-3 animate-bounce" />
            <span>強勢 ({statistics.strong})</span>
          </button>
          <button
            onClick={() => handleHeatChange('volatile')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-1 ${
              selectedHeatFilter === 'volatile'
                ? 'bg-amber-600 text-white shadow-[0_0_12px_rgba(245,158,11,0.35)] ring-1 ring-amber-400'
                : 'bg-amber-950/40 text-amber-400 hover:bg-amber-900/40 border border-amber-800/40'
            }`}
          >
            <Zap className="w-3 h-3 animate-pulse" />
            <span>異常波動 ({statistics.volatile})</span>
          </button>
          <button
            onClick={() => handleHeatChange('volume')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center space-x-1 ${
              selectedHeatFilter === 'volume'
                ? 'bg-cyan-600 text-white shadow'
                : 'bg-cyan-950/40 text-cyan-400 hover:bg-cyan-900/40 border border-cyan-800/40'
            }`}
          >
            <Volume2 className="w-3 h-3" />
            <span>人氣巨量 ({statistics.volume})</span>
          </button>
        </div>
      </div>

      {/* Industry Filter Chips */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800">
        <Filter className="w-3.5 h-3.5 text-slate-500 flex-shrink-0 mr-1" />
        {industries.map((ind) => (
          <button
            key={ind}
            onClick={() => handleIndustryChange(ind)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              selectedIndustry === ind
                ? 'bg-blue-600 text-white font-bold shadow'
                : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {ind}
          </button>
        ))}
      </div>

      {/* Top Pagination Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between text-xs text-slate-400 gap-2 bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800/80">
        <div className="flex items-center space-x-2">
          <span>目前顯示第 <span className="font-mono font-bold text-slate-200">{(safeCurrentPage - 1) * pageSize + 1}</span> - <span className="font-mono font-bold text-slate-200">{Math.min(filteredStocks.length, safeCurrentPage * pageSize)}</span> 筆</span>
          <span className="text-slate-600">/</span>
          <span>篩選後共 <span className="font-mono font-bold text-blue-400">{filteredStocks.length}</span> 筆</span>
          <span className="text-slate-500">(全市場 {masterStocks.length} 檔)</span>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500">每頁:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2 py-0.5 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value={50}>50 筆</option>
              <option value={100}>100 筆</option>
              <option value={200}>200 筆</option>
              <option value={500}>500 筆</option>
            </select>
          </div>

          <div className="flex items-center space-x-1 font-mono">
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage(1)}
              className="p-1 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300"
              title="第一頁"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300"
              title="上一頁"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-bold text-slate-200">
              {safeCurrentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300"
              title="下一頁"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className="p-1 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300"
              title="最後頁"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Master Stock Directory Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800 select-none">
            <tr>
              <th className="py-3 px-3 sm:px-4">股號</th>
              <th className="py-3 px-3 sm:px-4">股票名稱</th>
              <th className="py-3 px-3 sm:px-4 hidden md:table-cell">產業類別</th>
              <th className="py-3 px-3 sm:px-4 text-right">今日收盤價</th>
              <th className="py-3 px-3 sm:px-4 text-right">漲跌金額</th>
              <th className="py-3 px-3 sm:px-4 text-right">當日漲跌幅</th>
              <th className="py-3 px-3 sm:px-4 text-center">即時熱度標籤</th>
              <th className="py-3 px-3 sm:px-4 text-right hidden lg:table-cell">昨日收盤</th>
              <th className="py-3 px-3 sm:px-4 text-right hidden sm:table-cell">成交量 (張)</th>
              <th className="py-3 px-3 sm:px-4 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {paginatedStocks.map((s) => {
              const isSelected = s.symbol === currentSymbol;
              const isInWatchlist = watchlistSymbols.includes(s.symbol);
              const isUp = s.change > 0;
              const isDown = s.change < 0;
              const priceColor = isUp ? 'text-red-400' : isDown ? 'text-emerald-400' : 'text-slate-300';
              const changeBg = isUp ? 'bg-red-500/10 text-red-400' : isDown ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400';

              return (
                <tr
                  key={s.symbol}
                  onClick={() => onSelectStock(s.symbol)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-950/40 hover:bg-blue-950/50'
                      : 'hover:bg-slate-900/60'
                  }`}
                >
                  {/* Symbol */}
                  <td className="py-3 px-3 sm:px-4 font-mono font-bold text-blue-400">
                    <span className="flex items-center space-x-1.5">
                      <span>{s.symbol}</span>
                      <span className="text-[10px] font-normal text-slate-500 border border-slate-800 px-1 py-0.2 rounded hidden sm:inline">
                        {s.market}
                      </span>
                    </span>
                  </td>

                  {/* Name */}
                  <td className="py-3 px-3 sm:px-4">
                    <div className="font-bold text-slate-200 flex items-center space-x-1.5">
                      <span>{s.name}</span>
                      {isSelected && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30">
                          目前檢視
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Industry */}
                  <td className="py-3 px-3 sm:px-4 text-slate-400 hidden md:table-cell">
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-xs">
                      {s.industry}
                    </span>
                  </td>

                  {/* Price */}
                  <td className={`py-3 px-3 sm:px-4 text-right font-mono font-bold text-sm sm:text-base ${priceColor}`}>
                    ${s.price.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                  </td>

                  {/* Change */}
                  <td className={`py-3 px-3 sm:px-4 text-right font-mono font-semibold ${priceColor}`}>
                    {s.change > 0 ? `+${s.change}` : s.change}
                  </td>

                  {/* Change Percent */}
                  <td className="py-3 px-3 sm:px-4 text-right font-mono">
                    <span className={`px-2 py-0.5 rounded-md font-semibold text-xs inline-block ${changeBg}`}>
                      {s.change >= 0 ? '+' : ''}{s.changePercent.toFixed(2)}%
                    </span>
                  </td>

                  {/* Real-time Heat Badge & Volume Visual Alert */}
                  <td className="py-3 px-3 sm:px-4 text-center whitespace-nowrap">
                    <div className="inline-flex flex-col items-center group relative">
                      <span
                        className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${s.heat.badgeBg} ${s.heat.borderColor} ${s.heat.textColor} ${s.heat.glowEffect}`}
                        title={s.heat.summary}
                      >
                        {s.heat.category === 'strong' && (
                          <span className="flex items-center space-x-1">
                            <Flame className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                          </span>
                        )}
                        {s.heat.category === 'volatile' && (
                          <span className="flex items-center space-x-1">
                            <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                          </span>
                        )}
                        {s.heat.category === 'volume' && (
                          <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                        )}
                        {s.heat.category === 'pullback' && (
                          <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        {s.heat.category === 'neutral' && (
                          <Activity className="w-3 h-3 text-slate-500" />
                        )}

                        <span>{s.heat.label}</span>
                        <span className="text-[10px] font-mono opacity-80 border-l border-current/30 pl-1.5 hidden sm:inline">
                          {s.heat.subLabel}
                        </span>
                      </span>

                      {/* Volume status hint */}
                      <span className="text-[10px] text-slate-400 mt-0.5 font-medium flex items-center space-x-1">
                        <span className="text-slate-500">量能:</span>
                        <span
                          className={
                            s.heat.category === 'strong'
                              ? 'text-rose-400 font-semibold'
                              : s.heat.category === 'volatile'
                              ? 'text-amber-400 font-semibold'
                              : 'text-slate-400'
                          }
                        >
                          {s.heat.volumeStatus}
                        </span>
                      </span>
                    </div>
                  </td>

                  {/* Yesterday Close */}
                  <td className="py-3 px-3 sm:px-4 text-right font-mono text-slate-400 hidden lg:table-cell">
                    ${s.yesterdayClose.toFixed(1)}
                  </td>

                  {/* Volume */}
                  <td className="py-3 px-3 sm:px-4 text-right font-mono text-slate-300 hidden sm:table-cell">
                    {s.volume.toLocaleString()}
                  </td>

                  {/* Action Buttons */}
                  <td className="py-3 px-3 sm:px-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectStock(s.symbol)}
                        title="查看三竹完整籌碼與AI投研報告"
                        className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white transition-all text-xs font-semibold flex items-center space-x-1 border border-blue-500/30"
                      >
                        <Eye className="w-3 h-3" />
                        <span className="hidden sm:inline">分析</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleWatchlist(s.symbol)}
                        title={isInWatchlist ? '從自選移除' : '加入自選'}
                        className={`p-1.5 rounded-lg transition-all border ${
                          isInWatchlist
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30'
                            : 'bg-slate-900 text-slate-400 hover:text-amber-400 border-slate-800 hover:border-amber-500/30'
                        }`}
                      >
                        <Star className={`w-3.5 h-3.5 ${isInWatchlist ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredStocks.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            查無符合「{searchTerm}」的股票，請確認股號或股名後重新搜尋。
          </div>
        )}
      </div>

      {/* Bottom Pagination Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between text-xs text-slate-400 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
        <div className="flex items-center space-x-2">
          <span>第 <span className="font-mono font-bold text-slate-200">{safeCurrentPage}</span> 頁 / 共 <span className="font-mono font-bold text-slate-200">{totalPages}</span> 頁</span>
          <span className="text-slate-600">|</span>
          <span>顯示第 <span className="font-mono font-bold text-slate-200">{(safeCurrentPage - 1) * pageSize + 1}</span> - <span className="font-mono font-bold text-slate-200">{Math.min(filteredStocks.length, safeCurrentPage * pageSize)}</span> 筆 (共 {filteredStocks.length} 筆)</span>
        </div>

        <div className="flex items-center space-x-1 font-mono">
          <button
            type="button"
            disabled={safeCurrentPage <= 1}
            onClick={() => setCurrentPage(1)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 font-sans text-xs"
          >
            首頁
          </button>
          <button
            type="button"
            disabled={safeCurrentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 flex items-center space-x-1 font-sans text-xs"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>上一頁</span>
          </button>

          <span className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs shadow">
            {safeCurrentPage}
          </span>

          <button
            type="button"
            disabled={safeCurrentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 flex items-center space-x-1 font-sans text-xs"
          >
            <span>下一頁</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={safeCurrentPage >= totalPages}
            onClick={() => setCurrentPage(totalPages)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 font-sans text-xs"
          >
            末頁
          </button>
        </div>
      </div>

      {/* Summary Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 pt-1 px-1 gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span>全市場收錄：{masterStocks.length} 檔 (上市 {statistics.listed} 檔 + 上櫃 {statistics.otc} 檔)</span>
          <span className="text-slate-700">|</span>
          <span className="text-rose-400 font-semibold flex items-center space-x-1">
            <Flame className="w-3 h-3 inline" />
            <span>強勢 {statistics.strong} 檔</span>
          </span>
          <span className="text-slate-700">|</span>
          <span className="text-amber-400 font-semibold flex items-center space-x-1">
            <Zap className="w-3 h-3 inline" />
            <span>異常波動 {statistics.volatile} 檔</span>
          </span>
        </div>
        <span>資料來源：台灣證券交易所 (TWSE) & 櫃買中心 (TPEx) 官方全市場 OpenAPI 定價資料庫</span>
      </div>
    </div>
  );
};
