import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  BarChart2, 
  Layers, 
  Activity, 
  GitCommit, 
  Sliders,
  Zap,
  Sparkles,
  Eye,
  Check,
  Calendar,
  Scale,
  AlertTriangle,
  TrendingDown
} from 'lucide-react';
import { StockData, IntradayTick } from '../types/stock';
import { 
  generateDailyCandles, 
  calculateSMA, 
  calculateKD, 
  calculateIntradayKD, 
  calculateMACD,
  calculateIntradayMACD,
  calculateBollingerBands,
  calculateIntradayBollingerBands,
  calculateVWAP,
  calculateIntradayVWAP,
  detectTechnicalDivergence,
  DailyCandle,
  KDResult,
  MACDResult,
  BollingerBandsResult,
  VWAPResult,
  TechnicalDivergenceResult
} from '../utils/technicalIndicators';

interface InteractiveChartsProps {
  stock: StockData;
  latestTick: IntradayTick | null;
}

export const InteractiveCharts: React.FC<InteractiveChartsProps> = ({ stock, latestTick }) => {
  const [activeTab, setActiveTab] = useState<'intraday' | 'orderFlow' | 'institutional' | 'peBand' | 'orderBook'>('intraday');

  // Technical Indicators Switcher State
  const [showMA5, setShowMA5] = useState<boolean>(true);
  const [showMA20, setShowMA20] = useState<boolean>(true);
  const [showMA60, setShowMA60] = useState<boolean>(true);
  const [showKD, setShowKD] = useState<boolean>(true);
  const [showMACD, setShowMACD] = useState<boolean>(true);
  const [showBollinger, setShowBollinger] = useState<boolean>(true);
  const [showVWAP, setShowVWAP] = useState<boolean>(true);
  const [showDivergence, setShowDivergence] = useState<boolean>(true);
  const [chartMode, setChartMode] = useState<'intraday' | 'kline'>('intraday');

  // Crosshair hover inspection
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const {
    price,
    yesterdayClose,
    highPrice,
    lowPrice,
    intradayTicks,
    orderFlow,
    institutionalHistory,
    peBands,
    orderBook,
    ma5,
    ma20,
    ma60,
  } = stock;

  // 1. Daily Candles & Indicators (35-day historical dataset)
  const dailyCandles = useMemo<DailyCandle[]>(() => generateDailyCandles(stock, 35), [stock]);
  const dailyClosePrices = useMemo(() => dailyCandles.map((c) => c.close), [dailyCandles]);
  const dailyMA5 = useMemo(() => calculateSMA(dailyClosePrices, 5), [dailyClosePrices]);
  const dailyMA20 = useMemo(() => calculateSMA(dailyClosePrices, 20), [dailyClosePrices]);
  const dailyMA60 = useMemo(() => calculateSMA(dailyClosePrices, 60), [dailyClosePrices]);
  const dailyKD = useMemo<KDResult>(() => calculateKD(dailyCandles, 9), [dailyCandles]);
  const dailyMACD = useMemo<MACDResult>(() => calculateMACD(dailyCandles, 12, 26, 9), [dailyCandles]);
  const dailyBollinger = useMemo<BollingerBandsResult>(() => calculateBollingerBands(dailyCandles, 20, 2), [dailyCandles]);
  const dailyVWAP = useMemo<VWAPResult>(() => calculateVWAP(dailyCandles), [dailyCandles]);

  // 2. Intraday Ticks & Indicators
  const intradayPrices = useMemo(() => intradayTicks.map((t) => t.price), [intradayTicks]);
  const intradayMA5 = useMemo(() => calculateSMA(intradayPrices, 3), [intradayPrices]);
  const intradayMA20 = useMemo(() => calculateSMA(intradayPrices, 6), [intradayPrices]);
  const intradayMA60 = useMemo(() => calculateSMA(intradayPrices, 10), [intradayPrices]);
  const intradayKD = useMemo<KDResult>(() => calculateIntradayKD(intradayTicks), [intradayTicks]);
  const intradayMACD = useMemo<MACDResult>(() => calculateIntradayMACD(intradayTicks), [intradayTicks]);
  const intradayBollinger = useMemo<BollingerBandsResult>(() => calculateIntradayBollingerBands(intradayTicks), [intradayTicks]);
  const intradayVWAP = useMemo<VWAPResult>(() => calculateIntradayVWAP(intradayTicks), [intradayTicks]);

  // Active indicators depending on mode
  const activeKD = chartMode === 'intraday' ? intradayKD : dailyKD;
  const activeMACD = chartMode === 'intraday' ? intradayMACD : dailyMACD;
  const activeBollinger = chartMode === 'intraday' ? intradayBollinger : dailyBollinger;
  const activeVWAP = chartMode === 'intraday' ? intradayVWAP : dailyVWAP;

  // 3. Technical Indicator Divergence Detection (技術指標背離偵測：股價創新高但 MACD 或 KD 未創新高)
  const dailyDivergence = useMemo<TechnicalDivergenceResult>(() => {
    const series = dailyCandles.map((c) => ({
      label: c.date,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    return detectTechnicalDivergence(series, dailyKD, dailyMACD);
  }, [dailyCandles, dailyKD, dailyMACD]);

  const intradayDivergence = useMemo<TechnicalDivergenceResult>(() => {
    const series = intradayTicks.map((t, idx) => {
      const prevP = idx > 0 ? intradayTicks[idx - 1].price : t.price;
      return {
        label: t.time,
        high: Math.max(t.price, prevP),
        low: Math.min(t.price, prevP),
        close: t.price,
      };
    });
    return detectTechnicalDivergence(series, intradayKD, intradayMACD);
  }, [intradayTicks, intradayKD, intradayMACD]);

  // Mode-matched divergence for SVG coordinate lines, and primary banner divergence
  const modeDivergence = chartMode === 'kline' ? dailyDivergence : intradayDivergence;
  const activeDivergence =
    chartMode === 'kline'
      ? dailyDivergence
      : intradayDivergence.hasDivergence
      ? intradayDivergence
      : dailyDivergence;

  // Chart Dimensions
  const svgWidth = 800;
  const mainSvgHeight = 240;
  const kdSvgHeight = 100;
  const macdSvgHeight = 110;
  const padding = { top: 20, right: 40, bottom: 25, left: 55 };
  const chartW = svgWidth - padding.left - padding.right;
  const chartH = mainSvgHeight - padding.top - padding.bottom;
  const kdH = kdSvgHeight - 15 - 18;
  const macdH = macdSvgHeight - 15 - 18;

  // --- Intraday Coordinate Mapping ---
  const allIntradayPrices = useMemo(() => {
    const list = [...intradayTicks.map((t) => t.price), lowPrice, yesterdayClose * 0.985];
    return list;
  }, [intradayTicks, lowPrice, yesterdayClose]);

  const minIntradayPrice = Math.min(...allIntradayPrices);
  const maxIntradayPrice = Math.max(...allIntradayPrices, highPrice, yesterdayClose * 1.015);
  const intradayPriceRange = maxIntradayPrice - minIntradayPrice || 1;

  const getIntradayX = (idx: number) => padding.left + (idx / Math.max(1, intradayTicks.length - 1)) * chartW;
  const getIntradayY = (val: number) => padding.top + (1 - (val - minIntradayPrice) / intradayPriceRange) * chartH;

  const intradayPoints = intradayTicks.map((t, idx) => `${getIntradayX(idx)},${getIntradayY(t.price)}`).join(' ');
  const intradayAreaPoints = `${getIntradayX(0)},${padding.top + chartH} ${intradayPoints} ${getIntradayX(intradayTicks.length - 1)},${padding.top + chartH}`;
  const yesterdayY = getIntradayY(yesterdayClose);
  const isUp = price >= yesterdayClose;
  const maxIntradayVol = Math.max(...intradayTicks.map((t) => t.volume), 100);

  // --- K-Line Coordinate Mapping ---
  const allCandlePrices = useMemo(() => {
    return dailyCandles.flatMap((c) => [c.high, c.low]);
  }, [dailyCandles]);

  const minKlinePrice = Math.min(...allCandlePrices) * 0.985;
  const maxKlinePrice = Math.max(...allCandlePrices) * 1.015;
  const klinePriceRange = maxKlinePrice - minKlinePrice || 1;

  const getKlineX = (idx: number) => padding.left + (idx / Math.max(1, dailyCandles.length - 1)) * chartW;
  const getKlineY = (val: number) => padding.top + (1 - (val - minKlinePrice) / klinePriceRange) * chartH;
  const maxDailyVol = Math.max(...dailyCandles.map((c) => c.volume), 1000);

  // --- KD Coordinate Mapping (0 to 100 scale) ---
  const getKdY = (val: number) => 15 + (1 - Math.max(0, Math.min(100, val)) / 100) * kdH;

  // --- MACD Coordinate Mapping (Centered symmetrical around 0) ---
  const maxMacdVal = useMemo(() => {
    const vals = [
      ...activeMACD.dif.map(Math.abs),
      ...activeMACD.macd.map(Math.abs),
      ...activeMACD.osc.map(Math.abs),
    ];
    const peak = Math.max(...vals, 0.5);
    return Math.max(0.5, peak * 1.18);
  }, [activeMACD]);

  const macdZeroY = 15 + macdH / 2;
  const getMacdY = (val: number) => {
    const clamped = Math.max(-maxMacdVal, Math.min(maxMacdVal, val));
    return macdZeroY - (clamped / maxMacdVal) * (macdH / 2);
  };

  // Active dataset length and accessor for crosshair
  const activeLength = chartMode === 'intraday' ? intradayTicks.length : dailyCandles.length;
  const currentHover = hoverIndex !== null && hoverIndex >= 0 && hoverIndex < activeLength ? hoverIndex : null;

  // Dynamic values at hover or latest
  const inspectedData = useMemo(() => {
    if (chartMode === 'intraday') {
      const idx = currentHover !== null ? currentHover : intradayTicks.length - 1;
      const tick = intradayTicks[idx] || { time: '13:30', price, volume: 0, type: 'neutral' };
      const curMA5 = intradayMA5[idx] ?? ma5 ?? price;
      const curMA20 = intradayMA20[idx] ?? ma20 ?? price;
      const curMA60 = intradayMA60[idx] ?? ma60 ?? price;
      const curK = intradayKD.k[idx] ?? intradayKD.currentK;
      const curD = intradayKD.d[idx] ?? intradayKD.currentD;
      const curDIF = intradayMACD.dif[idx] ?? intradayMACD.currentDIF;
      const curMACD = intradayMACD.macd[idx] ?? intradayMACD.currentMACD;
      const curOSC = intradayMACD.osc[idx] ?? intradayMACD.currentOSC;
      const curBollUpper = intradayBollinger.upper[idx] ?? intradayBollinger.currentUpper;
      const curBollMiddle = intradayBollinger.middle[idx] ?? intradayBollinger.currentMiddle;
      const curBollLower = intradayBollinger.lower[idx] ?? intradayBollinger.currentLower;
      const curVWAP = intradayVWAP.values[idx] ?? intradayVWAP.currentVWAP;

      return {
        label: tick.time,
        price: tick.price,
        open: tick.price,
        high: Math.max(tick.price, yesterdayClose),
        low: Math.min(tick.price, yesterdayClose),
        volume: tick.volume,
        ma5: curMA5,
        ma20: curMA20,
        ma60: curMA60,
        k: curK,
        d: curD,
        dif: curDIF,
        macd: curMACD,
        osc: curOSC,
        bollingerUpper: curBollUpper,
        bollingerMiddle: curBollMiddle,
        bollingerLower: curBollLower,
        vwap: curVWAP,
        isLatest: currentHover === null,
      };
    } else {
      const idx = currentHover !== null ? currentHover : dailyCandles.length - 1;
      const candle = dailyCandles[idx] || dailyCandles[dailyCandles.length - 1];
      const curMA5 = dailyMA5[idx] ?? ma5;
      const curMA20 = dailyMA20[idx] ?? ma20;
      const curMA60 = dailyMA60[idx] ?? ma60;
      const curK = dailyKD.k[idx] ?? dailyKD.currentK;
      const curD = dailyKD.d[idx] ?? dailyKD.currentD;
      const curDIF = dailyMACD.dif[idx] ?? dailyMACD.currentDIF;
      const curMACD = dailyMACD.macd[idx] ?? dailyMACD.currentMACD;
      const curOSC = dailyMACD.osc[idx] ?? dailyMACD.currentOSC;
      const curBollUpper = dailyBollinger.upper[idx] ?? dailyBollinger.currentUpper;
      const curBollMiddle = dailyBollinger.middle[idx] ?? dailyBollinger.currentMiddle;
      const curBollLower = dailyBollinger.lower[idx] ?? dailyBollinger.currentLower;
      const curVWAP = dailyVWAP.values[idx] ?? dailyVWAP.currentVWAP;

      return {
        label: candle.date,
        price: candle.close,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        volume: candle.volume,
        ma5: curMA5,
        ma20: curMA20,
        ma60: curMA60,
        k: curK,
        d: curD,
        dif: curDIF,
        macd: curMACD,
        osc: curOSC,
        bollingerUpper: curBollUpper,
        bollingerMiddle: curBollMiddle,
        bollingerLower: curBollLower,
        vwap: curVWAP,
        isLatest: currentHover === null,
      };
    }
  }, [
    chartMode,
    currentHover,
    intradayTicks,
    dailyCandles,
    intradayMA5,
    intradayMA20,
    intradayMA60,
    intradayKD,
    intradayMACD,
    intradayBollinger,
    intradayVWAP,
    dailyMA5,
    dailyMA20,
    dailyMA60,
    dailyKD,
    dailyMACD,
    dailyBollinger,
    dailyVWAP,
    price,
    yesterdayClose,
    ma5,
    ma20,
    ma60,
  ]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Primary Chart Nav Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 sm:px-6 py-3 bg-slate-950/60 overflow-x-auto">
        <div className="flex items-center space-x-1 sm:space-x-2 min-w-max">
          <button
            onClick={() => setActiveTab('intraday')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'intraday'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>技術走勢與指標 (MA/KD/MACD)</span>
          </button>

          <button
            onClick={() => setActiveTab('orderFlow')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'orderFlow'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>大小單能量分布</span>
          </button>

          <button
            onClick={() => setActiveTab('institutional')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'institutional'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>法人進出軌跡圖</span>
          </button>

          <button
            onClick={() => setActiveTab('peBand')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'peBand'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>本益比河流圖</span>
          </button>

          <button
            onClick={() => setActiveTab('orderBook')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'orderBook'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <GitCommit className="w-3.5 h-3.5" />
            <span>五檔即時撮合</span>
          </button>
        </div>

        <div className="text-xs text-slate-400 hidden sm:flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono">三竹高頻數據在線</span>
        </div>
      </div>

      {/* TECHNICAL INDICATOR CONTROLS TOOLBAR (Only shown on technical chart tab) */}
      {activeTab === 'intraday' && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-2.5 bg-slate-950/80 border-b border-slate-800 text-xs">
          {/* Chart Mode Toggle (分時 vs 日K) */}
          <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => {
                setChartMode('intraday');
                setHoverIndex(null);
              }}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                chartMode === 'intraday'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3 h-3" />
              <span>分時走勢</span>
            </button>
            <button
              onClick={() => {
                setChartMode('kline');
                setHoverIndex(null);
              }}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                chartMode === 'kline'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-3 h-3" />
              <span>日K技術線</span>
            </button>
          </div>

          {/* Indicator Selectors: MA (5, 20, 60) and KD */}
          <div className="flex flex-wrap items-center gap-2">
            {/* MA Selectors Group */}
            <div className="flex items-center space-x-1.5 bg-slate-900/90 px-2 py-1 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400 font-semibold mr-1 flex items-center">
                <TrendingUp className="w-3 h-3 mr-1 text-slate-400" />
                均線：
              </span>

              {/* MA 5 Selector */}
              <button
                onClick={() => setShowMA5(!showMA5)}
                className={`flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                  showMA5
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-500/10'
                    : 'text-slate-500 hover:text-slate-400 bg-slate-800/40 border border-slate-700/50'
                }`}
                title="切換 5日移動平均線 (週線)"
              >
                <span className={`w-2 h-0.5 rounded-full ${showMA5 ? 'bg-amber-400' : 'bg-slate-600'}`} />
                <span>MA5</span>
                <span className="font-mono text-[10px] opacity-85">
                  {typeof ma5 === 'number' ? `$${ma5}` : ''}
                </span>
              </button>

              {/* MA 20 Selector */}
              <button
                onClick={() => setShowMA20(!showMA20)}
                className={`flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                  showMA20
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50 shadow-sm shadow-sky-500/10'
                    : 'text-slate-500 hover:text-slate-400 bg-slate-800/40 border border-slate-700/50'
                }`}
                title="切換 20日移動平均線 (月線/生命線)"
              >
                <span className={`w-2 h-0.5 rounded-full ${showMA20 ? 'bg-sky-400' : 'bg-slate-600'}`} />
                <span>MA20</span>
                <span className="font-mono text-[10px] opacity-85">
                  {typeof ma20 === 'number' ? `$${ma20}` : ''}
                </span>
              </button>

              {/* MA 60 Selector */}
              <button
                onClick={() => setShowMA60(!showMA60)}
                className={`flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-bold transition-all ${
                  showMA60
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-sm shadow-purple-500/10'
                    : 'text-slate-500 hover:text-slate-400 bg-slate-800/40 border border-slate-700/50'
                }`}
                title="切換 60日移動平均線 (季線/趨勢線)"
              >
                <span className={`w-2 h-0.5 rounded-full ${showMA60 ? 'bg-purple-400' : 'bg-slate-600'}`} />
                <span>MA60</span>
                <span className="font-mono text-[10px] opacity-85">
                  {typeof ma60 === 'number' ? `$${ma60}` : ''}
                </span>
              </button>

              {/* Quick toggle all */}
              <button
                onClick={() => {
                  const allOn = showMA5 && showMA20 && showMA60;
                  setShowMA5(!allOn);
                  setShowMA20(!allOn);
                  setShowMA60(!allOn);
                }}
                className="text-[10px] text-slate-400 hover:text-slate-200 px-1 py-0.5 hover:underline"
              >
                {showMA5 && showMA20 && showMA60 ? '全隱藏' : '全顯示'}
              </button>
            </div>

            {/* KD Indicator Selector */}
            <button
              onClick={() => setShowKD(!showKD)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                showKD
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 shadow-md shadow-cyan-500/15'
                  : 'bg-slate-900 text-slate-500 hover:text-slate-400 border border-slate-800'
              }`}
              title="切換顯示 KD (9,3,3) 隨機指標"
            >
              <Zap className={`w-3.5 h-3.5 ${showKD ? 'text-cyan-400 fill-cyan-400/20' : 'text-slate-500'}`} />
              <span>KD指標</span>
              <span className={`w-1.5 h-1.5 rounded-full ${showKD ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`} />
              {showKD && (
                <span className="flex items-center space-x-1 font-mono text-[11px] pl-1 border-l border-cyan-500/30">
                  <span className="text-amber-300">K:{activeKD.currentK}</span>
                  <span className="text-sky-300">D:{activeKD.currentD}</span>
                </span>
              )}
            </button>

            {/* MACD Indicator Selector */}
            <button
              onClick={() => setShowMACD(!showMACD)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                showMACD
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/60 shadow-md shadow-purple-500/15'
                  : 'bg-slate-900 text-slate-500 hover:text-slate-400 border border-slate-800'
              }`}
              title="切換顯示 MACD 指數平滑異同移動平均線"
            >
              <Sliders className={`w-3.5 h-3.5 ${showMACD ? 'text-purple-400 fill-purple-400/20' : 'text-slate-500'}`} />
              <span>MACD指標</span>
              <span className={`w-1.5 h-1.5 rounded-full ${showMACD ? 'bg-purple-400 animate-pulse' : 'bg-slate-600'}`} />
              {showMACD && (
                <span className="flex items-center space-x-1 font-mono text-[11px] pl-1 border-l border-purple-500/30">
                  <span className="text-amber-300">DIF:{activeMACD.currentDIF}</span>
                  <span className="text-sky-300">MACD:{activeMACD.currentMACD}</span>
                  <span className={activeMACD.currentOSC >= 0 ? 'text-red-400' : 'text-emerald-400'}>
                    OSC:{activeMACD.currentOSC >= 0 ? `+${activeMACD.currentOSC}` : activeMACD.currentOSC}
                  </span>
                </span>
              )}
            </button>

            {/* Bollinger Bands Indicator Selector */}
            <button
              onClick={() => setShowBollinger(!showBollinger)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                showBollinger
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/60 shadow-md shadow-sky-500/15'
                  : 'bg-slate-900 text-slate-500 hover:text-slate-400 border border-slate-800'
              }`}
              title="切換顯示布林通道 (Bollinger Bands 20, 2)"
            >
              <Activity className={`w-3.5 h-3.5 ${showBollinger ? 'text-sky-400' : 'text-slate-500'}`} />
              <span>布林通道</span>
              <span className={`w-1.5 h-1.5 rounded-full ${showBollinger ? 'bg-sky-400 animate-pulse' : 'bg-slate-600'}`} />
              {showBollinger && (
                <span className="flex items-center space-x-1 font-mono text-[11px] pl-1 border-l border-sky-500/30">
                  <span className="text-sky-300">上:{activeBollinger.currentUpper}</span>
                  <span className="text-slate-400">中:{activeBollinger.currentMiddle}</span>
                  <span className="text-indigo-300">下:{activeBollinger.currentLower}</span>
                </span>
              )}
            </button>

            {/* VWAP Indicator Selector */}
            <button
              onClick={() => setShowVWAP(!showVWAP)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                showVWAP
                  ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/60 shadow-md shadow-fuchsia-500/15'
                  : 'bg-slate-900 text-slate-500 hover:text-slate-400 border border-slate-800'
              }`}
              title="切換顯示成交量加權平均價 (VWAP)"
            >
              <Scale className={`w-3.5 h-3.5 ${showVWAP ? 'text-fuchsia-400' : 'text-slate-500'}`} />
              <span>VWAP</span>
              <span className={`w-1.5 h-1.5 rounded-full ${showVWAP ? 'bg-fuchsia-400 animate-pulse' : 'bg-slate-600'}`} />
              {showVWAP && (
                <span className="flex items-center space-x-1 font-mono text-[11px] pl-1 border-l border-fuchsia-500/30">
                  <span className="text-fuchsia-300">${activeVWAP.currentVWAP}</span>
                  <span className={activeVWAP.priceVsVWAPPct >= 0 ? 'text-red-400' : 'text-emerald-400'}>
                    ({activeVWAP.priceVsVWAPPct >= 0 ? '+' : ''}{activeVWAP.priceVsVWAPPct}%)
                  </span>
                </span>
              )}
            </button>

            {/* Quick Combo Selector: Bollinger + VWAP Dual Overlay */}
            <button
              onClick={() => {
                const bothOn = showBollinger && showVWAP;
                setShowBollinger(!bothOn);
                setShowVWAP(!bothOn);
              }}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                showBollinger && showVWAP
                  ? 'bg-gradient-to-r from-sky-500/25 to-fuchsia-500/25 text-white border border-fuchsia-500/50 shadow-sm shadow-fuchsia-950/30 ring-1 ring-fuchsia-400/30'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
              title="一鍵同時疊加『布林通道』與『VWAP』雙指標"
            >
              <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>布林+VWAP疊加</span>
              <span className={`w-1.5 h-1.5 rounded-full ${showBollinger && showVWAP ? 'bg-fuchsia-400 animate-pulse' : 'bg-slate-600'}`} />
            </button>

            {/* Technical Divergence Detection Selector (技術指標背離偵測) */}
            <button
              onClick={() => setShowDivergence(!showDivergence)}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                showDivergence
                  ? activeDivergence.hasDivergence
                    ? 'bg-amber-500/20 text-amber-200 border border-amber-500/60 shadow-md shadow-amber-500/15 ring-1 ring-amber-400/30'
                    : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-900 text-slate-500 hover:text-slate-400 border border-slate-800'
              }`}
              title="切換『技術指標背離偵測』(偵測股價創新高但 MACD 或 KD 未創新高)"
            >
              <AlertTriangle
                className={`w-3.5 h-3.5 ${
                  showDivergence
                    ? activeDivergence.hasDivergence
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                    : 'text-slate-500'
                }`}
              />
              <span>背離偵測</span>
              {activeDivergence.hasDivergence && (
                <span className="px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-200 font-extrabold text-[10px] border border-amber-400/40 animate-pulse">
                  潛在背離
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Main Canvas Area */}
      <div className="p-4 sm:p-6">
        {/* TAB 1: 技術走勢與指標 (MA/KD/MACD/Bollinger/VWAP) */}
        {activeTab === 'intraday' && (
          <div className="space-y-4">
            {/* Live Inspection / Indicator HUD Header */}
            <div className="flex flex-wrap justify-between items-center text-xs text-slate-400 gap-2 bg-slate-950/60 px-3.5 py-2 rounded-xl border border-slate-800/80">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-slate-200 font-bold flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  {inspectedData.label}
                  {inspectedData.isLatest ? ' (最新撮合)' : ' (歷史游標)'}
                </span>

                <span className="font-mono">
                  價: <strong className={isUp ? 'text-red-400' : 'text-emerald-400'}>${inspectedData.price}</strong>
                </span>

                {showMA5 && inspectedData.ma5 && (
                  <span className="font-mono text-amber-400 flex items-center">
                    <span className="w-2 h-0.5 bg-amber-400 mr-1 rounded" />
                    MA5: ${inspectedData.ma5}
                  </span>
                )}

                {showMA20 && inspectedData.ma20 && (
                  <span className="font-mono text-sky-400 flex items-center">
                    <span className="w-2 h-0.5 bg-sky-400 mr-1 rounded" />
                    MA20: ${inspectedData.ma20}
                  </span>
                )}

                {showMA60 && inspectedData.ma60 && (
                  <span className="font-mono text-purple-400 flex items-center">
                    <span className="w-2 h-0.5 bg-purple-400 mr-1 rounded" />
                    MA60: ${inspectedData.ma60}
                  </span>
                )}

                {showKD && (
                  <span className="font-mono text-cyan-300 flex items-center space-x-1 pl-1 border-l border-slate-800">
                    <span className="text-amber-400">K:{inspectedData.k}</span>
                    <span className="text-sky-400">D:{inspectedData.d}</span>
                  </span>
                )}

                {showMACD && (
                  <span className="font-mono text-purple-300 flex items-center space-x-1.5 pl-1.5 border-l border-slate-800">
                    <span className="text-amber-400">DIF:{inspectedData.dif}</span>
                    <span className="text-sky-400">MACD:{inspectedData.macd}</span>
                    <span className={`font-bold ${inspectedData.osc >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      OSC:{inspectedData.osc >= 0 ? `+${inspectedData.osc}` : inspectedData.osc}
                    </span>
                  </span>
                )}

                {showBollinger && inspectedData.bollingerUpper && (
                  <span className="font-mono text-sky-300 flex items-center space-x-1 pl-1.5 border-l border-slate-800">
                    <span className="text-slate-400 text-[10px]">布林:</span>
                    <span className="text-sky-400">上:${inspectedData.bollingerUpper}</span>
                    <span className="text-slate-400">中:${inspectedData.bollingerMiddle}</span>
                    <span className="text-indigo-400">下:${inspectedData.bollingerLower}</span>
                  </span>
                )}

                {showVWAP && inspectedData.vwap && (
                  <span className="font-mono text-fuchsia-300 flex items-center space-x-1 pl-1.5 border-l border-slate-800">
                    <span className="w-2 h-0.5 bg-fuchsia-400 mr-1 rounded" />
                    VWAP: ${inspectedData.vwap}
                  </span>
                )}
              </div>

              <div className="font-mono text-[11px] flex items-center space-x-2">
                <span>最高: <strong className="text-red-400">${chartMode === 'intraday' ? highPrice : maxKlinePrice.toFixed(1)}</strong></span>
                <span>最低: <strong className="text-emerald-400">${chartMode === 'intraday' ? lowPrice : minKlinePrice.toFixed(1)}</strong></span>
              </div>
            </div>

            {/* TOP OF CHART DIVERGENCE ALERT BANNER: 技術指標背離偵測 (於圖表上方標示『潛在背離』提示，輔助判斷反轉點) */}
            {showDivergence && (
              <div
                className={`rounded-xl p-3.5 sm:p-4 border transition-all ${
                  activeDivergence.hasDivergence
                    ? 'bg-gradient-to-r from-amber-950/50 via-slate-900 to-rose-950/40 border-amber-500/50 shadow-lg shadow-amber-950/20'
                    : 'bg-slate-950/70 border-slate-800/90'
                }`}
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 mb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold border shadow-sm ${
                        activeDivergence.hasDivergence
                          ? 'bg-amber-500/25 text-amber-200 border-amber-400/60 animate-pulse'
                          : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        {activeDivergence.hasDivergence ? '潛在背離' : '指標同步'}
                      </span>
                    </span>

                    <h4 className="text-xs sm:text-sm font-bold text-slate-100">
                      技術指標背離偵測：{activeDivergence.headline}
                    </h4>

                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-md font-bold border ${
                        activeDivergence.reversalRiskLevel === 'high'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : activeDivergence.reversalRiskLevel === 'medium'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {activeDivergence.reversalRiskLabel}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 self-end lg:self-auto">
                    {chartMode === 'intraday' && !intradayDivergence.hasDivergence && dailyDivergence.hasDivergence && (
                      <button
                        type="button"
                        onClick={() => {
                          setChartMode('kline');
                          setHoverIndex(null);
                        }}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 font-bold transition-colors"
                      >
                        切換日K檢視波段背離軌跡 ➔
                      </button>
                    )}
                    <span className="text-[11px] font-mono text-slate-400 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800">
                      反轉頸線防守：<strong className="text-amber-300">${activeDivergence.keyNecklinePrice}</strong>
                    </span>
                  </div>
                </div>

                {/* 4-Column Quantitative Peak vs Indicator Comparison Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                  {/* Col 1: Price New High Check */}
                  <div className="bg-slate-950/75 border border-slate-800/90 rounded-lg p-2.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span>波段高點價格對比</span>
                      <span className="text-red-400 font-bold flex items-center">
                        <TrendingUp className="w-3 h-3 mr-0.5" />
                        股價創新高
                      </span>
                    </div>
                    <div className="font-mono text-xs text-slate-200 flex items-center justify-between">
                      <span>
                        前高 ({activeDivergence.prevPeakLabel}):{' '}
                        <strong>${activeDivergence.prevPeakPrice}</strong>
                      </span>
                      <span className="text-slate-500">➔</span>
                      <span className="text-red-400 font-bold">
                        新高: ${activeDivergence.currPeakPrice}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-1">
                      創高幅度:{' '}
                      <span className="text-red-400 font-bold">
                        {activeDivergence.priceChangePct >= 0 ? '+' : ''}
                        {activeDivergence.priceChangePct}%
                      </span>
                    </div>
                  </div>

                  {/* Col 2: KD Peak Check */}
                  <div
                    className={`rounded-lg p-2.5 border ${
                      activeDivergence.kdDivergence
                        ? 'bg-amber-950/30 border-amber-500/40'
                        : 'bg-slate-950/75 border-slate-800/90'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span>KD (%K) 峰值對比</span>
                      <span
                        className={`font-bold flex items-center ${
                          activeDivergence.kdDivergence ? 'text-amber-300' : 'text-emerald-400'
                        }`}
                      >
                        {activeDivergence.kdDivergence ? (
                          <>
                            <TrendingDown className="w-3 h-3 mr-0.5" />
                            未創新高 (潛在背離)
                          </>
                        ) : (
                          '指標同步創高'
                        )}
                      </span>
                    </div>
                    <div className="font-mono text-xs text-slate-200 flex items-center justify-between">
                      <span>前高 K: <strong>{activeDivergence.prevPeakK}</strong></span>
                      <span className="text-slate-500">➔</span>
                      <span
                        className={`font-bold ${
                          activeDivergence.kdDivergence ? 'text-amber-300' : 'text-slate-200'
                        }`}
                      >
                        現高 K: {activeDivergence.currPeakK}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-1">
                      峰值落差:{' '}
                      <span
                        className={`font-bold ${
                          activeDivergence.kDiff < 0 ? 'text-amber-300' : 'text-red-400'
                        }`}
                      >
                        {activeDivergence.kDiff > 0 ? '+' : ''}
                        {activeDivergence.kDiff}
                      </span>
                    </div>
                  </div>

                  {/* Col 3: MACD Peak Check */}
                  <div
                    className={`rounded-lg p-2.5 border ${
                      activeDivergence.macdDivergence
                        ? 'bg-amber-950/30 border-amber-500/40'
                        : 'bg-slate-950/75 border-slate-800/90'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                      <span>MACD (DIF/OSC) 對比</span>
                      <span
                        className={`font-bold flex items-center ${
                          activeDivergence.macdDivergence ? 'text-amber-300' : 'text-emerald-400'
                        }`}
                      >
                        {activeDivergence.macdDivergence ? (
                          <>
                            <TrendingDown className="w-3 h-3 mr-0.5" />
                            未創新高 (潛在背離)
                          </>
                        ) : (
                          '動能同步推升'
                        )}
                      </span>
                    </div>
                    <div className="font-mono text-xs text-slate-200 flex items-center justify-between">
                      <span>前高 DIF: <strong>{activeDivergence.prevPeakDIF}</strong></span>
                      <span className="text-slate-500">➔</span>
                      <span
                        className={`font-bold ${
                          activeDivergence.macdDivergence ? 'text-amber-300' : 'text-slate-200'
                        }`}
                      >
                        現高 DIF: {activeDivergence.currPeakDIF}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-1">
                      柱體 OSC: {activeDivergence.prevPeakOSC} ➔{' '}
                      <span
                        className={`font-bold ${
                          activeDivergence.currPeakOSC < activeDivergence.prevPeakOSC
                            ? 'text-amber-300'
                            : 'text-red-400'
                        }`}
                      >
                        {activeDivergence.currPeakOSC}
                      </span>
                    </div>
                  </div>

                  {/* Col 4: Reversal Point Judgment Guide */}
                  <div className="bg-slate-950/75 border border-slate-800/90 rounded-lg p-2.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-[11px] text-amber-300 font-bold mb-1">
                      <span>反轉點輔助判斷建議</span>
                      <span className="font-mono text-[10px] text-slate-400">
                        頸線 ${activeDivergence.keyNecklinePrice}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">
                      {activeDivergence.suggestedAction}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* CHART 1: Price / K-line Canvas */}
            <div 
              className="w-full overflow-hidden bg-slate-950/90 rounded-xl border border-slate-800 p-2 cursor-crosshair relative"
              onMouseLeave={() => setHoverIndex(null)}
            >
              {/* Floating Top-Right Overlay Pill on Main Chart when Divergence is Detected */}
              {showDivergence && activeDivergence.hasDivergence && (
                <div className="absolute top-3 right-12 z-10 pointer-events-none flex items-center space-x-1.5 bg-amber-950/90 border border-amber-400/60 text-amber-200 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-lg">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>潛在背離：{activeDivergence.badgeText}</span>
                </div>
              )}
              <svg 
                viewBox={`0 0 ${svgWidth} ${mainSvgHeight}`} 
                className="w-full h-64 sm:h-72 select-none"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const relX = (e.clientX - rect.left) / rect.width;
                  const svgX = relX * svgWidth;
                  const activeW = chartW;
                  const clampedX = Math.max(0, Math.min(activeW, svgX - padding.left));
                  const idx = Math.round((clampedX / activeW) * (activeLength - 1));
                  setHoverIndex(idx);
                }}
              >
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isUp ? '#ef4444' : '#10b981'} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={isUp ? '#ef4444' : '#10b981'} stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal reference grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                  const y = padding.top + pct * chartH;
                  const priceLabel = chartMode === 'intraday'
                    ? (maxIntradayPrice - pct * intradayPriceRange).toFixed(1)
                    : (maxKlinePrice - pct * klinePriceRange).toFixed(1);
                  return (
                    <g key={pct}>
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={svgWidth - padding.right}
                        y2={y}
                        stroke="#1e293b"
                        strokeDasharray="3,3"
                      />
                      <text
                        x={padding.left - 6}
                        y={y + 4}
                        fill="#64748b"
                        fontSize="10"
                        textAnchor="end"
                        fontFamily="monospace"
                      >
                        {priceLabel}
                      </text>
                    </g>
                  );
                })}

                {/* MODE A: 分時走勢圖 */}
                {chartMode === 'intraday' && (
                  <g>
                    {/* Yesterday close flat line */}
                    <line
                      x1={padding.left}
                      y1={yesterdayY}
                      x2={svgWidth - padding.right}
                      y2={yesterdayY}
                      stroke="#64748b"
                      strokeDasharray="4,4"
                      strokeWidth="1.2"
                    />

                    {/* Area fill */}
                    <polygon points={intradayAreaPoints} fill="url(#priceGradient)" />

                    {/* Price Polyline */}
                    <polyline
                      fill="none"
                      stroke={isUp ? '#ef4444' : '#10b981'}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={intradayPoints}
                    />

                    {/* MA 5 Intraday Curve */}
                    {showMA5 && (
                      <polyline
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={intradayMA5
                          .map((val, idx) => (val !== null ? `${getIntradayX(idx)},${getIntradayY(val)}` : null))
                          .filter(Boolean)
                          .join(' ')}
                      />
                    )}

                    {/* MA 20 Intraday Curve */}
                    {showMA20 && (
                      <polyline
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={intradayMA20
                          .map((val, idx) => (val !== null ? `${getIntradayX(idx)},${getIntradayY(val)}` : null))
                          .filter(Boolean)
                          .join(' ')}
                      />
                    )}

                    {/* MA 60 Intraday Curve */}
                    {showMA60 && (
                      <polyline
                        fill="none"
                        stroke="#c084fc"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={intradayMA60
                          .map((val, idx) => (val !== null ? `${getIntradayX(idx)},${getIntradayY(val)}` : null))
                          .filter(Boolean)
                          .join(' ')}
                      />
                    )}

                    {/* Bollinger Bands Intraday */}
                    {showBollinger && (
                      <g>
                        <polygon
                          fill="#38bdf8"
                          fillOpacity="0.08"
                          points={`
                            ${intradayBollinger.upper
                              .map((val, idx) => `${getIntradayX(idx)},${getIntradayY(val)}`)
                              .join(' ')}
                            ${intradayBollinger.lower
                              .map((val, idx) => `${getIntradayX(idx)},${getIntradayY(val)}`)
                              .reverse()
                              .join(' ')}
                          `}
                        />
                        <polyline
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="1.5"
                          strokeDasharray="3 3"
                          points={intradayBollinger.upper
                            .map((val, idx) => `${getIntradayX(idx)},${getIntradayY(val)}`)
                            .join(' ')}
                        />
                        <polyline
                          fill="none"
                          stroke="#818cf8"
                          strokeWidth="1.5"
                          strokeDasharray="3 3"
                          points={intradayBollinger.lower
                            .map((val, idx) => `${getIntradayX(idx)},${getIntradayY(val)}`)
                            .join(' ')}
                        />
                      </g>
                    )}

                    {/* VWAP Intraday Line */}
                    {showVWAP && (
                      <polyline
                        fill="none"
                        stroke="#d946ef"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={intradayVWAP.values
                          .map((val, idx) => `${getIntradayX(idx)},${getIntradayY(val)}`)
                          .join(' ')}
                      />
                    )}

                    {/* Benchmark MA price reference lines if on screen */}
                    {showMA5 && typeof ma5 === 'number' && ma5 >= minIntradayPrice && ma5 <= maxIntradayPrice && (
                      <g>
                        <line
                          x1={padding.left}
                          y1={getIntradayY(ma5)}
                          x2={svgWidth - padding.right}
                          y2={getIntradayY(ma5)}
                          stroke="#f59e0b"
                          strokeDasharray="2,2"
                          strokeOpacity="0.4"
                        />
                        <text
                          x={svgWidth - padding.right + 4}
                          y={getIntradayY(ma5) + 3}
                          fill="#f59e0b"
                          fontSize="9"
                          fontFamily="monospace"
                        >
                          MA5
                        </text>
                      </g>
                    )}

                    {/* Pulse circle on latest tick */}
                    {intradayTicks.length > 0 && (
                      <g>
                        <circle
                          cx={getIntradayX(intradayTicks.length - 1)}
                          cy={getIntradayY(intradayTicks[intradayTicks.length - 1].price)}
                          r="4"
                          fill={isUp ? '#ef4444' : '#10b981'}
                          className="animate-ping"
                        />
                        <circle
                          cx={getIntradayX(intradayTicks.length - 1)}
                          cy={getIntradayY(intradayTicks[intradayTicks.length - 1].price)}
                          r="4"
                          fill="#ffffff"
                        />
                      </g>
                    )}

                    {/* Volume bars at bottom */}
                    {intradayTicks.map((t, idx) => {
                      const x = getIntradayX(idx);
                      const barH = (t.volume / maxIntradayVol) * 40;
                      const barY = padding.top + chartH - barH;
                      const col = t.type === 'buy' ? '#ef4444' : t.type === 'sell' ? '#10b981' : '#64748b';
                      return (
                        <rect
                          key={idx}
                          x={x - 2}
                          y={barY}
                          width="4"
                          height={barH}
                          fill={col}
                          opacity={idx === currentHover ? '1' : '0.7'}
                        />
                      );
                    })}

                    {/* Time Axis Labels */}
                    <text x={padding.left} y={mainSvgHeight - 6} fill="#64748b" fontSize="10" textAnchor="start">09:00</text>
                    <text x={padding.left + chartW * 0.33} y={mainSvgHeight - 6} fill="#64748b" fontSize="10" textAnchor="middle">10:30</text>
                    <text x={padding.left + chartW * 0.66} y={mainSvgHeight - 6} fill="#64748b" fontSize="10" textAnchor="middle">12:00</text>
                    <text x={svgWidth - padding.right} y={mainSvgHeight - 6} fill="#64748b" fontSize="10" textAnchor="end">13:30</text>
                  </g>
                )}

                {/* MODE B: 日K線走勢圖 */}
                {chartMode === 'kline' && (
                  <g>
                    {/* Render 35 Candlesticks */}
                    {dailyCandles.map((c, idx) => {
                      const x = getKlineX(idx);
                      const candleW = Math.max(4, (chartW / dailyCandles.length) * 0.6);
                      const col = c.isUp ? '#ef4444' : '#10b981';
                      const topY = getKlineY(Math.max(c.open, c.close));
                      const bottomY = getKlineY(Math.min(c.open, c.close));
                      const bodyH = Math.max(2, bottomY - topY);
                      const highY = getKlineY(c.high);
                      const lowY = getKlineY(c.low);

                      const volH = (c.volume / maxDailyVol) * 40;
                      const volY = padding.top + chartH - volH;

                      return (
                        <g key={idx}>
                          {/* Candlestick Wick */}
                          <line
                            x1={x}
                            y1={highY}
                            x2={x}
                            y2={lowY}
                            stroke={col}
                            strokeWidth="1.4"
                          />
                          {/* Candlestick Body */}
                          <rect
                            x={x - candleW / 2}
                            y={topY}
                            width={candleW}
                            height={bodyH}
                            fill={c.isUp ? '#ef4444' : '#10b981'}
                            stroke={col}
                            strokeWidth="1"
                            opacity={idx === currentHover ? '1' : '0.9'}
                          />
                          {/* Volume Bar */}
                          <rect
                            x={x - candleW / 2}
                            y={volY}
                            width={candleW}
                            height={volH}
                            fill={col}
                            opacity={idx === currentHover ? '0.9' : '0.6'}
                          />
                        </g>
                      );
                    })}

                    {/* MA 5 Line */}
                    {showMA5 && (
                      <polyline
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={dailyMA5
                          .map((val, idx) => (val !== null ? `${getKlineX(idx)},${getKlineY(val)}` : null))
                          .filter(Boolean)
                          .join(' ')}
                      />
                    )}

                    {/* MA 20 Line */}
                    {showMA20 && (
                      <polyline
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={dailyMA20
                          .map((val, idx) => (val !== null ? `${getKlineX(idx)},${getKlineY(val)}` : null))
                          .filter(Boolean)
                          .join(' ')}
                      />
                    )}

                    {/* MA 60 Line */}
                    {showMA60 && (
                      <polyline
                        fill="none"
                        stroke="#c084fc"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={dailyMA60
                          .map((val, idx) => (val !== null ? `${getKlineX(idx)},${getKlineY(val)}` : null))
                          .filter(Boolean)
                          .join(' ')}
                      />
                    )}

                    {/* Bollinger Bands Daily */}
                    {showBollinger && (
                      <g>
                        <polygon
                          fill="#38bdf8"
                          fillOpacity="0.08"
                          points={`
                            ${dailyBollinger.upper
                              .map((val, idx) => `${getKlineX(idx)},${getKlineY(val)}`)
                              .join(' ')}
                            ${dailyBollinger.lower
                              .map((val, idx) => `${getKlineX(idx)},${getKlineY(val)}`)
                              .reverse()
                              .join(' ')}
                          `}
                        />
                        <polyline
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="1.5"
                          strokeDasharray="3 3"
                          points={dailyBollinger.upper
                            .map((val, idx) => `${getKlineX(idx)},${getKlineY(val)}`)
                            .join(' ')}
                        />
                        <polyline
                          fill="none"
                          stroke="#818cf8"
                          strokeWidth="1.5"
                          strokeDasharray="3 3"
                          points={dailyBollinger.lower
                            .map((val, idx) => `${getKlineX(idx)},${getKlineY(val)}`)
                            .join(' ')}
                        />
                      </g>
                    )}

                    {/* VWAP Daily Line */}
                    {showVWAP && (
                      <polyline
                        fill="none"
                        stroke="#d946ef"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={dailyVWAP.values
                          .map((val, idx) => `${getKlineX(idx)},${getKlineY(val)}`)
                          .join(' ')}
                      />
                    )}

                    {/* K-Line Date Axis Labels */}
                    {dailyCandles
                      .filter((_, i) => i % 6 === 0 || i === dailyCandles.length - 1)
                      .map((c, i) => {
                        const originalIndex = dailyCandles.indexOf(c);
                        return (
                          <text
                            key={i}
                            x={getKlineX(originalIndex)}
                            y={mainSvgHeight - 6}
                            fill="#64748b"
                            fontSize="10"
                            textAnchor="middle"
                            fontFamily="monospace"
                          >
                            {c.date}
                          </text>
                        );
                      })}
                  </g>
                )}

                {/* Divergence Peak Connector Overlay on Main Price Chart */}
                {showDivergence && modeDivergence.hasDivergence && (() => {
                  const x1 =
                    chartMode === 'intraday'
                      ? getIntradayX(modeDivergence.prevPeakIndex)
                      : getKlineX(modeDivergence.prevPeakIndex);
                  const y1 =
                    chartMode === 'intraday'
                      ? getIntradayY(modeDivergence.prevPeakPrice)
                      : getKlineY(modeDivergence.prevPeakPrice);
                  const x2 =
                    chartMode === 'intraday'
                      ? getIntradayX(modeDivergence.currPeakIndex)
                      : getKlineX(modeDivergence.currPeakIndex);
                  const y2 =
                    chartMode === 'intraday'
                      ? getIntradayY(modeDivergence.currPeakPrice)
                      : getKlineY(modeDivergence.currPeakPrice);

                  return (
                    <g>
                      <line
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke="#fbbf24"
                        strokeWidth="2"
                        strokeDasharray="5,3"
                      />
                      <circle cx={x1} cy={y1} r="4" fill="#fbbf24" stroke="#0f172a" strokeWidth="1.5" />
                      <circle cx={x2} cy={y2} r="4.5" fill="#ef4444" stroke="#fbbf24" strokeWidth="2" />
                      <text
                        x={x1}
                        y={Math.max(12, y1 - 7)}
                        fill="#fde68a"
                        fontSize="9"
                        fontWeight="bold"
                        textAnchor="middle"
                        fontFamily="monospace"
                      >
                        前高 ${modeDivergence.prevPeakPrice}
                      </text>
                      <text
                        x={Math.min(svgWidth - padding.right - 28, x2)}
                        y={Math.max(12, y2 - 7)}
                        fill="#fca5a5"
                        fontSize="9"
                        fontWeight="bold"
                        textAnchor="middle"
                        fontFamily="monospace"
                      >
                        創高↗ ${modeDivergence.currPeakPrice} (潛在背離)
                      </text>
                    </g>
                  );
                })()}

                {/* Interactive Crosshair & Cursor */}
                {currentHover !== null && (
                  <g>
                    <line
                      x1={chartMode === 'intraday' ? getIntradayX(currentHover) : getKlineX(currentHover)}
                      y1={padding.top}
                      x2={chartMode === 'intraday' ? getIntradayX(currentHover) : getKlineX(currentHover)}
                      y2={padding.top + chartH}
                      stroke="#f8fafc"
                      strokeWidth="1.2"
                      strokeDasharray="3,3"
                      opacity="0.85"
                    />
                    <circle
                      cx={chartMode === 'intraday' ? getIntradayX(currentHover) : getKlineX(currentHover)}
                      cy={chartMode === 'intraday' ? getIntradayY(inspectedData.price) : getKlineY(inspectedData.price)}
                      r="4"
                      fill="#ffffff"
                      stroke="#0284c7"
                      strokeWidth="2"
                    />
                  </g>
                )}
              </svg>
            </div>

            {/* Bollinger Bands & VWAP Confluence Analysis Panel (When Either is Enabled) */}
            {(showBollinger || showVWAP) && (
              <div className="bg-slate-950/80 rounded-xl p-3 sm:p-4 border border-slate-800 text-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800/80">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
                    <span className="font-bold text-slate-200">
                      布林通道 (Bollinger Bands) 與 成交量加權平均價 (VWAP) 波動區間與支撐壓力共振
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 font-mono text-[11px]">
                    <span className="text-sky-300">
                      布林狀態: <strong className="font-bold">{activeBollinger.statusLabel}</strong>
                    </span>
                    <span className="text-slate-600">|</span>
                    <span className="text-fuchsia-300">
                      VWAP 狀態: <strong className="font-bold">{activeVWAP.statusLabel}</strong>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-[11px]">
                  {/* Column 1: Bollinger Bands Range */}
                  <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px] mb-1 font-sans">
                      布林通道波動帶 (20, 2)
                    </span>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-sky-400">上軌 (壓力線):</span>
                        <strong>${activeBollinger.currentUpper}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-300">中軌 (基準線):</span>
                        <strong>${activeBollinger.currentMiddle}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-indigo-400">下軌 (支撐線):</span>
                        <strong>${activeBollinger.currentLower}</strong>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-800 text-[10px] text-slate-400">
                        <span>通道帶寬 (Bandwidth):</span>
                        <span className="text-slate-200">{activeBollinger.currentBandwidth}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: VWAP Anchor */}
                  <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px] mb-1 font-sans">
                      成交量加權平均價 (VWAP)
                    </span>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-fuchsia-400">VWAP 均價線:</span>
                        <strong className="text-fuchsia-300 text-sm">${activeVWAP.currentVWAP}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">現價相對於 VWAP:</span>
                        <strong className={activeVWAP.priceVsVWAPPct >= 0 ? 'text-red-400' : 'text-emerald-400'}>
                          {activeVWAP.priceVsVWAPPct >= 0 ? '+' : ''}{activeVWAP.priceVsVWAPPct}%
                        </strong>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                        <span>籌碼控盤方向:</span>
                        <span className="text-slate-200">{activeVWAP.priceVsVWAPPct >= 0 ? '多方量價溢價控盤' : '空方折價壓制'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Confluence Tactical Insight */}
                  <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800 flex flex-col justify-between font-sans">
                    <span className="text-slate-400 block text-[10px] mb-1">
                      雙指標支撐壓力實戰診斷
                    </span>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {price >= activeBollinger.currentUpper
                        ? '🔥 突破布林上軌且處於 VWAP 上方：強勢多頭加速攻擊，短線注意上軌乖離是否過大，不宜盲目追價。'
                        : price <= activeBollinger.currentLower
                        ? '🛡️ 跌破布林下軌且低於 VWAP：技術面嚴重超跌，密切留意下軌支撐回測，若放量回補有望發動強彈。'
                        : price >= activeVWAP.currentVWAP
                        ? `📈 位於 VWAP ($${activeVWAP.currentVWAP}) 之上並於布林中上軌運行：中軌與 VWAP 形成雙重下檔強支撐，拉回可伺機切入。`
                        : `📉 位於 VWAP ($${activeVWAP.currentVWAP}) 之下且於中下軌弱勢震盪：反彈面臨 VWAP 均價線反壓，需等待突破確認。`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* CHART 2: KD (9, 3, 3) SUB-CHART (When KD Selector is Enabled) */}
            {showKD && (
              <div className="w-full overflow-hidden bg-slate-950/90 rounded-xl border border-slate-800 p-3 relative">
                {/* KD Sub-chart Header */}
                <div className="flex flex-wrap items-center justify-between text-xs mb-2 gap-2">
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-slate-200 flex items-center">
                      <Zap className="w-3.5 h-3.5 text-cyan-400 mr-1" />
                      KD (9, 3, 3) 隨機擺盪指標
                    </span>
                    <span className="flex items-center font-mono text-[11px] text-amber-400">
                      <span className="w-2.5 h-0.5 bg-amber-400 mr-1 rounded" />
                      %K: {inspectedData.k}
                    </span>
                    <span className="flex items-center font-mono text-[11px] text-sky-400">
                      <span className="w-2.5 h-0.5 bg-sky-400 mr-1 rounded" />
                      %D: {inspectedData.d}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                      超買(80) / 多空(50) / 超賣(20)
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                      activeKD.signal === 'golden_cross'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                        : activeKD.signal === 'death_cross'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : activeKD.signal === 'overbought'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : activeKD.signal === 'oversold'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {activeKD.signalLabel}
                    </span>
                  </div>
                </div>

                {/* KD SVG Canvas */}
                <svg viewBox={`0 0 ${svgWidth} ${kdSvgHeight}`} className="w-full h-24 select-none">
                  {/* Overbought shaded zone (80 to 100) */}
                  <rect
                    x={padding.left}
                    y={getKdY(100)}
                    width={chartW}
                    height={getKdY(80) - getKdY(100)}
                    fill="#ef4444"
                    opacity="0.08"
                  />
                  {/* Oversold shaded zone (0 to 20) */}
                  <rect
                    x={padding.left}
                    y={getKdY(20)}
                    width={chartW}
                    height={getKdY(0) - getKdY(20)}
                    fill="#10b981"
                    opacity="0.08"
                  />

                  {/* 80 Line */}
                  <line
                    x1={padding.left}
                    y1={getKdY(80)}
                    x2={svgWidth - padding.right}
                    y2={getKdY(80)}
                    stroke="#ef4444"
                    strokeDasharray="3,3"
                    strokeOpacity="0.4"
                  />
                  <text
                    x={padding.left - 6}
                    y={getKdY(80) + 3}
                    fill="#f87171"
                    fontSize="9"
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    80
                  </text>

                  {/* 50 Center Line */}
                  <line
                    x1={padding.left}
                    y1={getKdY(50)}
                    x2={svgWidth - padding.right}
                    y2={getKdY(50)}
                    stroke="#475569"
                    strokeDasharray="2,2"
                    strokeOpacity="0.5"
                  />
                  <text
                    x={padding.left - 6}
                    y={getKdY(50) + 3}
                    fill="#64748b"
                    fontSize="9"
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    50
                  </text>

                  {/* 20 Line */}
                  <line
                    x1={padding.left}
                    y1={getKdY(20)}
                    x2={svgWidth - padding.right}
                    y2={getKdY(20)}
                    stroke="#10b981"
                    strokeDasharray="3,3"
                    strokeOpacity="0.4"
                  />
                  <text
                    x={padding.left - 6}
                    y={getKdY(20) + 3}
                    fill="#34d399"
                    fontSize="9"
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    20
                  </text>

                  {/* %K Line */}
                  <polyline
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={activeKD.k
                      .map((val, idx) => {
                        const x = chartMode === 'intraday' ? getIntradayX(idx) : getKlineX(idx);
                        return `${x},${getKdY(val)}`;
                      })
                      .join(' ')}
                  />

                  {/* %D Line */}
                  <polyline
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={activeKD.d
                      .map((val, idx) => {
                        const x = chartMode === 'intraday' ? getIntradayX(idx) : getKlineX(idx);
                        return `${x},${getKdY(val)}`;
                      })
                      .join(' ')}
                  />

                  {/* KD Divergence Trendline Overlay (When KD fails to make new high) */}
                  {showDivergence && modeDivergence.kdDivergence && (() => {
                    const x1 =
                      chartMode === 'intraday'
                        ? getIntradayX(modeDivergence.prevPeakIndex)
                        : getKlineX(modeDivergence.prevPeakIndex);
                    const y1 = getKdY(modeDivergence.prevPeakK);
                    const x2 =
                      chartMode === 'intraday'
                        ? getIntradayX(modeDivergence.currPeakIndex)
                        : getKlineX(modeDivergence.currPeakIndex);
                    const y2 = getKdY(modeDivergence.currPeakK);
                    return (
                      <g>
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke="#fbbf24"
                          strokeWidth="1.8"
                          strokeDasharray="4,3"
                        />
                        <circle cx={x1} cy={y1} r="3.5" fill="#fbbf24" />
                        <circle cx={x2} cy={y2} r="3.5" fill="#fbbf24" />
                        <text
                          x={(x1 + x2) / 2}
                          y={Math.max(12, Math.min(y1, y2) - 4)}
                          fill="#fde68a"
                          fontSize="9"
                          fontWeight="bold"
                          textAnchor="middle"
                          fontFamily="monospace"
                        >
                          KD未創高↘ ({modeDivergence.prevPeakK} → {modeDivergence.currPeakK}) 潛在背離
                        </text>
                      </g>
                    );
                  })()}

                  {/* Crosshair on KD chart */}
                  {currentHover !== null && (
                    <g>
                      <line
                        x1={chartMode === 'intraday' ? getIntradayX(currentHover) : getKlineX(currentHover)}
                        y1={15}
                        x2={chartMode === 'intraday' ? getIntradayX(currentHover) : getKlineX(currentHover)}
                        y2={15 + kdH}
                        stroke="#f8fafc"
                        strokeWidth="1.2"
                        strokeDasharray="3,3"
                        opacity="0.85"
                      />
                      <circle
                        cx={chartMode === 'intraday' ? getIntradayX(currentHover) : getKlineX(currentHover)}
                        cy={getKdY(inspectedData.k)}
                        r="3.5"
                        fill="#f59e0b"
                      />
                      <circle
                        cx={chartMode === 'intraday' ? getIntradayX(currentHover) : getKlineX(currentHover)}
                        cy={getKdY(inspectedData.d)}
                        r="3.5"
                        fill="#38bdf8"
                      />
                    </g>
                  )}
                </svg>
              </div>
            )}

            {/* CHART 3: MACD (12, 26, 9) SUB-CHART (When MACD Selector is Enabled) */}
            {showMACD && (
              <div className="w-full overflow-hidden bg-slate-950/90 rounded-xl border border-slate-800 p-3 relative">
                {/* MACD Sub-chart Header */}
                <div className="flex flex-wrap items-center justify-between text-xs mb-2 gap-2">
                  <div className="flex flex-wrap items-center space-x-2 sm:space-x-3 gap-y-1">
                    <span className="font-bold text-slate-200 flex items-center">
                      <Sliders className="w-3.5 h-3.5 text-purple-400 mr-1" />
                      {chartMode === 'intraday' ? '分時 MACD (6, 13, 5)' : 'MACD (12, 26, 9) 指數平滑異同'}
                    </span>
                    <span className="flex items-center font-mono text-[11px] text-amber-400">
                      <span className="w-2.5 h-0.5 bg-amber-400 mr-1 rounded" />
                      DIF: {inspectedData.dif}
                    </span>
                    <span className="flex items-center font-mono text-[11px] text-sky-400">
                      <span className="w-2.5 h-0.5 bg-sky-400 mr-1 rounded" />
                      MACD: {inspectedData.macd}
                    </span>
                    <span className="flex items-center font-mono text-[11px]">
                      <span className={`w-2 h-2 mr-1 rounded-sm ${inspectedData.osc >= 0 ? 'bg-red-500' : 'bg-emerald-500'}`} />
                      <span className={inspectedData.osc >= 0 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                        OSC: {inspectedData.osc >= 0 ? `+${inspectedData.osc}` : inspectedData.osc}
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                      快線(DIF) / 慢線(DEM) / 柱體(OSC)
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                      activeMACD.signal === 'golden_cross'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                        : activeMACD.signal === 'death_cross'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : activeMACD.signal === 'bullish_expand'
                        ? 'bg-red-500/10 text-red-300 border border-red-500/30'
                        : activeMACD.signal === 'bullish_shrink'
                        ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                        : activeMACD.signal === 'bearish_expand'
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                        : 'bg-teal-500/10 text-teal-300 border border-teal-500/30'
                    }`}>
                      {activeMACD.signalLabel}
                    </span>
                  </div>
                </div>

                {/* MACD SVG Canvas */}
                <svg 
                  viewBox={`0 0 ${svgWidth} ${macdSvgHeight}`} 
                  className="w-full h-24 select-none"
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const relX = (e.clientX - rect.left) / rect.width;
                    const svgX = relX * svgWidth;
                    const activeW = chartW;
                    const clampedX = Math.max(0, Math.min(activeW, svgX - padding.left));
                    const idx = Math.round((clampedX / activeW) * (activeLength - 1));
                    setHoverIndex(idx);
                  }}
                >
                  {/* Upper Boundary Line */}
                  <line
                    x1={padding.left}
                    y1={getMacdY(maxMacdVal * 0.75)}
                    x2={svgWidth - padding.right}
                    y2={getMacdY(maxMacdVal * 0.75)}
                    stroke="#475569"
                    strokeDasharray="2,2"
                    strokeOpacity="0.4"
                  />
                  <text
                    x={padding.left - 6}
                    y={getMacdY(maxMacdVal * 0.75) + 3}
                    fill="#64748b"
                    fontSize="9"
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    +{Number((maxMacdVal * 0.75).toFixed(1))}
                  </text>

                  {/* 0.0 Center Baseline */}
                  <line
                    x1={padding.left}
                    y1={macdZeroY}
                    x2={svgWidth - padding.right}
                    y2={macdZeroY}
                    stroke="#64748b"
                    strokeWidth="1.2"
                    strokeDasharray="3,3"
                    strokeOpacity="0.75"
                  />
                  <text
                    x={padding.left - 6}
                    y={macdZeroY + 3}
                    fill="#94a3b8"
                    fontSize="9"
                    textAnchor="end"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    0.0
                  </text>

                  {/* Lower Boundary Line */}
                  <line
                    x1={padding.left}
                    y1={getMacdY(-maxMacdVal * 0.75)}
                    x2={svgWidth - padding.right}
                    y2={getMacdY(-maxMacdVal * 0.75)}
                    stroke="#475569"
                    strokeDasharray="2,2"
                    strokeOpacity="0.4"
                  />
                  <text
                    x={padding.left - 6}
                    y={getMacdY(-maxMacdVal * 0.75) + 3}
                    fill="#64748b"
                    fontSize="9"
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    -{Number((maxMacdVal * 0.75).toFixed(1))}
                  </text>

                  {/* OSC Histogram Bars */}
                  {activeMACD.osc.map((oscVal, idx) => {
                    const x = chartMode === 'intraday' ? getIntradayX(idx) : getKlineX(idx);
                    const barWidth = Math.max(2, Math.min(8, (chartW / activeLength) * 0.6));
                    const isBullish = oscVal >= 0;
                    const topY = isBullish ? getMacdY(oscVal) : macdZeroY;
                    const height = Math.max(1.2, Math.abs(getMacdY(oscVal) - macdZeroY));
                    const isHovered = currentHover === idx;

                    return (
                      <rect
                        key={idx}
                        x={x - barWidth / 2}
                        y={topY}
                        width={barWidth}
                        height={height}
                        fill={isBullish ? '#ef4444' : '#10b981'}
                        opacity={isHovered ? 1 : 0.82}
                        rx="0.5"
                      />
                    );
                  })}

                  {/* DIF (快線) Polyline */}
                  <polyline
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={activeMACD.dif
                      .map((val, idx) => {
                        const x = chartMode === 'intraday' ? getIntradayX(idx) : getKlineX(idx);
                        return `${x},${getMacdY(val)}`;
                      })
                      .join(' ')}
                  />

                  {/* MACD / DEM (慢線) Polyline */}
                  <polyline
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={activeMACD.macd
                      .map((val, idx) => {
                        const x = chartMode === 'intraday' ? getIntradayX(idx) : getKlineX(idx);
                        return `${x},${getMacdY(val)}`;
                      })
                      .join(' ')}
                  />

                  {/* MACD Divergence Trendline Overlay (When MACD fails to make new high) */}
                  {showDivergence && modeDivergence.macdDivergence && (() => {
                    const x1 =
                      chartMode === 'intraday'
                        ? getIntradayX(modeDivergence.prevPeakIndex)
                        : getKlineX(modeDivergence.prevPeakIndex);
                    const y1 = getMacdY(modeDivergence.prevPeakDIF);
                    const x2 =
                      chartMode === 'intraday'
                        ? getIntradayX(modeDivergence.currPeakIndex)
                        : getKlineX(modeDivergence.currPeakIndex);
                    const y2 = getMacdY(modeDivergence.currPeakDIF);
                    return (
                      <g>
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke="#fbbf24"
                          strokeWidth="1.8"
                          strokeDasharray="4,3"
                        />
                        <circle cx={x1} cy={y1} r="3.5" fill="#fbbf24" />
                        <circle cx={x2} cy={y2} r="3.5" fill="#fbbf24" />
                        <text
                          x={(x1 + x2) / 2}
                          y={Math.max(12, Math.min(y1, y2) - 4)}
                          fill="#fde68a"
                          fontSize="9"
                          fontWeight="bold"
                          textAnchor="middle"
                          fontFamily="monospace"
                        >
                          MACD未創高↘ (DIF {modeDivergence.prevPeakDIF} → {modeDivergence.currPeakDIF}) 潛在背離
                        </text>
                      </g>
                    );
                  })()}

                  {/* Crosshair on MACD chart */}
                  {currentHover !== null && (
                    <g>
                      <line
                        x1={chartMode === 'intraday' ? getIntradayX(currentHover) : getKlineX(currentHover)}
                        y1={15}
                        x2={chartMode === 'intraday' ? getIntradayX(currentHover) : getKlineX(currentHover)}
                        y2={15 + macdH}
                        stroke="#f8fafc"
                        strokeWidth="1.2"
                        strokeDasharray="3,3"
                        opacity="0.85"
                      />
                      <circle
                        cx={chartMode === 'intraday' ? getIntradayX(currentHover) : getKlineX(currentHover)}
                        cy={getMacdY(inspectedData.dif)}
                        r="3.5"
                        fill="#f59e0b"
                      />
                      <circle
                        cx={chartMode === 'intraday' ? getIntradayX(currentHover) : getKlineX(currentHover)}
                        cy={getMacdY(inspectedData.macd)}
                        r="3.5"
                        fill="#38bdf8"
                      />
                    </g>
                  )}
                </svg>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: 大小單能量分布圖 */}
        {activeTab === 'orderFlow' && (
          <div className="space-y-6">
            <div className="text-xs text-slate-400">
              三竹專屬大小單多空力道矩陣：以委託筆數與撮合張數精準劃分「特大單、大單、中單、散單」意向。
            </div>

            <div className="space-y-4">
              {[
                { name: '特大單 (>50張 / >500萬)', buy: orderFlow.superLargeBuy, sell: orderFlow.superLargeSell, net: orderFlow.superLargeNet, tag: '主力核心手筆' },
                { name: '大單 (10~50張)', buy: orderFlow.largeBuy, sell: orderFlow.largeSell, net: orderFlow.largeNet, tag: '法人與大戶' },
                { name: '中單 (3~10張)', buy: orderFlow.mediumBuy, sell: orderFlow.mediumSell, net: orderFlow.mediumNet, tag: '中實戶與積極短線' },
                { name: '散單小單 (1~2張)', buy: orderFlow.smallBuy, sell: orderFlow.smallSell, net: orderFlow.smallNet, tag: '一般散戶小額' },
              ].map((row, idx) => {
                const total = row.buy + row.sell || 1;
                const buyPct = Number(((row.buy / total) * 100).toFixed(1));
                const sellPct = Number(((row.sell / total) * 100).toFixed(1));

                return (
                  <div key={idx} className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs mb-2 gap-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-200">{row.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {row.tag}
                        </span>
                      </div>
                      <div className="font-mono text-xs flex items-center space-x-3">
                        <span className="text-red-400">買進: {row.buy.toLocaleString()} 張</span>
                        <span className="text-emerald-400">賣出: {row.sell.toLocaleString()} 張</span>
                        <span className={`font-bold ${row.net >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          差額: {row.net >= 0 ? '+' : ''}{row.net.toLocaleString()} 張
                        </span>
                      </div>
                    </div>

                    {/* Dual bar for Buy vs Sell */}
                    <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
                      <div
                        className="bg-red-500 flex items-center justify-start pl-2 text-[10px] font-bold text-white transition-all duration-500"
                        style={{ width: `${buyPct}%` }}
                      >
                        {buyPct > 15 ? `${buyPct}%` : ''}
                      </div>
                      <div
                        className="bg-emerald-500 flex items-center justify-end pr-2 text-[10px] font-bold text-white transition-all duration-500"
                        style={{ width: `${sellPct}%` }}
                      >
                        {sellPct > 15 ? `${sellPct}%` : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: 法人進出軌跡柱狀圖 */}
        {activeTab === 'institutional' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>近期 10 日三大法人買賣超柱狀圖 (外資 + 投信 + 自營商)</span>
              <div className="flex items-center space-x-3 text-[11px]">
                <span className="flex items-center"><span className="w-2.5 h-2.5 rounded bg-blue-500 mr-1" /> 外資</span>
                <span className="flex items-center"><span className="w-2.5 h-2.5 rounded bg-amber-500 mr-1" /> 投信</span>
                <span className="flex items-center"><span className="w-2.5 h-2.5 rounded bg-purple-500 mr-1" /> 自營商</span>
              </div>
            </div>

            <div className="h-64 flex items-end justify-between gap-2 pt-6 pb-2 px-4 bg-slate-950/80 rounded-xl border border-slate-800">
              {institutionalHistory.map((item, idx) => {
                const maxVal = 15000;
                const totalH = Math.min(100, Math.max(10, (Math.abs(item.total) / maxVal) * 90));
                const isNetBuy = item.total >= 0;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] p-1.5 rounded pointer-events-none whitespace-nowrap z-20 shadow-lg border border-slate-700">
                      <div>合計: {item.total >= 0 ? '+' : ''}{item.total} 張</div>
                      <div>外資: {item.foreign} | 投信: {item.trust}</div>
                    </div>

                    <div
                      className={`w-full max-w-[28px] rounded-t-sm transition-all duration-300 ${
                        isNetBuy ? 'bg-gradient-to-t from-red-600 to-red-400' : 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                      }`}
                      style={{ height: `${totalH}%` }}
                    />
                    <span className="text-[10px] font-mono text-slate-400 mt-2">{item.date}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: 本益比河流圖 */}
        {activeTab === 'peBand' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>歷史本益比河流圖 (P/E River Bands)</span>
              <span className="text-slate-300">目前本益比: <strong className="text-amber-400 font-mono">{stock.pe} 倍</strong></span>
            </div>

            <div className="bg-slate-950/80 p-5 rounded-xl border border-slate-800 space-y-3">
              {[
                { label: '32x 本益比天花板 (極昂貴)', price: peBands.pe32, color: 'bg-red-500/20 text-red-300 border-red-500/30' },
                { label: '28x 本益比高估區 (獲利了結)', price: peBands.pe28, color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
                { label: '24x 本益比合理偏高', price: peBands.pe24, color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
                { label: '20x 本益比合理估值中軸', price: peBands.pe20, color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
                { label: '16x 本益比安全邊際區 (嚴重低估)', price: peBands.pe16, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
              ].map((band, idx) => {
                const isCurrentInside = price >= (band.price * 0.92) && (idx === 0 || price < (band.price * 1.08));
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-xl border ${band.color} ${
                      isCurrentInside ? 'ring-2 ring-white/50 shadow-md' : 'opacity-85'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold">{band.label}</span>
                      {isCurrentInside && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-slate-950 font-black animate-pulse">
                          現價位階落在本區間
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-sm font-bold">${band.price.toFixed(1)} 元</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: 五檔即時報價 */}
        {activeTab === 'orderBook' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>三竹即時五檔委託買賣盤深</span>
              <div className="font-mono">
                外盤量: <span className="text-red-400 font-bold">{orderBook.outerVolume.toLocaleString()}</span> (
                {((orderBook.outerVolume / (orderBook.outerVolume + orderBook.innerVolume)) * 100).toFixed(1)}%) | 
                內盤量: <span className="text-emerald-400 font-bold ml-1">{orderBook.innerVolume.toLocaleString()}</span>
              </div>
            </div>

            {/* Inner / Outer Bar */}
            <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
              <div
                className="bg-red-500 transition-all duration-300"
                style={{
                  width: `${(orderBook.outerVolume / (orderBook.outerVolume + orderBook.innerVolume)) * 100}%`,
                }}
              />
              <div
                className="bg-emerald-500 transition-all duration-300"
                style={{
                  width: `${(orderBook.innerVolume / (orderBook.outerVolume + orderBook.innerVolume)) * 100}%`,
                }}
              />
            </div>

            {/* Bid / Ask Table */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              {/* Bids 買盤 */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <div className="text-slate-400 font-bold mb-2 flex justify-between">
                  <span>買盤委託</span>
                  <span>掛單量 (張)</span>
                </div>
                <div className="space-y-1.5">
                  {orderBook.bids.map((b, i) => (
                    <div key={i} className="flex justify-between items-center text-red-400">
                      <span>買{i + 1}: ${b.price.toFixed(1)}</span>
                      <span className="font-bold text-slate-200">{b.volume}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Asks 賣盤 */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <div className="text-slate-400 font-bold mb-2 flex justify-between">
                  <span>賣盤委託</span>
                  <span>掛單量 (張)</span>
                </div>
                <div className="space-y-1.5">
                  {orderBook.asks.map((a, i) => (
                    <div key={i} className="flex justify-between items-center text-emerald-400">
                      <span>賣{i + 1}: ${a.price.toFixed(1)}</span>
                      <span className="font-bold text-slate-200">{a.volume}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
