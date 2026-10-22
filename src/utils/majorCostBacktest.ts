import { StockData } from '../types/stock';

export type BacktestPeriod = 30 | 60 | 90;

export type DeviationZone = 
  | 'extreme_overheat'   // 偏離度 > +15% : 高檔過熱，小心主力倒貨
  | 'bull_push'          // +5% ~ +15%   : 主力獲利拉抬，強勢多頭
  | 'cost_defense'       // -5% ~ +5%    : 成本防守區，主力共振關鍵位
  | 'bear_trapped'       // -5% ~ -15%   : 主力輕度套牢，逢低護盤中
  | 'severe_trapped';    // < -15%       : 深度破線套牢，留意停損賣壓

export interface DailyBacktestCostPoint {
  date: string;
  dayIndex: number;            // 1 to N
  price: number;               // 當日收盤價
  high: number;                // 當日最高價
  low: number;                 // 當日最低價
  volume: number;              // 總成交量 (張)
  majorNetBuy: number;         // 當日主力淨買賣超 (張)
  cumMajorNetBuy: number;      // 該期間累計主力買賣超 (張)
  rollingMajorCost: number;    // 當日累積的主力均價成本 (元)
  costBandUpper: number;       // +2% 成本上緣
  costBandLower: number;       // -2% 成本下緣
  dailyDeviationPercent: number; // ((price - rollingMajorCost) / rollingMajorCost) * 100
  majorPnLPercent: number;     // 當前價格對比當時成本的浮動損益 %
}

export interface PeriodBacktestResult {
  period: BacktestPeriod;
  periodLabel: string;
  periodSublabel: string;
  startDate: string;
  endDate: string;
  tradingDaysCount: number;
  
  // 核心成本與偏離度
  averageMajorCost: number;     // 該區間主力平均建倉成本 (元)
  currentPrice: number;        // 當前股價
  priceDeviationAmount: number;// 偏離金額 (元) = currentPrice - averageMajorCost
  priceDeviationPercent: number;// 偏離度 % = (priceDeviationAmount / averageMajorCost) * 100
  
  // 籌碼與成交量度量
  intervalNetShares: number;    // 區間主力累計淨買超 (張)
  intervalTotalVolume: number;  // 區間市場總成交量 (張)
  majorParticipationRate: number; // 主力進出參與率 %
  majorBuyVolume: number;       // 區間主力買進張數
  majorSellVolume: number;      // 區間主力賣出張數
  
  // 成本分佈邊界
  highestCostDay: { date: string; price: number };
  lowestCostDay: { date: string; price: number };
  
  // 主力損益估算
  estimatedMajorProfitAmount: number; // 預估主力浮動損益 (百萬元 NT$)
  estimatedMajorReturnRate: number;   // 預估主力平均報酬率 %
  
  // 狀態分類與指標
  zone: DeviationZone;
  zoneTitle: string;
  zoneBadgeText: string;
  zoneBadgeClass: string;
  zoneColor: string;
  thermometerScore: number;     // 0 ~ 100 過熱/偏離指數
  
  // 支撐壓力與戰術分析
  defenseLine: number;          // 主力底線防守價 (成本 -2%)
  breakoutTarget: number;       // 主力拉抬目標價 (成本 +10% ~ +15%)
  riskRewardRatio: string;      // 風險報酬比評級
  tacticalAdvice: string;       // 操盤與散戶跟單指引
  diagnosticSummary: string;    // 深度診斷文案
  
  // 每日數據軌跡
  dailyPoints: DailyBacktestCostPoint[];
}

export interface MajorCostBacktestData {
  results: Record<BacktestPeriod, PeriodBacktestResult>;
  activePeriod: BacktestPeriod;
  activeResult: PeriodBacktestResult;
  comparison: {
    period: BacktestPeriod;
    label: string;
    cost: number;
    deviation: number;
    netShares: number;
    zoneTitle: string;
    badgeClass: string;
  }[];
}

/**
 * Generate synchronized, realistic 90-day base history for backtesting
 */
export function generateMajorCostBacktest(
  stock: StockData,
  selectedPeriod: BacktestPeriod = 60
): MajorCostBacktestData {
  const currentPrice = stock.price;
  const baseMajorCost = stock.majorCost || Number((currentPrice * 0.985).toFixed(1));

  // Deterministic seed based on symbol & name
  let seed = stock.symbol.split('').reduce((acc, ch) => acc + ch.charCodeAt(0) * 17, 73);
  const pseudoRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  // Generate 90 trading days dates backwards from today
  const tradingDates: string[] = [];
  const curr = new Date();
  const d = new Date(curr);
  while (tradingDates.length < 90) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      tradingDates.unshift(`${mm}/${dd}`);
    }
    d.setDate(d.getDate() - 1);
  }

  // Generate continuous 90-day price and volume action
  // Day 89 (index 89) is today (current price)
  const allDaysRaw: {
    date: string;
    price: number;
    high: number;
    low: number;
    volume: number;
    majorNetBuy: number;
  }[] = [];

  // Determine starting price 90 days ago based on ma60 / trend
  const trendRatio = stock.ma60 ? currentPrice / stock.ma60 : 1.05;
  const startPrice = Number((currentPrice / (trendRatio > 1 ? 1.12 : 0.92)).toFixed(1));

  let simPrice = startPrice;
  const avgVol = stock.volume > 0 ? stock.volume : 15000;

  for (let i = 0; i < 90; i++) {
    const progress = i / 89; // 0 to 1
    const targetPrice = startPrice + (currentPrice - startPrice) * Math.pow(progress, 0.85);
    const noise = (pseudoRandom() - 0.48) * (stock.price * 0.025);
    
    // Ensure final day hits stock.price exactly
    if (i === 89) {
      simPrice = currentPrice;
    } else {
      simPrice = Number((targetPrice + noise).toFixed(1));
    }

    const dayFluctuation = simPrice * (0.012 + pseudoRandom() * 0.018);
    const high = Number((simPrice + dayFluctuation * pseudoRandom()).toFixed(1));
    const low = Number((simPrice - dayFluctuation * pseudoRandom()).toFixed(1));

    // Volume with occasional volume spikes
    const volNoise = 0.6 + pseudoRandom() * 0.8;
    const vol = Math.round(avgVol * volNoise);

    // Major net buy (+ or -)
    // Correlate somewhat with price direction and stock.majorAccumulation
    const isUpDay = i > 0 ? simPrice >= allDaysRaw[i - 1].price : true;
    const bias = (stock.majorAccumulation || 2500) > 0 ? 0.55 : 0.42;
    const majorDirection = pseudoRandom() < bias ? (isUpDay ? 1 : 0.3) : -0.8;
    const majorNet = Math.round((vol * 0.18 + pseudoRandom() * vol * 0.15) * majorDirection);

    allDaysRaw.push({
      date: tradingDates[i],
      price: simPrice,
      high,
      low,
      volume: vol,
      majorNetBuy: majorNet,
    });
  }

  // Helper to compute a specific period
  const computePeriod = (period: BacktestPeriod): PeriodBacktestResult => {
    const slice = allDaysRaw.slice(90 - period);
    const startDate = slice[0].date;
    const endDate = slice[slice.length - 1].date;

    // Calculate volume-weighted major cost across this slice
    // VWAP for major buying days, plus weighted baseline
    let cumCostVolume = 0;
    let cumWeights = 0;
    let cumMajorNetBuy = 0;
    let intervalTotalVolume = 0;
    let intervalMajorBuyLots = 0;
    let intervalMajorSellLots = 0;

    const dailyPoints: DailyBacktestCostPoint[] = [];

    // Progressive rolling cost calculation
    let rollingNumerator = 0;
    let rollingDenominator = 0;

    // Base prior cost baseline for smooth convergence
    const initialCostEstimate = period === 30 
      ? (stock.ma20 || baseMajorCost) 
      : period === 60 
      ? (stock.ma60 || baseMajorCost) 
      : ((stock.ma60 || baseMajorCost) * 0.96);

    slice.forEach((day, idx) => {
      cumMajorNetBuy += day.majorNetBuy;
      intervalTotalVolume += day.volume;
      if (day.majorNetBuy > 0) {
        intervalMajorBuyLots += day.majorNetBuy;
      } else {
        intervalMajorSellLots += Math.abs(day.majorNetBuy);
      }

      // Weight by volume and major participation
      const dayWeight = Math.max(day.volume * 0.2, Math.abs(day.majorNetBuy) * 2 + 500);
      rollingNumerator += day.price * dayWeight;
      rollingDenominator += dayWeight;

      // Blend rolling VWAP with theoretical cost
      const rawVwap = rollingNumerator / rollingDenominator;
      const blendFactor = Math.min(1, (idx + 5) / (period * 0.6));
      const rollingCost = Number((initialCostEstimate * (1 - blendFactor) + rawVwap * blendFactor).toFixed(1));

      const costBandUpper = Number((rollingCost * 1.02).toFixed(1));
      const costBandLower = Number((rollingCost * 0.98).toFixed(1));
      const dailyDev = Number((((day.price - rollingCost) / rollingCost) * 100).toFixed(2));
      const pnlPct = Number((((currentPrice - rollingCost) / rollingCost) * 100).toFixed(2));

      dailyPoints.push({
        date: day.date,
        dayIndex: idx + 1,
        price: day.price,
        high: day.high,
        low: day.low,
        volume: day.volume,
        majorNetBuy: day.majorNetBuy,
        cumMajorNetBuy,
        rollingMajorCost: rollingCost,
        costBandUpper,
        costBandLower,
        dailyDeviationPercent: dailyDev,
        majorPnLPercent: pnlPct,
      });

      cumCostVolume += day.price * dayWeight;
      cumWeights += dayWeight;
    });

    // Final interval average cost
    // For 60-day, closely align with stock.majorCost if available
    let avgMajorCost = Number((cumCostVolume / cumWeights).toFixed(1));
    if (period === 60 && stock.majorCost) {
      avgMajorCost = stock.majorCost;
      // also ensure latest point is calibrated
      if (dailyPoints.length > 0) {
        dailyPoints[dailyPoints.length - 1].rollingMajorCost = avgMajorCost;
      }
    } else if (period === 30) {
      // 30-day tends to be closer to recent price
      avgMajorCost = Number(((avgMajorCost * 0.4) + ((stock.ma20 || currentPrice) * 0.6)).toFixed(1));
      if (dailyPoints.length > 0) {
        dailyPoints[dailyPoints.length - 1].rollingMajorCost = avgMajorCost;
      }
    } else if (period === 90) {
      // 90-day reflects longer-term base
      avgMajorCost = Number(((avgMajorCost * 0.5) + ((stock.ma60 || baseMajorCost * 0.97) * 0.5)).toFixed(1));
      if (dailyPoints.length > 0) {
        dailyPoints[dailyPoints.length - 1].rollingMajorCost = avgMajorCost;
      }
    }

    const priceDeviationAmount = Number((currentPrice - avgMajorCost).toFixed(1));
    const priceDeviationPercent = Number(((priceDeviationAmount / avgMajorCost) * 100).toFixed(2));

    // Highest and lowest cost days
    let maxDay = slice[0];
    let minDay = slice[0];
    slice.forEach(d => {
      if (d.price > maxDay.price) maxDay = d;
      if (d.price < minDay.price) minDay = d;
    });

    const majorParticipationRate = intervalTotalVolume > 0 
      ? Number(((Math.abs(cumMajorNetBuy) / intervalTotalVolume) * 100).toFixed(1))
      : 8.5;

    // Major estimated profit amount (NT$ millions)
    // cumMajorNetBuy (張) * 1000 shares * priceDeviationAmount / 1,000,000
    const estProfitMln = cumMajorNetBuy !== 0 
      ? Number(((cumMajorNetBuy * 1000 * priceDeviationAmount) / 1000000).toFixed(1))
      : Number(((5000 * 1000 * priceDeviationAmount) / 1000000).toFixed(1));

    // Determine zone & diagnosis
    let zone: DeviationZone = 'cost_defense';
    let zoneTitle = '成本防守 (主力均價震盪整理)';
    let zoneBadgeText = '均價共振區';
    let zoneBadgeClass = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    let zoneColor = '#06b6d4';
    let thermometerScore = 50;
    let tacticalAdvice = '';
    let diagnosticSummary = '';

    if (priceDeviationPercent >= 15) {
      zone = 'extreme_overheat';
      zoneTitle = '獲利超載 (高檔過熱警戒)';
      zoneBadgeText = '主力高檔大賺 + 獲利了結警戒';
      zoneBadgeClass = 'bg-rose-500/25 text-rose-300 border-rose-500/50 shadow-rose-950/40 shadow-sm';
      zoneColor = '#f43f5e';
      thermometerScore = 92;
      diagnosticSummary = `當前股價高於 ${period} 日主力建倉成本達 ${priceDeviationPercent}%（每股超額獲利 $${priceDeviationAmount} 元）。主力波段帳面獲利豐厚，籌碼隨時有逢高拉抬派發、落袋為安的意願，短線追高風險急劇升高。`;
      tacticalAdvice = `建議已持有者可分批調高停利點，切忌在偏離度大於 15% 時盲目追價。密切注意盤中是否出現特大單出貨或爆量長黑倒貨訊號。`;
    } else if (priceDeviationPercent >= 5) {
      zone = 'bull_push';
      zoneTitle = '主力獲利拉抬 (強勢鎖碼推進)';
      zoneBadgeText = '主力順勢推升 · 多頭掌控';
      zoneBadgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      zoneColor = '#f59e0b';
      thermometerScore = 72;
      diagnosticSummary = `當前股價穩居 ${period} 日主力建倉成本上方 +${priceDeviationPercent}%。主力籌碼具備穩定正報酬保護，通常會持續沿 5 日或 10 日均線偏多運作，成本線具備強大回測支撐力道。`;
      tacticalAdvice = `拉回接近主力成本區間（回測幅度在 +2%~+5% 內）為極佳加碼或切入點，停損可設定於主力成本價下方 2% 處，具備優異風險報酬比。`;
    } else if (priceDeviationPercent >= -5) {
      zone = 'cost_defense';
      zoneTitle = '成本防禦區 (主力均價拉鋸共振)';
      zoneBadgeText = '主力保本防線 · 關鍵決戰點';
      zoneBadgeClass = 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      zoneColor = '#38bdf8';
      thermometerScore = 48;
      diagnosticSummary = `當前股價與 ${period} 日主力均價差距僅 ${priceDeviationPercent}%（${priceDeviationAmount >= 0 ? '+' : ''}$${priceDeviationAmount} 元）。主力持倉處於損益兩平臨界點，此區間為主力的核心護盤戰略高地，向下常有大單護盤承接。`;
      tacticalAdvice = `此為「跟單主力」最具性價比的戰術區域。只要不帶量摜破主力成本下緣 ($${(avgMajorCost * 0.98).toFixed(1)})，可分批逢低承接，享受主力後續發動行情的紅利。`;
    } else if (priceDeviationPercent >= -15) {
      zone = 'bear_trapped';
      zoneTitle = '主力暫時套牢 (低檔承接護盤中)';
      zoneBadgeText = '主力微幅套牢 · 防守反彈可期';
      zoneBadgeClass = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      zoneColor = '#818cf8';
      thermometerScore = 32;
      diagnosticSummary = `當前股價跌破 ${period} 日主力建倉成本 ${Math.abs(priceDeviationPercent)}%（主力每股虧損 $${Math.abs(priceDeviationAmount)} 元）。主力短線亦陷入套牢，但若未見恐慌性倒貨，主力通常具備自救解套與低接攤平的強烈動機。`;
      tacticalAdvice = `觀察成交量是否萎縮至低檔，並檢視三大法人是否出現連續買超逆勢承接。若突破重返主力成本線上方，將轉化為強力的軋空或解套行情。`;
    } else {
      zone = 'severe_trapped';
      zoneTitle = '主力嚴重套牢 / 破線棄守警戒';
      zoneBadgeText = '深度破線 · 留意主力停損停損停潮';
      zoneBadgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      zoneColor = '#10b981';
      thermometerScore = 15;
      diagnosticSummary = `股價已低於 ${period} 日主力成本高達 ${Math.abs(priceDeviationPercent)}%。此情況代表主力建倉宣告失利，可能面臨融資斷頭或法人被迫停損停售，原主力成本線已轉變為上方極重沉重壓力區。`;
      tacticalAdvice = `不宜因看似便宜而貿然撈底。應耐心等待右側底部型態確認，且主力出現大規模連續 3 日以上大單回補，方可考慮分批進場。`;
    }

    const defenseLine = Number((avgMajorCost * 0.98).toFixed(1));
    const breakoutTarget = Number((avgMajorCost * 1.12).toFixed(1));
    
    // Evaluate risk reward ratio
    const downside = Math.max(0.5, currentPrice - defenseLine);
    const upside = Math.max(1, breakoutTarget - currentPrice);
    const rrRatioVal = (upside / downside).toFixed(1);
    const riskRewardRatio = `${rrRatioVal} : 1 (${Number(rrRatioVal) >= 2 ? '優良' : Number(rrRatioVal) >= 1 ? '中性' : '偏低'})`;

    const periodLabels: Record<BacktestPeriod, { label: string; sub: string }> = {
      30: { label: '近 30 日', sub: '短線主力成本回測 (約 1.5 個月)' },
      60: { label: '近 60 日', sub: '季線波段主力建倉 (約 3 個月)' },
      90: { label: '近 90 日', sub: '中長線大戶底層持倉 (約 4.5 個月)' },
    };

    return {
      period,
      periodLabel: periodLabels[period].label,
      periodSublabel: periodLabels[period].sub,
      startDate,
      endDate,
      tradingDaysCount: period,
      averageMajorCost: avgMajorCost,
      currentPrice,
      priceDeviationAmount,
      priceDeviationPercent,
      intervalNetShares: cumMajorNetBuy,
      intervalTotalVolume,
      majorParticipationRate,
      majorBuyVolume: intervalMajorBuyLots,
      majorSellVolume: intervalMajorSellLots,
      highestCostDay: { date: maxDay.date, price: maxDay.price },
      lowestCostDay: { date: minDay.date, price: minDay.price },
      estimatedMajorProfitAmount: estProfitMln,
      estimatedMajorReturnRate: priceDeviationPercent,
      zone,
      zoneTitle,
      zoneBadgeText,
      zoneBadgeClass,
      zoneColor,
      thermometerScore,
      defenseLine,
      breakoutTarget,
      riskRewardRatio,
      tacticalAdvice,
      diagnosticSummary,
      dailyPoints,
    };
  };

  const r30 = computePeriod(30);
  const r60 = computePeriod(60);
  const r90 = computePeriod(90);

  const results: Record<BacktestPeriod, PeriodBacktestResult> = {
    30: r30,
    60: r60,
    90: r90,
  };

  const activeResult = results[selectedPeriod];

  const comparison = [
    {
      period: 30 as BacktestPeriod,
      label: '30日 (短線主力)',
      cost: r30.averageMajorCost,
      deviation: r30.priceDeviationPercent,
      netShares: r30.intervalNetShares,
      zoneTitle: r30.zoneBadgeText,
      badgeClass: r30.zoneBadgeClass,
    },
    {
      period: 60 as BacktestPeriod,
      label: '60日 (季線波段)',
      cost: r60.averageMajorCost,
      deviation: r60.priceDeviationPercent,
      netShares: r60.intervalNetShares,
      zoneTitle: r60.zoneBadgeText,
      badgeClass: r60.zoneBadgeClass,
    },
    {
      period: 90 as BacktestPeriod,
      label: '90日 (長線大戶)',
      cost: r90.averageMajorCost,
      deviation: r90.priceDeviationPercent,
      netShares: r90.intervalNetShares,
      zoneTitle: r90.zoneBadgeText,
      badgeClass: r90.zoneBadgeClass,
    },
  ];

  return {
    results,
    activePeriod: selectedPeriod,
    activeResult,
    comparison,
  };
}
