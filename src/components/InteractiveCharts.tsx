import React, { useState, useMemo } from 'react';
import * as d3 from 'd3';
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
  TrendingDown,
  Crosshair,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  RotateCcw
} from 'lucide-react';
import { StockData, IntradayTick } from '../types/stock';
import { 
  generateDailyCandles, 
  generateDailyKLineByDateRange,
  getDefaultKlineDateRange,
  formatIsoDate,
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
  DateRangeKLinePackage,
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
  const [activeTab, setActiveTab] = useState<'intraday' | 'majorTrajectory' | 'orderFlow' | 'institutional' | 'peBand' | 'orderBook'>('intraday');

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

  // Daily K-Line Custom Date Range State (可輸入日期區間後顯示日K技術圖)
  const defaultKlineRange = useMemo(() => getDefaultKlineDateRange(35), []);
  const [klineStartInput, setKlineStartInput] = useState<string>(defaultKlineRange.startDate);
  const [klineEndInput, setKlineEndInput] = useState<string>(defaultKlineRange.endDate);
  const [appliedKlineRange, setAppliedKlineRange] = useState<{
    startDate: string;
    endDate: string;
  }>(defaultKlineRange);
  const [activeKlinePreset, setActiveKlinePreset] = useState<
    '2W' | '1M' | '35D' | '3M' | '6M' | 'YTD' | 'CUSTOM'
  >('35D');

  const handleApplyKlineDateRange = (
    rawStart = klineStartInput,
    rawEnd = klineEndInput,
    preset: '2W' | '1M' | '35D' | '3M' | '6M' | 'YTD' | 'CUSTOM' = 'CUSTOM'
  ) => {
    const fallback = getDefaultKlineDateRange(35);
    const s = rawStart || fallback.startDate;
    const e = rawEnd || fallback.endDate;
    const [normStart, normEnd] = s <= e ? [s, e] : [e, s];
    setKlineStartInput(normStart);
    setKlineEndInput(normEnd);
    setAppliedKlineRange({ startDate: normStart, endDate: normEnd });
    setActiveKlinePreset(preset);
    setChartMode('kline');
    setHoverIndex(null);
  };

  const handleSelectKlinePreset = (preset: '2W' | '1M' | '35D' | '3M' | '6M' | 'YTD') => {
    if (preset === 'YTD') {
      const now = new Date();
      const startDate = `${now.getFullYear()}-01-01`;
      const endDate = formatIsoDate(now);
      handleApplyKlineDateRange(startDate, endDate, 'YTD');
      return;
    }
    const daysMap: Record<'2W' | '1M' | '35D' | '3M' | '6M', number> = {
      '2W': 10,
      '1M': 22,
      '35D': 35,
      '3M': 65,
      '6M': 130,
    };
    const range = getDefaultKlineDateRange(daysMap[preset]);
    handleApplyKlineDateRange(range.startDate, range.endDate, preset);
  };

  // Crosshair hover inspection
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Major Player Trajectory Perspective (主力軌跡透視) Interactive State
  const [majorHoverIndex, setMajorHoverIndex] = useState<number | null>(null);
  const [showMajorCost5d, setShowMajorCost5d] = useState<boolean>(true);
  const [showSignalZones, setShowSignalZones] = useState<boolean>(true);
  const [showSignalMarkers, setShowSignalMarkers] = useState<boolean>(true);
  const [biasThreshold, setBiasThreshold] = useState<5 | 8>(5);

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

  // 1. Daily Candles & Indicators (Driven by User-Specified Date Range [startDate, endDate])
  const klinePackage = useMemo<DateRangeKLinePackage>(
    () =>
      generateDailyKLineByDateRange(
        stock,
        appliedKlineRange.startDate,
        appliedKlineRange.endDate
      ),
    [stock, appliedKlineRange.startDate, appliedKlineRange.endDate]
  );

  const dailyCandles = klinePackage.candles;
  const dailyMA5 = klinePackage.ma5;
  const dailyMA20 = klinePackage.ma20;
  const dailyMA60 = klinePackage.ma60;
  const dailyKD = klinePackage.kd;
  const dailyMACD = klinePackage.macd;
  const dailyBollinger = klinePackage.bollinger;
  const dailyVWAP = klinePackage.vwap;

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
        label: candle.fullDate ? `${candle.fullDate} (${candle.date})` : candle.date,
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

  // --- 4. Major Player Cost Trajectory & Bias Ratio (主力軌跡透視 D3 數據與幾何計算) ---
  const majorTrajectoryData = useMemo(() => {
    const n = dailyCandles.length;
    if (n === 0) return [];

    // Raw 20-day rolling volume-weighted cost approximation
    const rawCost20: number[] = [];
    const rawCost5: number[] = [];

    for (let i = 0; i < n; i++) {
      const start20 = Math.max(0, i - 19);
      let volSum20 = 0;
      let pvSum20 = 0;
      for (let j = start20; j <= i; j++) {
        const c = dailyCandles[j];
        const typical = (c.high + c.low + c.close * 2) / 4;
        // Weight days with strong volume more heavily to reflect major player cost
        const w = Math.pow(Math.max(100, c.volume), 1.12);
        volSum20 += w;
        pvSum20 += typical * w;
      }
      rawCost20.push(volSum20 > 0 ? pvSum20 / volSum20 : dailyCandles[i].close);

      const start5 = Math.max(0, i - 4);
      let volSum5 = 0;
      let pvSum5 = 0;
      for (let j = start5; j <= i; j++) {
        const c = dailyCandles[j];
        const typical = (c.high + c.low + c.close * 2) / 4;
        const w = Math.pow(Math.max(100, c.volume), 1.15);
        volSum5 += w;
        pvSum5 += typical * w;
      }
      rawCost5.push(volSum5 > 0 ? pvSum5 / volSum5 : dailyCandles[i].close);
    }

    // Anchor the final day's 20D major cost line to stock.majorCost so all panels stay 100% consistent
    const lastRaw20 = rawCost20[n - 1] || stock.majorCost || price;
    const scaleRatio = (stock.majorCost || price) / lastRaw20;

    return dailyCandles.map((c, idx) => {
      const isLast = idx === n - 1;
      const closePrice = isLast ? price : c.close;
      const cost20 = Number((rawCost20[idx] * scaleRatio).toFixed(2));
      const cost5 = Number((rawCost5[idx] * scaleRatio).toFixed(2));
      const biasPct = Number((((closePrice - cost20) / (cost20 || 1)) * 100).toFixed(2));
      const bias5dPct = Number((((closePrice - cost5) / (cost5 || 1)) * 100).toFixed(2));

      // Estimate daily major net buy/sell lots (張)
      const prevClose = idx > 0 ? dailyCandles[idx - 1].close : c.open;
      const priceDeltaRatio = (closePrice - prevClose) / (prevClose || 1);
      const baseNetLots = Math.round(
        (c.volume * 0.22 * (priceDeltaRatio >= 0 ? 1 : -1) * (0.65 + Math.min(1.5, Math.abs(priceDeltaRatio) * 28))) +
          (stock.majorAccumulation / 20) * 0.35
      );

      // Classify Signal Zone (主力進出訊號區間)
      // 1. overheated: 高檔正乖離調節區 (乖離 >= +biasThreshold%)
      // 2. breakout: 突破成本加碼區 (乖離 +1.5% ~ +biasThreshold% 且短線5日成本 >= 20日成本)
      // 3. accumulation: 主力低檔吸籌區 (乖離 -biasThreshold% ~ +1.5% 且在成本線附近築底/吸籌)
      // 4. defense: 跌破成本警戒區 (乖離 < -biasThreshold% 或重挫破線)
      let zoneKey: 'accumulation' | 'breakout' | 'overheated' | 'defense' = 'accumulation';
      let zoneLabel = '主力低檔吸籌區';
      let zoneAction = '逢低分批佈局・沿成本線吸籌';

      if (biasPct >= biasThreshold) {
        zoneKey = 'overheated';
        zoneLabel = '正乖離過熱調節區';
        zoneAction = '高檔正乖離擴大・提防主力逢高調節';
      } else if (biasPct <= -biasThreshold) {
        zoneKey = 'defense';
        zoneLabel = '負乖離超跌/破線區';
        zoneAction = '跌破主力防守區・等待止穩訊號';
      } else if (biasPct >= 1.2 && closePrice >= cost5) {
        zoneKey = 'breakout';
        zoneLabel = '突破成本拉抬加碼區';
        zoneAction = '站穩主力成本線之上・多頭波段順勢加碼';
      } else {
        zoneKey = 'accumulation';
        zoneLabel = '主力成本吸籌防守區';
        zoneAction = '貼近主力均價成本・洗盤換手支撐強';
      }

      // Detect discrete entry/exit signal markers on key inflection days
      let signalType: 'buy_entry' | 'breakout_add' | 'profit_trim' | 'cost_defend' | null = null;
      let signalText = '';

      if (idx >= 2) {
        const prevCost20 = Number((rawCost20[idx - 1] * scaleRatio).toFixed(2));
        const prevBias = ((dailyCandles[idx - 1].close - prevCost20) / (prevCost20 || 1)) * 100;

        if (prevBias < 0 && biasPct >= 0.3 && baseNetLots > 0) {
          signalType = 'breakout_add';
          signalText = '突破成本加碼';
        } else if (biasPct >= biasThreshold && prevBias < biasThreshold) {
          signalType = 'profit_trim';
          signalText = '正乖離調節';
        } else if (biasPct <= -biasThreshold * 0.65 && baseNetLots > 0 && closePrice > c.open) {
          signalType = 'buy_entry';
          signalText = '主力低接吸籌';
        } else if (Math.abs(biasPct) <= 0.85 && prevBias > 1.2 && closePrice >= cost20) {
          signalType = 'cost_defend';
          signalText = '回測成本有守';
        }
      }

      return {
        index: idx,
        date: c.date,
        close: closePrice,
        high: c.high,
        low: c.low,
        volume: c.volume,
        majorCost: cost20,
        majorCost5d: cost5,
        biasPct,
        bias5dPct,
        netMajorLots: baseNetLots,
        zoneKey,
        zoneLabel,
        zoneAction,
        signalType,
        signalText,
      };
    });
  }, [dailyCandles, stock.majorCost, stock.majorAccumulation, price, biasThreshold]);

  // Group contiguous signal zones into horizontal span intervals for D3 background zone bands
  const contiguousSignalZones = useMemo(() => {
    if (majorTrajectoryData.length === 0) return [];
    const spans: Array<{
      startIdx: number;
      endIdx: number;
      zoneKey: 'accumulation' | 'breakout' | 'overheated' | 'defense';
      zoneLabel: string;
    }> = [];

    let current = {
      startIdx: 0,
      endIdx: 0,
      zoneKey: majorTrajectoryData[0].zoneKey,
      zoneLabel: majorTrajectoryData[0].zoneLabel,
    };

    for (let i = 1; i < majorTrajectoryData.length; i++) {
      const item = majorTrajectoryData[i];
      if (item.zoneKey === current.zoneKey) {
        current.endIdx = i;
      } else {
        spans.push(current);
        current = {
          startIdx: i,
          endIdx: i,
          zoneKey: item.zoneKey,
          zoneLabel: item.zoneLabel,
        };
      }
    }
    spans.push(current);
    return spans;
  }, [majorTrajectoryData]);

  // D3 Scales & Path Generators for Major Trajectory Perspective
  const d3TrajectoryLayout = useMemo(() => {
    const width = 800;
    const priceHeight = 250;
    const biasHeight = 145;
    const pad = { top: 24, right: 48, bottom: 26, left: 58 };
    const innerW = width - pad.left - pad.right;
    const innerPriceH = priceHeight - pad.top - pad.bottom;
    const innerBiasH = biasHeight - 20 - 24;

    const count = Math.max(1, majorTrajectoryData.length);
    const xScale = d3
      .scaleLinear()
      .domain([0, Math.max(1, count - 1)])
      .range([pad.left, pad.left + innerW]);

    const allPriceValues = majorTrajectoryData.flatMap((d) => [
      d.close,
      d.majorCost,
      d.majorCost5d,
      d.majorCost * (1 + biasThreshold / 100),
      d.majorCost * (1 - biasThreshold / 100),
    ]);
    const [minP = price * 0.9, maxP = price * 1.1] = d3.extent(allPriceValues);
    const pricePad = (maxP - minP || 1) * 0.08;

    const yPriceScale = d3
      .scaleLinear()
      .domain([minP - pricePad, maxP + pricePad])
      .range([pad.top + innerPriceH, pad.top]);

    const maxAbsBias = Math.max(
      biasThreshold * 1.45,
      ...majorTrajectoryData.map((d) => Math.abs(d.biasPct) * 1.15),
      6
    );

    const yBiasScale = d3
      .scaleLinear()
      .domain([-maxAbsBias, maxAbsBias])
      .range([20 + innerBiasH, 20]);

    // D3 Line Generators
    const closeLineGen = d3
      .line<(typeof majorTrajectoryData)[0]>()
      .x((_, i) => xScale(i))
      .y((d) => yPriceScale(d.close))
      .curve(d3.curveMonotoneX);

    const cost20LineGen = d3
      .line<(typeof majorTrajectoryData)[0]>()
      .x((_, i) => xScale(i))
      .y((d) => yPriceScale(d.majorCost))
      .curve(d3.curveMonotoneX);

    const cost5LineGen = d3
      .line<(typeof majorTrajectoryData)[0]>()
      .x((_, i) => xScale(i))
      .y((d) => yPriceScale(d.majorCost5d))
      .curve(d3.curveMonotoneX);

    // Upper & Lower Signal Band Paths (+biasThreshold% overheated band & -biasThreshold% accumulation band)
    const upperThresholdBandGen = d3
      .line<(typeof majorTrajectoryData)[0]>()
      .x((_, i) => xScale(i))
      .y((d) => yPriceScale(d.majorCost * (1 + biasThreshold / 100)))
      .curve(d3.curveMonotoneX);

    const lowerThresholdBandGen = d3
      .line<(typeof majorTrajectoryData)[0]>()
      .x((_, i) => xScale(i))
      .y((d) => yPriceScale(d.majorCost * (1 - biasThreshold / 100)))
      .curve(d3.curveMonotoneX);

    // D3 Area between Price and Major Cost Line
    const spreadAreaGen = d3
      .area<(typeof majorTrajectoryData)[0]>()
      .x((_, i) => xScale(i))
      .y0((d) => yPriceScale(d.majorCost))
      .y1((d) => yPriceScale(d.close))
      .curve(d3.curveMonotoneX);

    // D3 Bias Ratio Curve & Area Generator
    const biasLineGen = d3
      .line<(typeof majorTrajectoryData)[0]>()
      .x((_, i) => xScale(i))
      .y((d) => yBiasScale(d.biasPct))
      .curve(d3.curveMonotoneX);

    const biasAreaGen = d3
      .area<(typeof majorTrajectoryData)[0]>()
      .x((_, i) => xScale(i))
      .y0(() => yBiasScale(0))
      .y1((d) => yBiasScale(d.biasPct))
      .curve(d3.curveMonotoneX);

    return {
      width,
      priceHeight,
      biasHeight,
      pad,
      innerW,
      innerPriceH,
      innerBiasH,
      xScale,
      yPriceScale,
      yBiasScale,
      maxAbsBias,
      closePath: closeLineGen(majorTrajectoryData) || '',
      cost20Path: cost20LineGen(majorTrajectoryData) || '',
      cost5Path: cost5LineGen(majorTrajectoryData) || '',
      upperBandPath: upperThresholdBandGen(majorTrajectoryData) || '',
      lowerBandPath: lowerThresholdBandGen(majorTrajectoryData) || '',
      spreadAreaPath: spreadAreaGen(majorTrajectoryData) || '',
      biasLinePath: biasLineGen(majorTrajectoryData) || '',
      biasAreaPath: biasAreaGen(majorTrajectoryData) || '',
      priceTicks: yPriceScale.ticks(5),
      biasTicks: [-biasThreshold, 0, biasThreshold],
    };
  }, [majorTrajectoryData, biasThreshold, price]);

  const inspectedMajorPoint = useMemo(() => {
    if (majorTrajectoryData.length === 0) return null;
    const idx =
      majorHoverIndex !== null && majorHoverIndex >= 0 && majorHoverIndex < majorTrajectoryData.length
        ? majorHoverIndex
        : majorTrajectoryData.length - 1;
    return majorTrajectoryData[idx];
  }, [majorTrajectoryData, majorHoverIndex]);

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
            onClick={() => setActiveTab('majorTrajectory')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'majorTrajectory'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-amber-300/90 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>主力軌跡透視</span>
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
          {/* Chart Mode Toggle (分時 vs 日K) + Inline Date Range Trigger */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
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
                type="button"
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
                <span>日K技術線 (區間查詢)</span>
              </button>
            </div>

            {/* Quick Inline Date Range Picker & "顯示日K技術圖" Trigger */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800">
              <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-[11px] text-slate-300 font-semibold">日K區間：</span>
              <input
                type="date"
                aria-label="日K起始日期"
                value={klineStartInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setKlineStartInput(val);
                  if (val && klineEndInput) {
                    const [s, end] = val <= klineEndInput ? [val, klineEndInput] : [klineEndInput, val];
                    setAppliedKlineRange({ startDate: s, endDate: end });
                    setActiveKlinePreset('CUSTOM');
                  }
                }}
                className="bg-slate-950 text-slate-200 font-mono text-[11px] px-2 py-0.5 rounded border border-slate-700 focus:border-blue-500 focus:outline-none"
              />
              <span className="text-slate-500 font-mono">~</span>
              <input
                type="date"
                aria-label="日K結束日期"
                value={klineEndInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setKlineEndInput(val);
                  if (klineStartInput && val) {
                    const [s, end] = klineStartInput <= val ? [klineStartInput, val] : [val, klineStartInput];
                    setAppliedKlineRange({ startDate: s, endDate: end });
                    setActiveKlinePreset('CUSTOM');
                  }
                }}
                className="bg-slate-950 text-slate-200 font-mono text-[11px] px-2 py-0.5 rounded border border-slate-700 focus:border-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleApplyKlineDateRange(klineStartInput, klineEndInput, 'CUSTOM')}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-sm transition-all cursor-pointer"
                title="根據輸入的起始與結束日期，產生並顯示日K技術圖"
              >
                <Search className="w-3 h-3" />
                <span>顯示日K技術圖</span>
              </button>
            </div>
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
            {/* DAILY K-LINE DATE RANGE CONTROL & PERIOD SUMMARY PANEL (Visible in 日K技術線 mode) */}
            {chartMode === 'kline' && (
              <div className="bg-gradient-to-r from-slate-950 via-blue-950/25 to-slate-950 rounded-xl p-3.5 sm:p-4 border border-blue-500/30 shadow-md space-y-3">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                  {/* Left: Date Range Inputs + Action Button */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center space-x-1.5 mr-1">
                      <span className="p-1.5 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-400">
                        <Calendar className="w-4 h-4" />
                      </span>
                      <div>
                        <div className="text-xs font-extrabold text-slate-100 flex items-center space-x-1.5">
                          <span>日K技術線・日期區間設定</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">
                            共 {klinePackage.tradingDaysCount} 個交易日
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          輸入起始與結束日期後，點擊「顯示日K技術圖」即可繪製指定區間之日K線與技術指標
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-lg border border-slate-800">
                      <label className="flex items-center space-x-1 text-[11px] text-slate-400 pl-1">
                        <span>起始日:</span>
                        <input
                          type="date"
                          value={klineStartInput}
                          onChange={(e) => {
                            const val = e.target.value;
                            setKlineStartInput(val);
                            if (val && klineEndInput) {
                              const [s, end] =
                                val <= klineEndInput
                                  ? [val, klineEndInput]
                                  : [klineEndInput, val];
                              setAppliedKlineRange({ startDate: s, endDate: end });
                              setActiveKlinePreset('CUSTOM');
                            }
                          }}
                          className="bg-slate-950 text-slate-100 font-mono text-xs px-2 py-1 rounded border border-slate-700 focus:border-blue-500 focus:outline-none"
                        />
                      </label>

                      <span className="text-slate-500 font-bold px-0.5">至</span>

                      <label className="flex items-center space-x-1 text-[11px] text-slate-400">
                        <span>結束日:</span>
                        <input
                          type="date"
                          value={klineEndInput}
                          onChange={(e) => {
                            const val = e.target.value;
                            setKlineEndInput(val);
                            if (klineStartInput && val) {
                              const [s, end] =
                                klineStartInput <= val
                                  ? [klineStartInput, val]
                                  : [val, klineStartInput];
                              setAppliedKlineRange({ startDate: s, endDate: end });
                              setActiveKlinePreset('CUSTOM');
                            }
                          }}
                          className="bg-slate-950 text-slate-100 font-mono text-xs px-2 py-1 rounded border border-slate-700 focus:border-blue-500 focus:outline-none"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() =>
                          handleApplyKlineDateRange(klineStartInput, klineEndInput, 'CUSTOM')
                        }
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-extrabold bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>顯示日K技術圖</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSelectKlinePreset('35D')}
                        title="重置為預設近35個交易日區間"
                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/70 transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Right: Quick Period Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 font-semibold mr-1">
                      快速區間：
                    </span>
                    {(
                      [
                        { id: '2W', label: '近2週 (10日)' },
                        { id: '1M', label: '近1個月 (22日)' },
                        { id: '35D', label: '近35日 (預設)' },
                        { id: '3M', label: '近3個月 (季線)' },
                        { id: '6M', label: '近半年 (130日)' },
                        { id: 'YTD', label: '今年以來 (YTD)' },
                      ] as const
                    ).map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectKlinePreset(preset.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          activeKlinePreset === preset.id
                            ? 'bg-blue-600 text-white border border-blue-400/60 shadow-sm'
                            : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Period Quantitative Summary Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-800/80 text-xs font-mono">
                  <div className="bg-slate-900/75 px-3 py-1.5 rounded-lg border border-slate-800/90">
                    <span className="text-[10px] text-slate-400 block font-sans">生效日期區間</span>
                    <span className="text-slate-200 font-bold text-[11px]">
                      {klinePackage.effectiveStartDate} ~ {klinePackage.effectiveEndDate}
                    </span>
                  </div>
                  <div className="bg-slate-900/75 px-3 py-1.5 rounded-lg border border-slate-800/90">
                    <span className="text-[10px] text-slate-400 block font-sans">區間累計漲跌</span>
                    <span
                      className={`font-extrabold ${
                        klinePackage.periodChange >= 0 ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      {klinePackage.periodChange >= 0 ? '+' : ''}
                      {klinePackage.periodChange} ({klinePackage.periodChangePct >= 0 ? '+' : ''}
                      {klinePackage.periodChangePct}%)
                    </span>
                  </div>
                  <div className="bg-slate-900/75 px-3 py-1.5 rounded-lg border border-slate-800/90">
                    <span className="text-[10px] text-slate-400 block font-sans">區間最高價</span>
                    <span className="text-red-400 font-bold">${klinePackage.periodHigh}</span>
                  </div>
                  <div className="bg-slate-900/75 px-3 py-1.5 rounded-lg border border-slate-800/90">
                    <span className="text-[10px] text-slate-400 block font-sans">區間最低價</span>
                    <span className="text-emerald-400 font-bold">${klinePackage.periodLow}</span>
                  </div>
                  <div className="bg-slate-900/75 px-3 py-1.5 rounded-lg border border-slate-800/90 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-400 block font-sans">區間總成交量</span>
                    <span className="text-amber-300 font-bold">
                      {klinePackage.totalVolume.toLocaleString()} 張
                    </span>
                  </div>
                </div>
              </div>
            )}

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

                {/* MODE B: 日K線走勢圖 (依輸入日期區間動態繪製) */}
                {chartMode === 'kline' && (
                  <g>
                    {/* Render Candlesticks for Selected Date Range */}
                    {dailyCandles.map((c, idx) => {
                      const x = getKlineX(idx);
                      const candleW = Math.max(
                        2.2,
                        Math.min(14, (chartW / Math.max(1, dailyCandles.length)) * 0.62)
                      );
                      const col = c.isUp ? '#ef4444' : '#10b981';
                      const topY = getKlineY(Math.max(c.open, c.close));
                      const bottomY = getKlineY(Math.min(c.open, c.close));
                      const bodyH = Math.max(2, bottomY - topY);
                      const highY = getKlineY(c.high);
                      const lowY = getKlineY(c.low);

                      const volH = (c.volume / maxDailyVol) * 40;
                      const volY = padding.top + chartH - volH;

                      return (
                        <g key={c.fullDate || idx}>
                          {/* Candlestick Wick */}
                          <line
                            x1={x}
                            y1={highY}
                            x2={x}
                            y2={lowY}
                            stroke={col}
                            strokeWidth={dailyCandles.length > 90 ? '1' : '1.4'}
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

                    {/* Adaptive K-Line Date Axis Labels */}
                    {(() => {
                      const labelStep = Math.max(1, Math.ceil(dailyCandles.length / 7));
                      return dailyCandles
                        .map((c, originalIndex) => ({ c, originalIndex }))
                        .filter(
                          ({ originalIndex }) =>
                            originalIndex % labelStep === 0 ||
                            originalIndex === dailyCandles.length - 1
                        )
                        .map(({ c, originalIndex }) => (
                          <text
                            key={c.fullDate || originalIndex}
                            x={getKlineX(originalIndex)}
                            y={mainSvgHeight - 6}
                            fill="#64748b"
                            fontSize="10"
                            textAnchor="middle"
                            fontFamily="monospace"
                          >
                            {c.date}
                          </text>
                        ));
                    })()}
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

        {/* TAB 6: 主力軌跡透視 (D3 Major Cost Line vs Price & Bias Ratio Visualization) */}
        {activeTab === 'majorTrajectory' && inspectedMajorPoint && (
          <div className="space-y-4">
            {/* Top Control Bar & Summary Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Crosshair className="w-4 h-4 text-amber-400" />
                  <span className="text-xs sm:text-sm font-bold text-white">
                    D3 主力成本軌跡與乖離率透視圖 (35日動態籌碼推演)
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      inspectedMajorPoint.zoneKey === 'breakout'
                        ? 'bg-red-500/20 text-red-300 border-red-500/40'
                        : inspectedMajorPoint.zoneKey === 'overheated'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : inspectedMajorPoint.zoneKey === 'accumulation'
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    當前區間：{inspectedMajorPoint.zoneLabel}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  以 D3.js 曲線擬合近 35 日「主力 20 日均價成本線」與「成交價」之動態乖離率，自動標示主力低接吸籌、突破加碼與高檔過熱調節區間。
                </p>
              </div>

              {/* Layer & Threshold Controls */}
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <button
                  onClick={() => setShowMajorCost5d(!showMajorCost5d)}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg border font-bold transition-all ${
                    showMajorCost5d
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                      : 'bg-slate-900 text-slate-500 border-slate-800'
                  }`}
                >
                  <Check className="w-3 h-3" />
                  <span>5日短線成本線</span>
                </button>

                <button
                  onClick={() => setShowSignalZones(!showSignalZones)}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg border font-bold transition-all ${
                    showSignalZones
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-900 text-slate-500 border-slate-800'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>訊號區間底色帶</span>
                </button>

                <button
                  onClick={() => setShowSignalMarkers(!showSignalMarkers)}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg border font-bold transition-all ${
                    showSignalMarkers
                      ? 'bg-red-500/20 text-red-300 border-red-500/40'
                      : 'bg-slate-900 text-slate-500 border-slate-800'
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  <span>進出訊號標記</span>
                </button>

                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                  <button
                    onClick={() => setBiasThreshold(5)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                      biasThreshold === 5 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ±5% 敏感閾值
                  </button>
                  <button
                    onClick={() => setBiasThreshold(8)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                      biasThreshold === 8 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ±8% 波段閾值
                  </button>
                </div>
              </div>
            </div>

            {/* Real-time / Hover Inspected Data Readout Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-slate-950/90 p-3 rounded-xl border border-slate-800/90 text-xs font-mono">
              <div className="bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800/70">
                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>檢視日期 / 現價</span>
                  <span className="text-sky-400">{majorHoverIndex === null ? '最新即時' : '游標鎖定'}</span>
                </div>
                <div className="text-sm font-bold text-white mt-0.5">
                  {inspectedMajorPoint.date} <span className="text-sky-400 ml-1">${inspectedMajorPoint.close.toFixed(1)}</span>
                </div>
              </div>

              <div className="bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800/70">
                <div className="text-[10px] text-slate-400">主力20日成本線</div>
                <div className="text-sm font-bold text-amber-400 mt-0.5">
                  ${inspectedMajorPoint.majorCost.toFixed(2)}
                  <span className="text-[10px] text-purple-300 ml-1.5">
                    (5日: ${inspectedMajorPoint.majorCost5d.toFixed(1)})
                  </span>
                </div>
              </div>

              <div className="bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800/70">
                <div className="text-[10px] text-slate-400">主力成本乖離率</div>
                <div
                  className={`text-sm font-bold mt-0.5 flex items-center ${
                    inspectedMajorPoint.biasPct >= 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {inspectedMajorPoint.biasPct >= 0 ? (
                    <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                  )}
                  {inspectedMajorPoint.biasPct >= 0 ? '+' : ''}
                  {inspectedMajorPoint.biasPct.toFixed(2)}%
                </div>
              </div>

              <div className="bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800/70">
                <div className="text-[10px] text-slate-400">當日主力淨買賣推估</div>
                <div
                  className={`text-sm font-bold mt-0.5 ${
                    inspectedMajorPoint.netMajorLots >= 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {inspectedMajorPoint.netMajorLots >= 0 ? '+' : ''}
                  {inspectedMajorPoint.netMajorLots.toLocaleString()} 張
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1 bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800/70 font-sans">
                <div className="text-[10px] text-slate-400">主力操作意圖判讀</div>
                <div className="text-xs font-bold text-slate-200 mt-0.5 truncate" title={inspectedMajorPoint.zoneAction}>
                  {inspectedMajorPoint.zoneAction}
                </div>
              </div>
            </div>

            {/* PANEL 1: D3 Price vs Major Cost Line & Signal Zones */}
            <div className="bg-slate-950/90 rounded-xl border border-slate-800 p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] px-1">
                <div className="flex items-center space-x-3">
                  <span className="font-bold text-slate-200 flex items-center">
                    <Scale className="w-3.5 h-3.5 text-amber-400 mr-1" />
                    成交價 vs 主力成本線軌跡 (含主力進出訊號區間)
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[10px]">
                  <span className="flex items-center text-sky-300">
                    <span className="w-3 h-0.5 bg-sky-400 mr-1" /> 成交價走勢
                  </span>
                  <span className="flex items-center text-amber-300">
                    <span className="w-3 h-0.5 bg-amber-400 mr-1" /> 20日主力成本線
                  </span>
                  {showMajorCost5d && (
                    <span className="flex items-center text-purple-300">
                      <span className="w-3 h-0.5 border-b border-dashed border-purple-400 mr-1" /> 5日主力成本
                    </span>
                  )}
                  <span className="flex items-center text-red-300">
                    <span className="w-2.5 h-2.5 rounded-sm bg-red-500/25 border border-red-500/50 mr-1" /> 突破加碼區
                  </span>
                  <span className="flex items-center text-sky-300">
                    <span className="w-2.5 h-2.5 rounded-sm bg-sky-500/20 border border-sky-500/40 mr-1" /> 低檔吸籌區
                  </span>
                  <span className="flex items-center text-amber-300">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/20 border border-amber-500/40 mr-1" /> 正乖離調節區
                  </span>
                </div>
              </div>

              <div className="relative w-full overflow-hidden">
                <svg
                  viewBox={`0 0 ${d3TrajectoryLayout.width} ${d3TrajectoryLayout.priceHeight}`}
                  className="w-full h-auto select-none cursor-crosshair"
                  onMouseLeave={() => setMajorHoverIndex(null)}
                >
                  <defs>
                    <linearGradient id="majorSpreadGain" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.05" />
                    </linearGradient>
                    <linearGradient id="biasPositiveGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0.05" />
                    </linearGradient>
                  </defs>

                  {/* Background Contiguous Signal Zone Regime Bands */}
                  {showSignalZones &&
                    contiguousSignalZones.map((span, idx) => {
                      const x1 = d3TrajectoryLayout.xScale(Math.max(0, span.startIdx - 0.45));
                      const x2 = d3TrajectoryLayout.xScale(
                        Math.min(majorTrajectoryData.length - 1, span.endIdx + 0.45)
                      );
                      const w = Math.max(4, x2 - x1);
                      const fillMap = {
                        breakout: 'rgba(239, 68, 68, 0.09)',
                        overheated: 'rgba(245, 158, 11, 0.12)',
                        accumulation: 'rgba(56, 189, 248, 0.08)',
                        defense: 'rgba(16, 185, 129, 0.09)',
                      };
                      const badgeColorMap = {
                        breakout: '#fca5a5',
                        overheated: '#fcd34d',
                        accumulation: '#7dd3fc',
                        defense: '#6ee7b7',
                      };

                      return (
                        <g key={idx}>
                          <rect
                            x={x1}
                            y={d3TrajectoryLayout.pad.top}
                            width={w}
                            height={d3TrajectoryLayout.innerPriceH}
                            fill={fillMap[span.zoneKey]}
                          />
                          {w > 78 && (
                            <text
                              x={x1 + w / 2}
                              y={d3TrajectoryLayout.pad.top + 12}
                              textAnchor="middle"
                              fill={badgeColorMap[span.zoneKey]}
                              fontSize="9"
                              fontWeight="bold"
                              opacity="0.85"
                            >
                              {span.zoneLabel}
                            </text>
                          )}
                        </g>
                      );
                    })}

                  {/* Horizontal Price Grid Lines */}
                  {d3TrajectoryLayout.priceTicks.map((tickVal, idx) => {
                    const y = d3TrajectoryLayout.yPriceScale(tickVal);
                    return (
                      <g key={idx}>
                        <line
                          x1={d3TrajectoryLayout.pad.left}
                          y1={y}
                          x2={d3TrajectoryLayout.width - d3TrajectoryLayout.pad.right}
                          y2={y}
                          stroke="#1e293b"
                          strokeDasharray="3,3"
                        />
                        <text
                          x={d3TrajectoryLayout.pad.left - 8}
                          y={y + 3}
                          textAnchor="end"
                          fill="#64748b"
                          fontSize="10"
                          fontFamily="monospace"
                        >
                          ${tickVal.toFixed(0)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Overheated (+biasThreshold%) and Accumulation (-biasThreshold%) Dynamic Envelope Lines */}
                  {showSignalZones && (
                    <>
                      <path
                        d={d3TrajectoryLayout.upperBandPath}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="1"
                        strokeDasharray="4,4"
                        opacity="0.55"
                      />
                      <path
                        d={d3TrajectoryLayout.lowerBandPath}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="1"
                        strokeDasharray="4,4"
                        opacity="0.55"
                      />
                    </>
                  )}

                  {/* Shaded Spread Area between Closing Price and 20D Major Cost Line */}
                  <path d={d3TrajectoryLayout.spreadAreaPath} fill="url(#majorSpreadGain)" />

                  {/* 5D Short-Term Major Cost Line */}
                  {showMajorCost5d && (
                    <path
                      d={d3TrajectoryLayout.cost5Path}
                      fill="none"
                      stroke="#c084fc"
                      strokeWidth="1.6"
                      strokeDasharray="3,3"
                      opacity="0.9"
                    />
                  )}

                  {/* 20D Core Major Cost Line (主力成本線) */}
                  <path
                    d={d3TrajectoryLayout.cost20Path}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                  />

                  {/* Closing / Current Price Line (當前成交價走勢) */}
                  <path
                    d={d3TrajectoryLayout.closePath}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.4"
                  />

                  {/* Discrete Entry / Exit Signal Markers on Key Inflection Days */}
                  {showSignalMarkers &&
                    majorTrajectoryData.map((d, i) => {
                      if (!d.signalType) return null;
                      const cx = d3TrajectoryLayout.xScale(i);
                      const cy = d3TrajectoryLayout.yPriceScale(d.close);
                      const isBullish =
                        d.signalType === 'buy_entry' ||
                        d.signalType === 'breakout_add' ||
                        d.signalType === 'cost_defend';
                      const markerColor =
                        d.signalType === 'profit_trim'
                          ? '#f59e0b'
                          : d.signalType === 'breakout_add'
                          ? '#ef4444'
                          : '#38bdf8';

                      return (
                        <g key={`sig-${i}`}>
                          <circle
                            cx={cx}
                            cy={cy}
                            r="4.5"
                            fill={markerColor}
                            stroke="#0f172a"
                            strokeWidth="1.5"
                          />
                          <g transform={`translate(${cx}, ${isBullish ? cy + 16 : cy - 12})`}>
                            <rect
                              x="-30"
                              y="-8"
                              width="60"
                              height="14"
                              rx="3"
                              fill="#0f172a"
                              stroke={markerColor}
                              strokeWidth="0.9"
                              opacity="0.92"
                            />
                            <text
                              x="0"
                              y="2"
                              textAnchor="middle"
                              fill={markerColor}
                              fontSize="8.5"
                              fontWeight="bold"
                            >
                              {d.signalText}
                            </text>
                          </g>
                        </g>
                      );
                    })}

                  {/* X-axis Date Labels */}
                  {majorTrajectoryData.map((d, i) => {
                    if (i % 6 !== 0 && i !== majorTrajectoryData.length - 1) return null;
                    const x = d3TrajectoryLayout.xScale(i);
                    return (
                      <text
                        key={i}
                        x={x}
                        y={d3TrajectoryLayout.priceHeight - 6}
                        textAnchor="middle"
                        fill="#64748b"
                        fontSize="10"
                        fontFamily="monospace"
                      >
                        {d.date}
                      </text>
                    );
                  })}

                  {/* Active Crosshair on Upper Price vs Major Cost Chart */}
                  {inspectedMajorPoint && (
                    <g>
                      <line
                        x1={d3TrajectoryLayout.xScale(inspectedMajorPoint.index)}
                        y1={d3TrajectoryLayout.pad.top}
                        x2={d3TrajectoryLayout.xScale(inspectedMajorPoint.index)}
                        y2={d3TrajectoryLayout.pad.top + d3TrajectoryLayout.innerPriceH}
                        stroke="#f8fafc"
                        strokeWidth="1.1"
                        strokeDasharray="3,3"
                        opacity="0.8"
                      />
                      <circle
                        cx={d3TrajectoryLayout.xScale(inspectedMajorPoint.index)}
                        cy={d3TrajectoryLayout.yPriceScale(inspectedMajorPoint.close)}
                        r="4.5"
                        fill="#38bdf8"
                        stroke="#0f172a"
                        strokeWidth="1.5"
                      />
                      <circle
                        cx={d3TrajectoryLayout.xScale(inspectedMajorPoint.index)}
                        cy={d3TrajectoryLayout.yPriceScale(inspectedMajorPoint.majorCost)}
                        r="4.5"
                        fill="#f59e0b"
                        stroke="#0f172a"
                        strokeWidth="1.5"
                      />
                    </g>
                  )}

                  {/* Interactive Hover Hit Columns */}
                  {majorTrajectoryData.map((_, i) => {
                    const colW = d3TrajectoryLayout.innerW / Math.max(1, majorTrajectoryData.length);
                    const x = d3TrajectoryLayout.xScale(i) - colW / 2;
                    return (
                      <rect
                        key={`hit-top-${i}`}
                        x={x}
                        y={d3TrajectoryLayout.pad.top}
                        width={colW}
                        height={d3TrajectoryLayout.innerPriceH}
                        fill="transparent"
                        onMouseEnter={() => setMajorHoverIndex(i)}
                      />
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* PANEL 2: D3 Bias Ratio % (主力成本乖離率走勢圖) */}
            <div className="bg-slate-950/90 rounded-xl border border-slate-800 p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] px-1">
                <span className="font-bold text-slate-200 flex items-center">
                  <Activity className="w-3.5 h-3.5 text-red-400 mr-1" />
                  主力成本乖離率走勢圖 (Bias Ratio = (成交價 - 主力成本) ÷ 主力成本)
                </span>
                <div className="flex items-center space-x-3 text-[10px] font-mono">
                  <span className="text-amber-400">+{biasThreshold}% 正乖離過熱線</span>
                  <span className="text-slate-400">0% 成本基準軸</span>
                  <span className="text-emerald-400">-{biasThreshold}% 負乖離低接線</span>
                </div>
              </div>

              <div className="relative w-full overflow-hidden">
                <svg
                  viewBox={`0 0 ${d3TrajectoryLayout.width} ${d3TrajectoryLayout.biasHeight}`}
                  className="w-full h-auto select-none cursor-crosshair"
                  onMouseLeave={() => setMajorHoverIndex(null)}
                >
                  {/* Reference Lines: +biasThreshold%, 0%, -biasThreshold% */}
                  {d3TrajectoryLayout.biasTicks.map((val, idx) => {
                    const y = d3TrajectoryLayout.yBiasScale(val);
                    const isZero = val === 0;
                    const strokeColor = isZero ? '#475569' : val > 0 ? '#f59e0b' : '#10b981';
                    return (
                      <g key={idx}>
                        <line
                          x1={d3TrajectoryLayout.pad.left}
                          y1={y}
                          x2={d3TrajectoryLayout.width - d3TrajectoryLayout.pad.right}
                          y2={y}
                          stroke={strokeColor}
                          strokeWidth={isZero ? '1.3' : '1'}
                          strokeDasharray={isZero ? undefined : '4,4'}
                          opacity={isZero ? '0.9' : '0.65'}
                        />
                        <text
                          x={d3TrajectoryLayout.pad.left - 8}
                          y={y + 3}
                          textAnchor="end"
                          fill={strokeColor}
                          fontSize="9.5"
                          fontFamily="monospace"
                        >
                          {val > 0 ? `+${val}%` : `${val}%`}
                        </text>
                      </g>
                    );
                  })}

                  {/* Daily Bias Histogram Bars */}
                  {majorTrajectoryData.map((d, i) => {
                    const x = d3TrajectoryLayout.xScale(i);
                    const zeroY = d3TrajectoryLayout.yBiasScale(0);
                    const valY = d3TrajectoryLayout.yBiasScale(d.biasPct);
                    const barW = Math.max(4, (d3TrajectoryLayout.innerW / majorTrajectoryData.length) * 0.52);
                    const yTop = Math.min(zeroY, valY);
                    const barH = Math.max(1.5, Math.abs(valY - zeroY));
                    const fill =
                      d.biasPct >= biasThreshold
                        ? '#f59e0b'
                        : d.biasPct >= 0
                        ? '#ef4444'
                        : d.biasPct <= -biasThreshold
                        ? '#38bdf8'
                        : '#10b981';

                    return (
                      <rect
                        key={`bias-bar-${i}`}
                        x={x - barW / 2}
                        y={yTop}
                        width={barW}
                        height={barH}
                        rx="1.5"
                        fill={fill}
                        opacity={inspectedMajorPoint.index === i ? '0.95' : '0.45'}
                      />
                    );
                  })}

                  {/* Smooth D3 Bias Curve */}
                  <path
                    d={d3TrajectoryLayout.biasAreaPath}
                    fill="url(#biasPositiveGrad)"
                    opacity="0.35"
                  />
                  <path
                    d={d3TrajectoryLayout.biasLinePath}
                    fill="none"
                    stroke="#f8fafc"
                    strokeWidth="1.8"
                  />

                  {/* Crosshair on Bias Chart */}
                  {inspectedMajorPoint && (
                    <g>
                      <line
                        x1={d3TrajectoryLayout.xScale(inspectedMajorPoint.index)}
                        y1={20}
                        x2={d3TrajectoryLayout.xScale(inspectedMajorPoint.index)}
                        y2={20 + d3TrajectoryLayout.innerBiasH}
                        stroke="#f8fafc"
                        strokeWidth="1.1"
                        strokeDasharray="3,3"
                      />
                      <circle
                        cx={d3TrajectoryLayout.xScale(inspectedMajorPoint.index)}
                        cy={d3TrajectoryLayout.yBiasScale(inspectedMajorPoint.biasPct)}
                        r="4"
                        fill={inspectedMajorPoint.biasPct >= 0 ? '#ef4444' : '#10b981'}
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    </g>
                  )}

                  {/* Interactive Hover Hit Columns */}
                  {majorTrajectoryData.map((_, i) => {
                    const colW = d3TrajectoryLayout.innerW / Math.max(1, majorTrajectoryData.length);
                    const x = d3TrajectoryLayout.xScale(i) - colW / 2;
                    return (
                      <rect
                        key={`hit-bias-${i}`}
                        x={x}
                        y={20}
                        width={colW}
                        height={d3TrajectoryLayout.innerBiasH}
                        fill="transparent"
                        onMouseEnter={() => setMajorHoverIndex(i)}
                      />
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Signal Zones Action Guide Matrix (主力進出訊號區間實戰對照表) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  key: 'accumulation',
                  title: '主力低檔吸籌區',
                  rangeText: `$${(stock.majorCost * (1 - biasThreshold / 100)).toFixed(1)} ~ $${(
                    stock.majorCost * 1.012
                  ).toFixed(1)}`,
                  biasRule: `乖離率 -${biasThreshold}% ~ +1.2%`,
                  desc: '股價貼近主力 20 日均價成本線，大戶暗中吃貨護盤，下檔具備籌碼鐵板支撐。',
                  color: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
                },
                {
                  key: 'breakout',
                  title: '突破成本加碼區',
                  rangeText: `$${(stock.majorCost * 1.012).toFixed(1)} ~ $${(
                    stock.majorCost *
                    (1 + biasThreshold / 100)
                  ).toFixed(1)}`,
                  biasRule: `乖離率 +1.2% ~ +${biasThreshold}%`,
                  desc: '現價帶量脫離主力成本區且 5 日成本向上發散，屬於主升段點火順勢加碼訊號。',
                  color: 'border-red-500/40 bg-red-500/10 text-red-300',
                },
                {
                  key: 'overheated',
                  title: '正乖離過熱調節區',
                  rangeText: `≥ $${(stock.majorCost * (1 + biasThreshold / 100)).toFixed(1)}`,
                  biasRule: `乖離率 ≥ +${biasThreshold}%`,
                  desc: '短線漲幅遠高於主力持倉成本，主力獲利豐厚易引發逢高分批調節與技術面修正。',
                  color: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
                },
                {
                  key: 'defense',
                  title: '跌破成本警戒區',
                  rangeText: `≤ $${(stock.majorCost * (1 - biasThreshold / 100)).toFixed(1)}`,
                  biasRule: `乖離率 ≤ -${biasThreshold}%`,
                  desc: '股價跌破主力核心持倉成本防線，短線轉為套牢壓力或極度超跌，宜待止穩訊號。',
                  color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
                },
              ].map((zone) => {
                const latestPoint = majorTrajectoryData[majorTrajectoryData.length - 1];
                const isCurrent = latestPoint?.zoneKey === zone.key;
                return (
                  <div
                    key={zone.key}
                    className={`p-3.5 rounded-xl border transition-all ${zone.color} ${
                      isCurrent ? 'ring-2 ring-white/60 shadow-lg' : 'opacity-85'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-extrabold flex items-center">
                        <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                        {zone.title}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-slate-950 font-black">
                          目前落點
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-xs font-bold text-white mb-0.5">{zone.rangeText}</div>
                    <div className="text-[10px] font-mono opacity-80 mb-2">{zone.biasRule}</div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">{zone.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
