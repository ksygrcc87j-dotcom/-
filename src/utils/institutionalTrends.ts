import { StockData } from '../types/stock';

export interface VolumePriceBracket {
  minPrice: number;
  maxPrice: number;
  label: string;
  volumeShares: number;
  percentage: number;
  isPoc: boolean; // Point of Control (最大籌碼堆疊峰)
  isCurrentPriceInside: boolean;
  isCostInside: boolean;
}

export interface MajorCostDay {
  date: string;
  dayIndex: number;
  price: number;
  high: number;
  low: number;
  majorCost: number;
  costUpperBand: number; // +2.5%
  costLowerBand: number; // -2.5%
  volume: number;
  isUp: boolean;
}

export interface MajorCostTrajectoryData {
  days: MajorCostDay[];
  volumeBrackets: VolumePriceBracket[];
  currentPrice: number;
  currentMajorCost: number;
  costLowerZone: number;
  costUpperZone: number;
  pocBracket: VolumePriceBracket;
  supportLevel: number;
  resistanceLevel: number;
  statusDiagnosis: string;
  statusBadge: string;
  statusBadgeColor: string;
}

export interface InstitutionalTrendDay {
  date: string;
  dayIndex: number;
  price: number;
  foreignNet: number;
  trustNet: number;
  dealerNet: number;
  totalNet: number;
  foreignCum: number;
  trustCum: number;
  majorCum: number;
  concentrationRate: number; // 籌碼集中度 %
}

export interface InstitutionalTrendSummary {
  days: InstitutionalTrendDay[];
  currentPrice: number;
  foreignTotal20d: number;
  trustTotal20d: number;
  dealerTotal20d: number;
  majorTotal20d: number;
  latestConcentration: number;
  concentrationTrend: 'rising' | 'neutral' | 'falling';
  concentrationLabel: string;
  institutionalCohesion: string;
}

/**
 * Generate 60-day major cost trajectory & volume-at-price profile
 */
export function generateMajorCostTrajectory(stock: StockData): MajorCostTrajectoryData {
  const currentPrice = stock.price;
  const majorCost = stock.majorCost || Number((currentPrice * 0.98).toFixed(1));
  const costLowerZone = Number((majorCost * 0.975).toFixed(1));
  const costUpperZone = Number((majorCost * 1.025).toFixed(1));

  let seed = stock.symbol.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 101);
  const pseudoRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  // Generate 60 trading days
  const tradingDates: string[] = [];
  const curr = new Date();
  let d = new Date(curr);
  while (tradingDates.length < 60) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      tradingDates.unshift(`${mm}/${dd}`);
    }
    d.setDate(d.getDate() - 1);
  }

  const days: MajorCostDay[] = [];
  // Trend from starting cost 60 days ago towards current cost
  const startCost = stock.ma60 ? stock.ma60 * 0.98 : majorCost * 0.94;
  const costDelta = majorCost - startCost;

  for (let i = 0; i < 60; i++) {
    const isToday = i === 59;
    const progress = i / 59;
    const dynamicCost = Number((startCost + costDelta * Math.pow(progress, 0.95) + (pseudoRandom() - 0.49) * (majorCost * 0.008)).toFixed(1));
    const curCost = isToday ? majorCost : dynamicCost;

    let p = currentPrice;
    let h = stock.highPrice || currentPrice;
    let l = stock.lowPrice || currentPrice;
    let vol = stock.volume || 10000;

    if (!isToday) {
      // Dynamic simulated historical price swinging around major cost
      const baseExpected = curCost * (1 + (progress - 0.5) * 0.08 + (pseudoRandom() - 0.5) * 0.04);
      p = Number(Math.max(1, baseExpected).toFixed(1));
      h = Number((p * (1 + pseudoRandom() * 0.018)).toFixed(1));
      l = Number((p * (1 - pseudoRandom() * 0.018)).toFixed(1));
      vol = Math.floor(vol * (0.6 + pseudoRandom() * 0.8));
    }

    days.push({
      date: tradingDates[i] || `D-${i + 1}`,
      dayIndex: i + 1,
      price: p,
      high: h,
      low: l,
      majorCost: curCost,
      costUpperBand: Number((curCost * 1.025).toFixed(1)),
      costLowerBand: Number((curCost * 0.975).toFixed(1)),
      volume: vol,
      isUp: p >= curCost,
    });
  }

  // Calculate Volume-by-Price brackets across the 60 days
  const allPrices = days.map((d) => d.price);
  const minP = Math.min(...allPrices) * 0.99;
  const maxP = Math.max(...allPrices) * 1.01;
  const numBrackets = 10;
  const step = (maxP - minP) / numBrackets;

  const rawBrackets: { minPrice: number; maxPrice: number; label: string; volumeShares: number }[] = [];
  for (let b = 0; b < numBrackets; b++) {
    const bMin = Number((minP + b * step).toFixed(1));
    const bMax = Number((minP + (b + 1) * step).toFixed(1));
    rawBrackets.push({
      minPrice: bMin,
      maxPrice: bMax,
      label: `${bMin} ~ ${bMax}`,
      volumeShares: 0,
    });
  }

  // Accumulate volume into brackets
  for (const day of days) {
    for (const br of rawBrackets) {
      if (day.price >= br.minPrice && (day.price < br.maxPrice || br.maxPrice >= maxP - 0.1)) {
        br.volumeShares += day.volume;
        break;
      }
    }
  }

  const totalVol = rawBrackets.reduce((acc, b) => acc + b.volumeShares, 0) || 1;
  const maxBracketVol = Math.max(...rawBrackets.map((b) => b.volumeShares));

  const volumeBrackets: VolumePriceBracket[] = rawBrackets.map((b) => {
    const isPoc = b.volumeShares === maxBracketVol;
    const isCurrentPriceInside = currentPrice >= b.minPrice && currentPrice <= b.maxPrice;
    const isCostInside = majorCost >= b.minPrice && majorCost <= b.maxPrice;
    return {
      ...b,
      percentage: Number(((b.volumeShares / totalVol) * 100).toFixed(1)),
      isPoc,
      isCurrentPriceInside,
      isCostInside,
    };
  });

  const pocBracket = volumeBrackets.find((b) => b.isPoc) || volumeBrackets[0];
  const supportLevel = Number(Math.min(costLowerZone, pocBracket.minPrice).toFixed(1));
  const resistanceLevel = Number(Math.max(currentPrice * 1.06, pocBracket.maxPrice * 1.05).toFixed(1));

  // Diagnostic interpretation
  let statusDiagnosis = '';
  let statusBadge = '';
  let statusBadgeColor = '';

  const costDiffPct = ((currentPrice - majorCost) / majorCost) * 100;
  if (costDiffPct >= 4.0) {
    statusBadge = '🔥 波段獲利脫離成本區';
    statusBadgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    statusDiagnosis = `現價 $${currentPrice} 元已有效拉開主力持倉成本線 $${majorCost} 元（溢價 +${costDiffPct.toFixed(1)}%），近 60 日最大籌碼堆疊峰落在 ${pocBracket.label} 元，構成強力下檔防線，主力控盤獲利拉抬意向明確。`;
  } else if (costDiffPct >= -1.5 && costDiffPct < 4.0) {
    statusBadge = '🎯 貼近主力核心成本護盤區';
    statusBadgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    statusDiagnosis = `現價 $${currentPrice} 元緊貼近 60 日主力平均持股成本 $${majorCost} 元（區間 $${costLowerZone} ~ $${costUpperZone} 元），此處為大戶建倉成本重鎮，具備強大下檔支撐力道與拉回買盤保護。`;
  } else {
    statusBadge = '⚠️ 跌破主力成本套牢區';
    statusBadgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    statusDiagnosis = `現價 $${currentPrice} 元跌破主力持倉成本均價 $${majorCost} 元（折價 ${costDiffPct.toFixed(1)}%），上方 ${pocBracket.label} 元大量密集區將轉為反彈壓力，需關注主力是否有逢低自救拉抬買單湧入。`;
  }

  return {
    days,
    volumeBrackets,
    currentPrice,
    currentMajorCost: majorCost,
    costLowerZone,
    costUpperZone,
    pocBracket,
    supportLevel,
    resistanceLevel,
    statusDiagnosis,
    statusBadge,
    statusBadgeColor,
  };
}

/**
 * Generate 20-day institutional and major holdings comparative trend data
 */
export function generateInstitutionalTrends(stock: StockData): InstitutionalTrendSummary {
  const currentPrice = stock.price;
  const majorTotal = stock.majorAccumulation || 15000;
  const concentration = stock.majorConcentration || 28.5;

  let seed = stock.symbol.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 133);
  const pseudoRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  // Generate 20 trading dates
  const tradingDates: string[] = [];
  const curr = new Date();
  let d = new Date(curr);
  while (tradingDates.length < 20) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      tradingDates.unshift(`${mm}/${dd}`);
    }
    d.setDate(d.getDate() - 1);
  }

  const days: InstitutionalTrendDay[] = [];
  let foreignCum = 0;
  let trustCum = 0;
  let majorCum = 0;

  for (let i = 0; i < 20; i++) {
    const isToday = i === 19;
    const progress = i / 19;

    let fNet = isToday && stock.foreignNetBuy !== undefined ? stock.foreignNetBuy : Math.round((pseudoRandom() - 0.46) * 4500);
    let tNet = isToday && stock.trustNetBuy !== undefined ? stock.trustNetBuy : Math.round((pseudoRandom() - 0.44) * 2200);
    let dNet = isToday && stock.dealerNetBuy !== undefined ? stock.dealerNetBuy : Math.round((pseudoRandom() - 0.5) * 1200);

    // If day matches institutionalHistory
    if (stock.institutionalHistory && stock.institutionalHistory[i]) {
      const hist = stock.institutionalHistory[i];
      fNet = hist.foreign;
      tNet = hist.trust;
      dNet = hist.dealer;
    }

    const totalNet = fNet + tNet + dNet;
    foreignCum += fNet;
    trustCum += tNet;
    majorCum += Math.round(fNet * 0.7 + tNet * 0.9 + (pseudoRandom() - 0.45) * 800);

    // Price trajectory
    const dayPrice = isToday ? currentPrice : Number((currentPrice * (0.94 + progress * 0.06 + (pseudoRandom() - 0.5) * 0.02)).toFixed(1));
    const conc = Number((concentration - (1 - progress) * 3.5 + (pseudoRandom() - 0.5) * 0.8).toFixed(1));

    days.push({
      date: tradingDates[i] || `D-${i + 1}`,
      dayIndex: i + 1,
      price: dayPrice,
      foreignNet: fNet,
      trustNet: tNet,
      dealerNet: dNet,
      totalNet,
      foreignCum,
      trustCum,
      majorCum,
      concentrationRate: Math.max(10, conc),
    });
  }

  const foreignTotal20d = days.reduce((acc, d) => acc + d.foreignNet, 0);
  const trustTotal20d = days.reduce((acc, d) => acc + d.trustNet, 0);
  const dealerTotal20d = days.reduce((acc, d) => acc + d.dealerNet, 0);
  const majorTotal20d = majorTotal;

  const firstConc = days[0].concentrationRate;
  const latestConcentration = days[days.length - 1].concentrationRate;
  const concDiff = latestConcentration - firstConc;

  let concentrationTrend: InstitutionalTrendSummary['concentrationTrend'] = 'neutral';
  let concentrationLabel = '籌碼集中度穩定';
  if (concDiff >= 1.0) {
    concentrationTrend = 'rising';
    concentrationLabel = `籌碼顯著集中 (+${concDiff.toFixed(1)}%) · 大戶持續鎖碼`;
  } else if (concDiff <= -1.0) {
    concentrationTrend = 'falling';
    concentrationLabel = `籌碼散落調節 (${concDiff.toFixed(1)}%) · 散戶接手換手`;
  }

  let institutionalCohesion = '土洋對作';
  if (foreignTotal20d > 0 && trustTotal20d > 0) {
    institutionalCohesion = '🔥 外資投信土洋同買齊力作多';
  } else if (foreignTotal20d < 0 && trustTotal20d < 0) {
    institutionalCohesion = '⚠️ 外資投信齊步調節賣出';
  } else if (foreignTotal20d > 0 && trustTotal20d < 0) {
    institutionalCohesion = '外資加碼 · 投信調節';
  } else {
    institutionalCohesion = '投信認養加碼 · 外資換手';
  }

  return {
    days,
    currentPrice,
    foreignTotal20d,
    trustTotal20d,
    dealerTotal20d,
    majorTotal20d,
    latestConcentration,
    concentrationTrend,
    concentrationLabel,
    institutionalCohesion,
  };
}
