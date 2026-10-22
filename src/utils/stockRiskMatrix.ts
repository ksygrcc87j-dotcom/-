import { StockData } from '../types/stock';

export type RiskLevel = 'low' | 'moderate' | 'elevated' | 'extreme';

export interface RiskSubIndicator {
  id: string;
  category: 'volatility' | 'liquidity' | 'overheating';
  categoryLabel: string;
  name: string;
  shortName: string;
  valueDisplay: string;
  rawValue: number;
  score: number; // 0 to 100 (higher = higher risk)
  level: RiskLevel;
  levelLabel: string;
  thresholdNote: string;
  diagnosis: string;
  actionAdvice: string;
}

export interface RiskCategorySummary {
  category: 'volatility' | 'liquidity' | 'overheating';
  title: string;
  subtitle: string;
  score: number; // 0 to 100
  level: RiskLevel;
  levelLabel: string;
  color: string;
  badgeClass: string;
  description: string;
  indicators: RiskSubIndicator[];
}

export interface RiskMatrixQuadrant {
  quadrantId: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  title: string;
  tag: string;
  color: string;
  borderClass: string;
  bgClass: string;
  description: string;
  strategy: string;
}

export interface StockRiskMatrixAnalysis {
  compositeScore: number; // 0 to 100
  compositeLevel: RiskLevel;
  compositeLevelLabel: string;
  statusBadgeClass: string;
  statusColor: string;
  summaryTitle: string;
  summaryDiagnosis: string;
  recommendedPositionSize: string; // e.g. "建議持股 30% ~ 40%"
  defensiveStopPrice: number;       // e.g. 1020
  tacticalAdvice: string;
  categories: {
    volatility: RiskCategorySummary;
    liquidity: RiskCategorySummary;
    overheating: RiskCategorySummary;
  };
  gridItems: RiskSubIndicator[]; // 9 items for 3x3 Heatmap Grid
  quadrant: RiskMatrixQuadrant;
  coordinates: {
    x: number; // Technical Overheating (0 to 100)
    y: number; // Volatility (0 to 100)
    size: number; // Liquidity pressure (radius)
  };
}

/**
 * Helper to determine risk level & color classes based on 0-100 score
 */
function getRiskLevel(score: number): {
  level: RiskLevel;
  label: string;
  badgeClass: string;
  color: string;
} {
  if (score < 35) {
    return {
      level: 'low',
      label: '低度安全',
      badgeClass: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40',
      color: '#10b981',
    };
  }
  if (score < 60) {
    return {
      level: 'moderate',
      label: '中度穩健',
      badgeClass: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40',
      color: '#06b6d4',
    };
  }
  if (score < 80) {
    return {
      level: 'elevated',
      label: '偏高警戒',
      badgeClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
      color: '#f59e0b',
    };
  }
  return {
    level: 'extreme',
    label: '極度危險',
    badgeClass: 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse',
    color: '#ef4444',
  };
}

/**
 * Compute the complete Stock Risk Early Warning Matrix for a given stock
 */
export function calculateStockRiskMatrix(stock: StockData): StockRiskMatrixAnalysis {
  const {
    price,
    yesterdayClose,
    highPrice,
    lowPrice,
    beta,
    turnoverRate,
    turnoverRate5dAvg,
    volume,
    volumeRatio,
    ma20,
    majorCost,
    valuationScore,
    supportLevel,
  } = stock;

  // 1. --- 波動率風險指標 (Volatility Risk) ---
  // Sub 1: Beta Coefficient (市場敏感度)
  const safeBeta = typeof beta === 'number' && !isNaN(beta) ? beta : 1.0;
  let betaScore = 50;
  if (safeBeta <= 0.6) betaScore = 20;
  else if (safeBeta <= 0.95) betaScore = 35;
  else if (safeBeta <= 1.25) betaScore = 55;
  else if (safeBeta <= 1.6) betaScore = 78;
  else betaScore = 95;

  const betaLevel = getRiskLevel(betaScore);
  const betaIndicator: RiskSubIndicator = {
    id: 'vol_beta',
    category: 'volatility',
    categoryLabel: '波動率風險',
    name: '貝塔敏感度 (Beta)',
    shortName: 'Beta敏感度',
    valueDisplay: `${safeBeta.toFixed(2)}`,
    rawValue: safeBeta,
    score: betaScore,
    level: betaLevel.level,
    levelLabel: betaLevel.label,
    thresholdNote: '基準: 1.0 (大盤同步)',
    diagnosis: safeBeta > 1.3 
      ? `波動率放大 ${safeBeta.toFixed(2)} 倍，大盤震盪時易受劇烈放大甩轎。` 
      : `Beta值為 ${safeBeta.toFixed(2)}，與大盤關聯溫和，系統性風險可控。`,
    actionAdvice: safeBeta > 1.3 ? '單筆部位不宜超過總資金 15%，避免市場回檔產生槓桿效應。' : '可作核心持股，受大盤劇烈擾動程度在常態範圍內。',
  };

  // Sub 2: Intraday Amplitude (日內真實振幅)
  const amplitude = yesterdayClose > 0 
    ? Number((((highPrice - lowPrice) / yesterdayClose) * 100).toFixed(2))
    : 2.5;
  let ampScore = 40;
  if (amplitude <= 1.8) ampScore = 22;
  else if (amplitude <= 3.8) ampScore = 45;
  else if (amplitude <= 6.5) ampScore = 74;
  else ampScore = 96;

  const ampLevel = getRiskLevel(ampScore);
  const amplitudeIndicator: RiskSubIndicator = {
    id: 'vol_amplitude',
    category: 'volatility',
    categoryLabel: '波動率風險',
    name: '日內真實振幅 (Daily Range)',
    shortName: '日內振幅率',
    valueDisplay: `${amplitude}%`,
    rawValue: amplitude,
    score: ampScore,
    level: ampLevel.level,
    levelLabel: ampLevel.label,
    thresholdNote: '安全 < 3.5% | 劇烈 > 6.0%',
    diagnosis: amplitude > 5.0
      ? `單日高低點差距高達 ${amplitude}%，當沖與浮額劇烈交火，追高容易當日套牢。`
      : `日內震幅僅 ${amplitude}%，股價走勢節奏平緩，籌碼換手秩序良好。`,
    actionAdvice: amplitude > 5.0 ? '切忌追漲停或高盤急拉，應採取開低支撐逢回承接策略。' : '可依據既定技術均線進出，滑價衝擊風險低。',
  };

  // Sub 3: Historical 20-Day Annualized Volatility (歷史年化波動度)
  const estAnnualVol = Number((amplitude * 5.8 * Math.max(0.8, safeBeta)).toFixed(1));
  let volScore = 40;
  if (estAnnualVol <= 20) volScore = 20;
  else if (estAnnualVol <= 32) volScore = 42;
  else if (estAnnualVol <= 48) volScore = 72;
  else volScore = 92;

  const volLevel = getRiskLevel(volScore);
  const volIndicator: RiskSubIndicator = {
    id: 'vol_historical',
    category: 'volatility',
    categoryLabel: '波動率風險',
    name: '近20日年化波動率 (Hist Vol)',
    shortName: '年化波動率',
    valueDisplay: `${estAnnualVol}%`,
    rawValue: estAnnualVol,
    score: volScore,
    level: volLevel.level,
    levelLabel: volLevel.label,
    thresholdNote: '低波動 < 25% | 高警示 > 45%',
    diagnosis: estAnnualVol > 42
      ? `年化波動率高達 ${estAnnualVol}%，短期走勢易出現非線性跳空或跳水。`
      : `年化波動率維持在 ${estAnnualVol}%，波動符合防禦型或成長股穩健標準。`,
    actionAdvice: estAnnualVol > 42 ? '應以 ATR (真實波幅) 乘數放大停損距離，避免被假突破頻繁掃停損。' : '持股信心度高，適合波段持有。',
  };

  const volatilityCompositeScore = Math.round(betaScore * 0.35 + ampScore * 0.35 + volScore * 0.3);
  const volatilityLevel = getRiskLevel(volatilityCompositeScore);

  // 2. --- 流動性與籌碼防守風險 (Liquidity & Order Flow Risk) ---
  // Sub 4: Turnover Rate & Churn (周轉率籌碼過熱)
  const curTurnover = typeof turnoverRate === 'number' ? turnoverRate : 2.5;
  const avg5dTurnover = typeof turnoverRate5dAvg === 'number' ? turnoverRate5dAvg : curTurnover;
  let turnoverScore = 30;
  if (curTurnover < 0.6) turnoverScore = 65; // 流動性不足折價風險
  else if (curTurnover <= 3.5) turnoverScore = 25; // 最健康換手
  else if (curTurnover <= 8.0) turnoverScore = 48; // 活躍
  else if (curTurnover <= 16.0) turnoverScore = 76; // 過熱警示
  else turnoverScore = 95; // 籌碼大混戰

  const turnoverLevel = getRiskLevel(turnoverScore);
  const turnoverIndicator: RiskSubIndicator = {
    id: 'liq_turnover',
    category: 'liquidity',
    categoryLabel: '流動性風險',
    name: '籌碼周轉率 (Turnover Rate)',
    shortName: '日周轉率',
    valueDisplay: `${curTurnover}% (5日均 ${avg5dTurnover}%)`,
    rawValue: curTurnover,
    score: turnoverScore,
    level: turnoverLevel.level,
    levelLabel: turnoverLevel.label,
    thresholdNote: '適中 1.5%~6% | 過熱 > 12%',
    diagnosis: curTurnover > 12.0
      ? `當日周轉率飆升至 ${curTurnover}%，籌碼過度換手，主力高檔掩護出貨嫌疑大幅升高。`
      : curTurnover < 0.8
      ? `周轉率僅 ${curTurnover}%，買賣盤冷門，需注意流動性折價與變現滑價風險。`
      : `周轉率 ${curTurnover}% 處於黃金活躍區，主力籌碼穩定鎖碼未見鬆動。`,
    actionAdvice: curTurnover > 12.0 ? '不可在量能爆量噴出日融資追單，應防次日爆量反轉。' : '量能結構健康，按正常規劃下單即可。',
  };

  // Sub 5: Volume Ratio & Order Book Depth (估量倍比與委託深度)
  const safeVolRatio = typeof volumeRatio === 'number' && !isNaN(volumeRatio) ? volumeRatio : 1.0;
  let ratioScore = 30;
  if (safeVolRatio <= 0.45) ratioScore = 70; // 窒息量冷卻
  else if (safeVolRatio <= 1.35) ratioScore = 24; // 常態溫和
  else if (safeVolRatio <= 2.2) ratioScore = 62; // 攻擊放量
  else ratioScore = 88; // 爆衝急單

  const ratioLevel = getRiskLevel(ratioScore);
  const volumeRatioIndicator: RiskSubIndicator = {
    id: 'liq_volratio',
    category: 'liquidity',
    categoryLabel: '流動性風險',
    name: '成交估量比 (Volume Ratio)',
    shortName: '估量倍比',
    valueDisplay: `${safeVolRatio.toFixed(2)}x (${(volume || 0).toLocaleString()}張)`,
    rawValue: safeVolRatio,
    score: ratioScore,
    level: ratioLevel.level,
    levelLabel: ratioLevel.label,
    thresholdNote: '常態 0.8x~1.4x | 突波 > 2.0x',
    diagnosis: safeVolRatio > 2.0
      ? `預估量能為昨量 ${safeVolRatio.toFixed(2)} 倍，量能急遽暴增，需緊盯尾盤是否收長上影線。`
      : `量能比為 ${safeVolRatio.toFixed(2)} 倍，量價配合步調一致，未見籌碼異常失衡。`,
    actionAdvice: safeVolRatio > 2.0 ? '若股價創高但無法鎖住強勢，應嚴防主力趁量大倒出底層持股。' : '量價匹配，適合維持原有操作部位。',
  };

  // Sub 6: Large Order Net Pressure (特大單拋壓差額)
  const largeSellRatio = stock.largeOrderSellRatio || 30;
  const largeBuyRatio = stock.largeOrderBuyRatio || 30;
  const netSellPressure = Number((largeSellRatio - largeBuyRatio).toFixed(1));
  let netPressureScore = 40;
  if (netSellPressure <= -15) netPressureScore = 18; // 大單大幅買進 (極安全)
  else if (netSellPressure <= 0) netPressureScore = 35; // 買略大於賣
  else if (netSellPressure <= 12) netPressureScore = 62; // 賣方佔優
  else if (netSellPressure <= 25) netPressureScore = 82; // 賣壓沉重
  else netPressureScore = 96; // 恐慌倒貨

  const netPressureLevel = getRiskLevel(netPressureScore);
  const orderPressureIndicator: RiskSubIndicator = {
    id: 'liq_pressure',
    category: 'liquidity',
    categoryLabel: '流動性風險',
    name: '主力大單賣壓差額 (Order Bias)',
    shortName: '大單淨賣壓',
    valueDisplay: `${netSellPressure > 0 ? `+${netSellPressure}` : netSellPressure}%`,
    rawValue: netSellPressure,
    score: netPressureScore,
    level: netPressureLevel.level,
    levelLabel: netPressureLevel.label,
    thresholdNote: '淨賣壓: <0% 買方強 | >15% 警示',
    diagnosis: netSellPressure > 10
      ? `大單賣出比例高於買進 ${netSellPressure}%，主力與法人呈現高檔調節姿態。`
      : netSellPressure < -10
      ? `大單買進比例高於賣出 ${Math.abs(netSellPressure)}%，主力買盤堅固護盤意願強烈。`
      : `大單買賣比率旗鼓相當 (${largeBuyRatio}% vs ${largeSellRatio}%)，多空拉鋸均勻。`,
    actionAdvice: netSellPressure > 10 ? '逢反彈應縮減持股，不可逢低盲目攤平。' : '主力承接意願濃郁，若跌破關鍵支撐亦有假跌破快速收斂可能。',
  };

  const liquidityCompositeScore = Math.round(turnoverScore * 0.35 + ratioScore * 0.3 + netPressureScore * 0.35);
  const liquidityLevel = getRiskLevel(liquidityCompositeScore);

  // 3. --- 技術面與評價過熱程度 (Technical Overheating Risk) ---
  // Sub 7: MA20 BIAS (均線正負乖離率)
  const safeMa20 = typeof ma20 === 'number' && ma20 > 0 ? ma20 : price;
  const bias20 = Number((((price - safeMa20) / safeMa20) * 100).toFixed(2));
  let biasScore = 40;
  if (bias20 > 12) biasScore = 95; // 極度過熱，回檔機率高
  else if (bias20 > 6.5) biasScore = 78; // 偏高乖離
  else if (bias20 >= -2.5 && bias20 <= 4.0) biasScore = 25; // 均線支撐黃金區
  else if (bias20 < -8) biasScore = 70; // 負乖離過大破線下墜
  else biasScore = 45;

  const biasLevel = getRiskLevel(biasScore);
  const biasIndicator: RiskSubIndicator = {
    id: 'heat_bias',
    category: 'overheating',
    categoryLabel: '技術面過熱',
    name: '月線乖離率 (MA20 BIAS)',
    shortName: '月線乖離率',
    valueDisplay: `${bias20 > 0 ? `+${bias20}` : bias20}% (月線 $${safeMa20})`,
    rawValue: bias20,
    score: biasScore,
    level: biasLevel.level,
    levelLabel: biasLevel.label,
    thresholdNote: '健康 -2%~+5% | 過熱 > +8%',
    diagnosis: bias20 > 7.0
      ? `股價距離20日均線正乖離達 ${bias20}%，短線獲利回吐賣壓隨時觸發技術性回測。`
      : bias20 < -5.0
      ? `股價跌破月線且負乖離達 ${bias20}%，短線處於弱勢整理，反彈上方有均線蓋頭壓力。`
      : `股價緊貼月線 (乖離 ${bias20}%)，走勢溫和推升，均線具實質防守支撐。`,
    actionAdvice: bias20 > 7.0 ? '已持有者可分批拔檔獲利了結 1/3，未持有者切勿急於市價搶進。' : '沿月線作為防守點，破線停損，未破續抱。',
  };

  // Sub 8: Price Stage & Valuation Percentile (位階評價過熱分位)
  const safeValuation = typeof valuationScore === 'number' ? valuationScore : 50;
  let valScore = safeValuation;
  const valLevel = getRiskLevel(valScore);
  const valuationIndicator: RiskSubIndicator = {
    id: 'heat_valuation',
    category: 'overheating',
    categoryLabel: '技術面過熱',
    name: '歷史估值位階分位 (Valuation Rank)',
    shortName: '位階過熱分位',
    valueDisplay: `${safeValuation}分 (${stock.stageLabel || '常態'})`,
    rawValue: safeValuation,
    score: valScore,
    level: valLevel.level,
    levelLabel: valLevel.label,
    thresholdNote: '低階 < 35 | 高估 > 75',
    diagnosis: safeValuation > 75
      ? `處於歷史 52 週與本益比高位階 (${safeValuation}分)，利多大多已反映在股價上，防守空間壓縮。`
      : safeValuation < 35
      ? `處於低檔築底區間 (${safeValuation}分)，下檔具高殖利率與淨值比保護，下檔風險有限。`
      : `處於成長主升中位階 (${safeValuation}分)，基本面增長有助消化評價。`,
    actionAdvice: safeValuation > 75 ? '應以右側交易為準，嚴設移動停利，不預設立場。' : '下檔具安全邊際，可採中長線定期定額或逢低佈局。',
  };

  // Sub 9: Major Cost Premium % (主力持倉成本溢價)
  const safeMajorCost = typeof majorCost === 'number' && majorCost > 0 ? majorCost : price * 0.95;
  const majorCostDiff = price - safeMajorCost;
  const majorPremium = Number(((majorCostDiff / safeMajorCost) * 100).toFixed(2));
  let majorCostScore = 40;
  if (majorPremium > 16) majorCostScore = 90; // 主力利潤極厚，倒貨風險大
  else if (majorPremium > 8.0) majorCostScore = 65; // 主力獲利中等
  else if (majorPremium >= -2.0 && majorPremium <= 6.0) majorCostScore = 25; // 緊貼主力成本，防守最硬
  else majorCostScore = 55; // 跌破主力成本 (套牢抵抗)

  const majorCostLevel = getRiskLevel(majorCostScore);
  const majorCostIndicator: RiskSubIndicator = {
    id: 'heat_majorcost',
    category: 'overheating',
    categoryLabel: '技術面過熱',
    name: '主力成本溢價幅度 (Cost Premium)',
    shortName: '主力溢價率',
    valueDisplay: `${majorPremium > 0 ? `+${majorPremium}` : majorPremium}% (成本 $${safeMajorCost})`,
    rawValue: majorPremium,
    score: majorCostScore,
    level: majorCostLevel.level,
    levelLabel: majorCostLevel.label,
    thresholdNote: '安全 < +6% | 倒貨戒備 > +15%',
    diagnosis: majorPremium > 15.0
      ? `股價已脫離主力平均成本達 ${majorPremium}%，主力持股利潤豐厚，具隨時市價倒貨兌現動機。`
      : majorPremium < 0
      ? `現價低於主力成本線 ${Math.abs(majorPremium)}%，主力亦受困套牢，具備技術性自救反彈動能。`
      : `現價緊貼主力成本線 (+${majorPremium}%)，主力在此具有極高護盤維穩誘因。`,
    actionAdvice: majorPremium > 15.0 ? '提防主力拉高出貨，不可將主力成本作為此處的支撐依據。' : `主力成本線 $${safeMajorCost} 可作為極佳波段防守點。`,
  };

  const overheatingCompositeScore = Math.round(biasScore * 0.4 + valScore * 0.3 + majorCostScore * 0.3);
  const overheatingLevel = getRiskLevel(overheatingCompositeScore);

  // 4. --- 綜合風險指數與評級 (Overall Composite Risk) ---
  const compositeScore = Math.round(
    volatilityCompositeScore * 0.35 +
    liquidityCompositeScore * 0.30 +
    overheatingCompositeScore * 0.35
  );
  const compositeLevel = getRiskLevel(compositeScore);

  // Suggested position size & stop price
  let recommendedPositionSize = '50% ~ 70% (適中波段配置)';
  let tacticalAdvice = '維持紀律操作，緊盯均線軌道。';
  if (compositeScore < 35) {
    recommendedPositionSize = '70% ~ 100% (積極防守進攻配置)';
    tacticalAdvice = '當前市場環境各項風險指標處於安全區，籌碼沉澱且估值具防禦性，建議逢回分批建立波段部位。';
  } else if (compositeScore < 60) {
    recommendedPositionSize = '40% ~ 60% (穩健平衡配置)';
    tacticalAdvice = '各維度指標健康運作，但需留意技術線型與量能連續性，建議依月線與主力成本線作為動態移動停利基準。';
  } else if (compositeScore < 80) {
    recommendedPositionSize = '20% ~ 35% (防禦輕倉配置)';
    tacticalAdvice = '部分指標出現過熱或大單調節訊號，盤勢波動恐擴大，嚴禁以融資盲目追高，建議將部分獲利放進口袋。';
  } else {
    recommendedPositionSize = '0% ~ 20% (極輕倉或退場觀望)';
    tacticalAdvice = '多項關鍵指標（乖離率、主力獲利溢價或大單拋壓）已進入危險警戒區，嚴防主力假拉抬真出貨，建議恪守嚴格停損。';
  }

  const defensiveStopPrice = typeof supportLevel === 'number' && supportLevel > 0 
    ? supportLevel 
    : Number((price * 0.94).toFixed(1));

  // Determine 2D Quadrant
  let quadrant: RiskMatrixQuadrant;
  if (overheatingCompositeScore >= 50 && volatilityCompositeScore >= 50) {
    quadrant = {
      quadrantId: 'Q1',
      title: '極度過熱噴出區 (Extreme Heat & High Volatility)',
      tag: '高風險警戒',
      color: '#ef4444',
      borderClass: 'border-red-500/40',
      bgClass: 'bg-red-500/10 text-red-300',
      description: '個股呈現高波動且技術面過熱，多空激烈博弈，獲利回吐賣壓隨時引發急殺。',
      strategy: '只出不進、嚴設移動停損、絕不追價。',
    };
  } else if (overheatingCompositeScore < 50 && volatilityCompositeScore >= 50) {
    quadrant = {
      quadrantId: 'Q2',
      title: '劇烈洗盤震盪區 (High Volatility & Low Overheating)',
      tag: '高震盪洗刷',
      color: '#f59e0b',
      borderClass: 'border-amber-500/40',
      bgClass: 'bg-amber-500/10 text-amber-300',
      description: '股價尚未過熱但短線波動劇烈，常有長下影線或跳空誘空，考驗持股定力。',
      strategy: '逢低分批承接、擴大單筆停損區間、縮減槓桿。',
    };
  } else if (overheatingCompositeScore < 50 && volatilityCompositeScore < 50) {
    quadrant = {
      quadrantId: 'Q3',
      title: '低檔築底防禦區 (Safe Haven & Defensive Base)',
      tag: '安全低風險',
      color: '#10b981',
      borderClass: 'border-emerald-500/40',
      bgClass: 'bg-emerald-500/10 text-emerald-300',
      description: '波動平穩且估值位階偏低，籌碼結構沉澱，下檔具有堅實安全邊際。',
      strategy: '安心波段抱牢、回檔至主力成本線加碼。',
    };
  } else {
    quadrant = {
      quadrantId: 'Q4',
      title: '溫和盤堅推升區 (Steady Trend & Moderate Heat)',
      tag: '趨勢行進',
      color: '#06b6d4',
      borderClass: 'border-cyan-500/40',
      bgClass: 'bg-cyan-500/10 text-cyan-300',
      description: '走勢沿均線溫和推進，波動可控但需定期檢視籌碼背離或突發爆量。',
      strategy: '以月線為防守軌道續抱、順勢操作。',
    };
  }

  return {
    compositeScore,
    compositeLevel: compositeLevel.level,
    compositeLevelLabel: compositeLevel.label,
    statusBadgeClass: compositeLevel.badgeClass,
    statusColor: compositeLevel.color,
    summaryTitle: `${stock.name} (${stock.symbol}) 綜合風險評級：${compositeLevel.label} (${compositeScore}分)`,
    summaryDiagnosis: `波動率評分 ${volatilityCompositeScore}分 · 流動性評分 ${liquidityCompositeScore}分 · 技術過熱 ${overheatingCompositeScore}分`,
    recommendedPositionSize,
    defensiveStopPrice,
    tacticalAdvice,
    categories: {
      volatility: {
        category: 'volatility',
        title: '波動率風險 (Volatility)',
        subtitle: '衡量 Beta、震幅與歷史變動',
        score: volatilityCompositeScore,
        level: volatilityLevel.level,
        levelLabel: volatilityLevel.label,
        color: volatilityLevel.color,
        badgeClass: volatilityLevel.badgeClass,
        description: '反映股價在盤中與歷史周期內的震盪劇烈度，高分意味著跳空或急殺風險高。',
        indicators: [betaIndicator, amplitudeIndicator, volIndicator],
      },
      liquidity: {
        category: 'liquidity',
        title: '流動性與籌碼防守 (Liquidity)',
        subtitle: '衡量周轉率、估量比與大單淨差',
        score: liquidityCompositeScore,
        level: liquidityLevel.level,
        levelLabel: liquidityLevel.label,
        color: liquidityLevel.color,
        badgeClass: liquidityLevel.badgeClass,
        description: '反映市場換手熱度、成交委託深度以及主力真實拋壓與支撐力道。',
        indicators: [turnoverIndicator, volumeRatioIndicator, orderPressureIndicator],
      },
      overheating: {
        category: 'overheating',
        title: '技術面與評價過熱 (Overheating)',
        subtitle: '衡量均線乖離、估值分位與主力溢價',
        score: overheatingCompositeScore,
        level: overheatingLevel.level,
        levelLabel: overheatingLevel.label,
        color: overheatingLevel.color,
        badgeClass: overheatingLevel.badgeClass,
        description: '反映股價是否已過度超買或脫離主力持倉成本太遠，高分意味著獲利回吐賣壓蓄勢待發。',
        indicators: [biasIndicator, valuationIndicator, majorCostIndicator],
      },
    },
    gridItems: [
      betaIndicator,
      amplitudeIndicator,
      volIndicator,
      turnoverIndicator,
      volumeRatioIndicator,
      orderPressureIndicator,
      biasIndicator,
      valuationIndicator,
      majorCostIndicator,
    ],
    quadrant,
    coordinates: {
      x: overheatingCompositeScore,
      y: volatilityCompositeScore,
      size: Math.max(14, Math.min(32, liquidityCompositeScore * 0.35)),
    },
  };
}
