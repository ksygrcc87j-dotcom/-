import { StockData } from '../types/stock';

export type MarketCorrelationQuadrant = 
  | 'counter_trend_leader'  // 逆勢突圍領頭羊 (大盤弱/震盪，主力逆勢大舉吸籌)
  | 'trend_amplifier'       // 順勢槓桿乘風者 (大盤走多，主力加倍買超放大漲幅)
  | 'market_follower'       // 順勢跟風隨波者 (籌碼動能與大盤同頻共振)
  | 'lagging_distributor';  // 弱勢背離倒貨者 (大盤上漲主力倒貨，或加速破底)

export interface DailyCorrelationPoint {
  date: string;
  dayIndex: number;
  stockPrice: number;
  stockChangePct: number;
  stockMajorNetBuy: number;       // 當日個股主力買賣超 (張)
  stockCumMajorNetBuy: number;    // 個股累計主力買賣超 (張)
  marketIndex: number;            // 加權指數收盤點數
  marketChangePct: number;        // 加權指數當日漲跌 %
  marketInstNetBuy: number;       // 大盤全市場三大法人淨買賣超 (億元)
  marketCumInstNetBuy: number;    // 大盤累計三大法人淨買賣超 (億元)
  relativeStrengthDelta: number;  // 個股漲跌幅 - 大盤漲跌幅 (%)
  chipSensitivityBeta: number;    // 當日滾動籌碼Beta
}

export interface ChipMarketCorrelationAnalysis {
  days: DailyCorrelationPoint[];
  currentStockPrice: number;
  currentMarketIndex: number;
  marketIndexChange20dPct: number;
  stockPriceChange20dPct: number;
  stockTotalCumMajorLots: number;
  marketTotalCumInstBillion: number;

  // 核心相關性與敏感度度量
  chipBeta: number;               // Beta 調整版籌碼敏感度 (e.g. 1.35x)
  chipBetaLabel: string;
  correlationCoefficient: number; // 籌碼與大盤皮爾森相關係數 (-1.0 ~ +1.0)
  correlationLabel: string;
  relativeStrengthScore: number;  // 相對大盤籌碼強度評分 (0 ~ 100)
  excessChipInflowLots: number;   // 20 日超額籌碼吸納張數 (張)
  chipAlpha: number;              // 籌碼阿法值 % (超額收益)

  // 四象限分佈與診斷
  quadrant: MarketCorrelationQuadrant;
  quadrantTitle: string;
  quadrantBadgeClass: string;
  quadrantColor: string;
  diagnosis: string;
  tacticalAdvice: string;
}

/**
 * Calculate 20-day chip flow vs market index (TAIEX) correlation & beta sensitivity
 */
export function calculateChipMarketCorrelation(stock: StockData): ChipMarketCorrelationAnalysis {
  const currentPrice = stock.price;

  // Pseudo-random deterministic generator based on symbol
  let seed = stock.symbol.split('').reduce((acc, ch) => acc + ch.charCodeAt(0) * 23, 137);
  const pseudoRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  // Generate 20 trading dates
  const tradingDates: string[] = [];
  const curr = new Date();
  const d = new Date(curr);
  while (tradingDates.length < 20) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      tradingDates.unshift(`${mm}/${dd}`);
    }
    d.setDate(d.getDate() - 1);
  }

  // Market baseline: TAIEX index around 22,500 ~ 23,200
  const currentMarketIndex = 22850 + Math.round((pseudoRandom() - 0.5) * 600);
  const marketTrend = 0.0015; // slightly upward bias

  // Simulate market daily points backwards
  const marketPoints: { index: number; changePct: number; instBillion: number }[] = [];
  let simMarket = currentMarketIndex * 0.975;
  for (let i = 0; i < 20; i++) {
    const noise = (pseudoRandom() - 0.47) * 0.012;
    const changePct = i === 0 ? 0 : Number(((marketTrend + noise) * 100).toFixed(2));
    if (i === 19) {
      simMarket = currentMarketIndex;
    } else {
      simMarket = Number((simMarket * (1 + changePct / 100)).toFixed(1));
    }
    const instNet = Math.round((changePct * 90 + (pseudoRandom() - 0.45) * 120)); // NT$ 億元
    marketPoints.push({ index: simMarket, changePct, instBillion: instNet });
  }

  // Stock simulated points
  const stockBeta = stock.beta || 1.15;
  const majorBias = (stock.majorAccumulation || 2000) > 0 ? 1 : -0.8;
  const startStockPrice = Number((currentPrice * (majorBias > 0 ? 0.93 : 1.04)).toFixed(1));

  let simStockPrice = startStockPrice;
  let cumStockMajor = 0;
  let cumMarketInst = 0;

  const days: DailyCorrelationPoint[] = [];

  for (let i = 0; i < 20; i++) {
    const mkt = marketPoints[i];
    cumMarketInst += mkt.instBillion;

    // Stock price change incorporates beta + stock alpha
    const stockAlphaNoise = (pseudoRandom() - 0.45) * 0.018 * majorBias;
    const stockDelta = i === 0 ? 0 : Number((mkt.changePct * stockBeta * 0.6 + stockAlphaNoise * 100).toFixed(2));

    if (i === 19) {
      simStockPrice = currentPrice;
    } else {
      simStockPrice = Number((simStockPrice * (1 + stockDelta / 100)).toFixed(1));
    }

    // Daily major net buy (張)
    const baseLots = Math.round(stock.volume * 0.12);
    const direction = (stockDelta * 0.4 + majorBias * 0.6 + (pseudoRandom() - 0.48) * 0.5);
    const dayLots = Math.round(baseLots * direction);
    cumStockMajor += dayLots;

    const relStrength = Number((stockDelta - mkt.changePct).toFixed(2));

    // Rolling beta estimate
    const rollingBeta = Number((stockBeta * (0.85 + pseudoRandom() * 0.3)).toFixed(2));

    days.push({
      date: tradingDates[i],
      dayIndex: i + 1,
      stockPrice: simStockPrice,
      stockChangePct: stockDelta,
      stockMajorNetBuy: dayLots,
      stockCumMajorNetBuy: cumStockMajor,
      marketIndex: mkt.index,
      marketChangePct: mkt.changePct,
      marketInstNetBuy: mkt.instBillion,
      marketCumInstNetBuy: cumMarketInst,
      relativeStrengthDelta: relStrength,
      chipSensitivityBeta: rollingBeta,
    });
  }

  // Calculate Covariance and Pearson Correlation between Stock Major Net Buy & Market Return
  let sumStockNet = 0;
  let sumMktReturn = 0;
  for (const d of days) {
    sumStockNet += d.stockMajorNetBuy;
    sumMktReturn += d.marketChangePct;
  }
  const meanStockNet = sumStockNet / 20;
  const meanMktReturn = sumMktReturn / 20;

  let cov = 0;
  let varMkt = 0;
  let varStock = 0;

  for (const d of days) {
    const diffStock = d.stockMajorNetBuy - meanStockNet;
    const diffMkt = d.marketChangePct - meanMktReturn;
    cov += diffStock * diffMkt;
    varMkt += diffMkt * diffMkt;
    varStock += diffStock * diffStock;
  }

  const rawCorr = (varMkt > 0 && varStock > 0) ? (cov / Math.sqrt(varMkt * varStock)) : 0.65;
  const correlationCoefficient = Number(rawCorr.toFixed(2));

  // Beta-adjusted chip sensitivity (how strongly major chip flow amplifies vs market changes)
  // Standardized around 1.0
  const chipBeta = Number(Math.max(0.2, (stockBeta * (0.9 + Math.abs(correlationCoefficient) * 0.35) * (majorBias > 0 ? 1.08 : 0.88))).toFixed(2));

  let chipBetaLabel = '中度隨盤聯動';
  if (chipBeta >= 1.3) {
    chipBetaLabel = '高度超敏 (主力積極放大漲跌)';
  } else if (chipBeta >= 0.85) {
    chipBetaLabel = '常態聯動 (順應大盤水溫)';
  } else {
    chipBetaLabel = '獨立防禦 (抗跌或自成格局)';
  }

  let correlationLabel = '顯著正相關';
  if (correlationCoefficient >= 0.6) {
    correlationLabel = '高度同向共振 (大盤漲法人買)';
  } else if (correlationCoefficient >= 0.2) {
    correlationLabel = '溫和正相關 (隨盤微調)';
  } else if (correlationCoefficient >= -0.2) {
    correlationLabel = '獨立無相關 (主力走自身節奏)';
  } else {
    correlationLabel = '逆勢負相關 (逆大盤反向布局)';
  }

  const stockPriceChange20dPct = Number((((currentPrice - startStockPrice) / startStockPrice) * 100).toFixed(2));
  const marketIndexChange20dPct = Number((((currentMarketIndex - marketPoints[0].index) / marketPoints[0].index) * 100).toFixed(2));
  const chipAlpha = Number((stockPriceChange20dPct - marketIndexChange20dPct).toFixed(2));

  // Relative strength score (0 to 100)
  let relativeStrengthScore = Math.round(50 + chipAlpha * 2.2 + (cumStockMajor > 0 ? 12 : -12));
  relativeStrengthScore = Math.max(10, Math.min(96, relativeStrengthScore));

  const excessChipInflowLots = Math.round(cumStockMajor - (cumMarketInst * 0.15));

  // Determine quadrant
  let quadrant: MarketCorrelationQuadrant = 'market_follower';
  let quadrantTitle = '順勢跟風隨波者';
  let quadrantBadgeClass = 'bg-sky-500/20 text-sky-300 border-sky-500/40';
  let quadrantColor = '#38bdf8';
  let diagnosis = '';
  let tacticalAdvice = '';

  if (chipAlpha >= 4.0 && cumStockMajor > 1000) {
    quadrant = 'counter_trend_leader';
    quadrantTitle = '逆勢突圍領頭羊 (籌碼獨立強勢鎖碼)';
    quadrantBadgeClass = 'bg-rose-500/25 text-rose-300 border-rose-500/50 shadow-rose-950/40 shadow-sm animate-pulse';
    quadrantColor = '#f43f5e';
    diagnosis = `個股近 20 日相對大盤阿法超額收益達 +${chipAlpha}%，累計主力大戶淨買超 ${cumStockMajor.toLocaleString()} 張。籌碼對大盤敏感度 Beta 為 ${chipBeta}，在大盤震盪拉回之際，主力非但未退縮，反而逆勢展現強大承接力道，屬於典型的「大盤跌它抗跌、大盤漲它飆升」市場多頭總指揮。`;
    tacticalAdvice = `戰略跟單指引：逆勢強勢股為市場資金避風港與攻擊箭頭，回測 5 日均線或大盤急殺回檔時，皆為絕佳之防禦性買點，停損可直接設於主力近期建倉成本線下方。`;
  } else if (chipBeta >= 1.25 && stockPriceChange20dPct >= 0) {
    quadrant = 'trend_amplifier';
    quadrantTitle = '順勢槓桿乘風者 (高敏大單急襲攻擊)';
    quadrantBadgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    quadrantColor = '#f59e0b';
    diagnosis = `籌碼敏感度 Beta 高達 ${chipBeta}x，顯示主力極善於借力使力：每當大盤指數翻紅或放量突破，個股即出現倍數於市場平均的特大單湧入推升，具備高度攻擊彈性與高 Alpha 爆發力。`;
    tacticalAdvice = `操盤指引：適合在台股大盤指數確立反彈或突破攻擊時積極切入；反之，若大盤出現系統性重挫，需留意主力抽單速度亦較常態個股更快，應善用移動停利保全戰果。`;
  } else if (chipAlpha <= -4.0 || cumStockMajor < -1000) {
    quadrant = 'lagging_distributor';
    quadrantTitle = '弱勢背離倒貨者 (籌碼失血破線警戒)';
    quadrantBadgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    quadrantColor = '#10b981';
    diagnosis = `個股近 20 日表現大幅落後大盤指數 ${Math.abs(chipAlpha)}%，且主力累計淨賣超達 ${Math.abs(cumStockMajor).toLocaleString()} 張。即使大盤指數上揚，個股亦呈現量縮鈍化或主力逢高派發，市場籌碼極度渙散，散戶套牢浮額沉重。`;
    tacticalAdvice = `防禦避險指引：弱勢背離股切忌盲目「逢低撈底」或「等解套攤平」。應靜待主力籌碼重新翻紅且連續 3 日大單回補，並重新站穩大盤相對強度基準線後方可重新審視。`;
  } else {
    quadrant = 'market_follower';
    quadrantTitle = '順勢隨波共振者 (中度聯動常態走勢)';
    quadrantBadgeClass = 'bg-sky-500/20 text-sky-300 border-sky-500/40';
    quadrantColor = '#38bdf8';
    diagnosis = `個股主力進出節奏與台股大盤指數呈現 ${correlationCoefficient >= 0 ? '+' : ''}${correlationCoefficient} 穩定共振，籌碼敏感度 Beta 為 ${chipBeta}。主力籌碼操作以順勢跟隨為主，既未見激進逆勢逼空，亦無大規模恐慌倒貨，走勢與整體台股行情高度契合。`;
    tacticalAdvice = `跟單指引：依循大盤多空方向順勢操作即可，重點關注大盤波段多空指標，只要大盤未出現轉折破線訊號，個股可維持中性偏多波段持有。`;
  }

  return {
    days,
    currentStockPrice: currentPrice,
    currentMarketIndex,
    marketIndexChange20dPct,
    stockPriceChange20dPct,
    stockTotalCumMajorLots: cumStockMajor,
    marketTotalCumInstBillion: cumMarketInst,
    chipBeta,
    chipBetaLabel,
    correlationCoefficient,
    correlationLabel,
    relativeStrengthScore,
    excessChipInflowLots,
    chipAlpha,
    quadrant,
    quadrantTitle,
    quadrantBadgeClass,
    quadrantColor,
    diagnosis,
    tacticalAdvice,
  };
}
