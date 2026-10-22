import { StockData, IntradayTick } from '../types/stock';

export interface DailyCandle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isUp: boolean;
}

export interface TechnicalIndicatorState {
  showMA5: boolean;
  showMA20: boolean;
  showMA60: boolean;
  showKD: boolean;
  showMACD: boolean;
  chartMode: 'intraday' | 'kline';
}

export interface KDResult {
  k: number[];
  d: number[];
  currentK: number;
  currentD: number;
  signal: 'golden_cross' | 'death_cross' | 'overbought' | 'oversold' | 'bullish' | 'bearish';
  signalLabel: string;
}

export interface MACDResult {
  dif: number[];      // 快線 DIF = EMA(12) - EMA(26)
  macd: number[];     // 慢線 MACD / DEM = EMA(DIF, 9)
  osc: number[];      // 柱狀體 OSC = DIF - MACD
  currentDIF: number;
  currentMACD: number;
  currentOSC: number;
  signal: 'golden_cross' | 'death_cross' | 'bullish_expand' | 'bullish_shrink' | 'bearish_expand' | 'bearish_shrink';
  signalLabel: string;
}

/**
 * Calculate Simple Moving Average
 */
export function calculateSMA(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += values[i - j];
      }
      result.push(Number((sum / period).toFixed(2)));
    }
  }
  return result;
}

/**
 * Standard Stochastic Oscillator KD (9, 3, 3) calculation
 */
export function calculateKD(
  candles: { high: number; low: number; close: number }[],
  period = 9
): KDResult {
  const kList: number[] = [];
  const dList: number[] = [];
  let prevK = 50;
  let prevD = 50;

  for (let i = 0; i < candles.length; i++) {
    const start = Math.max(0, i - period + 1);
    const window = candles.slice(start, i + 1);
    const highest = Math.max(...window.map((c) => c.high));
    const lowest = Math.min(...window.map((c) => c.low));
    const range = highest - lowest;
    const rsv = range === 0 ? 50 : ((candles[i].close - lowest) / range) * 100;

    const k = (2 / 3) * prevK + (1 / 3) * rsv;
    const d = (2 / 3) * prevD + (1 / 3) * k;
    kList.push(Number(k.toFixed(1)));
    dList.push(Number(d.toFixed(1)));
    prevK = k;
    prevD = d;
  }

  const currentK = kList[kList.length - 1] ?? 50;
  const currentD = dList[dList.length - 1] ?? 50;
  const prevPointK = kList[kList.length - 2] ?? 50;
  const prevPointD = dList[dList.length - 2] ?? 50;

  let signal: KDResult['signal'] = 'bullish';
  let signalLabel = 'KD偏多整理';

  if (prevPointK <= prevPointD && currentK > currentD) {
    signal = 'golden_cross';
    signalLabel = currentK < 30 ? '低檔黃金交叉 (強烈買訊)' : '黃金交叉 (多頭進攻)';
  } else if (prevPointK >= prevPointD && currentK < currentD) {
    signal = 'death_cross';
    signalLabel = currentK > 70 ? '高檔死亡交叉 (逢高避險)' : '死亡交叉 (短期整理)';
  } else if (currentK >= 80) {
    signal = 'overbought';
    signalLabel = 'KD超買區 (高檔強勢鈍化)';
  } else if (currentK <= 20) {
    signal = 'oversold';
    signalLabel = 'KD超賣區 (低檔築底反彈)';
  } else if (currentK > currentD) {
    signal = 'bullish';
    signalLabel = 'KD多頭排列';
  } else {
    signal = 'bearish';
    signalLabel = 'KD空方修正';
  }

  return {
    k: kList,
    d: dList,
    currentK,
    currentD,
    signal,
    signalLabel,
  };
}

/**
 * Generate a deterministic and realistic 35-day historical daily candlestick series
 * that aligns with stock's ma5, ma20, ma60, highPrice, lowPrice and price.
 */
export function generateDailyCandles(stock: StockData, days = 35): DailyCandle[] {
  const candles: DailyCandle[] = [];
  const finalPrice = stock.price;
  const finalOpen = stock.openPrice || finalPrice;
  const finalHigh = stock.highPrice || Math.max(finalPrice, finalOpen);
  const finalLow = stock.lowPrice || Math.min(finalPrice, finalOpen);
  const finalVol = stock.volume || 10000;

  // Use a seed based on symbol character codes
  let seed = stock.symbol.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 42);
  const pseudoRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  // Base starting price 35 days ago roughly around ma60
  const startPrice = stock.ma60 ? stock.ma60 * 0.98 : finalPrice * 0.92;
  const priceDelta = finalPrice - startPrice;

  // Generate backwards or forwards
  let runningClose = startPrice;
  const today = new Date();

  // Create date strings backwards for trading days
  const tradingDates: string[] = [];
  let d = new Date(today);
  while (tradingDates.length < days) {
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      tradingDates.unshift(`${mm}/${dd}`);
    }
    d.setDate(d.getDate() - 1);
  }

  for (let i = 0; i < days; i++) {
    const isToday = i === days - 1;
    const dateStr = tradingDates[i] || `Day-${i + 1}`;

    if (isToday) {
      // Ensure the final candle reflects current stock price/high/low
      const prevMaxHigh = candles.length > 0 ? Math.max(...candles.map((c) => c.high)) : finalHigh;
      const adjustedHigh = Math.max(finalHigh, Number((prevMaxHigh * 1.008).toFixed(1)));
      candles.push({
        date: dateStr,
        open: finalOpen,
        high: adjustedHigh,
        low: finalLow,
        close: finalPrice,
        volume: finalVol,
        isUp: finalPrice >= finalOpen,
      });
      break;
    }

    const progress = i / (days - 1);
    // Create a two-wave swing structure:
    // Wave 1 surges strongly around i = 18..23 (driving KD & MACD to a high momentum peak),
    // Pullback/consolidation around i = 24..29 (cooling MACD DIF & KD),
    // Wave 2 pushes price to a new high at i = 31..34 (while KD/MACD stays below Wave 1 peak).
    let waveBias = 0;
    if (i >= 17 && i <= 23) {
      // Sharp momentum surge in Wave 1
      const wavePos = (i - 17) / 6;
      waveBias = Math.sin(wavePos * Math.PI) * (finalPrice * 0.048);
    } else if (i >= 24 && i <= 29) {
      // Consolidation pullback that resets indicator momentum
      const dipPos = (i - 24) / 5;
      waveBias = -Math.sin(dipPos * Math.PI) * (finalPrice * 0.032);
    } else if (i >= 30) {
      // Gradual grind higher into final new price high
      waveBias = ((i - 30) / 4) * (finalPrice * 0.018);
    }

    const expected = startPrice + priceDelta * Math.pow(progress, 1.05) + waveBias;
    const dayFluctuation = (pseudoRandom() - 0.48) * (finalPrice * 0.016);
    const close = Number(Math.max(1, expected + dayFluctuation).toFixed(1));
    const open = Number((close * (1 + (pseudoRandom() - 0.5) * 0.014)).toFixed(1));
    const high = Number((Math.max(open, close) * (1 + pseudoRandom() * 0.012)).toFixed(1));
    const low = Number((Math.min(open, close) * (1 - pseudoRandom() * 0.012)).toFixed(1));
    const volume = Math.floor(finalVol * (0.6 + pseudoRandom() * 0.8));

    candles.push({
      date: dateStr,
      open,
      high,
      low,
      close,
      volume,
      isUp: close >= open,
    });
    runningClose = close;
  }

  return candles;
}

/**
 * Calculate Intraday KD from ticks
 */
export function calculateIntradayKD(ticks: IntradayTick[]): KDResult {
  const candles = ticks.map((t, idx) => {
    const prevPrice = idx > 0 ? ticks[idx - 1].price : t.price;
    return {
      high: Math.max(t.price, prevPrice),
      low: Math.min(t.price, prevPrice),
      close: t.price,
    };
  });
  return calculateKD(candles, 6);
}

/**
 * Exponential Moving Average (EMA)
 */
export function calculateEMA(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const ema: number[] = [];
  let prevEma = values[0];
  ema.push(Number(prevEma.toFixed(3)));

  for (let i = 1; i < values.length; i++) {
    const curEma = values[i] * k + prevEma * (1 - k);
    ema.push(Number(curEma.toFixed(3)));
    prevEma = curEma;
  }
  return ema;
}

/**
 * Standard MACD (12, 26, 9) Calculation
 * 快線 DIF = EMA(12) - EMA(26)
 * 慢線 MACD (DEM) = EMA(DIF, 9)
 * 柱狀體 OSC = DIF - MACD
 */
export function calculateMACD(
  candles: { close: number }[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MACDResult {
  const closes = candles.map((c) => c.close);
  if (closes.length === 0) {
    return {
      dif: [],
      macd: [],
      osc: [],
      currentDIF: 0,
      currentMACD: 0,
      currentOSC: 0,
      signal: 'bullish_expand',
      signalLabel: 'MACD 資料不足',
    };
  }

  const emaFast = calculateEMA(closes, fastPeriod);
  const emaSlow = calculateEMA(closes, slowPeriod);

  const dif: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    dif.push(Number((emaFast[i] - emaSlow[i]).toFixed(2)));
  }

  const macd = calculateEMA(dif, signalPeriod).map((v) => Number(v.toFixed(2)));

  const osc: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    osc.push(Number((dif[i] - macd[i]).toFixed(2)));
  }

  const currentDIF = dif[dif.length - 1] ?? 0;
  const currentMACD = macd[macd.length - 1] ?? 0;
  const currentOSC = osc[osc.length - 1] ?? 0;

  const prevDIF = dif.length > 1 ? dif[dif.length - 2] : currentDIF;
  const prevMACD = macd.length > 1 ? macd[macd.length - 2] : currentMACD;
  const prevOSC = osc.length > 1 ? osc[osc.length - 2] : currentOSC;

  let signal: MACDResult['signal'] = 'bullish_expand';
  let signalLabel = 'MACD 多方運行';

  if (prevDIF <= prevMACD && currentDIF > currentMACD) {
    signal = 'golden_cross';
    signalLabel = currentDIF >= 0 ? '0軸上黃金交叉 (強勢多頭攻擊)' : '0軸下黃金交叉 (低檔反彈突破)';
  } else if (prevDIF >= prevMACD && currentDIF < currentMACD) {
    signal = 'death_cross';
    signalLabel = currentDIF >= 0 ? '0軸上高檔死亡交叉 (多頭獲利回吐)' : '0軸下死亡交叉 (空方加速修正)';
  } else if (currentOSC > 0) {
    if (currentOSC >= prevOSC) {
      signal = 'bullish_expand';
      signalLabel = '多頭紅柱擴大 (多方動能增強)';
    } else {
      signal = 'bullish_shrink';
      signalLabel = '多頭紅柱收斂 (多方動能趨緩)';
    }
  } else {
    if (currentOSC <= prevOSC) {
      signal = 'bearish_expand';
      signalLabel = '空頭綠柱擴大 (空方賣壓增強)';
    } else {
      signal = 'bearish_shrink';
      signalLabel = '空頭綠柱收斂 (空方力道減弱反彈在即)';
    }
  }

  return {
    dif,
    macd,
    osc,
    currentDIF,
    currentMACD,
    currentOSC,
    signal,
    signalLabel,
  };
}

/**
 * Calculate Intraday MACD from ticks with adjusted fast/slow parameters
 */
export function calculateIntradayMACD(ticks: IntradayTick[]): MACDResult {
  const candles = ticks.map((t) => ({ close: t.price }));
  // Intraday ticks use (fast: 6, slow: 13, signal: 5) for high sensitivity
  return calculateMACD(candles, 6, 13, 5);
}

export interface BollingerBandsResult {
  upper: number[];
  middle: number[];
  lower: number[];
  currentUpper: number;
  currentMiddle: number;
  currentLower: number;
  currentBandwidth: number; // (upper - lower) / middle * 100 (%)
  currentPercentB: number;  // (price - lower) / (upper - lower)
  status: 'break_upper' | 'upper_half' | 'lower_half' | 'break_lower' | 'squeeze' | 'expansion';
  statusLabel: string;
}

/**
 * Bollinger Bands (20, 2)
 */
export function calculateBollingerBands(
  candles: { close: number }[],
  period = 20,
  multiplier = 2
): BollingerBandsResult {
  const upper: number[] = [];
  const middle: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < candles.length; i++) {
    const windowStart = Math.max(0, i - period + 1);
    const windowSlice = candles.slice(windowStart, i + 1);
    const sum = windowSlice.reduce((acc, c) => acc + c.close, 0);
    const mean = sum / windowSlice.length;

    const variance = windowSlice.reduce((acc, c) => acc + Math.pow(c.close - mean, 2), 0) / windowSlice.length;
    const stdDev = Math.sqrt(variance);

    const upVal = Number((mean + multiplier * stdDev).toFixed(2));
    const midVal = Number(mean.toFixed(2));
    const lowVal = Number((mean - multiplier * stdDev).toFixed(2));

    upper.push(upVal);
    middle.push(midVal);
    lower.push(lowVal);
  }

  const lastIdx = candles.length - 1;
  const currentUpper = upper[lastIdx] ?? 0;
  const currentMiddle = middle[lastIdx] ?? 0;
  const currentLower = lower[lastIdx] ?? 0;
  const lastPrice = candles[lastIdx]?.close ?? currentMiddle;

  const width = currentUpper - currentLower;
  const currentBandwidth = currentMiddle > 0 ? Number(((width / currentMiddle) * 100).toFixed(2)) : 0;
  const currentPercentB = width > 0 ? Number(((lastPrice - currentLower) / width).toFixed(2)) : 0.5;

  let status: BollingerBandsResult['status'] = 'upper_half';
  let statusLabel = '布林通道常態中軸運行';

  if (lastPrice >= currentUpper) {
    status = 'break_upper';
    statusLabel = '突破布林上軌 (強勢超買攻擊)';
  } else if (lastPrice <= currentLower) {
    status = 'break_lower';
    statusLabel = '跌破布林下軌 (超跌支撐測試)';
  } else if (lastPrice > currentMiddle) {
    status = 'upper_half';
    statusLabel = '布林通道中上軌運行 (偏多偏強)';
  } else {
    status = 'lower_half';
    statusLabel = '布林通道中下軌運行 (偏弱整理)';
  }

  return {
    upper,
    middle,
    lower,
    currentUpper,
    currentMiddle,
    currentLower,
    currentBandwidth,
    currentPercentB,
    status,
    statusLabel,
  };
}

export function calculateIntradayBollingerBands(ticks: IntradayTick[]): BollingerBandsResult {
  const candles = ticks.map((t) => ({ close: t.price }));
  return calculateBollingerBands(candles, 15, 2);
}

export interface VWAPResult {
  values: number[];
  currentVWAP: number;
  priceVsVWAPPct: number;
  status: 'above_vwap' | 'at_vwap' | 'below_vwap';
  statusLabel: string;
}

/**
 * Volume Weighted Average Price (VWAP)
 */
export function calculateVWAP(items: { close: number; volume: number }[]): VWAPResult {
  const values: number[] = [];
  let cumPV = 0;
  let cumVol = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const vol = item.volume > 0 ? item.volume : 100;
    cumPV += item.close * vol;
    cumVol += vol;

    const vwapVal = Number((cumPV / cumVol).toFixed(2));
    values.push(vwapVal);
  }

  const lastPrice = items[items.length - 1]?.close ?? 0;
  const currentVWAP = values[values.length - 1] ?? lastPrice;
  const priceVsVWAPPct = currentVWAP > 0 ? Number((((lastPrice - currentVWAP) / currentVWAP) * 100).toFixed(2)) : 0;

  let status: VWAPResult['status'] = 'at_vwap';
  let statusLabel = '與 VWAP 均價持平';

  if (priceVsVWAPPct > 0.3) {
    status = 'above_vwap';
    statusLabel = '高於 VWAP 均價線 (多方控盤推進)';
  } else if (priceVsVWAPPct < -0.3) {
    status = 'below_vwap';
    statusLabel = '低於 VWAP 均價線 (空方承壓折價)';
  }

  return {
    values,
    currentVWAP,
    priceVsVWAPPct,
    status,
    statusLabel,
  };
}

export function calculateIntradayVWAP(ticks: IntradayTick[]): VWAPResult {
  const items = ticks.map((t) => ({ close: t.price, volume: t.volume }));
  return calculateVWAP(items);
}

export interface TechnicalDivergenceResult {
  hasDivergence: boolean;
  divergenceType: 'both' | 'kd_only' | 'macd_only' | 'none';
  badgeText: string;
  headline: string;
  summary: string;
  reversalRiskLevel: 'high' | 'medium' | 'low';
  reversalRiskLabel: string;
  prevPeakIndex: number;
  prevPeakLabel: string;
  prevPeakPrice: number;
  currPeakIndex: number;
  currPeakLabel: string;
  currPeakPrice: number;
  priceChangePct: number;
  kdDivergence: boolean;
  prevPeakK: number;
  currPeakK: number;
  kDiff: number;
  macdDivergence: boolean;
  prevPeakDIF: number;
  currPeakDIF: number;
  difDiff: number;
  prevPeakOSC: number;
  currPeakOSC: number;
  keyNecklinePrice: number;
  suggestedAction: string;
}

/**
 * 技術指標背離偵測 (Technical Indicator Divergence Detection)
 * 偵測當股價創波段新高 (或拉升創高點) 時，MACD (DIF/OSC) 或 KD (%K) 指標是否未同步創新高，
 * 藉此標示「潛在背離」警示與潛在反轉點位。
 */
export function detectTechnicalDivergence(
  series: { label: string; high: number; low: number; close: number }[],
  kd: KDResult,
  macd: MACDResult
): TechnicalDivergenceResult {
  const n = series.length;
  if (n < 6) {
    return {
      hasDivergence: false,
      divergenceType: 'none',
      badgeText: '量價指標同步',
      headline: '指標與價格同步運行',
      summary: '資料點數不足以判定波段高點背離。',
      reversalRiskLevel: 'low',
      reversalRiskLabel: '反轉風險：低',
      prevPeakIndex: 0,
      prevPeakLabel: '-',
      prevPeakPrice: 0,
      currPeakIndex: 0,
      currPeakLabel: '-',
      currPeakPrice: 0,
      priceChangePct: 0,
      kdDivergence: false,
      prevPeakK: 50,
      currPeakK: 50,
      kDiff: 0,
      macdDivergence: false,
      prevPeakDIF: 0,
      currPeakDIF: 0,
      difDiff: 0,
      prevPeakOSC: 0,
      currPeakOSC: 0,
      keyNecklinePrice: 0,
      suggestedAction: '持續觀察量價結構變化。',
    };
  }

  // Divide the series into Previous Wave Peak Window and Recent High Window
  const prevStart = Math.max(1, Math.floor(n * 0.25));
  const prevEnd = Math.max(prevStart + 1, Math.floor(n * 0.72));
  const currStart = Math.min(n - 2, Math.max(prevEnd + 1, Math.floor(n * 0.78)));

  let prevPeakIndex = prevStart;
  for (let i = prevStart; i <= prevEnd; i++) {
    if (series[i].high >= series[prevPeakIndex].high) {
      prevPeakIndex = i;
    }
  }

  let currPeakIndex = currStart;
  for (let i = currStart; i < n; i++) {
    if (series[i].high >= series[currPeakIndex].high) {
      currPeakIndex = i;
    }
  }

  const prevPeakPrice = Number(series[prevPeakIndex].high.toFixed(2));
  const currPeakPrice = Number(series[currPeakIndex].high.toFixed(2));
  const prevPeakLabel = series[prevPeakIndex].label;
  const currPeakLabel = series[currPeakIndex].label;

  // Neckline support = lowest low between prevPeakIndex and currPeakIndex
  let necklineLow = series[prevPeakIndex].low;
  for (let i = prevPeakIndex; i <= currPeakIndex; i++) {
    if (series[i].low < necklineLow) {
      necklineLow = series[i].low;
    }
  }
  const keyNecklinePrice = Number(necklineLow.toFixed(2));

  // Peak indicator readings around Peak 1 and Peak 2
  const getWindowMax = (arr: number[], center: number, radius = 1) => {
    let best = arr[center] ?? 0;
    for (let i = Math.max(0, center - radius); i <= Math.min(arr.length - 1, center + radius); i++) {
      if ((arr[i] ?? 0) > best) best = arr[i];
    }
    return best;
  };

  const prevPeakK = Number(getWindowMax(kd.k, prevPeakIndex, 1).toFixed(1));
  const currPeakK = Number((kd.k[currPeakIndex] ?? kd.currentK).toFixed(1));
  const kDiff = Number((currPeakK - prevPeakK).toFixed(1));

  const prevPeakDIF = Number(getWindowMax(macd.dif, prevPeakIndex, 1).toFixed(2));
  const currPeakDIF = Number((macd.dif[currPeakIndex] ?? macd.currentDIF).toFixed(2));
  const difDiff = Number((currPeakDIF - prevPeakDIF).toFixed(2));

  const prevPeakOSC = Number(getWindowMax(macd.osc, prevPeakIndex, 1).toFixed(2));
  const currPeakOSC = Number((macd.osc[currPeakIndex] ?? macd.currentOSC).toFixed(2));

  const priceChangePct = Number(
    (((currPeakPrice - prevPeakPrice) / Math.max(0.01, prevPeakPrice)) * 100).toFixed(2)
  );

  // Condition: Price makes a new high (currPeakPrice >= prevPeakPrice * 0.998)
  const isPriceNewHigh = currPeakPrice >= prevPeakPrice * 0.998;
  const kdDivergence = isPriceNewHigh && currPeakK < prevPeakK;
  const macdDivergence = isPriceNewHigh && (currPeakDIF < prevPeakDIF || currPeakOSC < prevPeakOSC);
  const hasDivergence = kdDivergence || macdDivergence;

  let divergenceType: TechnicalDivergenceResult['divergenceType'] = 'none';
  if (kdDivergence && macdDivergence) {
    divergenceType = 'both';
  } else if (kdDivergence) {
    divergenceType = 'kd_only';
  } else if (macdDivergence) {
    divergenceType = 'macd_only';
  }

  let badgeText = '量價指標同步';
  let headline = '股價與技術指標動能同步，暫無頂背離訊號';
  let summary = `前波高點 (${prevPeakLabel} $${prevPeakPrice}) 至近期高點 (${currPeakLabel} $${currPeakPrice}) 期間，技術指標與價格趨勢保持一致。`;
  let reversalRiskLevel: 'high' | 'medium' | 'low' = 'low';
  let reversalRiskLabel = '反轉風險：低 (動能同步)';
  let suggestedAction = `順勢沿 5 日均線與波段支撐 ($${keyNecklinePrice}) 偏多看待。`;

  if (divergenceType === 'both') {
    badgeText = '潛在背離 (KD+MACD 雙背離)';
    headline = '潛在背離警示：股價創新高，但 MACD 與 KD 指標雙雙未創新高';
    summary = `股價由前高 $${prevPeakPrice} (${prevPeakLabel}) 推升至新高 $${currPeakPrice} (${currPeakLabel}，+${priceChangePct}%)，但 KD 指標 %K 由 ${prevPeakK} 降至 ${currPeakK} (${kDiff})、MACD 快線 DIF 由 ${prevPeakDIF} 降至 ${currPeakDIF} (柱體 OSC 由 ${prevPeakOSC} 縮減至 ${currPeakOSC})，顯示追價買盤動能衰竭，高檔極易出現技術性反轉。`;
    reversalRiskLevel = 'high';
    reversalRiskLabel = '高檔反轉風險：高 (KD+MACD 共振頂背離)';
    suggestedAction = `嚴防假突破拉回，切勿追高；若跌破五日線或頸線支撐 $${keyNecklinePrice} 應立即分批停利減碼。`;
  } else if (divergenceType === 'kd_only') {
    badgeText = '潛在背離 (KD 頂背離)';
    headline = '潛在背離提示：股價創新高，但 KD 隨機指標未創新高';
    summary = `股價創波段高點 $${currPeakPrice} (高於前波 ${prevPeakLabel} 之 $${prevPeakPrice})，惟 KD 指標 %K 值僅達 ${currPeakK}，未能越過前高水位 ${prevPeakK} (差值 ${kDiff})，短線擺盪動能轉弱，須提防短線拉回修正。`;
    reversalRiskLevel = 'medium';
    reversalRiskLabel = '短線反轉風險：中高 (KD 指標高檔背離)';
    suggestedAction = `短線逢高可先行部分鎖利，留意 %K 是否向下跌破 %D 形成高檔死亡交叉，防守頸線設於 $${keyNecklinePrice}。`;
  } else if (divergenceType === 'macd_only') {
    badgeText = '潛在背離 (MACD 頂背離)';
    headline = '潛在背離提示：股價創新高，但 MACD 趨勢動能未創新高';
    summary = `股價創下 $${currPeakPrice} 新高 (前波高點 $${prevPeakPrice})，但 MACD 指標未同步創高 (DIF: ${prevPeakDIF} → ${currPeakDIF}，OSC柱體: ${prevPeakOSC} → ${currPeakOSC})，反映中期多頭推升力道遞減，留意波段轉折訊號。`;
    reversalRiskLevel = 'medium';
    reversalRiskLabel = '波段反轉風險：中高 (MACD 動能背離)';
    suggestedAction = `留意紅柱 (OSC) 持續收斂或翻綠訊號，一旦失守關鍵支撐 $${keyNecklinePrice} 易啟動波段回檔。`;
  }

  return {
    hasDivergence,
    divergenceType,
    badgeText,
    headline,
    summary,
    reversalRiskLevel,
    reversalRiskLabel,
    prevPeakIndex,
    prevPeakLabel,
    prevPeakPrice,
    currPeakIndex,
    currPeakLabel,
    currPeakPrice,
    priceChangePct,
    kdDivergence,
    prevPeakK,
    currPeakK,
    kDiff,
    macdDivergence,
    prevPeakDIF,
    currPeakDIF,
    difDiff,
    prevPeakOSC,
    currPeakOSC,
    keyNecklinePrice,
    suggestedAction,
  };
}


