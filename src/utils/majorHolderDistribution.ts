import { StockData } from '../types/stock';

export type HolderCategory = 'major' | 'medium' | 'retail';

export interface HolderTierData {
  id: HolderCategory;
  name: string;
  shortName: string;
  shareBracket: string;         // e.g. "≥ 400 張"
  ratio: number;                // 當前持股比例 %
  ratio30dPrior: number;        // 30 日前持股比例 %
  change30d: number;            // 近 30 日變化率 (百分點, e.g. +2.45%)
  sharesEstimateLots: number;   // 估算持股張數 (張)
  marketValueBillion: number;   // 估算持股市值 (億元 NT$)
  holderCountEstimate: number;  // 估算股東人數 (人)
  holderCountChange30d: number; // 估算人數增減 (人)
  color: string;
  strokeColor: string;
  badgeClass: string;
  statusLabel: string;
  description: string;
}

export interface HoldingTrendPoint {
  periodLabel: string; // e.g. "30天前", "24天前", ... "今日"
  date: string;
  majorRatio: number;
  mediumRatio: number;
  retailRatio: number;
  price: number;
}

export interface MajorHolderDistributionAnalysis {
  tiers: HolderTierData[];
  totalSharesLots: number;       // 總發行張數估計 (張)
  totalMarketValueBillion: number;// 總發行市值估計 (億元)
  trendPoints: HoldingTrendPoint[]; // 近 30 日每 6 天走勢
  concentrationTier: 'ultra_high' | 'high' | 'moderate' | 'low';
  concentrationLabel: string;
  concentrationBadge: string;
  flowPattern: 'smart_accumulation' | 'smart_distribution' | 'consolidation_washout';
  flowPatternLabel: string;
  flowPatternBadge: string;
  netMajorLotDelta30d: number;  // 近 30 日主力淨增減張數 (張)
  netRetailLotDelta30d: number; // 近 30 日散戶淨增減張數 (張)
  turnoverFlowSummary: string;
  diagnosis: string;
  tacticalAdvice: string;
}

/**
 * Generate 30-day major shareholder holding distribution & equity structure dynamics
 */
export function calculateMajorHolderDistribution(stock: StockData): MajorHolderDistributionAnalysis {
  const currentPrice = stock.price;

  // Deterministic seed for repeatable, realistic calculations per stock
  let seed = stock.symbol.split('').reduce((acc, ch) => acc + ch.charCodeAt(0) * 19, 97);
  const pseudoRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  // Estimate total capital volume (張): based on volume and price
  // Blue chips (like 2330) have higher share counts, small caps lower
  const baseLots = Math.max(80000, Math.round((stock.volume * (300 + pseudoRandom() * 400))));
  const totalMarketValueBillion = Number(((baseLots * 1000 * currentPrice) / 100000000).toFixed(1));

  // Determine baseline major ratio from stock.majorConcentration or foreignHoldingRatio
  let baseMajorRatio = stock.majorConcentration 
    ? Math.min(85, Math.max(38, stock.majorConcentration * 1.05))
    : (stock.foreignHoldingRatio ? Math.min(82, Math.max(42, stock.foreignHoldingRatio * 0.95)) : 58.5);

  baseMajorRatio = Number(baseMajorRatio.toFixed(1));

  // Determine 30-day change trend (+/- pp)
  // Positive if majorAccumulation > 0 or positive orderflow
  const flowBias = (stock.majorAccumulation || 1500) > 0 ? 1 : -0.7;
  const majorDelta30d = Number(((0.8 + pseudoRandom() * 2.4) * flowBias).toFixed(2));
  const priorMajorRatio = Number((baseMajorRatio - majorDelta30d).toFixed(1));

  // Medium holders ratio (100 ~ 400 lots)
  const remainingRatio = 100 - baseMajorRatio;
  const mediumRatio = Number((remainingRatio * (0.42 + pseudoRandom() * 0.16)).toFixed(1));
  const mediumDelta30d = Number(((pseudoRandom() - 0.45) * 1.2).toFixed(2));
  const priorMediumRatio = Number((mediumRatio - mediumDelta30d).toFixed(1));

  // Retail holders ratio (< 100 lots)
  const retailRatio = Number((100 - baseMajorRatio - mediumRatio).toFixed(1));
  const retailDelta30d = Number((-majorDelta30d - mediumDelta30d).toFixed(2));
  const priorRetailRatio = Number((100 - priorMajorRatio - priorMediumRatio).toFixed(1));

  // Estimated shares per tier (張)
  const majorShares = Math.round((baseLots * baseMajorRatio) / 100);
  const mediumShares = Math.round((baseLots * mediumRatio) / 100);
  const retailShares = baseLots - majorShares - mediumShares;

  // Market values
  const majorValue = Number(((majorShares * 1000 * currentPrice) / 100000000).toFixed(1));
  const mediumValue = Number(((mediumShares * 1000 * currentPrice) / 100000000).toFixed(1));
  const retailValue = Number(((retailShares * 1000 * currentPrice) / 100000000).toFixed(1));

  // Shareholder counts (人)
  // Typically, 400+ lot holders are small in number (50~500), retail are huge (10,000~150,000)
  const majorCount = Math.max(15, Math.round(120 + pseudoRandom() * 250));
  const majorCountChange = majorDelta30d > 0 ? Math.round(3 + pseudoRandom() * 15) : -Math.round(2 + pseudoRandom() * 10);

  const mediumCount = Math.max(100, Math.round(900 + pseudoRandom() * 1800));
  const mediumCountChange = mediumDelta30d > 0 ? Math.round(15 + pseudoRandom() * 45) : -Math.round(10 + pseudoRandom() * 35);

  const retailCount = Math.max(5000, Math.round(25000 + pseudoRandom() * 65000));
  const retailCountChange = -majorCountChange * Math.round(35 + pseudoRandom() * 50);

  // Status labels & badges
  const majorStatusLabel = majorDelta30d >= 1.5 
    ? '強勢收網鎖碼' 
    : majorDelta30d > 0 
    ? '持續穩健增持' 
    : majorDelta30d >= -1.0 
    ? '高檔籌碼持平' 
    : '波段調節派發';

  const mediumStatusLabel = mediumDelta30d > 0.5 
    ? '實力戶積極跟進' 
    : mediumDelta30d >= -0.5 
    ? '中性籌碼觀望' 
    : '中線籌碼減退';

  const retailStatusLabel = retailDelta30d <= -1.2 
    ? '浮額急劇沉澱洗淨' 
    : retailDelta30d < 0 
    ? '散戶微幅退場' 
    : retailDelta30d < 1.2 
    ? '散單持股持平' 
    : '散戶追價接盤湧入';

  const tiers: HolderTierData[] = [
    {
      id: 'major',
      name: '主力大戶 (400張以上大戶)',
      shortName: '主力大戶',
      shareBracket: '≥ 400 張 (千張大戶)',
      ratio: baseMajorRatio,
      ratio30dPrior: priorMajorRatio,
      change30d: majorDelta30d,
      sharesEstimateLots: majorShares,
      marketValueBillion: majorValue,
      holderCountEstimate: majorCount,
      holderCountChange30d: majorCountChange,
      color: '#f43f5e', // Rose / Red for Bullish Smart Money
      strokeColor: '#fb7185',
      badgeClass: majorDelta30d >= 0 ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      statusLabel: majorStatusLabel,
      description: '包含外資投信、公司派核心大股東與千張超級大戶，為股價波段趨勢之權威造市主導者。',
    },
    {
      id: 'medium',
      name: '中實戶 (100~400張實力戶)',
      shortName: '中實戶',
      shareBracket: '100 ~ 399 張 (實力戶)',
      ratio: mediumRatio,
      ratio30dPrior: priorMediumRatio,
      change30d: mediumDelta30d,
      sharesEstimateLots: mediumShares,
      marketValueBillion: mediumValue,
      holderCountEstimate: mediumCount,
      holderCountChange30d: mediumCountChange,
      color: '#38bdf8', // Sky Blue
      strokeColor: '#7dd3fc',
      badgeClass: mediumDelta30d >= 0 ? 'bg-sky-500/20 text-sky-300 border-sky-500/40' : 'bg-slate-700/50 text-slate-300 border-slate-600',
      statusLabel: mediumStatusLabel,
      description: '包含地方主力分點、家族基金、高資產投資人與中型法人，具備高度敏銳的波段獲利敏感度。',
    },
    {
      id: 'retail',
      name: '散戶 (100張以下散單籌碼)',
      shortName: '一般散戶',
      shareBracket: '< 100 張 (零股與散戶)',
      ratio: retailRatio,
      ratio30dPrior: priorRetailRatio,
      change30d: retailDelta30d,
      sharesEstimateLots: retailShares,
      marketValueBillion: retailValue,
      holderCountEstimate: retailCount,
      holderCountChange30d: retailCountChange,
      color: '#10b981', // Emerald Green
      strokeColor: '#34d399',
      badgeClass: retailDelta30d <= 0 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      statusLabel: retailStatusLabel,
      description: '廣大零售散戶與零股交易人，籌碼流動性高但抗震性弱，常作為市場情緒與籌碼沈澱之逆向指標。',
    },
  ];

  // Generate 6-point trend timeline across past 30 days (T-30, T-24, T-18, T-12, T-6, Today)
  const trendPoints: HoldingTrendPoint[] = [];
  const intervals = [
    { label: '30天前', ratioProgress: 0, priceProgress: 0 },
    { label: '24天前', ratioProgress: 0.2, priceProgress: 0.18 },
    { label: '18天前', ratioProgress: 0.42, priceProgress: 0.4 },
    { label: '12天前', ratioProgress: 0.65, priceProgress: 0.62 },
    { label: '6天前', ratioProgress: 0.85, priceProgress: 0.82 },
    { label: '今日最新', ratioProgress: 1.0, priceProgress: 1.0 },
  ];

  const startPrice = Number((currentPrice * (majorDelta30d >= 0 ? 0.94 : 1.05)).toFixed(1));

  intervals.forEach((step) => {
    const curMajor = Number((priorMajorRatio + majorDelta30d * step.ratioProgress).toFixed(1));
    const curMedium = Number((priorMediumRatio + mediumDelta30d * step.ratioProgress).toFixed(1));
    const curRetail = Number((100 - curMajor - curMedium).toFixed(1));
    const curPrice = Number((startPrice + (currentPrice - startPrice) * step.priceProgress).toFixed(1));

    trendPoints.push({
      periodLabel: step.label,
      date: step.label,
      majorRatio: curMajor,
      mediumRatio: curMedium,
      retailRatio: curRetail,
      price: curPrice,
    });
  });

  // Concentration Tier
  let concentrationTier: 'ultra_high' | 'high' | 'moderate' | 'low' = 'high';
  let concentrationLabel = '籌碼高度集中 (籌碼沉澱穩定)';
  let concentrationBadge = 'bg-rose-500/25 text-rose-300 border-rose-500/50 shadow-rose-950/30 shadow-sm';

  if (baseMajorRatio >= 72) {
    concentrationTier = 'ultra_high';
    concentrationLabel = '極高度籌碼集中 (大戶絕對強勢控盤)';
    concentrationBadge = 'bg-rose-500/25 text-rose-300 border-rose-500/50 shadow-rose-950/30 shadow-sm animate-pulse';
  } else if (baseMajorRatio >= 55) {
    concentrationTier = 'high';
    concentrationLabel = '籌碼高度集中 (籌碼沉澱穩定)';
    concentrationBadge = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  } else if (baseMajorRatio >= 40) {
    concentrationTier = 'moderate';
    concentrationLabel = '股權結構均衡 (多空力量平衡)';
    concentrationBadge = 'bg-sky-500/20 text-sky-300 border-sky-500/40';
  } else {
    concentrationTier = 'low';
    concentrationLabel = '籌碼相對發散 (散戶浮額偏高)';
    concentrationBadge = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
  }

  // Flow pattern
  let flowPattern: 'smart_accumulation' | 'smart_distribution' | 'consolidation_washout' = 'smart_accumulation';
  let flowPatternLabel = '籌碼由散戶流向大戶 · 主力大舉鎖碼';
  let flowPatternBadge = 'bg-rose-500/20 text-rose-300 border-rose-500/40';

  if (majorDelta30d > 0.4 && retailDelta30d < -0.4) {
    flowPattern = 'smart_accumulation';
    flowPatternLabel = '籌碼由散戶流向大戶 · 主力大舉吸籌鎖碼';
    flowPatternBadge = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
  } else if (majorDelta30d < -0.4 && retailDelta30d > 0.4) {
    flowPattern = 'smart_distribution';
    flowPatternLabel = '大戶高檔派發 · 籌碼流向散戶追價接盤';
    flowPatternBadge = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  } else {
    flowPattern = 'consolidation_washout';
    flowPatternLabel = '籌碼均衡洗盤 · 浮額收斂中性整理';
    flowPatternBadge = 'bg-sky-500/20 text-sky-300 border-sky-500/40';
  }

  const netMajorLotDelta30d = Math.round((baseLots * majorDelta30d) / 100);
  const netRetailLotDelta30d = Math.round((baseLots * retailDelta30d) / 100);

  const turnoverFlowSummary = `近 30 日主力大戶持股比例變化 ${majorDelta30d >= 0 ? '+' : ''}${majorDelta30d}%（約淨增減 ${Math.abs(netMajorLotDelta30d).toLocaleString()} 張），散戶持股比例變化 ${retailDelta30d >= 0 ? '+' : ''}${retailDelta30d}%（約淨增減 ${Math.abs(netRetailLotDelta30d).toLocaleString()} 張）。`;

  let diagnosis = '';
  let tacticalAdvice = '';

  if (flowPattern === 'smart_accumulation') {
    diagnosis = `當前股權結構呈現經典「籌碼大換手」格局：主力大戶持股達 ${baseMajorRatio}%，近 30 日持續吸納籌碼 +${majorDelta30d} 個百分點，而散戶人數同期間驟減約 ${Math.abs(retailCountChange).toLocaleString()} 人，持股比例下滑 ${Math.abs(retailDelta30d)}%。這表明市場浮額已被主力強勢洗出，籌碼高度集中於具備雄厚資金之特定法人手中，不易因盤勢震盪而失控。`;
    tacticalAdvice = `跟單策略明確：主力籌碼高度鎖定且散戶退場，是拉升行情發動的最典型前兆。只要主力大戶持股比例未見驟降，回測均線或主力成本線皆屬安全之加碼或布局時機。`;
  } else if (flowPattern === 'smart_distribution') {
    diagnosis = `需高度警戒籌碼分散風險：主力大戶近 30 日持股佔比下降 ${Math.abs(majorDelta30d)} 個百分點，大戶人數減少；而散戶持股比例反向增加 +${retailDelta30d}%，散戶人數暴增約 ${retailCountChange.toLocaleString()} 人。顯示股價在高檔震盪之際，主力正在透過大單分批調節倒貨，籌碼由極度集中的少數人流向追價的散戶。`;
    tacticalAdvice = `防禦避險指引：當散戶籌碼激增、主力大戶逐步退場時，上方沉重賣壓將隨著追高套牢籌碼累積而持續加劇。不宜在此時盲目追價，持股者應設定嚴格停利點，逢反彈適度獲利了結。`;
  } else {
    diagnosis = `目前股權結構處於健康的中度沉澱整理期：主力大戶持股比例為 ${baseMajorRatio}%，近 30 日變動率在 ±1% 內溫和震盪，中實戶與散戶進出亦處於均衡拉鋸。籌碼結構尚未出現單邊倒貨或爆量追價的極端現象，市場籌碼處於良性換手與蓄勢待發階段。`;
    tacticalAdvice = `盤整應對策略：關注主力大戶持股佔比是否突破近 30 日新高，並搭配五日主力累積量與突破訊號，一旦大戶持股比再度連續跳升，即為波段主升段展開的重要確立訊號。`;
  }

  return {
    tiers,
    totalSharesLots: baseLots,
    totalMarketValueBillion,
    trendPoints,
    concentrationTier,
    concentrationLabel,
    concentrationBadge,
    flowPattern,
    flowPatternLabel,
    flowPatternBadge,
    netMajorLotDelta30d,
    netRetailLotDelta30d,
    turnoverFlowSummary,
    diagnosis,
    tacticalAdvice,
  };
}
