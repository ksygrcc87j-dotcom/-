import { StockData } from '../types/stock';
import { generateInstitutionalTrends, InstitutionalTrendDay } from './institutionalTrends';

export type AbsorptionPattern = 
  | 'surge_locking'        // 急漲強勢鎖碼 (價漲 + 集中度急增)
  | 'surge_distributing'   // 急漲高檔出貨 (價漲 + 集中度驟降)
  | 'stealth_accumulate'   // 盤整暗中吸籌 (盤整 + 集中度顯著上升)
  | 'fatigue_dispersion'   // 盤整浮額散發 (盤整 + 集中度下降)
  | 'dip_absorbing'        // 下跌逢低承接 (價跌 + 集中度逆勢增加)
  | 'cascade_dumping';     // 下跌棄守殺多 (價跌 + 集中度同步破底)

export interface DailyConcentrationPoint {
  date: string;
  dayIndex: number;
  price: number;
  priceChangePercent: number; // vs previous day
  concentrationRate: number;  // 籌碼集中度 % (e.g. 52.4)
  ma5Concentration: number;   // 5日集中度移動平均 %
  dailyDelta: number;         // 當日集中度變化率 (百分點, e.g. +0.45%)
  delta5d: number;            // 近5日累計集中度變化率 (百分點, e.g. +1.8%)
  pattern: AbsorptionPattern;
  patternLabel: string;
  patternColor: string;
  patternBadge: string;
  isUpConcentration: boolean;
  intensityScore: number;     // 0 to 100
}

export interface ChipConcentrationAnalysis {
  days: DailyConcentrationPoint[];
  currentConcentration: number;
  startConcentration: number;
  total20dChange: number;         // 20日累計變化 (+/- %)
  change5d: number;              // 5日累計變化 (+/- %)
  currentDailyDelta: number;      // 當日變化率
  ma5Concentration: number;       // 最新 5日均
  maxConcentration: number;
  minConcentration: number;
  absorptionStrength: number;     // 0 to 100
  absorptionStrengthLabel: string;
  currentPattern: AbsorptionPattern;
  currentPatternLabel: string;
  currentPatternBadge: string;
  patternColor: string;
  diagnosis: string;
  tacticalAdvice: string;
}

/**
 * Calculate 20-day daily concentration rate-of-change and absorption intensity
 */
export function calculateChipConcentrationTrend(stock: StockData): ChipConcentrationAnalysis {
  // Leverage institutional trends dataset for synchronized realistic prices & concentration
  const instTrends = generateInstitutionalTrends(stock);
  const rawDays = instTrends.days;

  const points: DailyConcentrationPoint[] = [];

  for (let i = 0; i < rawDays.length; i++) {
    const cur = rawDays[i];
    const prev = i > 0 ? rawDays[i - 1] : cur;
    const priceChange = prev.price > 0 ? Number((((cur.price - prev.price) / prev.price) * 100).toFixed(2)) : 0;
    const dailyDelta = i > 0 ? Number((cur.concentrationRate - prev.concentrationRate).toFixed(2)) : 0;

    // 5-day rolling window
    const windowStart = Math.max(0, i - 4);
    const windowSlice = rawDays.slice(windowStart, i + 1);
    const ma5Sum = windowSlice.reduce((acc, d) => acc + d.concentrationRate, 0);
    const ma5Concentration = Number((ma5Sum / windowSlice.length).toFixed(2));

    const day5Prior = rawDays[Math.max(0, i - 5)];
    const delta5d = Number((cur.concentrationRate - day5Prior.concentrationRate).toFixed(2));

    // Determine Absorption Pattern:
    // Compares Price action (priceChange) vs Concentration action (dailyDelta)
    let pattern: AbsorptionPattern = 'stealth_accumulate';
    let patternLabel = '盤整暗中吸籌';
    let patternColor = '#38bdf8';
    let patternBadge = 'bg-sky-500/20 text-sky-300 border-sky-500/40';
    let intensityScore = 65;

    const isPriceSurging = priceChange >= 1.5;
    const isPriceDropping = priceChange <= -1.5;
    const isPriceConsolidating = !isPriceSurging && !isPriceDropping;

    const isConcRising = dailyDelta > 0.15;
    const isConcFalling = dailyDelta < -0.15;

    if (isPriceSurging && isConcRising) {
      pattern = 'surge_locking';
      patternLabel = '急漲強勢鎖碼';
      patternColor = '#ef4444';
      patternBadge = 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse';
      intensityScore = 92;
    } else if (isPriceSurging && isConcFalling) {
      pattern = 'surge_distributing';
      patternLabel = '急漲高檔背離出貨';
      patternColor = '#f59e0b';
      patternBadge = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      intensityScore = 40;
    } else if (isPriceConsolidating && isConcRising) {
      pattern = 'stealth_accumulate';
      patternLabel = '盤整暗中吸籌';
      patternColor = '#06b6d4';
      patternBadge = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      intensityScore = 85;
    } else if (isPriceConsolidating && isConcFalling) {
      pattern = 'fatigue_dispersion';
      patternLabel = '盤整籌碼發散';
      patternColor = '#94a3b8';
      patternBadge = 'bg-slate-800 text-slate-300 border-slate-700';
      intensityScore = 35;
    } else if (isPriceDropping && isConcRising) {
      pattern = 'dip_absorbing';
      patternLabel = '下跌逢低逆勢承接';
      patternColor = '#10b981';
      patternBadge = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      intensityScore = 78;
    } else {
      pattern = 'cascade_dumping';
      patternLabel = '下跌籌碼潰散';
      patternColor = '#64748b';
      patternBadge = 'bg-slate-900 text-slate-400 border-slate-800';
      intensityScore = 18;
    }

    points.push({
      date: cur.date,
      dayIndex: cur.dayIndex,
      price: cur.price,
      priceChangePercent: priceChange,
      concentrationRate: cur.concentrationRate,
      ma5Concentration,
      dailyDelta,
      delta5d,
      pattern,
      patternLabel,
      patternColor,
      patternBadge,
      isUpConcentration: dailyDelta >= 0,
      intensityScore,
    });
  }

  const latestPoint = points[points.length - 1];
  const startPoint = points[0];
  const total20dChange = Number((latestPoint.concentrationRate - startPoint.concentrationRate).toFixed(2));
  const change5d = latestPoint.delta5d;
  const currentDailyDelta = latestPoint.dailyDelta;
  const currentConcentration = latestPoint.concentrationRate;
  const startConcentration = startPoint.concentrationRate;
  const ma5Concentration = latestPoint.ma5Concentration;

  const concValues = points.map((p) => p.concentrationRate);
  const maxConcentration = Math.max(...concValues);
  const minConcentration = Math.min(...concValues);

  // Absorption Strength (0 to 100)
  // Combines 20d total change, 5d momentum, and current pattern
  let absorptionStrength = Math.round(50 + total20dChange * 8 + change5d * 6);
  absorptionStrength = Math.max(10, Math.min(98, absorptionStrength));

  let absorptionStrengthLabel = '中性穩定吸籌';
  if (absorptionStrength >= 80) absorptionStrengthLabel = '極強主動吸籌 (Aggressive Absorption)';
  else if (absorptionStrength >= 65) absorptionStrengthLabel = '強勁吸籌增持 (Active Accumulation)';
  else if (absorptionStrength >= 45) absorptionStrengthLabel = '溫和吸籌盤整 (Neutral Consolidation)';
  else if (absorptionStrength >= 30) absorptionStrengthLabel = '籌碼輕度發散 (Mild Dispersion)';
  else absorptionStrengthLabel = '主力籌碼撤守 (Heavy Dispersion)';

  // Diagnosis and advice
  let diagnosis = '';
  let tacticalAdvice = '';

  if (latestPoint.pattern === 'stealth_accumulate') {
    diagnosis = `當前股價處於盤整區間，但近5日籌碼集中度逆勢推升 ${change5d > 0 ? `+${change5d}` : change5d}%，顯示主力大戶正趁散戶觀望之際於底部「壓盤吸籌」，壓抑股價波動同時大舉鎖碼。`;
    tacticalAdvice = '此為主力發動主升段前典型的蓄勢型態。建議緊跟主力成本線逢低布局，切勿因短線股價沉悶而輕易交出便宜籌碼。';
  } else if (latestPoint.pattern === 'surge_locking') {
    diagnosis = `股價急漲同時籌碼集中度飆升（日增 ${currentDailyDelta > 0 ? `+${currentDailyDelta}` : currentDailyDelta}%，5日增 +${change5d}%），表示主力不僅強力拉抬，更於上漲過程中通吃浮額，屬於標準「強勢鎖碼推升」。`;
    tacticalAdvice = '籌碼集中度與股價同步噴出，無出貨跡象。可沿 5 日移動平均線或主力均價線續抱，享受順勢主升段行情。';
  } else if (latestPoint.pattern === 'surge_distributing') {
    diagnosis = `特別警示：股價今日急拉創高，但籌碼集中度卻呈現負增長（${currentDailyDelta}%），出現明顯的「量價與籌碼背離」，主力疑似趁人氣熱絡、高盤急拉時將籌碼倒給追價散戶！`;
    tacticalAdvice = '嚴防主力假突破真出貨，嚴禁在此時市價融資追高，已獲利者建議分批拔檔獲利了結，並將移動停利價上移至今日低點。';
  } else if (latestPoint.pattern === 'dip_absorbing') {
    diagnosis = `股價拉回整理但籌碼集中度不降反升（+${currentDailyDelta}%），顯示主力並未棄守，反倒趁大盤震盪或短線回測時「逢低撿便宜」，洗出不堅定的浮額籌碼。`;
    tacticalAdvice = '短線拉回屬於主力良性甩轎洗盤，支撐位附近可視為極佳的左側或右側加碼買點。';
  } else if (latestPoint.pattern === 'fatigue_dispersion') {
    diagnosis = `股價維持橫盤震盪，但籌碼集中度連續出現萎縮（5日累計 ${change5d}%），大戶持股意願下降，籌碼逐漸擴散至零散散戶手中，需注意盤久必跌風險。`;
    tacticalAdvice = '缺乏主力主動控盤支持，反彈動能有限，若跌破月線或盤整區底頸線應果斷停損。';
  } else {
    diagnosis = `股價下跌且籌碼集中度同步重挫（日減 ${currentDailyDelta}%），主力與法人持續提款殺多，籌碼呈現單向渙散狀態。`;
    tacticalAdvice = '主力撤退無護盤意願，下方支撐容易被跌破，嚴禁逢低攤平，應落實嚴格資金風控。';
  }

  return {
    days: points,
    currentConcentration,
    startConcentration,
    total20dChange,
    change5d,
    currentDailyDelta,
    ma5Concentration,
    maxConcentration,
    minConcentration,
    absorptionStrength,
    absorptionStrengthLabel,
    currentPattern: latestPoint.pattern,
    currentPatternLabel: latestPoint.patternLabel,
    currentPatternBadge: latestPoint.patternBadge,
    patternColor: latestPoint.patternColor,
    diagnosis,
    tacticalAdvice,
  };
}
