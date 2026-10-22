import { StockData } from '../types/stock';

export interface ChipRadarMetric {
  subject: string;
  shortName: string;
  actor: 'major' | 'foreign' | 'trust' | 'retail';
  actorLabel: string;
  score: number;      // 0 to 100
  benchmark: number;  // 50 (neutral baseline)
  fullMark: number;   // 100
  rawDisplay: string;
  statusLabel: string;
  statusColor: string;
  description: string;
}

export interface ChipActorBalance {
  actor: 'major' | 'foreign' | 'trust' | 'retail';
  actorName: string;
  roleDescription: string;
  bullScore: number;  // 0 to 100
  bearScore: number;  // 0 to 100
  netStrength: number;// -100 to +100
  statusTag: string;
  badgeClass: string;
  color: string;
  details: string;
}

export interface ChipRadarAnalysis {
  compositeScore: number; // 0 to 100
  compositeStatus: string;
  compositeTagClass: string;
  structureDiagnosis: string;
  tacticalSummary: string;
  radarData: ChipRadarMetric[];
  actors: ChipActorBalance[];
}

/**
 * Calculate multi-dimensional chip flow metrics for Recharts Radar
 */
export function calculateChipRadarData(stock: StockData): ChipRadarAnalysis {
  const {
    orderFlow,
    majorAccumulation,
    majorConcentration,
    largeOrderBuyRatio,
    largeOrderSellRatio,
    foreignNetBuy,
    foreignStreak,
    foreignHoldingRatio,
    trustNetBuy,
    trustStreak,
    smallOrderBuyRatio,
    smallOrderSellRatio,
    turnoverRate,
  } = stock;

  // 1. --- 主力籌碼動向 (Major / Smart Money) ---
  // Large order thrust: buy ratio vs sell ratio
  const largeNet = (orderFlow?.superLargeNet || 0) + (orderFlow?.largeNet || 0);
  const largeRatioDiff = (largeOrderBuyRatio || 30) - (largeOrderSellRatio || 30);
  
  // Score based on major accumulation & order flow
  let majorScore = 50;
  if (majorAccumulation > 3000 || largeRatioDiff > 25) majorScore = 92;
  else if (majorAccumulation > 1000 || largeRatioDiff > 10) majorScore = 78;
  else if (majorAccumulation > 0 || largeRatioDiff > 0) majorScore = 62;
  else if (majorAccumulation > -1000 || largeRatioDiff > -10) majorScore = 42;
  else majorScore = 20;

  // 2. --- 外資籌碼動向 (Foreign Investors) ---
  let foreignScore = 50;
  if (foreignNetBuy > 3000 || foreignStreak >= 4) foreignScore = 90;
  else if (foreignNetBuy > 800 || foreignStreak >= 2) foreignScore = 75;
  else if (foreignNetBuy >= 0) foreignScore = 58;
  else if (foreignNetBuy > -1500 || foreignStreak >= -2) foreignScore = 40;
  else foreignScore = 18;

  // 3. --- 投信籌碼動向 (Investment Trust Funds) ---
  let trustScore = 50;
  if (trustNetBuy > 1500 || trustStreak >= 4) trustScore = 94;
  else if (trustNetBuy > 300 || trustStreak >= 2) trustScore = 76;
  else if (trustNetBuy >= 0) trustScore = 56;
  else if (trustNetBuy > -500 || trustStreak >= -2) trustScore = 42;
  else trustScore = 22;

  // 4. --- 散戶籌碼動向 (Retail Investor Dynamic) ---
  // In contrarian chip analysis:
  // When retail small orders are heavily selling and leaving -> Chip is clean/healthy (Bullish for stock!)
  // When retail small orders are FOMO buying at top -> Chip is dirty/overheated (Bearish for stock!)
  const smallRatioDiff = (smallOrderSellRatio || 25) - (smallOrderBuyRatio || 25);
  let retailCleanlinessScore = 50;
  if (smallRatioDiff > 12) retailCleanlinessScore = 88; // 散戶認賠賣出，籌碼高度沉澱
  else if (smallRatioDiff > 2) retailCleanlinessScore = 72; // 散戶觀望偏賣
  else if (smallRatioDiff >= -4) retailCleanlinessScore = 52; // 散戶中立
  else if (smallRatioDiff >= -12) retailCleanlinessScore = 35; // 散戶搶進
  else retailCleanlinessScore = 18; // 散戶瘋狂搶盤，籌碼混亂

  // 5. --- 籌碼集中度指標 (Chip Concentration) ---
  const safeConcentration = typeof majorConcentration === 'number' ? majorConcentration : 45;
  let concentrationScore = Math.max(15, Math.min(95, safeConcentration * 1.25));

  // 6. --- 大單控盤防禦度 (Order Book & Flow Defense) ---
  const totalLarge = (largeOrderBuyRatio || 30) + (largeOrderSellRatio || 30);
  const largeDominance = totalLarge > 0 ? (largeOrderBuyRatio / totalLarge) * 100 : 50;
  let orderDefenseScore = Math.max(15, Math.min(95, Math.round(largeDominance)));

  // Radar Metrics Array (6 dimensions)
  const radarData: ChipRadarMetric[] = [
    {
      subject: '主力鎖碼力',
      shortName: '主力鎖碼',
      actor: 'major',
      actorLabel: '主力大戶',
      score: majorScore,
      benchmark: 50,
      fullMark: 100,
      rawDisplay: `${majorAccumulation > 0 ? `+${majorAccumulation.toLocaleString()}` : majorAccumulation.toLocaleString()} 張`,
      statusLabel: majorScore >= 70 ? '強力鎖碼' : majorScore >= 50 ? '中性偏多' : '逢高調節',
      statusColor: majorScore >= 70 ? '#ef4444' : majorScore >= 50 ? '#f59e0b' : '#10b981',
      description: '反映近20日特大單累積囤貨與今日盤中特大單進出淨額。',
    },
    {
      subject: '外資動能',
      shortName: '外資買盤',
      actor: 'foreign',
      actorLabel: '外資法人',
      score: foreignScore,
      benchmark: 50,
      fullMark: 100,
      rawDisplay: `${foreignNetBuy > 0 ? `+${foreignNetBuy.toLocaleString()}` : foreignNetBuy.toLocaleString()} 張 (${foreignStreak >= 0 ? `連買${foreignStreak}日` : `連賣${Math.abs(foreignStreak)}日`})`,
      statusLabel: foreignScore >= 70 ? '外資搶進' : foreignScore >= 50 ? '溫和買超' : '提款賣超',
      statusColor: foreignScore >= 70 ? '#ef4444' : foreignScore >= 50 ? '#f59e0b' : '#10b981',
      description: '國際資金持股比例、今日買賣超與連續買賣天數趨勢。',
    },
    {
      subject: '投信認養度',
      shortName: '投信認養',
      actor: 'trust',
      actorLabel: '投信基金',
      score: trustScore,
      benchmark: 50,
      fullMark: 100,
      rawDisplay: `${trustNetBuy > 0 ? `+${trustNetBuy.toLocaleString()}` : trustNetBuy.toLocaleString()} 張 (${trustStreak >= 0 ? `連買${trustStreak}日` : `連賣${Math.abs(trustStreak)}日`})`,
      statusLabel: trustScore >= 70 ? '作帳認養' : trustScore >= 50 ? '零星買盤' : '逢高結帳',
      statusColor: trustScore >= 70 ? '#ef4444' : trustScore >= 50 ? '#f59e0b' : '#10b981',
      description: '國內本土投信基金進出軌跡與季底作帳/結帳攻擊力道。',
    },
    {
      subject: '散戶籌碼沉澱',
      shortName: '散戶沉澱',
      actor: 'retail',
      actorLabel: '一般散戶',
      score: retailCleanlinessScore,
      benchmark: 50,
      fullMark: 100,
      rawDisplay: `賣超差 ${smallRatioDiff > 0 ? `+${smallRatioDiff}` : smallRatioDiff}%`,
      statusLabel: retailCleanlinessScore >= 70 ? '散戶退場沉澱' : retailCleanlinessScore >= 50 ? '籌碼中立' : '散戶過熱搶進',
      statusColor: retailCleanlinessScore >= 70 ? '#10b981' : retailCleanlinessScore >= 50 ? '#06b6d4' : '#ef4444',
      description: '反向指標：散戶賣出退出代表籌碼流向主力，沉澱度越高後續漲勢越紮實。',
    },
    {
      subject: '籌碼集中度',
      shortName: '籌碼集中',
      actor: 'major',
      actorLabel: '集中度',
      score: Math.round(concentrationScore),
      benchmark: 50,
      fullMark: 100,
      rawDisplay: `${safeConcentration}%`,
      statusLabel: concentrationScore >= 65 ? '高度集中' : concentrationScore >= 45 ? '適度集中' : '籌碼發散',
      statusColor: concentrationScore >= 65 ? '#ef4444' : concentrationScore >= 45 ? '#f59e0b' : '#64748b',
      description: '前十大券商與主力分點佔總流通籌碼比率。',
    },
    {
      subject: '大單控盤強度',
      shortName: '大單力道',
      actor: 'major',
      actorLabel: '大單強弱',
      score: orderDefenseScore,
      benchmark: 50,
      fullMark: 100,
      rawDisplay: `大單買比 ${largeOrderBuyRatio}%`,
      statusLabel: orderDefenseScore >= 60 ? '多方控盤' : orderDefenseScore >= 45 ? '多空拉鋸' : '空方施壓',
      statusColor: orderDefenseScore >= 60 ? '#ef4444' : orderDefenseScore >= 45 ? '#f59e0b' : '#10b981',
      description: '盤中特大單與大單真實委託撮合多空比重。',
    },
  ];

  // 4 Actors Balance Cards
  const actors: ChipActorBalance[] = [
    {
      actor: 'major',
      actorName: '主力大戶 (Smart Money)',
      roleDescription: '主導波段趨勢與關鍵價位攻防',
      bullScore: majorScore,
      bearScore: 100 - majorScore,
      netStrength: majorScore - 50,
      statusTag: majorScore >= 70 ? '主力重倉鎖碼' : majorScore >= 50 ? '主力區間盤整' : '主力逢高倒貨',
      badgeClass: majorScore >= 70 ? 'bg-red-500/20 text-red-400 border-red-500/40' : majorScore >= 50 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      color: '#ef4444',
      details: `20日累計囤貨 ${majorAccumulation > 0 ? `+${majorAccumulation.toLocaleString()}` : majorAccumulation.toLocaleString()} 張，今日大單買進 ${largeOrderBuyRatio}% vs 賣出 ${largeOrderSellRatio}%。`,
    },
    {
      actor: 'foreign',
      actorName: '外資法人 (Foreign Funds)',
      roleDescription: '左右指數權值與中長線資金偏好',
      bullScore: foreignScore,
      bearScore: 100 - foreignScore,
      netStrength: foreignScore - 50,
      statusTag: foreignScore >= 70 ? '外資積極作多' : foreignScore >= 50 ? '外資觀望持平' : '外資持續調節',
      badgeClass: foreignScore >= 70 ? 'bg-red-500/20 text-red-400 border-red-500/40' : foreignScore >= 50 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      color: '#f59e0b',
      details: `今日買賣超 ${foreignNetBuy > 0 ? `+${foreignNetBuy.toLocaleString()}` : foreignNetBuy.toLocaleString()} 張，持股比例 ${foreignHoldingRatio}% (${foreignStreak >= 0 ? `連買 ${foreignStreak} 日` : `連賣 ${Math.abs(foreignStreak)} 日`})。`,
    },
    {
      actor: 'trust',
      actorName: '投信基金 (Domestic Trust)',
      roleDescription: '中小型股主升段推手與波段認養',
      bullScore: trustScore,
      bearScore: 100 - trustScore,
      netStrength: trustScore - 50,
      statusTag: trustScore >= 70 ? '投信重點認養' : trustScore >= 50 ? '投信步調平緩' : '投信逢高結帳',
      badgeClass: trustScore >= 70 ? 'bg-red-500/20 text-red-400 border-red-500/40' : trustScore >= 50 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      color: '#c084fc',
      details: `今日買賣超 ${trustNetBuy > 0 ? `+${trustNetBuy.toLocaleString()}` : trustNetBuy.toLocaleString()} 張 (${trustStreak >= 0 ? `連買 ${trustStreak} 日` : `連賣 ${Math.abs(trustStreak)} 日`})。`,
    },
    {
      actor: 'retail',
      actorName: '散戶游資 (Retail Sentiment)',
      roleDescription: '市場反向指標：散戶賣代表主力洗盤完畢',
      bullScore: retailCleanlinessScore,
      bearScore: 100 - retailCleanlinessScore,
      netStrength: retailCleanlinessScore - 50,
      statusTag: retailCleanlinessScore >= 70 ? '散戶離場·籌碼乾淨' : retailCleanlinessScore >= 50 ? '散戶持平·浮額常態' : '散戶追高·籌碼凌亂',
      badgeClass: retailCleanlinessScore >= 70 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : retailCleanlinessScore >= 50 ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-red-500/20 text-red-400 border-red-500/40',
      color: '#38bdf8',
      details: `小單賣出比重 ${(smallOrderSellRatio || 25)}% vs 買進 ${(smallOrderBuyRatio || 25)}%，散戶態度${smallRatioDiff > 0 ? '偏向退場觀望' : '積極進場接刀'}。`,
    },
  ];

  // Composite Chip Flow Score (Weighted: Major 35%, Foreign 25%, Trust 20%, Retail Cleanliness 20%)
  const compositeScore = Math.round(
    majorScore * 0.35 +
    foreignScore * 0.25 +
    trustScore * 0.20 +
    retailCleanlinessScore * 0.20
  );

  let compositeStatus = '多頭主力集結';
  let compositeTagClass = 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse';
  let structureDiagnosis = '主力與三大法人同向偏多，散戶浮額沉澱洗淨，籌碼集中度優異。';
  let tacticalSummary = '籌碼多方結構堅固，回測均線皆為優質買點，建議順勢做多波段續抱。';

  if (compositeScore >= 75) {
    compositeStatus = '強勢多頭鎖碼 (Strong Bullish)';
    compositeTagClass = 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse';
    structureDiagnosis = `主力大戶（${majorScore}分）與法人站在強勁買方，散戶小單籌碼沉澱（${retailCleanlinessScore}分），多空動能由主力完全主導。`;
    tacticalSummary = '籌碼面無明顯暗湧賣壓，建議以 5 日線或主力均價線作為移動停利點，享受主升段波段利潤。';
  } else if (compositeScore >= 58) {
    compositeStatus = '多方結構盤堅 (Mild Bullish)';
    compositeTagClass = 'bg-amber-500/20 text-amber-300 border border-amber-500/40';
    structureDiagnosis = `主力與法人籌碼偏向溫和多方，散戶進出平穩，籌碼處於良性換手推升階段。`;
    tacticalSummary = '走勢穩健推進，建議嚴守月線與主力成本線操作，未見大單異常倒貨前持續抱牢。';
  } else if (compositeScore >= 42) {
    compositeStatus = '多空對峙拉鋸 (Neutral Consolidation)';
    compositeTagClass = 'bg-slate-800 text-slate-300 border border-slate-700';
    structureDiagnosis = `土洋可能出現對作（例如外資賣、投信買），或主力高檔暫歇盤整，多空力量旗鼓相當。`;
    tacticalSummary = '區間震盪整理格局，建議採取低買高賣箱型思維，避免於箱頂追高。';
  } else {
    compositeStatus = '空方調節警示 (Bearish Distribution)';
    compositeTagClass = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
    structureDiagnosis = `主力或外資呈現高檔調節姿態，且散戶小單有逆勢承接跡象，籌碼有從大戶流向散戶的散發風險。`;
    tacticalSummary = '主力籌碼防守意志鬆動，若跌破關鍵支撐需嚴格執行停損，切忌逢低盲目攤平。';
  }

  return {
    compositeScore,
    compositeStatus,
    compositeTagClass,
    structureDiagnosis,
    tacticalSummary,
    radarData,
    actors,
  };
}
