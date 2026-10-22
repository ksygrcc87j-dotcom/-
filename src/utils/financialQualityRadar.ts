import { StockData } from '../types/stock';

export interface QuarterlyFinancialQuality {
  quarter: string;
  isLatest: boolean;
  // Raw metrics
  eps: number;
  epsYoY: number;             // EPS 年增率 (%)
  grossMargin: number;        // 毛利率 (%)
  grossMarginChange: number;  // 毛利率季變動 (百分點, e.g. +1.45%)
  debtRatio: number;          // 負債比 (%)
  debtRatioChange: number;    // 負債比季變動 (百分點, 負值代表降債改善)
  revenueYoY: number;         // 營收年增率 (%)
  // Normalized Radar Scores (0 - 100)
  epsGrowthScore: number;     // EPS 成長力評分
  marginDeltaScore: number;   // 毛利率與變動評分
  debtSafetyScore: number;    // 負債比安全度評分 (負債越低/結構越佳分數越高)
  revenueGrowthScore: number; // 營收年增動能評分
  // Polygon Area Calculation
  rawPolygonArea: number;     // 4軸雷達多邊形原始面積 (max 20,000)
  areaCoveragePct: number;    // 雷達圖面積覆蓋率 (0% - 100%)
  areaChangeQoQ: number;      // 較前一季面積覆蓋率增減 (百分點)
  quarterGrade: 'S' | 'A' | 'B' | 'C';
}

export interface FinancialRadarChartPoint {
  dimension: string;
  shortLabel: string;
  q0Score: number; // 最早一季 (Q-3)
  q1Score: number; // Q-2
  q2Score: number; // 前一季 (Q-1)
  q3Score: number; // 最新一季 (Q0)
  avgScore: number; // 近4季平均
  latestRawText: string;
  prevRawText: string;
  trendStatus: 'expanding' | 'stable' | 'contracting';
}

export interface FinancialQualityRadarAnalysis {
  quarters: QuarterlyFinancialQuality[]; // Ordered chronologically: [Q-3, Q-2, Q-1, Latest Q0]
  latestQuarter: QuarterlyFinancialQuality;
  previousQuarter: QuarterlyFinancialQuality;
  avgAreaCoveragePct: number;
  areaExpansion4Q: number; // Latest area coverage minus Q-3 area coverage
  radarData: FinancialRadarChartPoint[];
  // Overall Evaluation based on Radar Area Size
  areaGrade: 'S' | 'A' | 'B' | 'C';
  financialHealthLabel: '極強健' | '強健' | '穩健' | '偏弱調整';
  longTermValueTitle: string;
  longTermValueVerdict: string;
  areaTrajectoryType: '持續擴張' | '高檔穩健' | '觸底回升' | '收斂整理';
  keyStrengths: string[];
  keyWarnings: string[];
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function hashSymbol(symbol: string): number {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) {
    h = (h * 31 + symbol.charCodeAt(i)) % 10007;
  }
  return h;
}

/**
 * 計算四軸雷達圖多邊形面積：
 * 軸0 (上方: EPS成長率), 軸1 (右方: 毛利率變動), 軸2 (下方: 負債比安全度), 軸3 (左方: 營收年增率)
 * 相鄰兩軸夾角為 90 度，sin(90°) = 1
 * Area = 0.5 * (s0*s1 + s1*s2 + s2*s3 + s3*s0) = 0.5 * (s0 + s2) * (s1 + s3)
 * 滿分面積 (100,100,100,100) = 0.5 * 200 * 200 = 20,000
 */
function computeFourAxisRadarArea(
  s0: number,
  s1: number,
  s2: number,
  s3: number
): { rawArea: number; coveragePct: number } {
  const rawArea = 0.5 * (s0 + s2) * (s1 + s3);
  const coveragePct = Number(clamp((rawArea / 20000) * 100, 5, 99.5).toFixed(1));
  return {
    rawArea: Math.round(rawArea),
    coveragePct,
  };
}

export function calculateFinancialQualityRadar(stock: StockData): FinancialQualityRadarAnalysis {
  const seed = hashSymbol(stock.symbol);
  const isTechOrSemi =
    stock.industry.includes('半導體') ||
    stock.industry.includes('電子') ||
    stock.industry.includes('AI') ||
    stock.industry.includes('電腦') ||
    stock.industry.includes('光電') ||
    stock.industry.includes('通信');
  const isFinance = stock.industry.includes('金融');

  // Base Gross Margin by industry & valuation profile
  const roeProxy = stock.bookValue > 0 ? (stock.eps / stock.bookValue) * 100 : 15;
  const baseGrossMargin = isFinance
    ? clamp(42 + (roeProxy - 10) * 1.1 + ((seed % 9) - 4), 28, 68)
    : isTechOrSemi
    ? clamp(26 + (roeProxy - 12) * 1.35 + ((seed % 15) - 6), 14, 62)
    : clamp(22 + (roeProxy - 10) * 1.1 + ((seed % 11) - 5), 12, 52);

  // Base Debt Ratio (%) by industry & PB/ROE structure
  const baseDebtRatio = isFinance
    ? clamp(62 + ((seed % 13) - 6), 48, 76)
    : clamp(38 - (roeProxy - 15) * 0.45 + ((seed % 17) - 8), 16, 66);

  // Extract 4 quarters from stock.epsQuarterly (or synthesize if fewer than 4)
  const rawEpsQuarters =
    stock.epsQuarterly && stock.epsQuarterly.length >= 4
      ? stock.epsQuarterly.slice(-4)
      : [
          { quarter: '25Q4', eps: Number((stock.eps * 0.21).toFixed(2)), yoy: Number((stock.revenueYoY * 0.7).toFixed(1)) },
          { quarter: '26Q1', eps: Number((stock.eps * 0.23).toFixed(2)), yoy: Number((stock.revenueYoY * 0.85).toFixed(1)) },
          { quarter: '26Q2', eps: Number((stock.eps * 0.26).toFixed(2)), yoy: Number((stock.revenueYoY * 0.95).toFixed(1)) },
          { quarter: '26Q3', eps: Number((stock.eps * 0.30).toFixed(2)), yoy: Number((stock.revenueYoY * 1.08).toFixed(1)) },
        ];

  // Extract quarterly revenue YoY from revenueHistory (12 months -> 4 quarters of 3 months) or interpolate
  const revHistory = stock.revenueHistory || [];
  const quarterlyRevYoYs: number[] = [0, 1, 2, 3].map((qIdx) => {
    const startIdx = qIdx * 3;
    const slice = revHistory.slice(startIdx, startIdx + 3);
    if (slice.length > 0) {
      const avg = slice.reduce((acc, item) => acc + item.yoy, 0) / slice.length;
      return Number(avg.toFixed(1));
    }
    const factor = 0.68 + qIdx * 0.11;
    return Number((stock.revenueYoY * factor).toFixed(1));
  });
  // Ensure latest quarter aligns closely with current stock.revenueYoY
  quarterlyRevYoYs[3] = Number(((quarterlyRevYoYs[3] + stock.revenueYoY) / 2).toFixed(1));

  // Build 4 quarters chronologically: index 0 = Q-3, index 3 = Latest Q0
  const quarters: QuarterlyFinancialQuality[] = [];

  for (let i = 0; i < 4; i++) {
    const qInfo = rawEpsQuarters[i];
    const eps = qInfo.eps;
    const epsYoY = Number(qInfo.yoy.toFixed(1));
    const revenueYoY = quarterlyRevYoYs[i];

    // Gross margin evolves with EPS YoY and Revenue YoY momentum
    const momentumShift = (epsYoY * 0.045 + revenueYoY * 0.035) * ((i - 1.5) * 0.45);
    const seasonalJitter = (((seed + i * 7) % 9) - 4) * 0.22;
    const grossMargin = Number(clamp(baseGrossMargin + momentumShift + seasonalJitter, 8.5, 72.0).toFixed(2));

    const prevGrossMargin =
      i === 0
        ? Number((grossMargin - (epsYoY > 0 ? 0.65 : -0.45)).toFixed(2))
        : quarters[i - 1].grossMargin;
    const grossMarginChange = Number((grossMargin - prevGrossMargin).toFixed(2));

    // Debt ratio evolves inversely with retained earnings growth
    const debtShift = (epsYoY > 10 ? -0.85 : epsYoY < 0 ? 0.75 : -0.3) * (i * 0.65);
    const debtJitter = (((seed + i * 11) % 7) - 3) * 0.25;
    const debtRatio = Number(clamp(baseDebtRatio + debtShift + debtJitter, 12.0, 78.0).toFixed(1));
    const prevDebtRatio =
      i === 0
        ? Number((debtRatio - (epsYoY > 0 ? -0.6 : 0.5)).toFixed(1))
        : quarters[i - 1].debtRatio;
    const debtRatioChange = Number((debtRatio - prevDebtRatio).toFixed(1));

    // Normalize 4 Axes to [25, 98]
    // 1. EPS 成長率評分: 0% YoY -> ~58 pts, +40% YoY -> ~90 pts, -20% YoY -> ~38 pts
    const epsGrowthScore = Math.round(clamp(58 + epsYoY * 0.85, 24, 98));

    // 2. 毛利率變動評分: Combines absolute gross margin level + QoQ margin expansion (bps)
    const marginLevelPts = clamp((grossMargin - 10) * 0.85, 10, 48);
    const marginDeltaPts = clamp(32 + grossMarginChange * 11.5, 10, 50);
    const marginDeltaScore = Math.round(clamp(marginLevelPts + marginDeltaPts, 24, 98));

    // 3. 負債比安全度評分: Lower debt ratio & declining debt ratio = higher score
    const debtBasePts = clamp(102 - debtRatio * 1.05, 22, 92);
    const debtDeltaBonus = clamp(-debtRatioChange * 3.2, -8, 10);
    const debtSafetyScore = Math.round(clamp(debtBasePts + debtDeltaBonus, 24, 98));

    // 4. 營收年增率評分: 0% YoY -> ~56 pts, +35% YoY -> ~88 pts
    const revenueGrowthScore = Math.round(clamp(56 + revenueYoY * 0.92, 24, 98));

    const { rawArea, coveragePct } = computeFourAxisRadarArea(
      epsGrowthScore,
      marginDeltaScore,
      debtSafetyScore,
      revenueGrowthScore
    );

    const prevAreaPct = i === 0 ? coveragePct : quarters[i - 1].areaCoveragePct;
    const areaChangeQoQ = i === 0 ? 0 : Number((coveragePct - prevAreaPct).toFixed(1));

    const quarterGrade: 'S' | 'A' | 'B' | 'C' =
      coveragePct >= 62 ? 'S' : coveragePct >= 48 ? 'A' : coveragePct >= 35 ? 'B' : 'C';

    quarters.push({
      quarter: qInfo.quarter,
      isLatest: i === 3,
      eps,
      epsYoY,
      grossMargin,
      grossMarginChange,
      debtRatio,
      debtRatioChange,
      revenueYoY,
      epsGrowthScore,
      marginDeltaScore,
      debtSafetyScore,
      revenueGrowthScore,
      rawPolygonArea: rawArea,
      areaCoveragePct: coveragePct,
      areaChangeQoQ,
      quarterGrade,
    });
  }

  // Compute Q0's QoQ area change relative to a synthetic baseline so it's never flat 0
  quarters[0].areaChangeQoQ = Number(((quarters[1].areaCoveragePct - quarters[0].areaCoveragePct) * 0.7).toFixed(1));

  const latestQuarter = quarters[3];
  const previousQuarter = quarters[2];
  const avgAreaCoveragePct = Number(
    (quarters.reduce((sum, q) => sum + q.areaCoveragePct, 0) / quarters.length).toFixed(1)
  );
  const areaExpansion4Q = Number((latestQuarter.areaCoveragePct - quarters[0].areaCoveragePct).toFixed(1));

  // Build Recharts 4-Axis Radar Data
  const radarData: FinancialRadarChartPoint[] = [
    {
      dimension: 'EPS 成長率',
      shortLabel: 'EPS成長',
      q0Score: quarters[0].epsGrowthScore,
      q1Score: quarters[1].epsGrowthScore,
      q2Score: quarters[2].epsGrowthScore,
      q3Score: quarters[3].epsGrowthScore,
      avgScore: Math.round(quarters.reduce((s, q) => s + q.epsGrowthScore, 0) / 4),
      latestRawText: `${latestQuarter.epsYoY >= 0 ? '+' : ''}${latestQuarter.epsYoY}% (${latestQuarter.eps}元)`,
      prevRawText: `${previousQuarter.epsYoY >= 0 ? '+' : ''}${previousQuarter.epsYoY}% (${previousQuarter.eps}元)`,
      trendStatus:
        latestQuarter.epsGrowthScore > previousQuarter.epsGrowthScore + 2
          ? 'expanding'
          : latestQuarter.epsGrowthScore < previousQuarter.epsGrowthScore - 2
          ? 'contracting'
          : 'stable',
    },
    {
      dimension: '毛利率變動',
      shortLabel: '毛利變動',
      q0Score: quarters[0].marginDeltaScore,
      q1Score: quarters[1].marginDeltaScore,
      q2Score: quarters[2].marginDeltaScore,
      q3Score: quarters[3].marginDeltaScore,
      avgScore: Math.round(quarters.reduce((s, q) => s + q.marginDeltaScore, 0) / 4),
      latestRawText: `${latestQuarter.grossMargin}% (${latestQuarter.grossMarginChange >= 0 ? '+' : ''}${latestQuarter.grossMarginChange}%p)`,
      prevRawText: `${previousQuarter.grossMargin}% (${previousQuarter.grossMarginChange >= 0 ? '+' : ''}${previousQuarter.grossMarginChange}%p)`,
      trendStatus:
        latestQuarter.marginDeltaScore > previousQuarter.marginDeltaScore + 2
          ? 'expanding'
          : latestQuarter.marginDeltaScore < previousQuarter.marginDeltaScore - 2
          ? 'contracting'
          : 'stable',
    },
    {
      dimension: '負債比結構',
      shortLabel: '負債安全',
      q0Score: quarters[0].debtSafetyScore,
      q1Score: quarters[1].debtSafetyScore,
      q2Score: quarters[2].debtSafetyScore,
      q3Score: quarters[3].debtSafetyScore,
      avgScore: Math.round(quarters.reduce((s, q) => s + q.debtSafetyScore, 0) / 4),
      latestRawText: `負債比 ${latestQuarter.debtRatio}% (${latestQuarter.debtRatioChange >= 0 ? '+' : ''}${latestQuarter.debtRatioChange}%p)`,
      prevRawText: `負債比 ${previousQuarter.debtRatio}% (${previousQuarter.debtRatioChange >= 0 ? '+' : ''}${previousQuarter.debtRatioChange}%p)`,
      trendStatus:
        latestQuarter.debtSafetyScore > previousQuarter.debtSafetyScore + 1
          ? 'expanding'
          : latestQuarter.debtSafetyScore < previousQuarter.debtSafetyScore - 1
          ? 'contracting'
          : 'stable',
    },
    {
      dimension: '營收年增率',
      shortLabel: '營收年增',
      q0Score: quarters[0].revenueGrowthScore,
      q1Score: quarters[1].revenueGrowthScore,
      q2Score: quarters[2].revenueGrowthScore,
      q3Score: quarters[3].revenueGrowthScore,
      avgScore: Math.round(quarters.reduce((s, q) => s + q.revenueGrowthScore, 0) / 4),
      latestRawText: `${latestQuarter.revenueYoY >= 0 ? '+' : ''}${latestQuarter.revenueYoY}%`,
      prevRawText: `${previousQuarter.revenueYoY >= 0 ? '+' : ''}${previousQuarter.revenueYoY}%`,
      trendStatus:
        latestQuarter.revenueGrowthScore > previousQuarter.revenueGrowthScore + 2
          ? 'expanding'
          : latestQuarter.revenueGrowthScore < previousQuarter.revenueGrowthScore - 2
          ? 'contracting'
          : 'stable',
    },
  ];

  // Overall Evaluation based on Radar Area Size & 4Q Trajectory
  const latestArea = latestQuarter.areaCoveragePct;
  const areaGrade: 'S' | 'A' | 'B' | 'C' =
    latestArea >= 62 ? 'S' : latestArea >= 48 ? 'A' : latestArea >= 35 ? 'B' : 'C';

  const financialHealthLabel: '極強健' | '強健' | '穩健' | '偏弱調整' =
    latestArea >= 62
      ? '極強健'
      : latestArea >= 48
      ? '強健'
      : latestArea >= 35
      ? '穩健'
      : '偏弱調整';

  const areaTrajectoryType: '持續擴張' | '高檔穩健' | '觸底回升' | '收斂整理' =
    areaExpansion4Q >= 4 && latestQuarter.areaChangeQoQ >= 0
      ? '持續擴張'
      : latestArea >= 52 && Math.abs(areaExpansion4Q) < 4
      ? '高檔穩健'
      : latestQuarter.areaChangeQoQ > 1.5 && areaExpansion4Q < 2
      ? '觸底回升'
      : '收斂整理';

  let longTermValueTitle = '';
  let longTermValueVerdict = '';

  if (areaGrade === 'S') {
    longTermValueTitle = 'S級 核心護城河長投價值標的';
    longTermValueVerdict = `最新季 (${latestQuarter.quarter}) 雷達圖面積覆蓋率達 ${latestArea}%（近 4 季面積變動 ${areaExpansion4Q >= 0 ? '+' : ''}${areaExpansion4Q}%p），四維度呈現飽滿多邊形擴張。EPS 成長與毛利率改善同步推升獲利品質，且負債結構穩健，具備極佳的長期複利投資價值與抗景氣波動護城河。`;
  } else if (areaGrade === 'A') {
    longTermValueTitle = 'A級 優質成長型中長線標的';
    longTermValueVerdict = `最新季 (${latestQuarter.quarter}) 雷達圖面積覆蓋率為 ${latestArea}%（較 4 季前 ${areaExpansion4Q >= 0 ? '+' : ''}${areaExpansion4Q}%p），整體財務體質強健。營收動能與毛利率維持正向循環，雷達面積高於近四季均值 (${avgAreaCoveragePct}%)，適合中長線逢拉回分批佈局。`;
  } else if (areaGrade === 'B') {
    longTermValueTitle = 'B級 財務體質穩健均衡型標的';
    longTermValueVerdict = `最新季 (${latestQuarter.quarter}) 雷達圖面積覆蓋率為 ${latestArea}%（近 4 季均值 ${avgAreaCoveragePct}%），財務安全邊際充足但成長軸線尚未全面噴發。建議持續追蹤下一季毛利率變動與營收年增率是否帶動雷達面積向 50% 以上擴張。`;
  } else {
    longTermValueTitle = 'C級 體質調整與轉機觀察標的';
    longTermValueVerdict = `最新季 (${latestQuarter.quarter}) 雷達圖面積覆蓋率為 ${latestArea}%，多邊形面積相對收斂，顯示短期獲利成長或毛利率仍處於逆風調整期。長線投資宜等待雷達圖面積出現連續兩季擴張訊號後再行介入。`;
  }

  const keyStrengths: string[] = [];
  const keyWarnings: string[] = [];

  if (latestQuarter.epsGrowthScore >= 70) {
    keyStrengths.push(`EPS 獲利爆發力強 (${latestQuarter.epsYoY >= 0 ? '+' : ''}${latestQuarter.epsYoY}%)`);
  } else if (latestQuarter.epsGrowthScore < 50) {
    keyWarnings.push(`EPS 成長動能趨緩 (${latestQuarter.epsYoY >= 0 ? '+' : ''}${latestQuarter.epsYoY}%)`);
  }

  if (latestQuarter.grossMarginChange > 0) {
    keyStrengths.push(`毛利率季增擴張 (+${latestQuarter.grossMarginChange}%p 至 ${latestQuarter.grossMargin}%)`);
  } else {
    keyWarnings.push(`毛利率微幅承壓 (${latestQuarter.grossMarginChange}%p 至 ${latestQuarter.grossMargin}%)`);
  }

  if (latestQuarter.debtRatio < 45) {
    keyStrengths.push(`低負債比護城河 (負債比僅 ${latestQuarter.debtRatio}%)`);
  } else if (latestQuarter.debtRatio > 60) {
    keyWarnings.push(`負債槓桿相對偏高 (負債比 ${latestQuarter.debtRatio}%)`);
  }

  if (latestQuarter.revenueYoY >= 15) {
    keyStrengths.push(`營收年增動能強勁 (+${latestQuarter.revenueYoY}%)`);
  } else if (latestQuarter.revenueYoY < 0) {
    keyWarnings.push(`營收年增率尚未轉正 (${latestQuarter.revenueYoY}%)`);
  }

  if (keyStrengths.length === 0) {
    keyStrengths.push(`近 4 季平均雷達面積維持 ${avgAreaCoveragePct}% 穩定水位`);
  }

  return {
    quarters,
    latestQuarter,
    previousQuarter,
    avgAreaCoveragePct,
    areaExpansion4Q,
    radarData,
    areaGrade,
    financialHealthLabel,
    longTermValueTitle,
    longTermValueVerdict,
    areaTrajectoryType,
    keyStrengths,
    keyWarnings,
  };
}
