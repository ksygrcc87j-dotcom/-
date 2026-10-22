import { StockData } from '../types/stock';

export type MajorChipStatus = 
  | 'heavy_accumulate'    // 強力佈局 (> +2000張)
  | 'moderate_accumulate' // 溫和加碼 (+800 ~ +2000張)
  | 'light_accumulate'    // 輕度偏多 (+200 ~ +800張)
  | 'neutral'             // 區間盤整 (-200 ~ +200張)
  | 'light_distribute'    // 輕度調節 (-200 ~ -800張)
  | 'heavy_distribute';   // 主力倒貨 (< -800張)

export interface DailyMajorChipFlow {
  date: string;
  dayNumber: number; // 1 to 20
  netShares: number; // 當日主力買賣超 (張)
  cumulativeShares: number; // 當日為止累計囤貨張數 (張)
  status: MajorChipStatus;
  statusLabel: string;
  intensity: number; // -3 to +3
  color: string; // Hex color for SVG/dots
  bgClass: string;
  borderClass: string;
  textClass: string;
}

export interface MajorChipHeatmapSummary {
  days: DailyMajorChipFlow[];
  totalAccumulation: number;
  accumulation5d: number;
  accumulateDays: number;
  neutralDays: number;
  distributeDays: number;
  overallPhase: 'accumulating' | 'consolidating' | 'dumping';
  phaseTitle: string;
  phaseBadgeClass: string;
  diagnosis: string;
  peakCumulative: number;
  minCumulative: number;
}

/**
 * Generate a realistic, 20-day institutional major chip accumulation dataset
 * matching the stock's majorAccumulation, majorAccumulation5d, and orderFlow.
 */
export function generate20DayMajorFlow(stock: StockData): MajorChipHeatmapSummary {
  const totalAcc = stock.majorAccumulation || 0;
  const acc5d = stock.majorAccumulation5d || Math.round(totalAcc * 0.35);
  const accPrior15d = totalAcc - acc5d;

  // Use symbol seed for consistency
  let seed = stock.symbol.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 77);
  const pseudoRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  // Generate trading dates backwards from current date
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

  // If institutionalHistory exists, map known days
  const knownHistoryMap: Record<string, number> = {};
  if (Array.isArray(stock.institutionalHistory)) {
    for (const h of stock.institutionalHistory) {
      knownHistoryMap[h.date] = h.total;
    }
  }

  // Distribute the accumulation across 20 days with natural fluctuations
  const dailyRaw: number[] = [];
  const baseDay15 = accPrior15d / 15;
  const baseDay5 = acc5d / 5;

  for (let i = 0; i < 20; i++) {
    const isRecent5 = i >= 15;
    const base = isRecent5 ? baseDay5 : baseDay15;
    const variance = (pseudoRandom() - 0.45) * Math.max(800, Math.abs(base) * 0.8);
    let val = Math.round(base + variance);

    // If today (last index) and orderFlow superLargeNet + largeNet exists, align it
    if (i === 19 && stock.orderFlow) {
      const todayFlow = stock.orderFlow.superLargeNet + stock.orderFlow.largeNet;
      if (todayFlow !== 0) {
        val = todayFlow;
      }
    }

    dailyRaw.push(val);
  }

  // Normalize sum to roughly match totalAcc
  const rawSum = dailyRaw.reduce((a, b) => a + b, 0);
  const correction = rawSum !== 0 ? totalAcc / rawSum : 1;
  const normalized = dailyRaw.map((v, i) => {
    if (i === 19 && stock.orderFlow) return v; // preserve today
    return Math.round(v * correction);
  });

  // Build daily flow items
  let runningTotal = 0;
  const days: DailyMajorChipFlow[] = [];
  let accumulateDays = 0;
  let neutralDays = 0;
  let distributeDays = 0;

  for (let i = 0; i < 20; i++) {
    const net = normalized[i];
    runningTotal += net;

    let status: MajorChipStatus = 'neutral';
    let statusLabel = '區間盤整';
    let intensity = 0;
    let color = '#94a3b8';
    let bgClass = 'bg-slate-800/80 text-slate-300';
    let borderClass = 'border-slate-700';
    let textClass = 'text-slate-300';

    if (net >= 2000) {
      status = 'heavy_accumulate';
      statusLabel = '強力佈局';
      intensity = 3;
      color = '#e11d48'; // Rose-600
      bgClass = 'bg-rose-500/25 text-rose-300 shadow-sm shadow-rose-500/20';
      borderClass = 'border-rose-500/60 ring-1 ring-rose-500/40';
      textClass = 'text-rose-400 font-bold';
      accumulateDays++;
    } else if (net >= 800) {
      status = 'moderate_accumulate';
      statusLabel = '偏多吸籌';
      intensity = 2;
      color = '#f43f5e'; // Rose-500
      bgClass = 'bg-red-500/20 text-red-300';
      borderClass = 'border-red-500/40';
      textClass = 'text-red-400 font-semibold';
      accumulateDays++;
    } else if (net >= 200) {
      status = 'light_accumulate';
      statusLabel = '溫和加碼';
      intensity = 1;
      color = '#fb7185'; // Rose-400
      bgClass = 'bg-red-500/10 text-red-200';
      borderClass = 'border-red-500/25';
      textClass = 'text-red-300';
      accumulateDays++;
    } else if (net <= -1500) {
      status = 'heavy_distribute';
      statusLabel = '主力倒貨';
      intensity = -3;
      color = '#059669'; // Emerald-600
      bgClass = 'bg-emerald-500/25 text-emerald-300 shadow-sm shadow-emerald-500/20';
      borderClass = 'border-emerald-500/60 ring-1 ring-emerald-500/40';
      textClass = 'text-emerald-400 font-bold';
      distributeDays++;
    } else if (net <= -500) {
      status = 'light_distribute';
      statusLabel = '調節減碼';
      intensity = -2;
      color = '#10b981'; // Emerald-500
      bgClass = 'bg-emerald-500/15 text-emerald-200';
      borderClass = 'border-emerald-500/35';
      textClass = 'text-emerald-400';
      distributeDays++;
    } else {
      status = 'neutral';
      statusLabel = '盤整換手';
      intensity = 0;
      color = '#64748b'; // Slate-500
      bgClass = 'bg-slate-800/40 text-slate-400';
      borderClass = 'border-slate-800';
      textClass = 'text-slate-400';
      neutralDays++;
    }

    days.push({
      date: tradingDates[i] || `Day-${i + 1}`,
      dayNumber: i + 1,
      netShares: net,
      cumulativeShares: runningTotal,
      status,
      statusLabel,
      intensity,
      color,
      bgClass,
      borderClass,
      textClass,
    });
  }

  // Determine overall phase
  let overallPhase: MajorChipHeatmapSummary['overallPhase'] = 'consolidating';
  let phaseTitle = '⚖️ 籌碼沉澱盤整期';
  let phaseBadgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  let diagnosis = '';

  if (totalAcc > 5000 && accumulateDays >= 11) {
    overallPhase = 'accumulating';
    phaseTitle = '🔥 主力波段積極佈局期';
    phaseBadgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';
    diagnosis = `近 20 日主力籌碼呈現『大戶集中佈局』格局，20 個交易日中有 ${accumulateDays} 日為大單吸籌，累計鎖碼達 +${totalAcc.toLocaleString()} 張。主力成本均價 $${stock.majorCost} 元構築強固防守線，籌碼結構偏多續航。`;
  } else if (totalAcc < -5000 || distributeDays >= 11) {
    overallPhase = 'dumping';
    phaseTitle = '⚠️ 主力逢高調節倒貨期';
    phaseBadgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    diagnosis = `近 20 日主力籌碼呈現『倒貨減碼』態勢，共出現 ${distributeDays} 日大單出脫，累計賣超 ${totalAcc.toLocaleString()} 張。大戶籌碼鬆動，需提防高檔籌碼換手不順之拉回風險。`;
  } else {
    overallPhase = 'consolidating';
    phaseTitle = '⚖️ 籌碼換手沉澱盤整期';
    phaseBadgeClass = 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    diagnosis = `近 20 日主力籌碼多空拉鋸互見（${accumulateDays} 買 / ${distributeDays} 賣 / ${neutralDays} 平），主力尚未啟動單邊趨勢，以特定區間高出低進、洗盤沉澱浮額為主。`;
  }

  const allCumulatives = days.map((d) => d.cumulativeShares);
  const peakCumulative = Math.max(...allCumulatives);
  const minCumulative = Math.min(...allCumulatives);

  return {
    days,
    totalAccumulation: totalAcc,
    accumulation5d: acc5d,
    accumulateDays,
    neutralDays,
    distributeDays,
    overallPhase,
    phaseTitle,
    phaseBadgeClass,
    diagnosis,
    peakCumulative,
    minCumulative,
  };
}
