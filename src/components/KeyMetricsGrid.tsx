import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Layers, 
  DollarSign, 
  Activity, 
  Scale, 
  Compass, 
  PieChart, 
  Percent, 
  ShieldAlert, 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Zap,
  Info,
  Flame,
  Minus,
  Calendar,
  Target,
  LineChart,
  AlertTriangle,
  Crosshair,
  Sliders,
  History,
  RotateCcw,
  Sparkles,
  Gauge,
  Swords,
  Table,
  Award,
  CheckCircle2
} from 'lucide-react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Cell,
  PieChart as RechartsPieChart,
  Pie
} from 'recharts';
import { StockData } from '../types/stock';
import { generate20DayMajorFlow } from '../utils/majorChipHeatmap';
import { generateMajorCostTrajectory, generateInstitutionalTrends } from '../utils/institutionalTrends';
import { calculateStockRiskMatrix, RiskSubIndicator } from '../utils/stockRiskMatrix';
import { calculateChipRadarData } from '../utils/chipFlowRadar';
import { calculateChipConcentrationTrend, DailyConcentrationPoint } from '../utils/chipConcentrationTrend';
import { generateMajorCostBacktest, BacktestPeriod, DailyBacktestCostPoint } from '../utils/majorCostBacktest';
import { calculateMajorHolderDistribution, HolderTierData } from '../utils/majorHolderDistribution';
import { calculateChipMarketCorrelation, DailyCorrelationPoint } from '../utils/chipMarketCorrelation';
import { calculateVolumePriceProfile, VolumeBracketDetail } from '../utils/volumePriceProfile';
import { calculateOrderFlowEnergyBalance, OrderTierEnergyRow } from '../utils/orderFlowEnergyBalance';
import { calculateMajorCostVariation, MajorCostPeriodRow } from '../utils/majorCostVariation';
import { calculateFinancialQualityRadar } from '../utils/financialQualityRadar';

interface KeyMetricsGridProps {
  stock: StockData;
}

export const KeyMetricsGrid: React.FC<KeyMetricsGridProps> = ({ stock }) => {
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

  // Major Order Flow Bull/Bear Energy Balance Sheet (主力多空能量平衡表)
  const energyBalance = useMemo(() => calculateOrderFlowEnergyBalance(stock), [stock]);
  const [selectedEnergyTierId, setSelectedEnergyTierId] = useState<string | null>(null);
  const activeEnergyTier = useMemo<OrderTierEnergyRow | null>(() => {
    if (selectedEnergyTierId) {
      return energyBalance.rows.find(r => r.id === selectedEnergyTierId) || null;
    }
    return null;
  }, [energyBalance, selectedEnergyTierId]);

  // Major Holder Cost Variation Table (籌碼主力持倉成本變動表: 5日 / 20日 / 60日)
  const costVariation = useMemo(() => calculateMajorCostVariation(stock), [stock]);
  const [selectedCostPeriodKey, setSelectedCostPeriodKey] = useState<'5d' | '20d' | '60d'>('20d');
  const activeCostPeriodRow = useMemo<MajorCostPeriodRow>(() => {
    return (
      costVariation.rows.find((r) => r.periodKey === selectedCostPeriodKey) ||
      costVariation.rows[1]
    );
  }, [costVariation, selectedCostPeriodKey]);

  // Financial Quality Radar Matrix (財務品質雷達矩陣: 近 4 季 EPS成長率 / 毛利率變動 / 負債比 / 營收年增率)
  const financialRadar = useMemo(() => calculateFinancialQualityRadar(stock), [stock]);
  const [selectedFinQuarterIdx, setSelectedFinQuarterIdx] = useState<number>(3); // Default to Latest Quarter (index 3)
  const [finRadarOverlayMode, setFinRadarOverlayMode] = useState<'vsPrev' | 'vsAvg' | 'all4Q'>('vsPrev');
  const activeFinQuarter = useMemo(() => {
    return financialRadar.quarters[selectedFinQuarterIdx] || financialRadar.latestQuarter;
  }, [financialRadar, selectedFinQuarterIdx]);

  // Chip & Market Correlation Analysis (Beta-Adjusted Sensitivity)
  const marketCorr = useMemo(() => calculateChipMarketCorrelation(stock), [stock]);
  const [hoveredCorrDayIdx, setHoveredCorrDayIdx] = useState<number | null>(null);
  const activeCorrPoint = useMemo<DailyCorrelationPoint>(() => {
    if (hoveredCorrDayIdx !== null && hoveredCorrDayIdx >= 0 && hoveredCorrDayIdx < marketCorr.days.length) {
      return marketCorr.days[hoveredCorrDayIdx];
    }
    return marketCorr.days[marketCorr.days.length - 1];
  }, [marketCorr, hoveredCorrDayIdx]);

  // 60-Day Major Volume-at-Price Profile Table & Support/Resistance Density
  const volumeProfile = useMemo(() => calculateVolumePriceProfile(stock), [stock]);
  const [selectedBracketId, setSelectedBracketId] = useState<string | null>(null);
  const activeBracket = useMemo<VolumeBracketDetail>(() => {
    if (selectedBracketId) {
      const found = volumeProfile.brackets.find(b => b.id === selectedBracketId);
      if (found) return found;
    }
    return volumeProfile.brackets.find(b => b.isCurrentPrice) || volumeProfile.pocBracket;
  }, [volumeProfile, selectedBracketId]);

  // Major Holder Distribution (30-Day Equity Breakdown & Dynamics)
  const holderDist = useMemo(() => calculateMajorHolderDistribution(stock), [stock]);
  const [activeHolderTierId, setActiveHolderTierId] = useState<string | null>(null);
  const selectedTier = useMemo<HolderTierData | undefined>(() => {
    if (activeHolderTierId) {
      return holderDist.tiers.find(t => t.id === activeHolderTierId);
    }
    return undefined;
  }, [holderDist, activeHolderTierId]);

  // Major Cost Backtest Analysis (30 / 60 / 90 Days)
  const [backtestPeriod, setBacktestPeriod] = useState<BacktestPeriod>(60);
  const costBacktest = useMemo(() => generateMajorCostBacktest(stock, backtestPeriod), [stock, backtestPeriod]);
  const [hoveredBacktestIdx, setHoveredBacktestIdx] = useState<number | null>(null);
  const activeBacktestPoint = useMemo<DailyBacktestCostPoint>(() => {
    const pts = costBacktest.activeResult.dailyPoints;
    if (hoveredBacktestIdx !== null && hoveredBacktestIdx >= 0 && hoveredBacktestIdx < pts.length) {
      return pts[hoveredBacktestIdx];
    }
    return pts[pts.length - 1];
  }, [costBacktest, hoveredBacktestIdx]);

  // Major Chip Concentration Trend & Rate of Change Data
  const concTrend = useMemo(() => calculateChipConcentrationTrend(stock), [stock]);
  const [hoveredConcDayIdx, setHoveredConcDayIdx] = useState<number | null>(null);
  const activeConcPoint = useMemo<DailyConcentrationPoint>(() => {
    if (hoveredConcDayIdx !== null && hoveredConcDayIdx >= 0 && hoveredConcDayIdx < concTrend.days.length) {
      return concTrend.days[hoveredConcDayIdx];
    }
    return concTrend.days[concTrend.days.length - 1];
  }, [concTrend, hoveredConcDayIdx]);

  // 20-Day Major Chip Bull/Bear Radar Data (主力籌碼多空雷達：散戶流向、大單淨買賣、融資餘額、借券賣出、外資投信持股比例)
  const chipRadar = useMemo(() => calculateChipRadarData(stock), [stock]);
  const [chipRadarOverlayMode, setChipRadarOverlayMode] = useState<'vs20dAgo' | 'all3Stages' | 'vsBenchmark'>('vs20dAgo');
  const [selectedChipAxisId, setSelectedChipAxisId] = useState<string>('largeOrderNet');
  const activeChipAxis = useMemo(() => {
    return chipRadar.radarData.find((d) => d.id === selectedChipAxisId) || chipRadar.radarData[0];
  }, [chipRadar, selectedChipAxisId]);

  // Stock Risk Early Warning Matrix Data
  const riskMatrix = useMemo(() => calculateStockRiskMatrix(stock), [stock]);
  const [selectedRiskIndicatorId, setSelectedRiskIndicatorId] = useState<string | null>(null);
  const activeRiskIndicator = useMemo<RiskSubIndicator>(() => {
    if (selectedRiskIndicatorId) {
      const found = riskMatrix.gridItems.find((item) => item.id === selectedRiskIndicatorId);
      if (found) return found;
    }
    // Default to highest risk score item
    return [...riskMatrix.gridItems].sort((a, b) => b.score - a.score)[0] || riskMatrix.gridItems[0];
  }, [riskMatrix, selectedRiskIndicatorId]);

  // 20-Day Heatmap Data
  const chipSummary = useMemo(() => generate20DayMajorFlow(stock), [stock]);
  const activeDayIndex = hoveredDayIndex !== null 
    ? hoveredDayIndex 
    : selectedDayIndex !== null 
    ? selectedDayIndex 
    : chipSummary.days.length - 1;
  const inspectedDay = chipSummary.days[activeDayIndex] || chipSummary.days[chipSummary.days.length - 1];

  // 60-Day Major Cost Trajectory & Volume Profile Data
  const costTrajectory = useMemo(() => generateMajorCostTrajectory(stock), [stock]);
  const [hoveredCostDayIdx, setHoveredCostDayIdx] = useState<number | null>(null);
  const activeCostDay = hoveredCostDayIdx !== null 
    ? costTrajectory.days[hoveredCostDayIdx] 
    : costTrajectory.days[costTrajectory.days.length - 1];

  // 20-Day Institutional & Major Holdings Comparative Trend Data
  const instTrends = useMemo(() => generateInstitutionalTrends(stock), [stock]);
  const [hoveredInstDayIdx, setHoveredInstDayIdx] = useState<number | null>(null);
  const activeInstDay = hoveredInstDayIdx !== null 
    ? instTrends.days[hoveredInstDayIdx] 
    : instTrends.days[instTrends.days.length - 1];
  const {
    price,
    change,
    changePercent,
    orderFlow,
    largeOrderBuyRatio,
    largeOrderSellRatio,
    smallOrderBuyRatio,
    smallOrderSellRatio,
    majorConcentration,
    bookValue,
    pb,
    eps,
    pe,
    revenueCurrent,
    revenueMonth,
    revenueMoM,
    revenueYoY,
    valuationScore,
    stageLabel,
    stageAssessment,
    supportLevel,
    resistanceLevel,
    alpha,
    beta,
    majorAccumulation,
    majorAccumulation5d,
    majorCost,
    turnoverRate,
    turnoverRate5dAvg,
    foreignNetBuy,
    foreignStreak,
    trustNetBuy,
    trustStreak,
    dealerNetBuy,
    foreignHoldingRatio,
  } = stock;

  // Calculate premium relative to major cost
  const majorCostDiff = price - majorCost;
  const majorCostPremium = Number(((majorCostDiff / majorCost) * 100).toFixed(2));

  return (
    <div className="space-y-6">
      {/* SECTION 1: Automatic Stock Price Stage & Valuation Assessment Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-indigo-500/30 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-slate-100">
                  當前股價位階評估 (Automatic Stage Valuation)
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/40">
                  {valuationScore}% 位階 · {stageLabel}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                綜合歷史52週高低點、PE河流圖分位數、淨值比與季線乖離加權計算
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-xs font-mono">
            <div className="bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-lg">
              <span className="text-slate-400">關鍵支撐: </span>
              <span className="font-bold text-emerald-400">${supportLevel.toFixed(1)}</span>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-lg">
              <span className="text-slate-400">關鍵壓力: </span>
              <span className="font-bold text-red-400">${resistanceLevel.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* Visual Valuation Gauge Bar */}
        <div className="space-y-2 mt-4">
          <div className="relative h-4 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
            {/* Color zones: Low (Green) -> Fair (Blue) -> High (Amber) -> Overheated (Red) */}
            <div className="absolute inset-0 flex">
              <div className="w-[30%] bg-gradient-to-r from-emerald-600 to-teal-500 opacity-60" title="低檔築底區 (0-30%)" />
              <div className="w-[35%] bg-gradient-to-r from-teal-500 to-blue-500 opacity-60" title="合理初升區 (30-65%)" />
              <div className="w-[20%] bg-gradient-to-r from-blue-500 to-amber-500 opacity-60" title="高檔強勢區 (65-85%)" />
              <div className="w-[15%] bg-gradient-to-r from-amber-500 to-red-600 opacity-70" title="過熱警戒區 (85-100%)" />
            </div>

            {/* Current Position Marker */}
            <div
              className="absolute top-0 bottom-0 w-2.5 bg-white rounded-full shadow-lg shadow-white/50 border border-slate-900 transition-all duration-700 ease-out transform -translate-x-1/2"
              style={{ left: `${Math.min(100, Math.max(0, valuationScore))}%` }}
            />
          </div>

          <div className="flex justify-between text-[11px] text-slate-400 font-medium px-1">
            <span className="text-emerald-400 font-bold">0% 歷史底部築底</span>
            <span>30% 初升起漲</span>
            <span className="text-blue-400 font-bold">60% 合理估值波段</span>
            <span>85% 高檔強勢</span>
            <span className="text-red-400 font-bold">100% 過熱風險</span>
          </div>
        </div>

        <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
          <strong className="text-indigo-300 font-semibold">三竹位階診斷：</strong>
          {stageAssessment}
        </p>
      </div>

      {/* SECTION 2: Core Metrics Grid (All user-requested metrics) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: 大小單累積買賣超 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-300 mb-3">
              <span className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                <span>大小單累積買賣超</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                三竹主力監控
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800/60">
                <span className="text-slate-400">特大單 (&gt;50張):</span>
                <span className={`font-bold ${orderFlow.superLargeNet >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {orderFlow.superLargeNet >= 0 ? '+' : ''}{orderFlow.superLargeNet.toLocaleString()} 張
                </span>
              </div>
              <div className="flex justify-between items-center bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800/60">
                <span className="text-slate-400">大單 (10-50張):</span>
                <span className={`font-bold ${orderFlow.largeNet >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {orderFlow.largeNet >= 0 ? '+' : ''}{orderFlow.largeNet.toLocaleString()} 張
                </span>
              </div>
              <div className="flex justify-between items-center bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800/60">
                <span className="text-slate-400">中單 (3-10張):</span>
                <span className={`font-bold ${orderFlow.mediumNet >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {orderFlow.mediumNet >= 0 ? '+' : ''}{orderFlow.mediumNet.toLocaleString()} 張
                </span>
              </div>
              <div className="flex justify-between items-center bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800/60">
                <span className="text-slate-400">散單小單 (1-3張):</span>
                <span className={`font-bold ${orderFlow.smallNet >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {orderFlow.smallNet >= 0 ? '+' : ''}{orderFlow.smallNet.toLocaleString()} 張
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>大單合計買賣超:</span>
            <span className={`font-mono font-bold ${orderFlow.superLargeNet + orderFlow.largeNet >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {(orderFlow.superLargeNet + orderFlow.largeNet) >= 0 ? '+' : ''}
              {(orderFlow.superLargeNet + orderFlow.largeNet).toLocaleString()} 張
            </span>
          </div>
        </div>

        {/* CARD 2: 大小單買賣比例 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-300 mb-3">
              <span className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                <PieChart className="w-4 h-4 text-indigo-400" />
                <span>大小單買賣比例</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                盤中多空對抗
              </span>
            </div>

            <div className="space-y-3">
              {/* 大單買賣比 */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">大單買比 / 賣比</span>
                  <span className="font-mono font-bold text-red-400">{largeOrderBuyRatio}% <span className="text-slate-500">/</span> {largeOrderSellRatio}%</span>
                </div>
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                  <div className="bg-red-500 transition-all duration-500" style={{ width: `${largeOrderBuyRatio}%` }} />
                  <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${largeOrderSellRatio}%` }} />
                </div>
              </div>

              {/* 散單買賣比 */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">散單買比 / 賣比</span>
                  <span className="font-mono font-bold text-slate-300">{smallOrderBuyRatio}% <span className="text-slate-500">/</span> {smallOrderSellRatio}%</span>
                </div>
                <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                  <div className="bg-red-500/70 transition-all duration-500" style={{ width: `${smallOrderBuyRatio}%` }} />
                  <div className="bg-emerald-500/70 transition-all duration-500" style={{ width: `${smallOrderSellRatio}%` }} />
                </div>
              </div>

              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60 text-xs flex justify-between items-center">
                <span className="text-slate-400">主力籌碼集中度:</span>
                <span className="font-mono font-bold text-indigo-400">{majorConcentration}% (籌碼強固)</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
            {largeOrderBuyRatio > largeOrderSellRatio 
              ? '💡 大單買進動能強勁，主力手筆偏多主控' 
              : '⚠️ 大單調節比例偏高，提防主力逢高獲利結帳'}
          </div>
        </div>

        {/* CARD 3: 基本面 (淨值、EPS、本益比) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-300 mb-3">
              <span className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>淨值 · EPS · 本益比</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                基本面評價
              </span>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between items-center bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                <div>
                  <div className="text-[11px] text-slate-400">每股淨值 (NAV)</div>
                  <div className="text-base font-mono font-bold text-slate-100">${bookValue.toFixed(2)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-400">股價淨值比 (P/B)</div>
                  <div className="text-sm font-mono font-bold text-cyan-400">{pb} 倍</div>
                </div>
              </div>

              <div className="flex justify-between items-center bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                <div>
                  <div className="text-[11px] text-slate-400">近四季 EPS (每股盈餘)</div>
                  <div className="text-base font-mono font-bold text-emerald-400">${eps.toFixed(2)} 元</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-400">本益比 (P/E)</div>
                  <div className="text-sm font-mono font-bold text-amber-400">{pe} 倍</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex justify-between">
            <span>PE河流通道估值:</span>
            <span className="font-bold text-slate-300">{pe < 18 ? '低估偏便宜' : pe < 25 ? '合理估值區間' : '高成長定價'}</span>
          </div>
        </div>

        {/* CARD 4: 最新財報營收表現 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-300 mb-3">
              <span className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <span>最新財報營收表現</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                {revenueMonth}
              </span>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 mb-2.5">
              <div className="text-xs text-slate-400 mb-0.5">單月合併營收</div>
              <div className="text-2xl font-mono font-black text-slate-100">
                {revenueCurrent.toLocaleString()} <span className="text-xs font-normal text-slate-400">億元</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60 text-center">
                <div className="text-[10px] text-slate-400">月增率 (MoM)</div>
                <div className={`font-bold text-sm mt-0.5 ${revenueMoM >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {revenueMoM >= 0 ? '+' : ''}{revenueMoM}%
                </div>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60 text-center">
                <div className="text-[10px] text-slate-400">年增率 (YoY)</div>
                <div className={`font-bold text-sm mt-0.5 ${revenueYoY >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {revenueYoY >= 0 ? '+' : ''}{revenueYoY}%
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>營收成長動能:</span>
            <span className={`font-bold ${revenueYoY >= 20 ? 'text-emerald-400' : revenueYoY > 0 ? 'text-blue-400' : 'text-amber-400'}`}>
              {revenueYoY >= 20 ? '🔥 高成長爆發期' : revenueYoY > 0 ? '穩定正成長' : '處於週期築底'}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 3: Advanced Technical & Smart Money Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 5: 阿法值 (Alpha, α) & 貝塔值 (Beta, β) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-300 mb-3">
            <span className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Scale className="w-4 h-4 text-cyan-400" />
              <span>阿法值與貝塔值</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              量化指標
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
              <div className="text-[11px] text-slate-400">阿法值 (Alpha, α)</div>
              <div className={`text-lg font-mono font-bold mt-0.5 ${alpha >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {alpha >= 0 ? '+' : ''}{alpha}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">相對大盤超額收益</div>
            </div>

            <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
              <div className="text-[11px] text-slate-400">貝塔值 (Beta, β)</div>
              <div className="text-lg font-mono font-bold text-amber-400 mt-0.5">
                {beta}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">大盤波動敏感係數</div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/40 leading-relaxed">
            {beta > 1.3 ? '屬於高敏銳高進攻型個股，大盤上漲時彈力十足；' : '波動接近或低於大盤，防禦性較高；'}
            {alpha > 0 ? ' 阿法值正向表示個股具顯著獨立超額Alpha實力。' : ' 阿法值偏弱需留意抗跌能力。'}
          </div>
        </div>

        {/* CARD 6: 主力囤貨張數 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-300 mb-3">
            <span className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>主力囤貨張數</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              大戶鎖碼
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 mb-3">
            <div className="text-xs text-slate-400">近 20 日主力囤貨累計</div>
            <div className={`text-2xl font-mono font-black mt-0.5 ${majorAccumulation >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {majorAccumulation >= 0 ? '+' : ''}{majorAccumulation.toLocaleString()} <span className="text-xs font-normal text-slate-400">張</span>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs bg-slate-950/40 p-2 rounded-lg border border-slate-800/40 mb-2">
            <span className="text-slate-400">近 5 日主力加速吸籌:</span>
            <span className={`font-mono font-bold ${majorAccumulation5d >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {majorAccumulation5d >= 0 ? '+' : ''}{majorAccumulation5d.toLocaleString()} 張
            </span>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>籌碼沉澱狀態:</span>
            <span className="font-bold text-slate-200">
              {majorAccumulation > 10000 ? '🔒 大戶高度鎖碼' : '流通籌碼正常換手'}
            </span>
          </div>
        </div>

        {/* CARD 7: 主力均價 (成本線) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-300 mb-3">
            <span className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>主力均價 (成本線)</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              防守防線
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 mb-3">
            <div className="text-xs text-slate-400">近 20 日主力平均持股成本</div>
            <div className="text-2xl font-mono font-black text-amber-400 mt-0.5">
              ${majorCost.toFixed(1)} <span className="text-xs font-normal text-slate-400">元</span>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs bg-slate-950/40 p-2 rounded-lg border border-slate-800/40 mb-2">
            <span className="text-slate-400">當前現價 vs 主力成本:</span>
            <span className={`font-mono font-bold ${majorCostPremium >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {majorCostPremium >= 0 ? '+' : ''}{majorCostPremium}% ({majorCostDiff >= 0 ? '獲利保護' : '跌破成本'})
            </span>
          </div>

          <div className="text-[11px] text-slate-400">
            {majorCostPremium > 0 && majorCostPremium < 6 
              ? '🎯 股價緊貼主力成本線，具強烈買盤護盤支撐效益' 
              : majorCostPremium >= 6 
              ? '波段已拉開主力成本差距，留意逢高調節節奏' 
              : '股價低於主力均價，主力面臨自救拉抬可能'}
          </div>
        </div>

        {/* CARD 8: 周轉率 (Turnover Rate) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-300 mb-3">
            <span className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Activity className="w-4 h-4 text-rose-400" />
              <span>當日周轉率</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
              市場換手率
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 mb-3">
            <div className="text-xs text-slate-400">今日換手周轉率</div>
            <div className="text-2xl font-mono font-black text-slate-100 mt-0.5">
              {turnoverRate.toFixed(2)}%
            </div>
          </div>

          <div className="flex justify-between items-center text-xs bg-slate-950/40 p-2 rounded-lg border border-slate-800/40 mb-2">
            <span className="text-slate-400">5 日平均周轉率:</span>
            <span className="font-mono font-bold text-slate-300">{turnoverRate5dAvg.toFixed(2)}%</span>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>量能換手品質:</span>
            <span className="font-bold text-slate-200">
              {turnoverRate > 8 ? '🔥 爆量過熱警示' : turnoverRate > 3 ? '✅ 活躍健康換手' : '🌱 量縮溫和整理'}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION: 主力籌碼多空雷達 (過去 20 日籌碼結構變化：散戶流向、大單淨買賣、融資餘額、借券賣出、外資投信持股比例) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/25 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-5">
          <div className="flex items-start sm:items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
                chipRadar.compositeScore >= 60
                  ? 'bg-rose-600/25 border border-rose-500/50 text-rose-400'
                  : chipRadar.compositeScore >= 45
                  ? 'bg-amber-600/25 border border-amber-500/50 text-amber-400'
                  : 'bg-emerald-600/25 border border-emerald-500/50 text-emerald-400'
              }`}
            >
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">
                  主力籌碼多空雷達 (20-Day Major Chip Bull/Bear Radar)
                </h3>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${chipRadar.compositeTagClass}`}>
                  {chipRadar.compositeStatus}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-md font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">
                  多空總分: {chipRadar.compositeScore} 分 (20日{' '}
                  {chipRadar.compositeDelta20d >= 0 ? '+' : ''}
                  {chipRadar.compositeDelta20d}分)
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-md font-bold bg-slate-800/90 text-amber-300 border border-amber-500/30">
                  博弈格局：{chipRadar.snapshot20d.gamePatternLabel}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                將過去 20 日的五大核心籌碼結構變化（「大單淨買賣」、「外資投信持股比例」、「融資餘額」、「借券賣出」、「散戶流向」）以五維度雷達圖呈現，一目了然個股目前的多空籌碼博弈狀況
              </p>
            </div>
          </div>

          {/* 20-Day Structure Comparison Mode Toggle */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-lg p-1 text-xs">
              <button
                type="button"
                onClick={() => setChipRadarOverlayMode('vs20dAgo')}
                className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                  chipRadarOverlayMode === 'vs20dAgo'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                最新 vs 20日前結構
              </button>
              <button
                type="button"
                onClick={() => setChipRadarOverlayMode('all3Stages')}
                className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                  chipRadarOverlayMode === 'all3Stages'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                20日前 / 5日前 / 最新演進
              </button>
              <button
                type="button"
                onClick={() => setChipRadarOverlayMode('vsBenchmark')}
                className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                  chipRadarOverlayMode === 'vsBenchmark'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                對比 50分多空基準
              </button>
            </div>
          </div>
        </div>

        {/* Main 12-Col Grid: Left 6 Cols Recharts 5-Axis Radar Chart, Right 6 Cols 5-Dimension 20-Day Evolution Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
          {/* LEFT 6 Cols: 20-Day Chip Structure Radar Chart */}
          <div className="lg:col-span-6 bg-slate-950/75 border border-slate-800/90 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
            <div
              className="absolute w-60 h-60 rounded-full blur-3xl pointer-events-none opacity-15 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                backgroundColor:
                  chipRadar.compositeScore >= 60
                    ? '#f43f5e'
                    : chipRadar.compositeScore >= 45
                    ? '#f59e0b'
                    : '#10b981',
              }}
            />

            <div className="w-full flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 px-1 mb-1 relative z-10">
              <span className="font-bold text-slate-200 flex items-center">
                <Activity className="w-3.5 h-3.5 mr-1.5 text-rose-400" />
                過去 20 日籌碼結構變化雷達 (0 ~ 100 分)
              </span>
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
                <span className="flex items-center">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 mr-1" />
                  當前最新 ({chipRadar.polygonAreaPct}%面積)
                </span>
                {chipRadarOverlayMode === 'all3Stages' && (
                  <span className="flex items-center">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 mr-1" />
                    5日前
                  </span>
                )}
                {(chipRadarOverlayMode === 'vs20dAgo' || chipRadarOverlayMode === 'all3Stages') && (
                  <span className="flex items-center">
                    <span className="w-2.5 h-2.5 rounded-sm bg-sky-400 mr-1" />
                    20日前 ({chipRadar.polygonArea20dAgoPct}%面積)
                  </span>
                )}
                <span className="flex items-center">
                  <span className="w-2.5 h-0.5 bg-slate-400 mr-1" />
                  50分均衡線
                </span>
              </div>
            </div>

            {/* Recharts RadarChart */}
            <div className="w-full h-72 sm:h-80 relative select-none z-10">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="73%" data={chipRadar.radarData}>
                  <PolarGrid stroke="#334155" strokeDasharray="3,3" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: '#f1f5f9', fontSize: 12, fontWeight: 700 }}
                  />
                  <PolarRadiusAxis
                    angle={18}
                    domain={[0, 100]}
                    stroke="#475569"
                    tick={{ fill: '#64748b', fontSize: 9 }}
                    tickCount={5}
                  />

                  {/* 50 Baseline Neutral Benchmark Polygon */}
                  <Radar
                    name="多空均衡基準 (50分)"
                    dataKey="benchmark"
                    stroke="#64748b"
                    strokeWidth={1.2}
                    fill="#64748b"
                    fillOpacity={chipRadarOverlayMode === 'vsBenchmark' ? 0.14 : 0.05}
                    strokeDasharray="3,3"
                  />

                  {/* 20 Days Ago Chip Structure Polygon */}
                  {(chipRadarOverlayMode === 'vs20dAgo' || chipRadarOverlayMode === 'all3Stages') && (
                    <Radar
                      name="20日前籌碼結構"
                      dataKey="score20dAgo"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      strokeDasharray="4,2"
                      fill="#38bdf8"
                      fillOpacity={0.16}
                    />
                  )}

                  {/* 5 Days Ago Chip Structure Polygon */}
                  {chipRadarOverlayMode === 'all3Stages' && (
                    <Radar
                      name="5日前籌碼結構"
                      dataKey="score5dAgo"
                      stroke="#fbbf24"
                      strokeWidth={1.8}
                      strokeDasharray="2,2"
                      fill="#fbbf24"
                      fillOpacity={0.14}
                    />
                  )}

                  {/* Current Latest 20-Day Chip Structure Polygon */}
                  <Radar
                    name={`${stock.name} 最新籌碼結構`}
                    dataKey="score"
                    stroke={
                      chipRadar.compositeScore >= 60
                        ? '#f43f5e'
                        : chipRadar.compositeScore >= 45
                        ? '#f59e0b'
                        : '#10b981'
                    }
                    strokeWidth={2.5}
                    fill={
                      chipRadar.compositeScore >= 60
                        ? '#f43f5e'
                        : chipRadar.compositeScore >= 45
                        ? '#f59e0b'
                        : '#10b981'
                    }
                    fillOpacity={0.38}
                  />

                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as any;
                        return (
                          <div className="bg-slate-950/95 border border-slate-700/80 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs font-mono max-w-xs z-50">
                            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-1.5">
                              <span className="font-bold text-slate-100 flex items-center">
                                <span
                                  className="w-2 h-2 rounded-full mr-1.5"
                                  style={{ backgroundColor: data.statusColor }}
                                />
                                {data.subject} ({data.actorLabel})
                              </span>
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                                style={{
                                  backgroundColor: `${data.statusColor}22`,
                                  color: data.statusColor,
                                }}
                              >
                                {data.statusLabel}
                              </span>
                            </div>
                            <div className="space-y-1 text-[11px]">
                              <div className="flex justify-between">
                                <span className="text-slate-400">最新多方評分:</span>
                                <span className="font-bold text-rose-400">{data.score} 分</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">20日前基準評分:</span>
                                <span className="font-bold text-sky-400">{data.score20dAgo} 分</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">20日結構淨變化:</span>
                                <span
                                  className={`font-bold ${
                                    data.delta20dScore >= 0 ? 'text-rose-400' : 'text-emerald-400'
                                  }`}
                                >
                                  {data.delta20dScore >= 0 ? '+' : ''}
                                  {data.delta20dScore} 分 ({data.directionLabel})
                                </span>
                              </div>
                              <div className="flex justify-between pt-1 border-t border-slate-800/80">
                                <span className="text-slate-400">當前水位:</span>
                                <span className="font-bold text-slate-100">{data.currentValueDisplay}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">20日變化:</span>
                                <span className="font-bold text-amber-300">{data.change20dDisplay}</span>
                              </div>
                            </div>
                            <p className="mt-2 pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-300 font-sans leading-relaxed">
                              {data.gameInsight}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Bottom Summary Strip inside Radar Card */}
            <div className="pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono relative z-10">
              <span className="text-slate-400">
                雷達多方覆蓋面積：
                <strong className="text-slate-100 ml-1">
                  20日前 {chipRadar.polygonArea20dAgoPct}% ➔ 最新 {chipRadar.polygonAreaPct}%
                </strong>
              </span>
              <span
                className={`px-2 py-0.5 rounded font-bold ${
                  chipRadar.polygonAreaPct - chipRadar.polygonArea20dAgoPct >= 0
                    ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                    : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                20日面積變動:{' '}
                {chipRadar.polygonAreaPct - chipRadar.polygonArea20dAgoPct >= 0 ? '+' : ''}
                {chipRadar.polygonAreaPct - chipRadar.polygonArea20dAgoPct}%p
              </span>
            </div>
          </div>

          {/* RIGHT 6 Cols: 5 Core Chip Dimensions 20-Day Evolution Breakdown Cards */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-slate-200">
                五大籌碼維度 · 過去 20 日結構變化明細 (點擊維度檢視深度博弈解讀)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">20日前 ➔ 最新得分</span>
            </div>

            {chipRadar.radarData.map((item) => {
              const isSelected = activeChipAxis.id === item.id;
              const isImproved = item.delta20dScore >= 0;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedChipAxisId(item.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-rose-950/30 border-rose-500/60 ring-1 ring-rose-500/30 shadow-md'
                      : 'bg-slate-950/75 hover:bg-slate-900 border-slate-800/90 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center space-x-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.statusColor }}
                      />
                      <span className="text-xs sm:text-sm font-bold text-slate-100">
                        {item.subject}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                        {item.actorLabel}
                      </span>
                      <span
                        className="text-[10px] px-2 py-0.2 rounded font-bold"
                        style={{
                          backgroundColor: `${item.statusColor}20`,
                          color: item.statusColor,
                        }}
                      >
                        {item.statusLabel}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 font-mono text-xs">
                      <span className="text-slate-400 text-[11px]">{item.score20dAgo}分</span>
                      <span className="text-slate-600">➔</span>
                      <span className="font-extrabold text-white">{item.score}分</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                          isImproved
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {isImproved ? '+' : ''}
                        {item.delta20dScore}分
                      </span>
                    </div>
                  </div>

                  {/* Dual Progress Bar: 20d ago vs Current */}
                  <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden mb-1.5 relative">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${item.score}%`,
                        backgroundColor: item.statusColor,
                      }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                    <span className="text-slate-300">
                      目前：<strong className="text-slate-100">{item.currentValueDisplay}</strong>
                    </span>
                    <span className="text-amber-300 font-semibold">{item.change20dDisplay}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Deep Game Insight & Tactical Playbook Banner */}
        <div className="bg-slate-950/85 border border-slate-800 rounded-xl p-4 grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-900/70 p-3 rounded-lg border border-rose-500/30">
            <div className="font-bold text-rose-300 mb-1 flex items-center justify-between">
              <span className="flex items-center">
                <Target className="w-3.5 h-3.5 mr-1.5 text-rose-400" />
                焦點維度博弈剖析：{activeChipAxis.subject}
              </span>
              <span className="font-mono text-[11px] text-slate-300">{activeChipAxis.score} / 100分</span>
            </div>
            <p className="text-slate-300 leading-relaxed">{activeChipAxis.gameInsight}</p>
          </div>

          <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-800/80">
            <div className="font-bold text-slate-200 mb-1 flex items-center">
              <Activity className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
              過去 20 日籌碼結構總體研判
            </div>
            <p className="text-slate-400 leading-relaxed">{chipRadar.structureDiagnosis}</p>
          </div>

          <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-800/80">
            <div className="font-bold text-slate-200 mb-1 flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
              三竹籌碼博弈實戰對策
            </div>
            <p className="text-slate-400 leading-relaxed">{chipRadar.tacticalSummary}</p>
          </div>
        </div>
      </div>

      {/* SECTION: 財務品質雷達矩陣 (近 4 季 EPS 成長率、毛利率變動、負債比與營收年增率 & 雷達面積長期價值評價) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/25 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Top Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-5">
          <div className="flex items-start sm:items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
                financialRadar.areaGrade === 'S' || financialRadar.areaGrade === 'A'
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                  : financialRadar.areaGrade === 'B'
                  ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-400'
                  : 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
              }`}
            >
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">
                  財務品質雷達矩陣 (4-Quarter Financial Quality Radar Matrix)
                </h3>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-extrabold border ${
                    financialRadar.areaGrade === 'S'
                      ? 'bg-red-500/20 text-red-300 border-red-500/40'
                      : financialRadar.areaGrade === 'A'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : financialRadar.areaGrade === 'B'
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}
                >
                  雷達面積覆蓋率 {financialRadar.latestQuarter.areaCoveragePct}% · {financialRadar.areaGrade}級評價
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-md font-bold bg-slate-800/90 text-slate-200 border border-slate-700">
                  財務體質：{financialRadar.financialHealthLabel} ({financialRadar.areaTrajectoryType})
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                視覺化對比近 4 季「EPS 成長率」、「毛利率變動」、「負債比結構」與「營收年增率」，透過四維度雷達多邊形面積大小量化評估長期投資價值與財務護城河強弱
              </p>
            </div>
          </div>

          {/* Interactive Controls: Overlay Mode Switcher */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-lg p-1 text-xs">
              <button
                type="button"
                onClick={() => setFinRadarOverlayMode('vsPrev')}
                className={`px-2.5 py-1 rounded-md font-bold transition-colors ${
                  finRadarOverlayMode === 'vsPrev'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                最新季 vs 前一季
              </button>
              <button
                type="button"
                onClick={() => setFinRadarOverlayMode('vsAvg')}
                className={`px-2.5 py-1 rounded-md font-bold transition-colors ${
                  finRadarOverlayMode === 'vsAvg'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                最新季 vs 四季均值
              </button>
              <button
                type="button"
                onClick={() => setFinRadarOverlayMode('all4Q')}
                className={`px-2.5 py-1 rounded-md font-bold transition-colors ${
                  finRadarOverlayMode === 'all4Q'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                近 4 季面積演進
              </button>
            </div>
          </div>
        </div>

        {/* Main 12-Col Grid: Left 5 Cols Radar Chart + Area Gauge, Right 7 Cols 4-Quarter Matrix & Area Trajectory */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
          {/* Left 5 Cols: 4-Axis Financial Quality Radar Chart & Polygon Area Meter */}
          <div className="lg:col-span-5 bg-slate-950/70 border border-slate-800/90 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-slate-200">
                  四維度財務品質雷達圖 ({activeFinQuarter.quarter} 檢視)
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                多邊形面積: <strong className="text-emerald-400">{activeFinQuarter.rawPolygonArea.toLocaleString()}</strong> / 20,000
              </span>
            </div>

            {/* Radar Chart Container */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="73%" data={financialRadar.radarData}>
                  <PolarGrid stroke="#334155" strokeDasharray="3 3" />
                  <PolarAngleAxis
                    dataKey="dimension"
                    tick={{ fill: '#e2e8f0', fontSize: 12, fontWeight: 700 }}
                  />
                  <PolarRadiusAxis
                    angle={45}
                    domain={[0, 100]}
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickCount={5}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                      color: '#f8fafc',
                    }}
                  />
                  {finRadarOverlayMode === 'all4Q' && (
                    <>
                      <Radar
                        name={`${financialRadar.quarters[0].quarter} (面積 ${financialRadar.quarters[0].areaCoveragePct}%)`}
                        dataKey="q0Score"
                        stroke="#64748b"
                        strokeWidth={1.5}
                        strokeDasharray="3 3"
                        fill="#64748b"
                        fillOpacity={0.08}
                      />
                      <Radar
                        name={`${financialRadar.quarters[1].quarter} (面積 ${financialRadar.quarters[1].areaCoveragePct}%)`}
                        dataKey="q1Score"
                        stroke="#38bdf8"
                        strokeWidth={1.5}
                        fill="#38bdf8"
                        fillOpacity={0.12}
                      />
                    </>
                  )}
                  {(finRadarOverlayMode === 'vsPrev' || finRadarOverlayMode === 'all4Q') && (
                    <Radar
                      name={`${financialRadar.previousQuarter.quarter} 前季 (面積 ${financialRadar.previousQuarter.areaCoveragePct}%)`}
                      dataKey="q2Score"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="4 2"
                      fill="#f59e0b"
                      fillOpacity={0.18}
                    />
                  )}
                  {finRadarOverlayMode === 'vsAvg' && (
                    <Radar
                      name={`近4季平均 (面積 ${financialRadar.avgAreaCoveragePct}%)`}
                      dataKey="avgScore"
                      stroke="#818cf8"
                      strokeWidth={2}
                      strokeDasharray="4 2"
                      fill="#818cf8"
                      fillOpacity={0.2}
                    />
                  )}
                  <Radar
                    name={`${financialRadar.latestQuarter.quarter} 最新季 (面積 ${financialRadar.latestQuarter.areaCoveragePct}%)`}
                    dataKey="q3Score"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fill="#10b981"
                    fillOpacity={0.35}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Polygon Area Size Comparison Bar (4 Quarters) */}
            <div className="mt-2 pt-3 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                <span>近 4 季雷達面積覆蓋率演進 (點選季度切換明細)</span>
                <span
                  className={`font-mono font-bold ${
                    financialRadar.areaExpansion4Q >= 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  4季面積淨變動: {financialRadar.areaExpansion4Q >= 0 ? '+' : ''}
                  {financialRadar.areaExpansion4Q}%p
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {financialRadar.quarters.map((q, idx) => {
                  const isSel = idx === selectedFinQuarterIdx;
                  return (
                    <button
                      key={q.quarter}
                      type="button"
                      onClick={() => setSelectedFinQuarterIdx(idx)}
                      className={`p-2 rounded-lg border text-left transition-all ${
                        isSel
                          ? 'bg-emerald-950/50 border-emerald-500/60 ring-1 ring-emerald-500/30'
                          : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-mono font-bold text-slate-200">{q.quarter}</span>
                        <span
                          className={`px-1 rounded font-mono font-bold ${
                            q.quarterGrade === 'S'
                              ? 'bg-red-500/20 text-red-300'
                              : q.quarterGrade === 'A'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : q.quarterGrade === 'B'
                              ? 'bg-indigo-500/20 text-indigo-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {q.quarterGrade}
                        </span>
                      </div>
                      <div className="text-sm font-mono font-black text-slate-100 mt-0.5">
                        {q.areaCoveragePct}%
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full ${
                            q.isLatest ? 'bg-emerald-400' : 'bg-indigo-400/80'
                          }`}
                          style={{ width: `${Math.min(100, q.areaCoveragePct)}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right 7 Cols: 4-Quarter Financial Quality Matrix Table & 4-Dimension Cards */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            {/* 4-Axis Score Cards for Active Quarter */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* 1. EPS Growth Rate */}
              <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>EPS 成長率</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-emerald-300">
                    {activeFinQuarter.epsGrowthScore}分
                  </span>
                </div>
                <div
                  className={`text-lg font-mono font-black mt-1 ${
                    activeFinQuarter.epsYoY >= 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {activeFinQuarter.epsYoY >= 0 ? '+' : ''}
                  {activeFinQuarter.epsYoY}%
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  單季 EPS: <strong className="text-slate-200">{activeFinQuarter.eps} 元</strong>
                </div>
              </div>

              {/* 2. Gross Margin Change */}
              <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>毛利率變動</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-emerald-300">
                    {activeFinQuarter.marginDeltaScore}分
                  </span>
                </div>
                <div
                  className={`text-lg font-mono font-black mt-1 ${
                    activeFinQuarter.grossMarginChange >= 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {activeFinQuarter.grossMarginChange >= 0 ? '+' : ''}
                  {activeFinQuarter.grossMarginChange}%p
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  單季毛利率: <strong className="text-slate-200">{activeFinQuarter.grossMargin}%</strong>
                </div>
              </div>

              {/* 3. Debt Ratio */}
              <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>負債比結構</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-emerald-300">
                    {activeFinQuarter.debtSafetyScore}分
                  </span>
                </div>
                <div className="text-lg font-mono font-black text-slate-100 mt-1">
                  {activeFinQuarter.debtRatio}%
                </div>
                <div
                  className={`text-[10px] font-mono mt-0.5 ${
                    activeFinQuarter.debtRatioChange <= 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  季變動: {activeFinQuarter.debtRatioChange > 0 ? '+' : ''}
                  {activeFinQuarter.debtRatioChange}%p ({activeFinQuarter.debtRatioChange <= 0 ? '降債優化' : '槓桿微增'})
                </div>
              </div>

              {/* 4. Revenue YoY */}
              <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>營收年增率</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-emerald-300">
                    {activeFinQuarter.revenueGrowthScore}分
                  </span>
                </div>
                <div
                  className={`text-lg font-mono font-black mt-1 ${
                    activeFinQuarter.revenueYoY >= 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {activeFinQuarter.revenueYoY >= 0 ? '+' : ''}
                  {activeFinQuarter.revenueYoY}%
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  營收動能: <strong className="text-slate-200">{activeFinQuarter.revenueYoY >= 15 ? '強勁擴張' : activeFinQuarter.revenueYoY >= 0 ? '穩健成長' : '逆風整理'}</strong>
                </div>
              </div>
            </div>

            {/* 4-Quarter Financial Quality Comparison Matrix Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70">
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/90 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-2.5 px-3">季度別</th>
                    <th className="py-2.5 px-3 text-right">EPS / 年增率</th>
                    <th className="py-2.5 px-3 text-right">毛利率 / 季變動</th>
                    <th className="py-2.5 px-3 text-right">負債比 (安全分)</th>
                    <th className="py-2.5 px-3 text-right">營收年增率</th>
                    <th className="py-2.5 px-3 text-right">雷達面積覆蓋率</th>
                    <th className="py-2.5 px-3 text-center">體質評級</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-xs">
                  {financialRadar.quarters.map((q, idx) => {
                    const isSelected = idx === selectedFinQuarterIdx;
                    return (
                      <tr
                        key={q.quarter}
                        onClick={() => setSelectedFinQuarterIdx(idx)}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-950/35 hover:bg-emerald-950/45'
                            : 'hover:bg-slate-900/60'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-100">
                          <div className="flex items-center space-x-1.5">
                            <span
                              className={`w-1.5 h-5 rounded-full ${
                                q.isLatest ? 'bg-emerald-400' : 'bg-slate-600'
                              }`}
                            />
                            <span>{q.quarter}</span>
                            {q.isLatest && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                最新季
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          <span
                            className={`font-bold ${
                              q.epsYoY >= 0 ? 'text-red-400' : 'text-emerald-400'
                            }`}
                          >
                            {q.epsYoY >= 0 ? '+' : ''}
                            {q.epsYoY}%
                          </span>
                          <div className="text-[10px] text-slate-400">EPS {q.eps}元</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          <span className="text-slate-200 font-bold">{q.grossMargin}%</span>
                          <div
                            className={`text-[10px] font-bold ${
                              q.grossMarginChange >= 0 ? 'text-red-400' : 'text-emerald-400'
                            }`}
                          >
                            {q.grossMarginChange >= 0 ? '+' : ''}
                            {q.grossMarginChange}%p
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          <span className="text-slate-200 font-bold">{q.debtRatio}%</span>
                          <div className="text-[10px] text-slate-400">
                            安全度 {q.debtSafetyScore}分
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          <span
                            className={`font-bold ${
                              q.revenueYoY >= 0 ? 'text-red-400' : 'text-emerald-400'
                            }`}
                          >
                            {q.revenueYoY >= 0 ? '+' : ''}
                            {q.revenueYoY}%
                          </span>
                          <div className="text-[10px] text-slate-400">
                            動能 {q.revenueGrowthScore}分
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          <div className="text-sm font-black text-emerald-400">
                            {q.areaCoveragePct}%
                          </div>
                          <div
                            className={`text-[10px] ${
                              q.areaChangeQoQ >= 0 ? 'text-red-400' : 'text-emerald-400'
                            }`}
                          >
                            季變動 {q.areaChangeQoQ >= 0 ? '+' : ''}
                            {q.areaChangeQoQ}%p
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-extrabold border ${
                              q.quarterGrade === 'S'
                                ? 'bg-red-500/20 text-red-300 border-red-500/40'
                                : q.quarterGrade === 'A'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : q.quarterGrade === 'B'
                                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            }`}
                          >
                            {q.quarterGrade} 級
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Long-Term Value & Financial Health Diagnosis Footer Box */}
            <div className="bg-slate-950/85 border border-emerald-500/30 rounded-xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center space-x-2">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-extrabold text-slate-100">
                    雷達圖面積長期價值評價：{financialRadar.longTermValueTitle}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  近4季平均面積 <strong className="text-slate-200">{financialRadar.avgAreaCoveragePct}%</strong> → 最新季{' '}
                  <strong className="text-emerald-400">{financialRadar.latestQuarter.areaCoveragePct}%</strong>
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                {financialRadar.longTermValueVerdict}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
                {financialRadar.keyStrengths.map((str, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    {str}
                  </span>
                ))}
                {financialRadar.keyWarnings.map((warn, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium"
                  >
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    {warn}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: 籌碼主力持倉成本變動表 (5日 / 20日 / 60日 主力平均成本對比與操作意圖診斷) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/30 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-5">
          <div className="flex items-start sm:items-center space-x-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
                costVariation.overallStage === '獲利擴大'
                  ? 'bg-red-500/20 border border-red-500/40 text-red-400'
                  : 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
              }`}
            >
              <Table className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">
                  籌碼主力持倉成本變動表
                </h3>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                    costVariation.overallStage === '獲利擴大'
                      ? 'bg-red-500/15 text-red-300 border-red-500/40'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                  }`}
                >
                  當前主力階段：{costVariation.overallStage}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-md font-mono font-semibold bg-slate-800/90 text-slate-300 border border-slate-700">
                  {costVariation.overallStageHeadline}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                橫向對比 <span className="text-slate-200 font-semibold">5日短線</span>、
                <span className="text-slate-200 font-semibold">20日波段</span> 與{' '}
                <span className="text-slate-200 font-semibold">60日長線</span> 主力平均持倉成本與成本墊高/下移軌跡，精準判讀主力處於「獲利擴大」或「成本解套」階段
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-stretch lg:self-auto justify-between lg:justify-end bg-slate-950/70 px-3.5 py-2 rounded-xl border border-slate-800/80">
            <div className="text-xs text-slate-400">
              成本排列結構：
              <span
                className={`ml-1 font-bold ${
                  costVariation.isBullishCostAlignment ? 'text-red-400' : 'text-amber-400'
                }`}
              >
                {costVariation.costAlignmentOrder}
              </span>
            </div>
          </div>
        </div>

        {/* 4 Key Summary Signals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {costVariation.keySignals.map((sig, idx) => (
            <div
              key={idx}
              className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between"
            >
              <span className="text-[11px] text-slate-400 font-medium">{sig.label}</span>
              <span
                className={`text-sm font-mono font-bold mt-1 ${
                  sig.tone === 'red'
                    ? 'text-red-400'
                    : sig.tone === 'emerald'
                    ? 'text-emerald-400'
                    : sig.tone === 'amber'
                    ? 'text-amber-400'
                    : 'text-indigo-400'
                }`}
              >
                {sig.value}
              </span>
            </div>
          ))}
        </div>

        {/* Visual Cost Comparison Ladder (5D / 20D / 60D vs Current Price) */}
        {(() => {
          const allPrices = [
            stock.price,
            ...costVariation.rows.map((r) => r.avgCost),
          ];
          const minP = Math.min(...allPrices) * 0.96;
          const maxP = Math.max(...allPrices) * 1.04;
          const span = Math.max(maxP - minP, 0.01);
          const getPosPct = (val: number) =>
            Math.min(96, Math.max(4, ((val - minP) / span) * 100));

          return (
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 mb-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Crosshair className="w-4 h-4 text-indigo-400" />
                  <span>現價與三週期主力平均成本水位階梯圖</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1 text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-white inline-block ring-2 ring-indigo-500" />
                    現價: <strong className="font-mono">{stock.price}</strong>
                  </span>
                  {costVariation.rows.map((r) => (
                    <span key={r.periodKey} className="flex items-center gap-1 text-slate-300">
                      <span
                        className={`w-2.5 h-2.5 rounded-full inline-block ${
                          r.periodKey === '5d'
                            ? 'bg-amber-400'
                            : r.periodKey === '20d'
                            ? 'bg-red-400'
                            : 'bg-indigo-400'
                        }`}
                      />
                      {r.days}日均價: <strong className="font-mono">{r.avgCost}</strong>
                    </span>
                  ))}
                </div>
              </div>

              <div className="relative h-12 bg-slate-900 rounded-lg border border-slate-800 px-3 flex items-center">
                <div className="w-full h-1.5 bg-gradient-to-r from-emerald-500/30 via-amber-500/30 to-red-500/40 rounded-full relative">
                  {costVariation.rows.map((r) => {
                    const leftPct = getPosPct(r.avgCost);
                    const dotColor =
                      r.periodKey === '5d'
                        ? 'bg-amber-400 border-amber-200'
                        : r.periodKey === '20d'
                        ? 'bg-red-500 border-red-200'
                        : 'bg-indigo-400 border-indigo-200';
                    return (
                      <div
                        key={r.periodKey}
                        style={{ left: `${leftPct}%` }}
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group cursor-pointer"
                        onClick={() => setSelectedCostPeriodKey(r.periodKey)}
                      >
                        <div className={`w-3.5 h-3.5 rounded-full border-2 ${dotColor} shadow`} />
                        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-mono text-slate-400">
                          {r.days}D ({r.avgCost})
                        </div>
                      </div>
                    );
                  })}

                  {/* Current Price Marker */}
                  <div
                    style={{ left: `${getPosPct(stock.price)}%` }}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
                  >
                    <div className="w-4 h-4 rounded-full bg-white border-2 border-indigo-500 shadow-lg ring-4 ring-indigo-500/20" />
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-mono font-bold text-white bg-indigo-600/90 px-1.5 py-0.2 rounded">
                      現價 {stock.price}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Main Comparison Table: 5D / 20D / 60D Major Cost Variation */}
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 mb-5">
          <table className="w-full text-left border-collapse min-w-[820px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">統計週期 / 主力分群</th>
                <th className="py-3 px-3 text-right">主力平均成本</th>
                <th className="py-3 px-3 text-right">成本變動 (較前期)</th>
                <th className="py-3 px-3 text-right">現價 vs 主力成本</th>
                <th className="py-3 px-3 text-right">週期累計買賣超</th>
                <th className="py-3 px-3 text-center">主力持倉階段標示</th>
                <th className="py-3 px-3 text-right">護盤防線 / 壓力位</th>
                <th className="py-3 px-4">主力操作意圖判讀</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {costVariation.rows.map((row) => {
                const isSelected = row.periodKey === selectedCostPeriodKey;
                const isProfitStage = row.stage === '獲利擴大';

                return (
                  <tr
                    key={row.periodKey}
                    onClick={() => setSelectedCostPeriodKey(row.periodKey)}
                    className={`transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-950/40 hover:bg-indigo-950/50'
                        : 'hover:bg-slate-900/60'
                    }`}
                  >
                    {/* Period & Role */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2.5">
                        <span
                          className={`w-2 h-8 rounded-full ${
                            row.periodKey === '5d'
                              ? 'bg-amber-400'
                              : row.periodKey === '20d'
                              ? 'bg-red-500'
                              : 'bg-indigo-400'
                          }`}
                        />
                        <div>
                          <div className="font-bold text-slate-100 flex items-center gap-1.5">
                            <span>{row.periodLabel}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              權重 {row.holdingWeightPct}%
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{row.subLabel}</div>
                        </div>
                      </div>
                    </td>

                    {/* Average Cost */}
                    <td className="py-3.5 px-3 text-right font-mono">
                      <div className="text-sm font-black text-amber-400">{row.avgCost} 元</div>
                      <div className="text-[10px] text-slate-500">前期均價 {row.prevAvgCost}</div>
                    </td>

                    {/* Cost Change vs Prev Period */}
                    <td className="py-3.5 px-3 text-right font-mono">
                      <div
                        className={`font-bold ${
                          row.costChangeVal > 0
                            ? 'text-red-400'
                            : row.costChangeVal < 0
                            ? 'text-emerald-400'
                            : 'text-slate-300'
                        }`}
                      >
                        {row.costChangeVal > 0 ? '+' : ''}
                        {row.costChangeVal} ({row.costChangePct > 0 ? '+' : ''}
                        {row.costChangePct}%)
                      </div>
                      <span
                        className={`inline-block mt-0.5 text-[10px] px-1.5 py-0.2 rounded ${
                          row.costTrendLabel === '成本墊高'
                            ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                            : row.costTrendLabel === '成本下移'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {row.costTrendLabel}
                      </span>
                    </td>

                    {/* Current Price vs Cost (Unrealized Profit/Loss) */}
                    <td className="py-3.5 px-3 text-right font-mono">
                      <div
                        className={`text-sm font-bold ${
                          row.profitPct >= 0 ? 'text-red-400' : 'text-emerald-400'
                        }`}
                      >
                        {row.profitPct >= 0 ? '+' : ''}
                        {row.profitPct}%
                      </div>
                      <div className="text-[10px] text-slate-400">
                        價差 {row.profitDiff >= 0 ? '+' : ''}
                        {row.profitDiff} 元
                      </div>
                    </td>

                    {/* Accumulated Lots */}
                    <td className="py-3.5 px-3 text-right font-mono">
                      <div
                        className={`font-bold ${
                          row.accumulatedLots >= 0 ? 'text-red-400' : 'text-emerald-400'
                        }`}
                      >
                        {row.accumulatedLots >= 0 ? '+' : ''}
                        {row.accumulatedLots.toLocaleString()} 張
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {row.accumulatedLots >= 0 ? '主力淨買超吸籌' : '主力逢高調節'}
                      </div>
                    </td>

                    {/* Stage Badge: 獲利擴大 vs 成本解套 */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="flex flex-col items-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold border shadow-sm ${
                            isProfitStage
                              ? 'bg-red-500/20 text-red-300 border-red-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          {isProfitStage ? (
                            <TrendingUp className="w-3.5 h-3.5 text-red-400" />
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                          )}
                          <span>{row.stage}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1 font-medium">
                          {row.stageSubTag}
                        </span>
                      </div>
                    </td>

                    {/* Key Defense / Pressure Price */}
                    <td className="py-3.5 px-3 text-right font-mono">
                      <div className="text-slate-200">
                        防守 <span className="text-indigo-400 font-bold">{row.defensePrice}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {isProfitStage ? '推升目標' : '解套壓力'}{' '}
                        <span className="text-amber-300 font-bold">{row.pressurePrice}</span>
                      </div>
                    </td>

                    {/* Operational Intent Summary */}
                    <td className="py-3.5 px-4 max-w-[260px]">
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {row.operationalIntent}
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom Diagnostic Box: Overall Intent + Selected Horizon Tactical Guide */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left 7 cols: Overall Multi-Horizon Intent Diagnosis */}
          <div className="lg:col-span-7 bg-slate-950/75 border border-slate-800/90 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Compass className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-100">
                  {costVariation.overallIntentTitle}
                </span>
              </div>
              <span
                className={`text-[11px] px-2 py-0.5 rounded font-bold ${
                  costVariation.overallStage === '獲利擴大'
                    ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                    : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                }`}
              >
                綜合判定：{costVariation.overallStage}階段
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {costVariation.overallIntentDescription}
            </p>
          </div>

          {/* Right 5 cols: Active Selected Period Tactical Advice */}
          <div className="lg:col-span-5 bg-indigo-950/25 border border-indigo-500/30 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-indigo-400" />
                  <span>{activeCostPeriodRow.periodLabel}・實戰跟單建議</span>
                </span>
                <div className="flex items-center space-x-1">
                  {costVariation.rows.map((r) => (
                    <button
                      key={r.periodKey}
                      type="button"
                      onClick={() => setSelectedCostPeriodKey(r.periodKey)}
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold transition-colors ${
                        selectedCostPeriodKey === r.periodKey
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {r.days}日
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                {activeCostPeriodRow.tacticalAdvice}
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-indigo-500/20 flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">
                {activeCostPeriodRow.days}日主力防線:{' '}
                <strong className="text-indigo-300">{activeCostPeriodRow.defensePrice} 元</strong>
              </span>
              <span className="text-slate-400">
                {activeCostPeriodRow.stage === '獲利擴大' ? '波段推升目標' : '解套關鍵壓力'}:{' '}
                <strong className="text-amber-300">{activeCostPeriodRow.pressurePrice} 元</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: 個股風險預警矩陣圖 (Stock Risk Early Warning Matrix) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/25 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${
              riskMatrix.compositeScore >= 75
                ? 'bg-red-600/25 border border-red-500/50 text-red-400'
                : riskMatrix.compositeScore >= 55
                ? 'bg-amber-600/25 border border-amber-500/50 text-amber-400'
                : 'bg-emerald-600/25 border border-emerald-500/50 text-emerald-400'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-slate-100 flex items-center">
                  個股風險預警矩陣圖 (Stock Risk Early Warning Matrix)
                </h3>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${riskMatrix.statusBadgeClass}`}>
                  {riskMatrix.compositeLevelLabel} · {riskMatrix.compositeScore} 分
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-md font-bold border ${riskMatrix.quadrant.borderClass} ${riskMatrix.quadrant.bgClass}`}>
                  {riskMatrix.quadrant.tag}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                透過動態熱力圖即時監控「波動率風險」、「流動性風險」與「技術面過熱程度」三大維度與 9 項關鍵因子
              </p>
            </div>
          </div>

          {/* Quick Defensive Strategy Cards */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono">
            <div className="bg-slate-950/80 border border-slate-800/90 px-3 py-1.5 rounded-xl">
              <span className="text-slate-400 block text-[10px]">建議持股成數</span>
              <span className="font-bold text-slate-200">{riskMatrix.recommendedPositionSize}</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800/90 px-3 py-1.5 rounded-xl">
              <span className="text-slate-400 block text-[10px]">關鍵防守停損價</span>
              <span className="font-bold text-emerald-400">${riskMatrix.defensiveStopPrice}</span>
            </div>
          </div>
        </div>

        {/* 1. 三大核心維度動態比對條 (Three Core Dimensional Comparison Bars) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-5">
          {/* Dimension 1: Volatility */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-1.5">
                <Activity className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-slate-200">
                  {riskMatrix.categories.volatility.title}
                </span>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-md font-bold ${riskMatrix.categories.volatility.badgeClass}`}>
                {riskMatrix.categories.volatility.levelLabel} ({riskMatrix.categories.volatility.score}分)
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden mb-2">
              <div 
                className="h-full rounded-full transition-all duration-500" 
                style={{ 
                  width: `${riskMatrix.categories.volatility.score}%`,
                  backgroundColor: riskMatrix.categories.volatility.color 
                }}
              />
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono">
              <span>Beta: <strong className="text-slate-200">{riskMatrix.categories.volatility.indicators[0].valueDisplay}</strong></span>
              <span>振幅: <strong className="text-slate-200">{riskMatrix.categories.volatility.indicators[1].valueDisplay}</strong></span>
              <span>年化: <strong className="text-slate-200">{riskMatrix.categories.volatility.indicators[2].valueDisplay}</strong></span>
            </div>
          </div>

          {/* Dimension 2: Liquidity & Defense */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-slate-200">
                  {riskMatrix.categories.liquidity.title}
                </span>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-md font-bold ${riskMatrix.categories.liquidity.badgeClass}`}>
                {riskMatrix.categories.liquidity.levelLabel} ({riskMatrix.categories.liquidity.score}分)
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden mb-2">
              <div 
                className="h-full rounded-full transition-all duration-500" 
                style={{ 
                  width: `${riskMatrix.categories.liquidity.score}%`,
                  backgroundColor: riskMatrix.categories.liquidity.color 
                }}
              />
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono">
              <span>周轉: <strong className="text-slate-200">{turnoverRate.toFixed(1)}%</strong></span>
              <span>量比: <strong className="text-slate-200">{(stock.volumeRatio || 1).toFixed(2)}x</strong></span>
              <span>大單淨差: <strong className="text-slate-200">{riskMatrix.categories.liquidity.indicators[2].valueDisplay}</strong></span>
            </div>
          </div>

          {/* Dimension 3: Technical Overheating */}
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-1.5">
                <Flame className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-bold text-slate-200">
                  {riskMatrix.categories.overheating.title}
                </span>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-md font-bold ${riskMatrix.categories.overheating.badgeClass}`}>
                {riskMatrix.categories.overheating.levelLabel} ({riskMatrix.categories.overheating.score}分)
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden mb-2">
              <div 
                className="h-full rounded-full transition-all duration-500" 
                style={{ 
                  width: `${riskMatrix.categories.overheating.score}%`,
                  backgroundColor: riskMatrix.categories.overheating.color 
                }}
              />
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono">
              <span>月線乖離: <strong className="text-slate-200">{riskMatrix.categories.overheating.indicators[0].valueDisplay.split(' ')[0]}</strong></span>
              <span>位階: <strong className="text-slate-200">{valuationScore}分</strong></span>
              <span>主力溢價: <strong className="text-slate-200">{riskMatrix.categories.overheating.indicators[2].valueDisplay.split(' ')[0]}</strong></span>
            </div>
          </div>
        </div>

        {/* 2. 3x3 動態風險熱力矩陣圖 (3x3 Dynamic Risk Heatmap Matrix) */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-slate-300 flex items-center">
              <Sliders className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
              動態熱力因子矩陣 (點選任一因子格可展開深度診斷與操盤應對)
            </span>
            <div className="flex items-center space-x-3 text-[10px] text-slate-400 font-mono">
              <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 mr-1" /> 低度安全 (0-34)</span>
              <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-sm bg-cyan-500 mr-1" /> 中度穩健 (35-59)</span>
              <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500 mr-1" /> 偏高警戒 (60-79)</span>
              <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 mr-1" /> 極度危險 (80-100)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Loop through each category column */}
            {(['volatility', 'liquidity', 'overheating'] as const).map((catKey) => {
              const catData = riskMatrix.categories[catKey];
              return (
                <div key={catKey} className="space-y-2.5">
                  <div className="text-[11px] font-bold text-slate-400 px-1 flex items-center justify-between border-b border-slate-800/80 pb-1">
                    <span>{catData.title}</span>
                    <span className="font-mono">{catData.score} 分</span>
                  </div>

                  {catData.indicators.map((item) => {
                    const isSelected = activeRiskIndicator.id === item.id;
                    const cellColorClass = 
                      item.score >= 80 
                        ? 'bg-red-950/40 border-red-500/50 hover:bg-red-900/50 hover:border-red-400 text-red-200' 
                        : item.score >= 60 
                        ? 'bg-amber-950/40 border-amber-500/50 hover:bg-amber-900/50 hover:border-amber-400 text-amber-200'
                        : item.score >= 35 
                        ? 'bg-cyan-950/40 border-cyan-500/40 hover:bg-cyan-900/50 hover:border-cyan-400 text-cyan-200'
                        : 'bg-emerald-950/40 border-emerald-500/40 hover:bg-emerald-900/50 hover:border-emerald-400 text-emerald-200';

                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedRiskIndicatorId(item.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${cellColorClass} ${
                          isSelected ? 'ring-2 ring-white/60 shadow-lg scale-[1.01]' : 'hover:scale-[1.005]'
                        }`}
                      >
                        {/* Background temperature subtle glow */}
                        <div 
                          className="absolute -right-6 -bottom-6 w-20 h-20 rounded-full blur-xl pointer-events-none opacity-25"
                          style={{
                            backgroundColor: item.score >= 80 ? '#ef4444' : item.score >= 60 ? '#f59e0b' : item.score >= 35 ? '#06b6d4' : '#10b981'
                          }}
                        />

                        <div className="flex items-center justify-between mb-1 relative z-10">
                          <span className="text-xs font-bold text-slate-100 flex items-center">
                            <span 
                              className={`w-2 h-2 rounded-full mr-1.5 ${
                                item.score >= 80 ? 'bg-red-400 animate-ping' : ''
                              }`}
                              style={{
                                backgroundColor: item.score >= 80 ? '#ef4444' : item.score >= 60 ? '#f59e0b' : item.score >= 35 ? '#06b6d4' : '#10b981'
                              }}
                            />
                            {item.name}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                            item.score >= 80 ? 'bg-red-500/30 text-red-300' : item.score >= 60 ? 'bg-amber-500/30 text-amber-300' : item.score >= 35 ? 'bg-cyan-500/30 text-cyan-300' : 'bg-emerald-500/30 text-emerald-300'
                          }`}>
                            {item.levelLabel} ({item.score}分)
                          </span>
                        </div>

                        {/* Value display */}
                        <div className="flex items-baseline justify-between mb-1.5 relative z-10">
                          <div className="font-mono text-sm sm:text-base font-extrabold text-white">
                            {item.valueDisplay}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {item.thresholdNote}
                          </div>
                        </div>

                        {/* Temperature bar */}
                        <div className="h-1.5 w-full bg-slate-900/80 rounded-full overflow-hidden relative z-10">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.max(8, item.score)}%`,
                              backgroundColor: item.score >= 80 ? '#ef4444' : item.score >= 60 ? '#f59e0b' : item.score >= 35 ? '#06b6d4' : '#10b981'
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. 選定指標深度診斷與操盤對策 (Deep Diagnosis & Actionable Strategy Card) */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 mb-5 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800/80">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-400">指標深度診斷：</span>
              <span className="text-sm font-bold text-slate-100 flex items-center">
                <span className="w-2.5 h-2.5 rounded-full mr-1.5" style={{
                  backgroundColor: activeRiskIndicator.score >= 80 ? '#ef4444' : activeRiskIndicator.score >= 60 ? '#f59e0b' : activeRiskIndicator.score >= 35 ? '#06b6d4' : '#10b981'
                }} />
                {activeRiskIndicator.name}
              </span>
              <span className="font-mono text-xs text-white font-bold px-2 py-0.5 rounded bg-slate-800">
                {activeRiskIndicator.valueDisplay}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-slate-400 font-mono">
                {activeRiskIndicator.thresholdNote}
              </span>
              <span className={`text-[11px] px-2 py-0.5 rounded font-bold ${
                activeRiskIndicator.score >= 80 ? 'bg-red-500/20 text-red-400 border border-red-500/40' : activeRiskIndicator.score >= 60 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : activeRiskIndicator.score >= 35 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              }`}>
                {activeRiskIndicator.levelLabel} ({activeRiskIndicator.score}分)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/60">
              <div className="font-bold text-slate-300 mb-1 flex items-center">
                <Info className="w-3.5 h-3.5 mr-1 text-sky-400" />
                市場現象與風險成因
              </div>
              <p className="text-slate-400 leading-relaxed">
                {activeRiskIndicator.diagnosis}
              </p>
            </div>

            <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/60">
              <div className="font-bold text-slate-300 mb-1 flex items-center">
                <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                三竹量化操盤應對建議
              </div>
              <p className="text-slate-400 leading-relaxed">
                {activeRiskIndicator.actionAdvice}
              </p>
            </div>
          </div>
        </div>

        {/* 4. 風險情境象限圖 (2D Risk Quadrant Scatter Map) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 bg-slate-950/70 border border-slate-800 rounded-xl p-4">
          {/* Left: 2D Quadrant Scatter SVG */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-200 flex items-center">
                <Crosshair className="w-3.5 h-3.5 mr-1.5 text-purple-400" />
                2D 風險座標象限 (技術過熱 X 波動率)
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                座標: (過熱 {riskMatrix.coordinates.x}, 波動 {riskMatrix.coordinates.y})
              </span>
            </div>

            {/* SVG Quadrant Canvas */}
            <div className="w-full bg-slate-950 rounded-lg border border-slate-800/80 p-2 relative overflow-hidden">
              <svg viewBox="0 0 460 220" className="w-full h-48 select-none font-mono">
                {/* Quadrant Background Shading */}
                {/* Q2: Top-Left (Low Heat, High Vol) */}
                <rect x="40" y="20" width="190" height="85" fill="#f59e0b" opacity="0.04" />
                {/* Q1: Top-Right (High Heat, High Vol) */}
                <rect x="230" y="20" width="190" height="85" fill="#ef4444" opacity="0.06" />
                {/* Q3: Bottom-Left (Low Heat, Low Vol) */}
                <rect x="40" y="105" width="190" height="85" fill="#10b981" opacity="0.05" />
                {/* Q4: Bottom-Right (High Heat, Low Vol) */}
                <rect x="230" y="105" width="190" height="85" fill="#06b6d4" opacity="0.04" />

                {/* Quadrant Divider Axes */}
                <line x1="230" y1="20" x2="230" y2="190" stroke="#334155" strokeDasharray="3,3" strokeWidth="1.2" />
                <line x1="40" y1="105" x2="420" y2="105" stroke="#334155" strokeDasharray="3,3" strokeWidth="1.2" />

                {/* Outer Frame */}
                <rect x="40" y="20" width="380" height="170" fill="none" stroke="#1e293b" strokeWidth="1" />

                {/* Quadrant Title Tags in Background */}
                <text x="50" y="38" fill="#f59e0b" fontSize="10" opacity="0.75" fontWeight="bold">
                  Q2: ⚡ 劇烈洗盤震盪區 (低過熱·高波動)
                </text>
                <text x="240" y="38" fill="#ef4444" fontSize="10" opacity="0.75" fontWeight="bold">
                  Q1: 🚨 極度過熱噴出區 (高過熱·高波動)
                </text>
                <text x="50" y="180" fill="#10b981" fontSize="10" opacity="0.75" fontWeight="bold">
                  Q3: 🛡️ 低檔築底防禦區 (低過熱·低波動)
                </text>
                <text x="240" y="180" fill="#06b6d4" fontSize="10" opacity="0.75" fontWeight="bold">
                  Q4: 🚀 溫和盤堅推升區 (高過熱·低波動)
                </text>

                {/* Axis Labels */}
                <text x="230" y="208" fill="#64748b" fontSize="10" textAnchor="middle">
                  技術面過熱程度 (Overheating Score) →
                </text>
                <text x="18" y="110" fill="#64748b" fontSize="10" textAnchor="middle" transform="rotate(-90 18 110)">
                  波動率風險 (Volatility) →
                </text>

                {/* Stock Position Target Bubble */}
                {(() => {
                  // Coordinate mapping:
                  // X: 0 to 100 -> 40 to 420 (width 380)
                  // Y: 0 to 100 -> 190 to 20 (height 170, inverted since SVG y goes down)
                  const targetX = 40 + (riskMatrix.coordinates.x / 100) * 380;
                  const targetY = 190 - (riskMatrix.coordinates.y / 100) * 170;
                  const bubbleRadius = riskMatrix.coordinates.size;

                  return (
                    <g>
                      {/* Radiating pulse waves */}
                      <circle 
                        cx={targetX} 
                        cy={targetY} 
                        r={bubbleRadius + 8} 
                        fill={riskMatrix.statusColor} 
                        opacity="0.2"
                        className="animate-ping" 
                      />
                      <circle 
                        cx={targetX} 
                        cy={targetY} 
                        r={bubbleRadius} 
                        fill={riskMatrix.statusColor} 
                        opacity="0.35" 
                        stroke={riskMatrix.statusColor}
                        strokeWidth="2"
                      />
                      <circle 
                        cx={targetX} 
                        cy={targetY} 
                        r="4" 
                        fill="#ffffff" 
                      />
                      {/* Stock label pin */}
                      <rect
                        x={targetX - 28}
                        y={targetY - 26}
                        width="56"
                        height="18"
                        rx="4"
                        fill="#0f172a"
                        stroke={riskMatrix.statusColor}
                        strokeWidth="1.2"
                      />
                      <text
                        x={targetX}
                        y={targetY - 14}
                        fill="#f8fafc"
                        fontSize="10"
                        fontWeight="bold"
                        textAnchor="middle"
                      >
                        {stock.name}
                      </text>
                    </g>
                  );
                })()}
              </svg>
            </div>
          </div>

          {/* Right: Quadrant Tactical Playbook */}
          <div className="flex flex-col justify-between space-y-3 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-[11px] text-slate-400">當前風險象限定位：</span>
                <span className={`text-xs px-2 py-0.5 rounded font-bold border ${riskMatrix.quadrant.borderClass} ${riskMatrix.quadrant.bgClass}`}>
                  {riskMatrix.quadrant.title}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed mb-3">
                {riskMatrix.quadrant.description}
              </p>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-slate-800/80 text-xs">
              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/60">
                <span className="text-slate-400 block text-[10px] mb-0.5">實戰操作方針 (Tactical Playbook)</span>
                <span className="font-bold text-amber-300 leading-snug block">
                  {riskMatrix.quadrant.strategy}
                </span>
              </div>

              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/60 flex items-center justify-between font-mono text-[11px]">
                <span className="text-slate-400">綜合防守停損價:</span>
                <span className="font-bold text-emerald-400">${riskMatrix.defensiveStopPrice}</span>
              </div>

              <div className="text-[11px] text-slate-400 leading-tight">
                {riskMatrix.tacticalAdvice}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: 主力多空能量平衡表 (Major Order Flow Bull/Bear Energy Balance Sheet & Momentum Ratio) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/20 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Glow ambient accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-4 relative z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600/25 border border-rose-500/50 flex items-center justify-center text-rose-400 shadow-inner">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-slate-100 flex items-center">
                  主力多空能量平衡表
                  <span className="text-xs font-normal text-rose-400 ml-2 font-mono">
                    (Major Order Flow Energy Balance Sheet & Power Ratio)
                  </span>
                </h3>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${energyBalance.momentumBadgeClass}`}>
                  {energyBalance.momentumTitle}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  多空強弱比: {energyBalance.powerRatio}x
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  主力多空比: {energyBalance.majorPowerRatio}x
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  能量評分: {energyBalance.energyScore} / 100
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                將當日特大單、大單、中單與散單之買賣超張數與成交金額整理為平衡表，計算買賣多空強弱比率 (買/賣倍數)，深度剖析主力與散戶的即時勢頭博弈
              </p>
            </div>
          </div>

          {/* Quick HUD Metrics */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <div className="bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-1.5">
              <span className="text-slate-400">主力淨買賣:</span>
              <strong className={energyBalance.majorSummary.netLots >= 0 ? 'text-rose-400' : 'text-emerald-400'}>
                {energyBalance.majorSummary.netLots >= 0 ? '+' : ''}{energyBalance.majorSummary.netLots.toLocaleString()} 張
              </strong>
              <span className="text-slate-500 text-[10px]">
                ({energyBalance.majorSummary.netAmountMillion >= 0 ? '+' : ''}{energyBalance.majorSummary.netAmountMillion}百萬)
              </span>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-1.5">
              <span className="text-slate-400">散戶淨買賣:</span>
              <strong className={energyBalance.retailSummary.netLots >= 0 ? 'text-rose-400' : 'text-emerald-400'}>
                {energyBalance.retailSummary.netLots >= 0 ? '+' : ''}{energyBalance.retailSummary.netLots.toLocaleString()} 張
              </strong>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-1.5">
              <span className="text-slate-400">全日量能比:</span>
              <span className="text-rose-400 font-bold">買 {energyBalance.totalSummary.bullEnergyPct}%</span>
              <span className="text-slate-500">/</span>
              <span className="text-emerald-400 font-bold">賣 {energyBalance.totalSummary.bearEnergyPct}%</span>
            </div>
          </div>
        </div>

        {/* Bull / Bear Power Bar (多空能量平衡拉鋸計量條) */}
        <div className="bg-slate-950/75 border border-slate-800/90 rounded-xl p-4 mb-4 relative z-10">
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center space-x-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="font-bold text-rose-400">
                多方買進能量: {energyBalance.totalSummary.bullEnergyPct}%
              </span>
              <span className="text-slate-400 font-mono text-[11px]">
                ({energyBalance.totalSummary.buyLots.toLocaleString()} 張)
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center space-x-2">
              <span className="text-amber-400 font-bold font-mono">
                {energyBalance.totalSummary.bullEnergyPct >= 50 ? '多方主導推進' : '空方暫居上風'}
              </span>
              <span>•</span>
              <span>多空強弱平衡點 50%</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-slate-400 font-mono text-[11px]">
                ({energyBalance.totalSummary.sellLots.toLocaleString()} 張)
              </span>
              <span className="font-bold text-emerald-400">
                空方賣出能量: {energyBalance.totalSummary.bearEnergyPct}%
              </span>
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>

          {/* Tug of war bar */}
          <div className="h-3.5 w-full bg-slate-900 rounded-full overflow-hidden flex relative border border-slate-800 shadow-inner">
            {/* Center line marker */}
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/70 z-20" title="50% 能量平衡中軸線" />
            
            {/* Bull energy */}
            <div 
              className="h-full bg-gradient-to-r from-rose-600 via-rose-500 to-rose-400 transition-all duration-500 relative flex items-center justify-start pl-2"
              style={{ width: `${energyBalance.totalSummary.bullEnergyPct}%` }}
            >
              {energyBalance.totalSummary.bullEnergyPct > 15 && (
                <span className="text-[9px] font-mono font-bold text-white drop-shadow">
                  {energyBalance.totalSummary.bullEnergyPct}%
                </span>
              )}
            </div>

            {/* Bear energy */}
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-700 transition-all duration-500 relative flex items-center justify-end pr-2"
              style={{ width: `${energyBalance.totalSummary.bearEnergyPct}%` }}
            >
              {energyBalance.totalSummary.bearEnergyPct > 15 && (
                <span className="text-[9px] font-mono font-bold text-white drop-shadow">
                  {energyBalance.totalSummary.bearEnergyPct}%
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1.5 px-0.5">
            <span>0% (極度偏空)</span>
            <span>25%</span>
            <span className="text-slate-400 font-bold">50% (中立平衡)</span>
            <span>75%</span>
            <span>100% (極度偏多)</span>
          </div>
        </div>

        {/* 4-Metric Comparison Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 relative z-10">
          {/* Card 1: 全市場多空強弱比 */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5">
            <span className="text-xs text-slate-400 block mb-1">全市場多空強弱比 (買/賣)</span>
            <div className="flex items-baseline space-x-2">
              <strong className={`text-2xl font-bold font-mono ${
                energyBalance.powerRatio >= 1.2 ? 'text-rose-400' : energyBalance.powerRatio <= 0.8 ? 'text-emerald-400' : 'text-slate-200'
              }`}>
                {energyBalance.powerRatio}x
              </strong>
              <span className="text-xs text-slate-400">平衡基準: 1.0x</span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-1">
              {energyBalance.powerRatio >= 1.15 ? '買盤主動攻擊佔優' : energyBalance.powerRatio <= 0.85 ? '賣盤主動拋售佔優' : '多空雙方力量均勢'}
            </span>
          </div>

          {/* Card 2: 主力大戶多空比 (特大+大單) */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5">
            <span className="text-xs text-slate-400 block mb-1">主力多空強弱比 (特大+大單)</span>
            <div className="flex items-baseline space-x-2">
              <strong className={`text-2xl font-bold font-mono ${
                energyBalance.majorPowerRatio >= 1.2 ? 'text-rose-400' : energyBalance.majorPowerRatio <= 0.8 ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {energyBalance.majorPowerRatio}x
              </strong>
              <span className="text-xs text-slate-400">主力方向</span>
            </div>
            <div className="flex items-center space-x-1.5 mt-1">
              <span className="text-[11px] font-mono text-slate-300">
                淨額: <strong className={energyBalance.majorSummary.netLots >= 0 ? 'text-rose-400' : 'text-emerald-400'}>
                  {energyBalance.majorSummary.netLots >= 0 ? '+' : ''}{energyBalance.majorSummary.netLots.toLocaleString()}
                </strong> 張
              </span>
            </div>
          </div>

          {/* Card 3: 散戶群體多空比 (中單+散單) */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5">
            <span className="text-xs text-slate-400 block mb-1">散戶多空強弱比 (中單+散單)</span>
            <div className="flex items-baseline space-x-2">
              <strong className={`text-2xl font-bold font-mono ${
                energyBalance.retailPowerRatio >= 1.2 ? 'text-cyan-400' : energyBalance.retailPowerRatio <= 0.8 ? 'text-slate-400' : 'text-slate-300'
              }`}>
                {energyBalance.retailPowerRatio}x
              </strong>
              <span className="text-xs text-slate-400">散戶動向</span>
            </div>
            <div className="flex items-center space-x-1.5 mt-1">
              <span className="text-[11px] font-mono text-slate-300">
                淨額: <strong className={energyBalance.retailSummary.netLots >= 0 ? 'text-rose-400' : 'text-emerald-400'}>
                  {energyBalance.retailSummary.netLots >= 0 ? '+' : ''}{energyBalance.retailSummary.netLots.toLocaleString()}
                </strong> 張
              </span>
            </div>
          </div>

          {/* Card 4: 籌碼流向動態 */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5">
            <span className="text-xs text-slate-400 block mb-1">籌碼流向與沉澱狀態</span>
            <div className="flex items-center space-x-1.5 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded font-bold border ${energyBalance.momentumBadgeClass}`}>
                {energyBalance.majorSummary.netLots > 0 && energyBalance.retailSummary.netLots <= 0
                  ? '主力收網鎖碼'
                  : energyBalance.majorSummary.netLots < 0 && energyBalance.retailSummary.netLots >= 0
                  ? '散戶追價接刀'
                  : energyBalance.majorSummary.netLots > 0
                  ? '全市場活絡吸籌'
                  : '主力調節退場'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-1.5">
              主力能量: <strong className="text-rose-400">{energyBalance.majorSummary.bullEnergyPct}%</strong> 買進
            </span>
          </div>
        </div>

        {/* TABLE: 主力多空能量平衡表格 */}
        <div className="bg-slate-950/80 rounded-xl border border-slate-800/90 overflow-hidden mb-4 relative z-10 shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-slate-900/90 border-b border-slate-800 text-slate-400 text-[11px]">
                  <th className="py-3 px-3.5 font-semibold">單筆級距與參與者</th>
                  <th className="py-3 px-3 font-semibold text-right">買進張數</th>
                  <th className="py-3 px-3 font-semibold text-right">賣出張數</th>
                  <th className="py-3 px-3 font-semibold text-right">買賣超 (張)</th>
                  <th className="py-3 px-3 font-semibold text-right">預估金額 (百萬)</th>
                  <th className="py-3 px-3 font-semibold text-right">成交佔比</th>
                  <th className="py-3 px-3 font-semibold text-center">多空強弱比</th>
                  <th className="py-3 px-4 font-semibold text-center">買賣能量分佈</th>
                  <th className="py-3 px-3 font-semibold text-center">勢頭研判</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {/* 1. 特大單 */}
                {energyBalance.rows.slice(0, 2).map((row) => {
                  const isSelected = selectedEnergyTierId === row.id;
                  return (
                    <tr 
                      key={row.id}
                      onClick={() => setSelectedEnergyTierId(isSelected ? null : row.id)}
                      className={`transition-colors cursor-pointer ${
                        isSelected 
                          ? 'bg-rose-950/30 ring-1 ring-rose-500/50' 
                          : 'hover:bg-slate-900/60'
                      }`}
                    >
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-100 text-xs">{row.name}</span>
                          <span className="text-[10px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
                            {row.orderBracket}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block font-sans mt-0.5">
                          {row.participantType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-rose-400 font-bold">
                        {row.buyLots.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                        {row.sellLots.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold">
                        <span className={row.netLots >= 0 ? 'text-rose-400' : 'text-emerald-400'}>
                          {row.netLots >= 0 ? '+' : ''}{row.netLots.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={row.netAmountMillion >= 0 ? 'text-rose-400' : 'text-emerald-400'}>
                          {row.netAmountMillion >= 0 ? '+' : ''}${row.netAmountMillion}M
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-300">
                        {row.turnoverShare}%
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          row.powerRatio >= 1.3 ? 'bg-rose-500/20 text-rose-300' : row.powerRatio <= 0.75 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {row.powerRatio}x
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="w-24 mx-auto">
                          <div className="flex justify-between text-[10px] mb-0.5 font-mono">
                            <span className="text-rose-400">{row.bullEnergyPct}%</span>
                            <span className="text-emerald-400">{row.bearEnergyPct}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                            <div className="bg-rose-500 h-full" style={{ width: `${row.bullEnergyPct}%` }} />
                            <div className="bg-emerald-500 h-full" style={{ width: `${row.bearEnergyPct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${row.statusBadgeClass}`}>
                          {row.statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {/* Subtotal: 主力大戶合計 (特大單 + 大單) */}
                <tr className="bg-rose-950/20 font-bold border-y border-rose-900/40 text-slate-200">
                  <td className="py-2 px-3.5 flex items-center space-x-1.5">
                    <span className="text-rose-400">★ 主力大戶合計</span>
                    <span className="text-[10px] text-rose-300/80 font-normal">(特大單 + 大單)</span>
                  </td>
                  <td className="py-2 px-3 text-right text-rose-400">
                    {energyBalance.majorSummary.buyLots.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-right text-emerald-400">
                    {energyBalance.majorSummary.sellLots.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <span className={energyBalance.majorSummary.netLots >= 0 ? 'text-rose-400' : 'text-emerald-400'}>
                      {energyBalance.majorSummary.netLots >= 0 ? '+' : ''}{energyBalance.majorSummary.netLots.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <span className={energyBalance.majorSummary.netAmountMillion >= 0 ? 'text-rose-400' : 'text-emerald-400'}>
                      {energyBalance.majorSummary.netAmountMillion >= 0 ? '+' : ''}${energyBalance.majorSummary.netAmountMillion}M
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right text-rose-300">
                    {((energyBalance.majorSummary.buyLots + energyBalance.majorSummary.sellLots) / (energyBalance.totalSummary.buyLots + energyBalance.totalSummary.sellLots) * 100).toFixed(1)}%
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className="px-2 py-0.5 rounded bg-rose-500/25 text-rose-300 border border-rose-500/40">
                      {energyBalance.majorPowerRatio}x
                    </span>
                  </td>
                  <td className="py-2 px-4">
                    <div className="w-24 mx-auto">
                      <div className="flex justify-between text-[10px] mb-0.5 font-mono">
                        <span className="text-rose-400">{energyBalance.majorSummary.bullEnergyPct}%</span>
                        <span className="text-emerald-400">{energyBalance.majorSummary.bearEnergyPct}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                        <div className="bg-rose-500 h-full" style={{ width: `${energyBalance.majorSummary.bullEnergyPct}%` }} />
                        <div className="bg-emerald-500 h-full" style={{ width: `${energyBalance.majorSummary.bearEnergyPct}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                      {energyBalance.majorSummary.netLots > 0 ? '主力強吸籌' : '主力微調節'}
                    </span>
                  </td>
                </tr>

                {/* 2. 中單與散單 */}
                {energyBalance.rows.slice(2, 4).map((row) => {
                  const isSelected = selectedEnergyTierId === row.id;
                  return (
                    <tr 
                      key={row.id}
                      onClick={() => setSelectedEnergyTierId(isSelected ? null : row.id)}
                      className={`transition-colors cursor-pointer ${
                        isSelected 
                          ? 'bg-indigo-950/30 ring-1 ring-indigo-500/50' 
                          : 'hover:bg-slate-900/60'
                      }`}
                    >
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-100 text-xs">{row.name}</span>
                          <span className="text-[10px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
                            {row.orderBracket}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block font-sans mt-0.5">
                          {row.participantType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-rose-400 font-bold">
                        {row.buyLots.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">
                        {row.sellLots.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold">
                        <span className={row.netLots >= 0 ? 'text-rose-400' : 'text-emerald-400'}>
                          {row.netLots >= 0 ? '+' : ''}{row.netLots.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={row.netAmountMillion >= 0 ? 'text-rose-400' : 'text-emerald-400'}>
                          {row.netAmountMillion >= 0 ? '+' : ''}${row.netAmountMillion}M
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-300">
                        {row.turnoverShare}%
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded font-bold ${
                          row.powerRatio >= 1.3 ? 'bg-rose-500/20 text-rose-300' : row.powerRatio <= 0.75 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {row.powerRatio}x
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="w-24 mx-auto">
                          <div className="flex justify-between text-[10px] mb-0.5 font-mono">
                            <span className="text-rose-400">{row.bullEnergyPct}%</span>
                            <span className="text-emerald-400">{row.bearEnergyPct}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                            <div className="bg-rose-500 h-full" style={{ width: `${row.bullEnergyPct}%` }} />
                            <div className="bg-emerald-500 h-full" style={{ width: `${row.bearEnergyPct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${row.statusBadgeClass}`}>
                          {row.statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {/* Subtotal: 散戶合計 (中單 + 散單) */}
                <tr className="bg-slate-900/80 font-bold border-y border-slate-800 text-slate-300">
                  <td className="py-2 px-3.5 flex items-center space-x-1.5">
                    <span className="text-cyan-400">◎ 散戶群體小計</span>
                    <span className="text-[10px] text-slate-400 font-normal">(中單 + 散單)</span>
                  </td>
                  <td className="py-2 px-3 text-right text-rose-400/90">
                    {energyBalance.retailSummary.buyLots.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-right text-emerald-400/90">
                    {energyBalance.retailSummary.sellLots.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <span className={energyBalance.retailSummary.netLots >= 0 ? 'text-rose-400' : 'text-emerald-400'}>
                      {energyBalance.retailSummary.netLots >= 0 ? '+' : ''}{energyBalance.retailSummary.netLots.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <span className={energyBalance.retailSummary.netAmountMillion >= 0 ? 'text-rose-400' : 'text-emerald-400'}>
                      {energyBalance.retailSummary.netAmountMillion >= 0 ? '+' : ''}${energyBalance.retailSummary.netAmountMillion}M
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right text-slate-300">
                    {((energyBalance.retailSummary.buyLots + energyBalance.retailSummary.sellLots) / (energyBalance.totalSummary.buyLots + energyBalance.totalSummary.sellLots) * 100).toFixed(1)}%
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {energyBalance.retailPowerRatio}x
                    </span>
                  </td>
                  <td className="py-2 px-4">
                    <div className="w-24 mx-auto">
                      <div className="flex justify-between text-[10px] mb-0.5 font-mono">
                        <span className="text-rose-400">{energyBalance.retailSummary.bullEnergyPct}%</span>
                        <span className="text-emerald-400">{energyBalance.retailSummary.bearEnergyPct}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                        <div className="bg-rose-500 h-full" style={{ width: `${energyBalance.retailSummary.bullEnergyPct}%` }} />
                        <div className="bg-emerald-500 h-full" style={{ width: `${energyBalance.retailSummary.bearEnergyPct}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-800 text-slate-400 border border-slate-700">
                      {energyBalance.retailSummary.netLots > 0 ? '散戶追價' : '散戶拋售'}
                    </span>
                  </td>
                </tr>

                {/* Total: 全市場成交總計 */}
                <tr className="bg-slate-900 font-extrabold text-slate-100 border-t-2 border-slate-700">
                  <td className="py-3 px-3.5">
                    <span className="text-amber-400 flex items-center">
                      <Table className="w-3.5 h-3.5 mr-1" />
                      全日買賣量能總計
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right text-rose-400 text-sm">
                    {energyBalance.totalSummary.buyLots.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right text-emerald-400 text-sm">
                    {energyBalance.totalSummary.sellLots.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right text-sm">
                    <span className={energyBalance.totalSummary.netLots >= 0 ? 'text-rose-400' : 'text-emerald-400'}>
                      {energyBalance.totalSummary.netLots >= 0 ? '+' : ''}{energyBalance.totalSummary.netLots.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right text-sm">
                    <span className={energyBalance.totalSummary.netAmountMillion >= 0 ? 'text-rose-400' : 'text-emerald-400'}>
                      {energyBalance.totalSummary.netAmountMillion >= 0 ? '+' : ''}${energyBalance.totalSummary.netAmountMillion}M
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right text-slate-200">
                    100.0%
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold ${
                      energyBalance.powerRatio >= 1.2 
                        ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40' 
                        : energyBalance.powerRatio <= 0.8 
                        ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40' 
                        : 'bg-slate-800 text-slate-200 border border-slate-700'
                    }`}>
                      {energyBalance.powerRatio}x
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="w-24 mx-auto">
                      <div className="flex justify-between text-[10px] mb-0.5 font-mono">
                        <span className="text-rose-400 font-bold">{energyBalance.totalSummary.bullEnergyPct}%</span>
                        <span className="text-emerald-400 font-bold">{energyBalance.totalSummary.bearEnergyPct}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
                        <div className="bg-rose-500 h-full" style={{ width: `${energyBalance.totalSummary.bullEnergyPct}%` }} />
                        <div className="bg-emerald-500 h-full" style={{ width: `${energyBalance.totalSummary.bearEnergyPct}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${energyBalance.momentumBadgeClass}`}>
                      {energyBalance.momentumState === 'bull_surge' ? '多方壓倒性勝出' : energyBalance.momentumState === 'bear_dump' ? '空方壓倒性殺盤' : '多空激烈博弈'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Tier Breakdown Callout (When clicked) */}
        {activeEnergyTier && (
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-rose-500/40 mb-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-rose-300 flex items-center text-xs">
                <Target className="w-3.5 h-3.5 mr-1.5 text-rose-400" />
                【{activeEnergyTier.name} ({activeEnergyTier.orderBracket})】深度量化行為檢視
              </span>
              <button
                onClick={() => setSelectedEnergyTierId(null)}
                className="text-[11px] text-slate-400 hover:text-slate-200 underline"
              >
                關閉細部檢視
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono text-slate-300">
              <div>
                參與者屬性: <strong className="text-slate-100">{activeEnergyTier.participantType}</strong>
              </div>
              <div>
                該單買賣超: <strong className={activeEnergyTier.netLots >= 0 ? 'text-rose-400' : 'text-emerald-400'}>
                  {activeEnergyTier.netLots >= 0 ? '+' : ''}{activeEnergyTier.netLots.toLocaleString()} 張 ({activeEnergyTier.netAmountMillion}百萬)
                </strong>
              </div>
              <div>
                該單多空比: <strong className="text-rose-300">{activeEnergyTier.powerRatio}x</strong> ({activeEnergyTier.statusLabel})
              </div>
            </div>
          </div>
        )}

        {/* Divergence Alert (if any) */}
        {energyBalance.divergenceAlert && (
          <div className="mb-4 bg-amber-950/40 border border-amber-500/50 p-3 rounded-xl flex items-center space-x-2.5 text-xs text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
            <div className="leading-relaxed">
              <strong className="font-bold text-amber-300">籌碼價量背離提醒：</strong>
              {energyBalance.divergenceAlert}
            </div>
          </div>
        )}

        {/* Bottom Tactical Playbook & Structure Diagnosis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs leading-relaxed relative z-10">
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80">
            <div className="font-bold text-slate-200 mb-1.5 flex items-center">
              <Activity className="w-3.5 h-3.5 mr-1.5 text-rose-400" />
              盤中主力籌碼勢頭深度剖析
            </div>
            <p className="text-slate-400 mb-2">
              {energyBalance.momentumDescription}
            </p>
            <p className="text-slate-400">
              {energyBalance.structureDiagnosis}
            </p>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80">
            <div className="font-bold text-slate-200 mb-1.5 flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
              三竹首席操盤跟單戰術指引
            </div>
            <p className="text-slate-300 font-semibold mb-2">
              👉 {energyBalance.tacticalPlaybook}
            </p>
            <p className="text-slate-400 text-[11px]">
              📌 {energyBalance.keySupportResistanceTip}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION: 籌碼與大盤相關性分析 (Chip Flow & Market Correlation Analysis · Beta-Adjusted) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/20 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Glow ambient accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-4 relative z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/25 border border-indigo-500/50 flex items-center justify-center text-indigo-400 shadow-inner">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-slate-100 flex items-center">
                  籌碼與大盤相關性分析
                  <span className="text-xs font-normal text-indigo-400 ml-2 font-mono">
                    (Beta-Adjusted Chip Sensitivity & TAIEX Correlation)
                  </span>
                </h3>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${marketCorr.quadrantBadgeClass}`}>
                  {marketCorr.quadrantTitle}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  Beta: {marketCorr.chipBeta}x ({marketCorr.chipBetaLabel})
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                精算個股籌碼變動相對於加權指數 (TAIEX) 的敏感度與超額吸籌力道，精準識別個股在各類市場行情下的籌碼強弱勢
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <div className="bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-1.5">
              <span className="text-slate-400">大盤指數:</span>
              <strong className="text-slate-200">{marketCorr.currentMarketIndex.toLocaleString()} 點</strong>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-1.5">
              <span className="text-slate-400">皮爾森相關 r:</span>
              <strong className="text-indigo-400">{marketCorr.correlationCoefficient >= 0 ? '+' : ''}{marketCorr.correlationCoefficient}</strong>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-1.5">
              <span className="text-slate-400">超額 Alpha:</span>
              <strong className={marketCorr.chipAlpha >= 0 ? 'text-rose-400' : 'text-emerald-400'}>
                {marketCorr.chipAlpha >= 0 ? '+' : ''}{marketCorr.chipAlpha}%
              </strong>
            </div>
          </div>
        </div>

        {/* 4-Metric Focus Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 relative z-10">
          {/* Card 1: 籌碼敏感度 Beta */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5">
            <span className="text-xs text-slate-400 block mb-1">籌碼敏感度 (Beta 調整版)</span>
            <div className="flex items-baseline space-x-2">
              <strong className="text-2xl font-bold font-mono text-indigo-400">
                {marketCorr.chipBeta}x
              </strong>
              <span className="text-xs text-slate-400">基準: 1.0x</span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-1">{marketCorr.chipBetaLabel}</span>
          </div>

          {/* Card 2: 籌碼與大盤相關係數 */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5">
            <span className="text-xs text-slate-400 block mb-1">大盤皮爾森相關係數 (r)</span>
            <div className="flex items-baseline space-x-2">
              <strong className={`text-2xl font-bold font-mono ${
                marketCorr.correlationCoefficient >= 0.3 ? 'text-cyan-400' : marketCorr.correlationCoefficient <= -0.2 ? 'text-rose-400' : 'text-slate-300'
              }`}>
                {marketCorr.correlationCoefficient >= 0 ? '+' : ''}{marketCorr.correlationCoefficient}
              </strong>
              <span className="text-xs text-slate-400">-1 ~ +1</span>
            </div>
            <span className="text-[11px] text-slate-400 block mt-1">{marketCorr.correlationLabel}</span>
          </div>

          {/* Card 3: 相對大盤籌碼強度 */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5">
            <span className="text-xs text-slate-400 block mb-1">相對大盤籌碼強度評分</span>
            <div className="flex items-baseline space-x-2">
              <strong className={`text-2xl font-bold font-mono ${
                marketCorr.relativeStrengthScore >= 70 ? 'text-rose-400' : marketCorr.relativeStrengthScore >= 50 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {marketCorr.relativeStrengthScore}
              </strong>
              <span className="text-xs text-slate-400">/ 100 分</span>
            </div>
            {/* Visual meter */}
            <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  marketCorr.relativeStrengthScore >= 70 ? 'bg-rose-500' : marketCorr.relativeStrengthScore >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${marketCorr.relativeStrengthScore}%` }}
              />
            </div>
          </div>

          {/* Card 4: 20日超額籌碼吸納 */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5">
            <span className="text-xs text-slate-400 block mb-1">20 日超額籌碼吸納 (Alpha)</span>
            <strong className={`text-2xl font-bold font-mono ${
              marketCorr.excessChipInflowLots >= 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              {marketCorr.excessChipInflowLots >= 0 ? '+' : ''}{marketCorr.excessChipInflowLots.toLocaleString()}
              <span className="text-xs font-normal text-slate-400 ml-1">張</span>
            </strong>
            <span className="text-[11px] text-slate-400 block mt-1">
              超額回報率: {marketCorr.chipAlpha >= 0 ? '+' : ''}{marketCorr.chipAlpha}%
            </span>
          </div>
        </div>

        {/* Dynamic HUD Inspection Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800 text-xs font-mono mb-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-300 font-bold flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1 text-indigo-400" />
              {activeCorrPoint.date} (第 {activeCorrPoint.dayIndex} 日 / 近 20 日)
              {activeCorrPoint.dayIndex === 20 ? ' · 最新交易日' : ''}
            </span>
            <span>
              個股現價: <strong className="text-cyan-400">${activeCorrPoint.stockPrice}</strong> ({activeCorrPoint.stockChangePct >= 0 ? '+' : ''}{activeCorrPoint.stockChangePct}%)
            </span>
            <span>
              加權指數: <strong className="text-amber-400">{activeCorrPoint.marketIndex.toLocaleString()}</strong> ({activeCorrPoint.marketChangePct >= 0 ? '+' : ''}{activeCorrPoint.marketChangePct}%)
            </span>
            <span>
              個股主力買賣超: 
              <strong className={`ml-1 ${activeCorrPoint.stockMajorNetBuy >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {activeCorrPoint.stockMajorNetBuy >= 0 ? '+' : ''}{activeCorrPoint.stockMajorNetBuy.toLocaleString()} 張
              </strong>
            </span>
            <span>
              相對強弱差: 
              <strong className={`ml-1 ${activeCorrPoint.relativeStrengthDelta >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {activeCorrPoint.relativeStrengthDelta >= 0 ? '+' : ''}{activeCorrPoint.relativeStrengthDelta}%
              </strong>
            </span>
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
            <span className="flex items-center">
              <span className="w-2.5 h-0.5 bg-cyan-400 mr-1 inline-block" /> 個股累計主力籌碼
            </span>
            <span className="flex items-center">
              <span className="w-2.5 h-0.5 bg-amber-400 mr-1 inline-block" /> 加權指數 (TAIEX)
            </span>
            <span className="flex items-center">
              <span className="w-2 h-2 bg-rose-500 mr-1 inline-block" /> 當日主力買超
            </span>
            <span className="flex items-center">
              <span className="w-2 h-2 bg-emerald-500 mr-1 inline-block" /> 當日主力賣超
            </span>
          </div>
        </div>

        {/* Interactive Dual-Axis Recharts ComposedChart */}
        <div className="w-full bg-slate-950/90 rounded-xl p-3 border border-slate-800 shadow-inner mb-4">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={marketCorr.days}
                margin={{ top: 15, right: 20, left: 10, bottom: 5 }}
                onMouseMove={(e: any) => {
                  if (e && e.activeTooltipIndex !== undefined && e.activeTooltipIndex !== null) {
                    setHoveredCorrDayIdx(e.activeTooltipIndex);
                  }
                }}
                onMouseLeave={() => setHoveredCorrDayIdx(null)}
              >
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" opacity={0.6} />

                <XAxis 
                  dataKey="date" 
                  stroke="#64748b" 
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                />

                {/* Left Y-Axis: Stock Cumulative Major Net Buy (張) */}
                <YAxis 
                  yAxisId="stockAxis"
                  stroke="#38bdf8" 
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  domain={['auto', 'auto']}
                  tickFormatter={(val) => `${(val / 1000).toFixed(0)}k張`}
                />

                {/* Right Y-Axis: Market Index (點) */}
                <YAxis 
                  yAxisId="marketAxis"
                  orientation="right"
                  stroke="#f59e0b" 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  domain={['auto', 'auto']}
                  tickFormatter={(val) => `${val.toLocaleString()}點`}
                />
                <RechartsTooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const data = payload[0]?.payload;
                    if (!data) return null;
                    return (
                      <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl p-3 shadow-xl text-xs font-mono backdrop-blur-sm z-50">
                        <div className="text-slate-300 font-bold mb-1.5 border-b border-slate-800 pb-1">
                          {label || data.date}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-400">當日主力買賣超:</span>
                            <span className={data.stockMajorNetBuy >= 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                              {data.stockMajorNetBuy >= 0 ? '+' : ''}{data.stockMajorNetBuy?.toLocaleString()} 張
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sky-400">累計主力買賣超:</span>
                            <span className="text-sky-300 font-bold">
                              {data.stockCumMajorNetBuy >= 0 ? '+' : ''}{data.stockCumMajorNetBuy?.toLocaleString()} 張
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-amber-400">加權指數點位:</span>
                            <span className="text-amber-300 font-bold">
                              {data.marketIndex?.toLocaleString()} 點
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar 
                  yAxisId="stockAxis"
                  dataKey="stockMajorNetBuy" 
                  opacity={0.65}
                  maxBarSize={8}
                >
                  {marketCorr.days.map((entry, idx) => (
                    <Cell 
                      key={`corr-bar-${idx}`} 
                      fill={entry.stockMajorNetBuy >= 0 ? '#f43f5e' : '#10b981'} 
                    />
                  ))}
                </Bar>

                {/* Stock Cumulative Major Net Buy Line */}
                <Line
                  yAxisId="stockAxis"
                  type="monotone"
                  dataKey="stockCumMajorNetBuy"
                  name="主力累計買超"
                  stroke="#38bdf8"
                  strokeWidth={2.4}
                  dot={false}
                  activeDot={{ r: 5, fill: '#38bdf8', stroke: '#fff', strokeWidth: 2 }}
                />

                {/* Market Index Line */}
                <Line
                  yAxisId="marketAxis"
                  type="monotone"
                  dataKey="marketIndex"
                  name="TAIEX 加權指數"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={{ r: 5, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4-Quadrant Visual Architecture */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
          <div className={`p-3 rounded-xl border text-xs transition-all ${
            marketCorr.quadrant === 'counter_trend_leader'
              ? 'bg-rose-950/40 border-rose-500/70 ring-1 ring-rose-500/40 shadow-md shadow-rose-950/40'
              : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
          }`}>
            <span className="font-bold text-rose-400 block mb-1">逆勢突圍領頭羊</span>
            <span className="text-[11px] leading-tight block">
              大盤回檔或震盪，主力大舉逆勢鎖碼，超額阿法爆發。
            </span>
          </div>

          <div className={`p-3 rounded-xl border text-xs transition-all ${
            marketCorr.quadrant === 'trend_amplifier'
              ? 'bg-amber-950/40 border-amber-500/70 ring-1 ring-amber-500/40 shadow-md shadow-amber-950/40'
              : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
          }`}>
            <span className="font-bold text-amber-400 block mb-1">順勢槓桿乘風者</span>
            <span className="text-[11px] leading-tight block">
              Beta &gt; 1.2x，大盤上漲即放大攻勢，大單強烈推升。
            </span>
          </div>

          <div className={`p-3 rounded-xl border text-xs transition-all ${
            marketCorr.quadrant === 'market_follower'
              ? 'bg-cyan-950/40 border-cyan-500/70 ring-1 ring-cyan-500/40 shadow-md shadow-cyan-950/40'
              : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
          }`}>
            <span className="font-bold text-cyan-400 block mb-1">順勢隨波共振者</span>
            <span className="text-[11px] leading-tight block">
              與大盤走勢平穩同頻，主力隨市場溫和進退。
            </span>
          </div>

          <div className={`p-3 rounded-xl border text-xs transition-all ${
            marketCorr.quadrant === 'lagging_distributor'
              ? 'bg-emerald-950/40 border-emerald-500/70 ring-1 ring-emerald-500/40 shadow-md shadow-emerald-950/40'
              : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
          }`}>
            <span className="font-bold text-emerald-400 block mb-1">弱勢背離倒貨者</span>
            <span className="text-[11px] leading-tight block">
              指數創高但主力逢高倒貨，或跟跌破線，需防散戶套牢。
            </span>
          </div>
        </div>

        {/* Strategic Quant Diagnosis & Actionable Tactics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs leading-relaxed">
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80">
            <div className="font-bold text-slate-200 mb-1.5 flex items-center">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
              籌碼對大盤敏感度與相對強弱深入解讀
            </div>
            <p className="text-slate-400">
              {marketCorr.diagnosis}
            </p>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80">
            <div className="font-bold text-slate-200 mb-1.5 flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
              三竹首席市場行情操盤戰略指引
            </div>
            <p className="text-slate-400">
              {marketCorr.tacticalAdvice}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION: 主力籌碼集中度變化率與吸籌強度 (Major Chip Concentration Trend & Rate of Change) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/25 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${
              concTrend.absorptionStrength >= 70
                ? 'bg-cyan-600/25 border border-cyan-500/50 text-cyan-400'
                : concTrend.absorptionStrength >= 45
                ? 'bg-amber-600/25 border border-amber-500/50 text-amber-400'
                : 'bg-slate-800 border border-slate-700 text-slate-400'
            }`}>
              <LineChart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-slate-100 flex items-center">
                  主力籌碼集中度變化率與吸籌強度 (Major Chip Concentration Trend)
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
                  現值: {concTrend.currentConcentration}%
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-md font-bold border ${concTrend.currentPatternBadge}`}>
                  {concTrend.currentPatternLabel}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                計算並繪製每日籌碼集中度與 5 日平滑均線移動趨勢，辨識主力在急漲期的鎖碼強度與盤整期的暗中吸籌現象
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono">
            <div className="bg-slate-950/80 border border-slate-800/90 px-3 py-1.5 rounded-xl">
              <span className="text-slate-400 block text-[10px]">近20日累計變化</span>
              <span className={`font-bold ${concTrend.total20dChange >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {concTrend.total20dChange >= 0 ? `+${concTrend.total20dChange}` : concTrend.total20dChange}%
              </span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800/90 px-3 py-1.5 rounded-xl">
              <span className="text-slate-400 block text-[10px]">近5日吸籌速度</span>
              <span className={`font-bold ${concTrend.change5d >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {concTrend.change5d >= 0 ? `+${concTrend.change5d}` : concTrend.change5d}%
              </span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800/90 px-3 py-1.5 rounded-xl">
              <span className="text-slate-400 block text-[10px]">吸籌強度評分</span>
              <span className="font-bold text-amber-300">
                {concTrend.absorptionStrength}分 ({concTrend.absorptionStrengthLabel.split(' ')[0]})
              </span>
            </div>
          </div>
        </div>

        {/* Live Crosshair Inspection HUD Header */}
        <div className="flex flex-wrap justify-between items-center text-xs text-slate-400 gap-2 bg-slate-950/70 px-3.5 py-2 rounded-xl border border-slate-800/80 mb-4 font-mono">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-200 font-bold flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
              {activeConcPoint.date} (第 {activeConcPoint.dayIndex} 日)
            </span>
            <span>
              股價: <strong className={activeConcPoint.priceChangePercent >= 0 ? 'text-red-400' : 'text-emerald-400'}>
                ${activeConcPoint.price} ({activeConcPoint.priceChangePercent >= 0 ? `+${activeConcPoint.priceChangePercent}%` : `${activeConcPoint.priceChangePercent}%`})
              </strong>
            </span>
            <span className="text-cyan-300">
              集中度: <strong className="text-cyan-300">{activeConcPoint.concentrationRate}%</strong>
            </span>
            <span className="text-amber-300">
              5日均: <strong>{activeConcPoint.ma5Concentration}%</strong>
            </span>
            <span>
              單日變化: <strong className={activeConcPoint.dailyDelta >= 0 ? 'text-red-400' : 'text-emerald-400'}>
                {activeConcPoint.dailyDelta >= 0 ? `+${activeConcPoint.dailyDelta}%` : `${activeConcPoint.dailyDelta}%`}
              </strong>
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[10px] text-slate-500 hidden sm:inline">主力行為判定:</span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${activeConcPoint.patternBadge}`}>
              {activeConcPoint.patternLabel}
            </span>
          </div>
        </div>

        {/* Recharts ComposedChart: Concentration Area + MA5 Line + Delta Bars */}
        <div className="bg-slate-950/80 border border-slate-800/90 rounded-2xl p-3 sm:p-4 mb-5">
          <div className="w-full flex flex-wrap items-center justify-between text-xs text-slate-400 px-2 mb-2">
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <span className="w-3 h-1 bg-cyan-400 mr-1.5 rounded" />
                主力籌碼集中度曲線 (%)
              </span>
              <span className="flex items-center">
                <span className="w-3 h-1 bg-amber-400 mr-1.5 rounded" />
                5日集中度平滑均線 (%)
              </span>
              <span className="flex items-center">
                <span className="w-2.5 h-2.5 bg-red-500 mr-1 rounded-sm" />
                <span className="w-2.5 h-2.5 bg-emerald-500 mr-1.5 rounded-sm" />
                每日變化率柱體 (紅買/綠賣)
              </span>
            </div>

            <div className="text-[10px] text-slate-500 font-mono hidden md:inline">
              左軸: 集中度絕對值% · 右軸: 單日變化率%
            </div>
          </div>

          <div className="w-full h-72 sm:h-80 select-none">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={concTrend.days}
                margin={{ top: 15, right: 15, left: -10, bottom: 5 }}
                onMouseMove={(state: any) => {
                  if (state && state.activeTooltipIndex !== undefined) {
                    setHoveredConcDayIdx(state.activeTooltipIndex);
                  }
                }}
                onMouseLeave={() => setHoveredConcDayIdx(null)}
              >
                <defs>
                  <linearGradient id="concAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid stroke="#1e293b" strokeDasharray="3,3" />

                <XAxis 
                  dataKey="date" 
                  stroke="#64748b" 
                  tick={{ fontSize: 10, fill: '#64748b' }} 
                />

                {/* Left Y Axis for Concentration Rate % */}
                <YAxis 
                  yAxisId="left" 
                  domain={[
                    Math.floor(concTrend.minConcentration - 1.2), 
                    Math.ceil(concTrend.maxConcentration + 1.2)
                  ]} 
                  stroke="#38bdf8" 
                  tick={{ fontSize: 10, fill: '#38bdf8' }} 
                  unit="%" 
                />

                {/* Right Y Axis for Daily Delta % */}
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  domain={[-1.6, 1.6]} 
                  stroke="#94a3b8" 
                  tick={{ fontSize: 9, fill: '#94a3b8' }} 
                  unit="%" 
                />

                <ReferenceLine yAxisId="right" y={0} stroke="#475569" strokeDasharray="3,3" strokeWidth={1} />

                {/* Daily Concentration Rate Area */}
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="concentrationRate"
                  name="主力籌碼集中度 %"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  fill="url(#concAreaGradient)"
                />

                {/* 5-day MA of Concentration */}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="ma5Concentration"
                  name="5日集中度均線 %"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />

                {/* Daily Delta Rate of Change Bar */}
                <Bar
                  yAxisId="right"
                  dataKey="dailyDelta"
                  name="當日集中度變化率 (%)"
                  barSize={8}
                  radius={[1, 1, 0, 0]}
                >
                  {concTrend.days.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.dailyDelta >= 0 ? '#ef4444' : '#10b981'} 
                      opacity={hoveredConcDayIdx === index ? 1 : 0.8}
                    />
                  ))}
                </Bar>

                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as DailyConcentrationPoint;
                      return (
                        <div className="bg-slate-950/95 border border-slate-700/80 p-3 rounded-xl shadow-2xl backdrop-blur-md text-xs font-mono max-w-xs z-50">
                          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-1.5">
                            <span className="font-bold text-slate-100 flex items-center">
                              <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                              {data.date} (第 {data.dayIndex} 日)
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${data.patternBadge}`}>
                              {data.patternLabel}
                            </span>
                          </div>

                          <div className="space-y-1 text-[11px]">
                            <div className="flex justify-between">
                              <span className="text-slate-400">當日收盤價:</span>
                              <span className={`font-bold ${data.priceChangePercent >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                ${data.price} ({data.priceChangePercent >= 0 ? `+${data.priceChangePercent}%` : `${data.priceChangePercent}%`})
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">主力籌碼集中度:</span>
                              <span className="font-bold text-cyan-300">{data.concentrationRate}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">5日集中度平滑均線:</span>
                              <span className="font-bold text-amber-300">{data.ma5Concentration}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">單日集中度變化率:</span>
                              <span className={`font-bold ${data.dailyDelta >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                {data.dailyDelta >= 0 ? `+${data.dailyDelta}%` : `${data.dailyDelta}%`}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">近5日累計增減:</span>
                              <span className={`font-bold ${data.delta5d >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                {data.delta5d >= 0 ? `+${data.delta5d}%` : `${data.delta5d}%`}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4 大主力吸籌形態解構矩陣 (Four Market Absorption Patterns Matrix) */}
        <div className="mb-5">
          <div className="text-xs font-bold text-slate-300 mb-2.5 flex items-center justify-between px-1">
            <span>主力急漲 vs 盤整期吸籌強度形態解讀</span>
            <span className="text-[10px] text-slate-500 font-mono">價量與籌碼同向/背離研判</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Pattern 1: 盤整暗中吸籌 */}
            <div className={`p-3.5 rounded-xl border transition-all ${
              concTrend.currentPattern === 'stealth_accumulate'
                ? 'bg-cyan-950/60 border-cyan-400 ring-2 ring-cyan-400/40 shadow-lg shadow-cyan-500/10'
                : 'bg-slate-950/70 border-slate-800/80 opacity-80 hover:opacity-100'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-cyan-300 flex items-center">
                  💎 盤整暗中吸籌
                </span>
                {concTrend.currentPattern === 'stealth_accumulate' && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/30 text-cyan-200 font-bold animate-pulse">
                    當前吻合
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mb-1.5">
                條件：價平/小跌 × 集中度逆勢上升
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                主力在低檔區壓盤吃貨，壓抑價格不漲同時將浮額持續鎖死，是即將發動主升段的先兆。
              </p>
            </div>

            {/* Pattern 2: 急漲強勢鎖碼 */}
            <div className={`p-3.5 rounded-xl border transition-all ${
              concTrend.currentPattern === 'surge_locking'
                ? 'bg-red-950/60 border-red-400 ring-2 ring-red-400/40 shadow-lg shadow-red-500/10'
                : 'bg-slate-950/70 border-slate-800/80 opacity-80 hover:opacity-100'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-red-300 flex items-center">
                  🚀 急漲強勢鎖碼
                </span>
                {concTrend.currentPattern === 'surge_locking' && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-500/30 text-red-200 font-bold animate-pulse">
                    當前吻合
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mb-1.5">
                條件：股價急漲 × 集中度同步飆升
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                主力在推升過程中大舉通吃流通籌碼，籌碼集中度大增，拉抬意志極度強烈，屬於主升段噴出行情。
              </p>
            </div>

            {/* Pattern 3: 急漲高檔背離出貨 */}
            <div className={`p-3.5 rounded-xl border transition-all ${
              concTrend.currentPattern === 'surge_distributing'
                ? 'bg-amber-950/60 border-amber-400 ring-2 ring-amber-400/40 shadow-lg shadow-amber-500/10'
                : 'bg-slate-950/70 border-slate-800/80 opacity-80 hover:opacity-100'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-amber-300 flex items-center">
                  ⚠️ 急漲高檔背離
                </span>
                {concTrend.currentPattern === 'surge_distributing' && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-200 font-bold animate-pulse">
                    當前吻合
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mb-1.5">
                條件：股價急漲創高 × 集中度驟降
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                重大警戒：主力趁人氣鼎沸、高盤急拉時將籌碼大量倒給散戶，籌碼散發，為高檔出貨典型警訊。
              </p>
            </div>

            {/* Pattern 4: 下跌逢低逆勢承接 */}
            <div className={`p-3.5 rounded-xl border transition-all ${
              concTrend.currentPattern === 'dip_absorbing'
                ? 'bg-emerald-950/60 border-emerald-400 ring-2 ring-emerald-400/40 shadow-lg shadow-emerald-500/10'
                : 'bg-slate-950/70 border-slate-800/80 opacity-80 hover:opacity-100'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-emerald-300 flex items-center">
                  🛡️ 下跌逆勢承接
                </span>
                {concTrend.currentPattern === 'dip_absorbing' && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-200 font-bold animate-pulse">
                    當前吻合
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 font-mono mb-1.5">
                條件：股價拉回 × 集中度不降反升
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                主力並未撤退，而是藉大盤震盪洗盤甩轎、逆向吃貨撿便宜，拉回支撐可視為黃金切入契機。
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Tactical Playbook & Diagnosis */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/60">
            <div className="font-bold text-slate-300 mb-1 flex items-center">
              <Activity className="w-3.5 h-3.5 mr-1 text-cyan-400" />
              籌碼集中度趨勢實時研判
            </div>
            <p className="text-slate-400 leading-relaxed">
              {concTrend.diagnosis}
            </p>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800/60">
            <div className="font-bold text-slate-300 mb-1 flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-400" />
              三竹首席吸籌操盤戰術
            </div>
            <p className="text-slate-400 leading-relaxed">
              {concTrend.tacticalAdvice}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION: 主力平均成本軌跡與 60 日分價累積量 (Major Cost Trajectory & Volume Profile) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600/25 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-inner">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">
                  主力平均成本軌跡與 60 日分價累積量 (Major Cost & Volume Profile)
                </h3>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${costTrajectory.statusBadgeColor}`}>
                  {costTrajectory.statusBadge}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                標示近 60 日主力分價累積量，並透過陰影區塊顯示主力持倉成本核心區間，精準研判多空支撐壓力
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <div className="bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-1.5">
              <span className="text-slate-400">主力均價:</span>
              <strong className="text-amber-400">${majorCost.toFixed(1)} 元</strong>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-1.5">
              <span className="text-slate-400">成本核心區間:</span>
              <strong className="text-slate-200">${costTrajectory.costLowerZone} ~ ${costTrajectory.costUpperZone}</strong>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-1.5">
              <span className="text-slate-400">最大籌碼峰:</span>
              <strong className="text-rose-400">{costTrajectory.pocBracket.label} 元</strong>
            </div>
          </div>
        </div>

        {/* Dynamic HUD Indicator */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800 text-xs font-mono mb-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-300 font-bold flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
              {activeCostDay.date} (第 {activeCostDay.dayIndex} 日)
              {activeCostDay.dayIndex === 60 ? ' · 今日最新' : ''}
            </span>
            <span>
              收盤價: <strong className="text-cyan-400">${activeCostDay.price}</strong>
            </span>
            <span className="text-amber-400 flex items-center">
              <span className="w-2.5 h-0.5 bg-amber-400 mr-1 rounded" />
              主力成本線: <strong>${activeCostDay.majorCost}</strong>
            </span>
            <span className="text-slate-400">
              持倉成本帶: <strong className="text-amber-300/80">${activeCostDay.costLowerBand} ~ ${activeCostDay.costUpperBand}</strong>
            </span>
            <span>
              溢價率: <strong className={activeCostDay.price >= activeCostDay.majorCost ? 'text-red-400' : 'text-emerald-400'}>
                {activeCostDay.price >= activeCostDay.majorCost ? '+' : ''}
                {(((activeCostDay.price - activeCostDay.majorCost) / activeCostDay.majorCost) * 100).toFixed(2)}%
              </strong>
            </span>
          </div>

          <div className="flex items-center space-x-3 text-[11px]">
            <span className="text-emerald-400 font-bold">● 防守支撐: ${costTrajectory.supportLevel}</span>
            <span className="text-red-400 font-bold">● 突破壓力: ${costTrajectory.resistanceLevel}</span>
          </div>
        </div>

        {/* Main Split Grid: 60-Day Trajectory (Left) + Volume-by-Price (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          {/* Left: 60-Day Cost Trajectory & Price Line */}
          <div className="lg:col-span-8 bg-slate-950/90 rounded-xl border border-slate-800 p-3 relative cursor-crosshair flex flex-col justify-between">
            <div className="flex justify-between items-center text-xs text-slate-400 mb-1 px-1">
              <span className="flex items-center space-x-2">
                <span className="w-2.5 h-0.5 bg-cyan-400 rounded mr-1" /> 現價走勢
                <span className="w-2.5 h-0.5 bg-amber-400 rounded ml-2 mr-1" /> 主力成本線
                <span className="w-2.5 h-2 bg-amber-500/20 border border-amber-400/50 rounded ml-2 mr-1" /> 主力持倉區間
              </span>
              <span className="text-[11px] font-mono text-slate-500">60 個交易日主力軌跡</span>
            </div>

            {/* Trajectory SVG */}
            {(() => {
              const svgW = 600;
              const svgH = 220;
              const pad = { top: 15, right: 45, bottom: 25, left: 45 };
              const cW = svgW - pad.left - pad.right;
              const cH = svgH - pad.top - pad.bottom;

              const allP = costTrajectory.days.flatMap((d) => [d.high, d.low, d.costUpperBand, d.costLowerBand]);
              const minP = Math.min(...allP) * 0.985;
              const maxP = Math.max(...allP) * 1.015;
              const rangeP = maxP - minP || 1;

              const getX = (i: number) => pad.left + (i / 59) * cW;
              const getY = (val: number) => pad.top + (1 - (val - minP) / rangeP) * cH;

              // Shaded Cost Zone polygon
              const costPolygon = `${costTrajectory.days.map((d, i) => `${getX(i)},${getY(d.costUpperBand)}`).join(' ')} ${costTrajectory.days
                .slice()
                .reverse()
                .map((d, i) => `${getX(59 - i)},${getY(d.costLowerBand)}`)
                .join(' ')}`;

              const pricePoints = costTrajectory.days.map((d, i) => `${getX(i)},${getY(d.price)}`).join(' ');
              const costPoints = costTrajectory.days.map((d, i) => `${getX(i)},${getY(d.majorCost)}`).join(' ');
              const priceArea = `${getX(0)},${pad.top + cH} ${pricePoints} ${getX(59)},${pad.top + cH}`;

              const suppY = getY(costTrajectory.supportLevel);
              const resY = getY(costTrajectory.resistanceLevel);

              return (
                <svg
                  viewBox={`0 0 ${svgW} ${svgH}`}
                  className="w-full h-56 select-none"
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const relX = (e.clientX - rect.left) / rect.width;
                    const svgX = relX * svgW;
                    const clampedX = Math.max(0, Math.min(cW, svgX - pad.left));
                    const idx = Math.round((clampedX / cW) * 59);
                    setHoveredCostDayIdx(idx);
                  }}
                  onMouseLeave={() => setHoveredCostDayIdx(null)}
                >
                  <defs>
                    <linearGradient id="costZoneGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.1" />
                    </linearGradient>
                    <linearGradient id="priceLineGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal grid lines */}
                  {[0, 0.33, 0.66, 1].map((pct) => {
                    const y = pad.top + pct * cH;
                    const label = (maxP - pct * rangeP).toFixed(1);
                    return (
                      <g key={pct}>
                        <line x1={pad.left} y1={y} x2={svgW - pad.right} y2={y} stroke="#1e293b" strokeDasharray="3,3" />
                        <text x={pad.left - 6} y={y + 3} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">
                          {label}
                        </text>
                      </g>
                    );
                  })}

                  {/* Support Line */}
                  <line x1={pad.left} y1={suppY} x2={svgW - pad.right} y2={suppY} stroke="#10b981" strokeDasharray="3,3" strokeOpacity="0.7" />
                  <text x={svgW - pad.right + 4} y={suppY + 3} fill="#10b981" fontSize="9" fontFamily="monospace">
                    支撐 ${costTrajectory.supportLevel}
                  </text>

                  {/* Resistance Line */}
                  <line x1={pad.left} y1={resY} x2={svgW - pad.right} y2={resY} stroke="#ef4444" strokeDasharray="3,3" strokeOpacity="0.7" />
                  <text x={svgW - pad.right + 4} y={resY + 3} fill="#ef4444" fontSize="9" fontFamily="monospace">
                    壓力 ${costTrajectory.resistanceLevel}
                  </text>

                  {/* Shaded Major Cost Zone (Band) */}
                  <polygon points={costPolygon} fill="url(#costZoneGradient)" />

                  {/* Price Area Fill */}
                  <polygon points={priceArea} fill="url(#priceLineGradient)" />

                  {/* Upper & Lower Cost Band Outlines */}
                  <polyline
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                    strokeOpacity="0.6"
                    points={costTrajectory.days.map((d, i) => `${getX(i)},${getY(d.costUpperBand)}`).join(' ')}
                  />
                  <polyline
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                    strokeOpacity="0.6"
                    points={costTrajectory.days.map((d, i) => `${getX(i)},${getY(d.costLowerBand)}`).join(' ')}
                  />

                  {/* Major Cost Line */}
                  <polyline
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2"
                    strokeDasharray="4,3"
                    strokeLinecap="round"
                    points={costPoints}
                  />

                  {/* Stock Price Line */}
                  <polyline
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={pricePoints}
                  />

                  {/* Timeline Date Labels */}
                  {costTrajectory.days
                    .filter((_, i) => i === 0 || i === 15 || i === 30 || i === 45 || i === 59)
                    .map((d, idx) => {
                      const originalIdx = costTrajectory.days.indexOf(d);
                      return (
                        <text
                          key={idx}
                          x={getX(originalIdx)}
                          y={svgH - 6}
                          fill="#64748b"
                          fontSize="9"
                          textAnchor="middle"
                          fontFamily="monospace"
                        >
                          {d.date}
                        </text>
                      );
                    })}

                  {/* Interactive Crosshair & Cursor */}
                  {hoveredCostDayIdx !== null && (
                    <g>
                      <line
                        x1={getX(hoveredCostDayIdx)}
                        y1={pad.top}
                        x2={getX(hoveredCostDayIdx)}
                        y2={pad.top + cH}
                        stroke="#f8fafc"
                        strokeWidth="1"
                        strokeDasharray="3,3"
                        opacity="0.8"
                      />
                      <circle
                        cx={getX(hoveredCostDayIdx)}
                        cy={getY(activeCostDay.price)}
                        r="4"
                        fill="#38bdf8"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      <circle
                        cx={getX(hoveredCostDayIdx)}
                        cy={getY(activeCostDay.majorCost)}
                        r="3.5"
                        fill="#f59e0b"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    </g>
                  )}
                </svg>
              );
            })()}
          </div>

          {/* Right: Volume-at-Price Profile (分價累積量堆疊) */}
          <div className="lg:col-span-4 bg-slate-950/90 rounded-xl border border-slate-800 p-3.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-slate-200 flex items-center">
                  <BarChart3 className="w-3.5 h-3.5 text-amber-400 mr-1" />
                  近 60 日分價累積量 (Volume Profile)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">10 階籌碼堆疊</span>
              </div>
              <p className="text-[11px] text-slate-400 mb-3 leading-tight">
                量能越長代表該價位大戶換手囤貨越密集，構成極強的關鍵支撐或壓力。
              </p>

              {/* Stacked price rows */}
              <div className="space-y-1.5 font-mono text-[11px]">
                {costTrajectory.volumeBrackets.slice().reverse().map((b, idx) => {
                  return (
                    <div
                      key={idx}
                      className={`p-1.5 rounded-lg border transition-all ${
                        b.isPoc
                          ? 'bg-rose-950/40 border-rose-500/60 shadow-sm shadow-rose-500/10'
                          : b.isCurrentPriceInside
                          ? 'bg-cyan-950/30 border-cyan-500/50'
                          : b.isCostInside
                          ? 'bg-amber-950/30 border-amber-500/40'
                          : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center space-x-1">
                          <span className={b.isCurrentPriceInside ? 'text-cyan-300 font-bold' : b.isPoc ? 'text-rose-300 font-bold' : 'text-slate-300'}>
                            ${b.minPrice} ~ ${b.maxPrice}
                          </span>
                          {b.isPoc && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-rose-500/30 text-rose-300 font-bold">
                              ★ POC 最大量
                            </span>
                          )}
                          {b.isCurrentPriceInside && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/30 text-cyan-300 font-bold">
                              🎯 現價
                            </span>
                          )}
                        </div>
                        <span className="text-slate-400 font-bold">
                          {b.percentage}%
                        </span>
                      </div>

                      {/* Bar Fill */}
                      <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            b.isPoc
                              ? 'bg-rose-500'
                              : b.isCurrentPriceInside
                              ? 'bg-cyan-400'
                              : b.isCostInside
                              ? 'bg-amber-400'
                              : 'bg-slate-600'
                          }`}
                          style={{ width: `${Math.min(100, b.percentage * 3.5)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>最大籌碼防守峰 (POC):</span>
              <strong className="text-rose-400 font-mono">${costTrajectory.pocBracket.label} 元</strong>
            </div>
          </div>
        </div>

        {/* Diagnosis Note */}
        <div className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 flex items-start space-x-2.5">
          <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-100 font-semibold mr-1.5">支撐與壓力實戰解讀：</strong>
            <span>{costTrajectory.statusDiagnosis}</span>
          </div>
        </div>
      </div>

      {/* SECTION: 近 60 日主力分價累積量表 (60-Day Major Volume-at-Price Profile Table & Support/Resistance Density) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Glow ambient accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-4 relative z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600/25 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-inner">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-slate-100 flex items-center">
                  近 60 日主力分價累積量表
                  <span className="text-xs font-normal text-amber-400 ml-2 font-mono">
                    (60-Day Volume-at-Price Density Profile & Support/Resistance)
                  </span>
                </h3>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${volumeProfile.statusBadgeColor}`}>
                  {volumeProfile.statusBadge}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  POC 籌碼峰: ${volumeProfile.pocBracket.midPrice} ({volumeProfile.pocBracket.percentage}%)
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  70% 價值區: ${volumeProfile.valueAreaLow} ~ ${volumeProfile.valueAreaHigh}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                以橫向直方圖展示各個價位的籌碼堆疊密度，精準標記 POC 最大籌碼防守峰、70% 價值核心區 (Value Area) 與現價位置，幫助一眼看出關鍵支撐與壓力區間
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <div className="bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-1.5">
              <span className="text-slate-400">總成交量:</span>
              <strong className="text-slate-200">{(volumeProfile.total60dVolumeLots / 10000).toFixed(1)} 萬張</strong>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-1.5">
              <span className="text-slate-400">現價 vs POC:</span>
              <strong className={volumeProfile.priceVsPocPct >= 0 ? 'text-rose-400' : 'text-emerald-400'}>
                {volumeProfile.priceVsPocPct >= 0 ? '+' : ''}{volumeProfile.priceVsPocPct}%
              </strong>
            </div>
          </div>
        </div>

        {/* 4-Key Support & Resistance Anchor Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4 relative z-10">
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block mb-0.5">第一支撐區間 (S1 · 核心大量)</span>
            <div className="flex items-baseline space-x-1.5">
              <strong className="text-base font-bold font-mono text-emerald-400">
                ${volumeProfile.supportLevel1.price} 元
              </strong>
              <span className="text-[10px] text-slate-400 font-mono">
                ({volumeProfile.supportLevel1.lots.toLocaleString()} 張)
              </span>
            </div>
            <span className="text-[10px] text-emerald-300/80 block mt-0.5 font-mono">
              區間: {volumeProfile.supportLevel1.label}
            </span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block mb-0.5">第二支撐區間 (S2 · 底層防守)</span>
            <div className="flex items-baseline space-x-1.5">
              <strong className="text-base font-bold font-mono text-emerald-400">
                ${volumeProfile.supportLevel2.price} 元
              </strong>
              <span className="text-[10px] text-slate-400 font-mono">
                ({volumeProfile.supportLevel2.lots.toLocaleString()} 張)
              </span>
            </div>
            <span className="text-[10px] text-emerald-300/80 block mt-0.5 font-mono">
              區間: {volumeProfile.supportLevel2.label}
            </span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block mb-0.5">第一壓力區間 (R1 · 密集套牢)</span>
            <div className="flex items-baseline space-x-1.5">
              <strong className="text-base font-bold font-mono text-rose-400">
                ${volumeProfile.resistanceLevel1.price} 元
              </strong>
              <span className="text-[10px] text-slate-400 font-mono">
                ({volumeProfile.resistanceLevel1.lots.toLocaleString()} 張)
              </span>
            </div>
            <span className="text-[10px] text-rose-300/80 block mt-0.5 font-mono">
              區間: {volumeProfile.resistanceLevel1.label}
            </span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3">
            <span className="text-[11px] text-slate-400 block mb-0.5">第二壓力區間 (R2 · 遠端關卡)</span>
            <div className="flex items-baseline space-x-1.5">
              <strong className="text-base font-bold font-mono text-rose-400">
                ${volumeProfile.resistanceLevel2.price} 元
              </strong>
              <span className="text-[10px] text-slate-400 font-mono">
                ({volumeProfile.resistanceLevel2.lots.toLocaleString()} 張)
              </span>
            </div>
            <span className="text-[10px] text-rose-300/80 block mt-0.5 font-mono">
              區間: {volumeProfile.resistanceLevel2.label}
            </span>
          </div>
        </div>

        {/* Horizontal Histogram Volume-at-Price Density Table */}
        <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800/90 mb-4 relative z-10">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-3 pb-2 border-b border-slate-800/80">
            <span className="font-semibold text-slate-200">
              各價位籌碼堆疊密度橫向分佈 (點擊任一價位檢視細部診斷)
            </span>
            <div className="flex items-center space-x-3 text-[11px]">
              <span className="flex items-center">
                <span className="w-2.5 h-2.5 bg-rose-500 rounded-sm mr-1 inline-block" /> 主力買進佔比
              </span>
              <span className="flex items-center">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm mr-1 inline-block" /> 主力賣出佔比
              </span>
              <span className="flex items-center text-amber-400">
                ★ POC 最大防守量
              </span>
              <span className="flex items-center text-cyan-400">
                🎯 當前現價
              </span>
            </div>
          </div>

          {/* Histogram Rows */}
          <div className="space-y-2 font-mono text-xs">
            {volumeProfile.brackets.slice().reverse().map((b) => {
              const isSelected = activeBracket.id === b.id;
              const maxPct = Math.max(...volumeProfile.brackets.map((x) => x.percentage));
              const relativeWidth = Math.min(100, Math.max(12, (b.percentage / maxPct) * 100));

              return (
                <div
                  key={b.id}
                  onClick={() => setSelectedBracketId(b.id)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-slate-900 border-amber-500/80 ring-1 ring-amber-500/50 shadow-md shadow-amber-950/30'
                      : b.isPoc
                      ? 'bg-amber-950/30 border-amber-500/50 hover:bg-amber-950/40'
                      : b.isCurrentPrice
                      ? 'bg-cyan-950/30 border-cyan-500/50 hover:bg-cyan-950/40'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900/60'
                  }`}
                >
                  {/* Left: Price Bracket & Feature Badges */}
                  <div className="flex items-center space-x-2 min-w-[210px]">
                    <span className={`font-bold text-xs ${
                      b.isCurrentPrice ? 'text-cyan-300' : b.isPoc ? 'text-amber-300' : 'text-slate-200'
                    }`}>
                      {b.label}
                    </span>

                    {b.isPoc && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-amber-500/30 text-amber-300 border border-amber-500/50 shadow-xs">
                        ★ POC 峰值
                      </span>
                    )}

                    {b.isCurrentPrice && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 animate-pulse">
                        🎯 現價 ${stock.price}
                      </span>
                    )}

                    {b.isValueArea && !b.isPoc && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        VA 價值區
                      </span>
                    )}

                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium border ${b.badgeClass}`}>
                      {b.zoneLabel}
                    </span>
                  </div>

                  {/* Middle: Horizontal Histogram Bar (Proportional Width & Buy/Sell Split) */}
                  <div className="w-full sm:flex-1 mx-0 sm:mx-3">
                    <div className="h-4 w-full bg-slate-900 rounded-md overflow-hidden flex shadow-inner relative">
                      {/* Buy segment */}
                      <div
                        className="bg-rose-500/90 h-full transition-all duration-500"
                        style={{ width: `${(b.majorBuyLots / b.volumeShares) * relativeWidth}%` }}
                        title={`買進: ${b.majorBuyLots.toLocaleString()} 張`}
                      />
                      {/* Sell segment */}
                      <div
                        className="bg-emerald-500/90 h-full transition-all duration-500"
                        style={{ width: `${(b.majorSellLots / b.volumeShares) * relativeWidth}%` }}
                        title={`賣出: ${b.majorSellLots.toLocaleString()} 張`}
                      />
                      {/* Empty remaining width if less than 100% relative */}
                      <div
                        className="bg-transparent h-full"
                        style={{ width: `${100 - relativeWidth}%` }}
                      />
                    </div>
                  </div>

                  {/* Right: Numerical Data */}
                  <div className="flex items-center space-x-3 text-right text-[11px] min-w-[200px] justify-between sm:justify-end">
                    <span className="text-slate-300 font-bold">
                      {b.volumeShares.toLocaleString()} <span className="text-[10px] text-slate-400">張</span>
                    </span>
                    <span className="text-amber-400 font-bold w-12 text-right">
                      {b.percentage}%
                    </span>
                    <span className={`w-20 text-right font-bold ${
                      b.majorNetLots >= 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {b.majorNetLots >= 0 ? '+' : ''}{b.majorNetLots.toLocaleString()} 張
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Bracket Detailed Quant Breakdown & Strategy */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-xs leading-relaxed relative z-10">
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80">
            <div className="font-bold text-slate-200 mb-1.5 flex items-center">
              <Crosshair className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
              所選價位籌碼明細: <strong className="text-amber-400 ml-1">{activeBracket.label}</strong>
            </div>
            <div className="space-y-1 font-mono text-[11px] text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">區間總成交量:</span>
                <strong className="text-slate-200">{activeBracket.volumeShares.toLocaleString()} 張 ({activeBracket.percentage}%)</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">主力買進 / 賣出:</span>
                <span>
                  <strong className="text-rose-400">{activeBracket.majorBuyLots.toLocaleString()}</strong> / <strong className="text-emerald-400">{activeBracket.majorSellLots.toLocaleString()}</strong> 張
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">主力淨進出:</span>
                <strong className={activeBracket.majorNetLots >= 0 ? 'text-rose-400' : 'text-emerald-400'}>
                  {activeBracket.majorNetLots >= 0 ? '+' : ''}{activeBracket.majorNetLots.toLocaleString()} 張
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">價位籌碼定位:</span>
                <span className={`px-1.5 py-0.2 rounded font-medium border ${activeBracket.badgeClass}`}>
                  {activeBracket.zoneLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80">
            <div className="font-bold text-slate-200 mb-1.5 flex items-center">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
              籌碼堆疊整體結構剖析
            </div>
            <p className="text-slate-400">
              {volumeProfile.profileDiagnosis}
            </p>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80">
            <div className="font-bold text-slate-200 mb-1.5 flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
              關鍵支撐壓力實戰操作戰略
            </div>
            <p className="text-slate-400">
              {volumeProfile.tradingStrategy}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION: 主力成本回測分析 (Major Cost Backtest Analysis: 30 / 60 / 90 Days) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/25 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Glow ambient accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header & Period Switcher */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-4 relative z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/25 border border-indigo-500/50 flex items-center justify-center text-indigo-400 shadow-inner">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-slate-100 flex items-center">
                  主力成本回測分析
                  <span className="text-xs font-normal text-indigo-400 ml-2 font-mono">
                    (Major Cost Backtest & Bias Analysis)
                  </span>
                </h3>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${costBacktest.activeResult.zoneBadgeClass}`}>
                  {costBacktest.activeResult.zoneBadgeText}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                自由切換過去 30 / 60 / 90 天，回測波段主力平均建倉成本與當前股價偏離度，精準剖析主力多空底牌與持倉防守線
              </p>
            </div>
          </div>

          {/* 30 / 60 / 90 Days Quick Selector */}
          <div className="flex items-center bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 shadow-inner">
            <span className="text-slate-400 text-xs px-2 font-medium flex items-center">
              <RotateCcw className="w-3.5 h-3.5 mr-1 text-indigo-400" />
              回測週期:
            </span>
            {([30, 60, 90] as BacktestPeriod[]).map((period) => {
              const res = costBacktest.results[period];
              const isSelected = backtestPeriod === period;
              return (
                <button
                  key={period}
                  onClick={() => {
                    setBacktestPeriod(period);
                    setHoveredBacktestIdx(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 ${
                    isSelected
                      ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-900/40 ring-1 ring-indigo-400'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <span>{period} 日</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    res.priceDeviationPercent >= 0 
                      ? isSelected ? 'bg-indigo-900/80 text-rose-300 font-bold' : 'text-rose-400 bg-rose-500/10'
                      : isSelected ? 'bg-indigo-900/80 text-emerald-300 font-bold' : 'text-emerald-400 bg-emerald-500/10'
                  }`}>
                    {res.priceDeviationPercent >= 0 ? '+' : ''}{res.priceDeviationPercent}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 30 / 60 / 90 Days Horizon Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 relative z-10">
          {costBacktest.comparison.map((item) => {
            const isCurrent = backtestPeriod === item.period;
            const fullRes = costBacktest.results[item.period];
            return (
              <div
                key={item.period}
                onClick={() => {
                  setBacktestPeriod(item.period);
                  setHoveredBacktestIdx(null);
                }}
                className={`cursor-pointer rounded-xl p-3.5 border transition-all duration-200 relative overflow-hidden ${
                  isCurrent
                    ? 'bg-slate-950/90 border-indigo-500/70 shadow-lg shadow-indigo-950/30 ring-1 ring-indigo-500/40'
                    : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950/70'
                }`}
              >
                {isCurrent && (
                  <div className="absolute top-0 right-0 w-2 h-2 bg-indigo-400 rounded-bl-md" />
                )}
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-slate-200 flex items-center">
                    <Calendar className="w-3.5 h-3.5 mr-1 text-indigo-400" />
                    {item.label}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${item.badgeClass}`}>
                    {item.zoneTitle}
                  </span>
                </div>
                
                <div className="flex items-baseline justify-between mt-2">
                  <div>
                    <span className="text-[11px] text-slate-400 block">主力建倉成本</span>
                    <strong className="text-base font-mono text-amber-400">
                      ${item.cost.toFixed(1)} <span className="text-xs text-slate-400">元</span>
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block">偏離度 (Bias)</span>
                    <strong className={`text-base font-mono flex items-center justify-end ${
                      item.deviation >= 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {item.deviation >= 0 ? (
                        <TrendingUp className="w-3.5 h-3.5 mr-0.5 inline" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 mr-0.5 inline" />
                      )}
                      {item.deviation >= 0 ? '+' : ''}{item.deviation.toFixed(2)}%
                    </strong>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>累計淨進出:</span>
                  <span className={item.netShares >= 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {item.netShares >= 0 ? '+' : ''}{item.netShares.toLocaleString()} 張
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 4-Key Metrics Focus Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 relative z-10">
          {/* Card 1: 股價 vs 主力均價 */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5">
            <span className="text-xs text-slate-400 block mb-1">
              {costBacktest.activeResult.period}日 主力均價 vs 現價
            </span>
            <div className="flex items-baseline space-x-2">
              <strong className="text-xl font-bold font-mono text-amber-400">
                ${costBacktest.activeResult.averageMajorCost.toFixed(1)}
              </strong>
              <span className="text-xs font-mono text-slate-400">
                現價: <strong className="text-cyan-400">${stock.price}</strong>
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-400 font-mono flex items-center justify-between">
              <span>每股價差:</span>
              <span className={costBacktest.activeResult.priceDeviationAmount >= 0 ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                {costBacktest.activeResult.priceDeviationAmount >= 0 ? '+' : ''}
                ${costBacktest.activeResult.priceDeviationAmount.toFixed(1)} 元
              </span>
            </div>
          </div>

          {/* Card 2: 偏離度 (Bias Rate %) */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-400">波段偏離度 (Bias)</span>
              <span className="text-[10px] text-slate-400 font-mono">基準: 0%</span>
            </div>
            <div className="flex items-baseline space-x-1.5">
              <strong className={`text-xl font-bold font-mono ${
                costBacktest.activeResult.priceDeviationPercent >= 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                {costBacktest.activeResult.priceDeviationPercent >= 0 ? '+' : ''}
                {costBacktest.activeResult.priceDeviationPercent.toFixed(2)}%
              </strong>
            </div>
            {/* Visual Mini Bias Meter */}
            <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden flex">
              <div 
                className={`h-full transition-all duration-300 ${
                  costBacktest.activeResult.priceDeviationPercent >= 0 ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{ 
                  width: `${Math.min(100, Math.max(10, Math.abs(costBacktest.activeResult.priceDeviationPercent) * 4))}%`,
                  marginLeft: costBacktest.activeResult.priceDeviationPercent < 0 ? 'auto' : undefined
                }}
              />
            </div>
          </div>

          {/* Card 3: 區間主力淨買超與參與率 */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5">
            <span className="text-xs text-slate-400 block mb-1">
              {costBacktest.activeResult.period}日 主力累計淨買超
            </span>
            <strong className={`text-xl font-bold font-mono ${
              costBacktest.activeResult.intervalNetShares >= 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              {costBacktest.activeResult.intervalNetShares >= 0 ? '+' : ''}
              {costBacktest.activeResult.intervalNetShares.toLocaleString()}
              <span className="text-xs font-normal text-slate-400 ml-1">張</span>
            </strong>
            <div className="mt-1 text-xs text-slate-400 font-mono flex items-center justify-between">
              <span>主力參與率:</span>
              <span className="text-indigo-400 font-semibold">{costBacktest.activeResult.majorParticipationRate}%</span>
            </div>
          </div>

          {/* Card 4: 主力預估浮動損益 */}
          <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3.5">
            <span className="text-xs text-slate-400 block mb-1">
              主力預估浮動損益
            </span>
            <strong className={`text-xl font-bold font-mono ${
              costBacktest.activeResult.estimatedMajorProfitAmount >= 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              {costBacktest.activeResult.estimatedMajorProfitAmount >= 0 ? '+' : ''}
              ${costBacktest.activeResult.estimatedMajorProfitAmount.toLocaleString()}
              <span className="text-xs font-normal text-slate-400 ml-1">百萬</span>
            </strong>
            <div className="mt-1 text-xs text-slate-400 font-mono flex items-center justify-between">
              <span>預估持倉報酬:</span>
              <span className={costBacktest.activeResult.estimatedMajorReturnRate >= 0 ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                {costBacktest.activeResult.estimatedMajorReturnRate >= 0 ? '+' : ''}
                {costBacktest.activeResult.estimatedMajorReturnRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic HUD Inspection Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800 text-xs font-mono mb-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-300 font-bold flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1 text-indigo-400" />
              {activeBacktestPoint.date} (第 {activeBacktestPoint.dayIndex} 日 / 共 {costBacktest.activeResult.tradingDaysCount} 日)
              {activeBacktestPoint.dayIndex === costBacktest.activeResult.tradingDaysCount ? ' · 今日最新' : ''}
            </span>
            <span>
              收盤價: <strong className="text-cyan-400">${activeBacktestPoint.price}</strong>
            </span>
            <span>
              主力累計成本: <strong className="text-amber-400">${activeBacktestPoint.rollingMajorCost}</strong>
            </span>
            <span>
              當日偏離度: 
              <strong className={`ml-1 ${activeBacktestPoint.dailyDeviationPercent >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {activeBacktestPoint.dailyDeviationPercent >= 0 ? '+' : ''}{activeBacktestPoint.dailyDeviationPercent}%
              </strong>
            </span>
            <span>
              當日主力淨買超: 
              <strong className={`ml-1 ${activeBacktestPoint.majorNetBuy >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {activeBacktestPoint.majorNetBuy >= 0 ? '+' : ''}{activeBacktestPoint.majorNetBuy.toLocaleString()} 張
              </strong>
            </span>
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
            <span className="flex items-center">
              <span className="w-2.5 h-0.5 bg-cyan-400 mr-1 inline-block" /> 股價
            </span>
            <span className="flex items-center">
              <span className="w-2.5 h-0.5 bg-amber-400 mr-1 inline-block" /> 主力均價成本線
            </span>
            <span className="flex items-center">
              <span className="w-2.5 h-2 bg-amber-500/20 border border-amber-500/40 mr-1 inline-block" /> 成本緩衝區 (±2%)
            </span>
            <span className="flex items-center">
              <span className="w-2 h-2 bg-rose-500 mr-1 inline-block" /> 買超
            </span>
            <span className="flex items-center">
              <span className="w-2 h-2 bg-emerald-500 mr-1 inline-block" /> 賣超
            </span>
          </div>
        </div>

        {/* Interactive Dual-Axis Chart */}
        <div className="w-full bg-slate-950/90 rounded-xl p-3 border border-slate-800 shadow-inner">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={costBacktest.activeResult.dailyPoints}
                margin={{ top: 15, right: 20, left: 10, bottom: 5 }}
                onMouseMove={(e: any) => {
                  if (e && e.activeTooltipIndex !== undefined && e.activeTooltipIndex !== null) {
                    setHoveredBacktestIdx(e.activeTooltipIndex);
                  }
                }}
                onMouseLeave={() => setHoveredBacktestIdx(null)}
              >
                <defs>
                  <linearGradient id="costBandFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.04} />
                  </linearGradient>
                </defs>

                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" opacity={0.6} />

                <XAxis 
                  dataKey="date" 
                  stroke="#64748b" 
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  interval={Math.floor(costBacktest.activeResult.tradingDaysCount / 7)}
                />

                {/* Left Y-Axis: Stock Price & Rolling Cost ($ NT) */}
                <YAxis 
                  yAxisId="priceAxis"
                  stroke="#94a3b8" 
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  domain={['auto', 'auto']}
                  tickFormatter={(val) => `$${val}`}
                />

                {/* Right Y-Axis: Daily Major Net Buy (Lots) */}
                <YAxis 
                  yAxisId="volAxis"
                  orientation="right"
                  stroke="#64748b" 
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                />
                <RechartsTooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const data = payload[0]?.payload;
                    if (!data) return null;
                    return (
                      <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl p-3 shadow-xl text-xs font-mono backdrop-blur-sm z-50">
                        <div className="text-slate-300 font-bold mb-1.5 border-b border-slate-800 pb-1">
                          {label || data.date}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-400">當日收盤價:</span>
                            <span className="text-slate-100 font-bold">${data.closePrice}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-amber-400">累計主力成本:</span>
                            <span className="text-amber-300 font-bold">${data.cumulativeCost?.toFixed(1)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-400">主力當日買超:</span>
                            <span className={data.majorNetBuy >= 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                              {data.majorNetBuy >= 0 ? '+' : ''}{data.majorNetBuy?.toLocaleString()} 張
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <ReferenceLine 
                  yAxisId="priceAxis"
                  y={costBacktest.activeResult.averageMajorCost} 
                  stroke="#f59e0b" 
                  strokeDasharray="4 4" 
                  label={{
                    value: `主力均價 $${costBacktest.activeResult.averageMajorCost.toFixed(1)}`,
                    fill: '#f59e0b',
                    fontSize: 10,
                    position: 'insideTopLeft'
                  }} 
                />

                {/* Cost Buffer Zone (Upper & Lower Band) */}
                <Area
                  yAxisId="priceAxis"
                  type="monotone"
                  dataKey="costBandUpper"
                  stroke="transparent"
                  fill="url(#costBandFill)"
                  isAnimationActive={false}
                />

                {/* Daily Major Net Buy Bar (Dual Axis) */}
                <Bar 
                  yAxisId="volAxis"
                  dataKey="majorNetBuy" 
                  opacity={0.65}
                  maxBarSize={8}
                >
                  {costBacktest.activeResult.dailyPoints.map((entry, idx) => (
                    <Cell 
                      key={`bar-${idx}`} 
                      fill={entry.majorNetBuy >= 0 ? '#f43f5e' : '#10b981'} 
                    />
                  ))}
                </Bar>

                {/* Rolling Major Cost Line */}
                <Line
                  yAxisId="priceAxis"
                  type="monotone"
                  dataKey="rollingMajorCost"
                  name="主力累計建倉均價"
                  stroke="#f59e0b"
                  strokeWidth={2.4}
                  dot={false}
                  activeDot={{ r: 5, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                />

                {/* Stock Price Line */}
                <Line
                  yAxisId="priceAxis"
                  type="monotone"
                  dataKey="price"
                  name="每日收盤價"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, fill: '#38bdf8', stroke: '#fff', strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Strategic Quant Matrix & Actionable Advice */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-1">主力保本防守底線 (成本 -2%)</span>
            <strong className="text-base font-mono text-emerald-400">
              ${costBacktest.activeResult.defenseLine.toFixed(1)} 元
            </strong>
            <span className="text-[11px] text-slate-400 block mt-1">
              若有效跌破此位，主力可能被迫發動停損或出現多殺多連鎖效應
            </span>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-1">波段推升目標價 (成本 +12%)</span>
            <strong className="text-base font-mono text-rose-400">
              ${costBacktest.activeResult.breakoutTarget.toFixed(1)} 元
            </strong>
            <span className="text-[11px] text-slate-400 block mt-1">
              主力波段拉抬的標準獲利目標區，接近時需提防高檔倒貨派發
            </span>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-1">進場風險報酬比評級</span>
            <strong className="text-base font-mono text-indigo-400">
              {costBacktest.activeResult.riskRewardRatio}
            </strong>
            <span className="text-[11px] text-slate-400 block mt-1">
              以當前價格、主力防守底線與拉抬目標價動態精算之勝率比率
            </span>
          </div>
        </div>

        {/* Tactical Diagnosis & Quant Strategy Advice */}
        <div className="mt-3.5 grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs leading-relaxed">
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80">
            <div className="font-bold text-slate-200 mb-1.5 flex items-center">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
              主力底牌與籌碼動向深度剖析
            </div>
            <p className="text-slate-400">
              {costBacktest.activeResult.diagnosticSummary}
            </p>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80">
            <div className="font-bold text-slate-200 mb-1.5 flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
              三竹首席操盤與散戶跟單指引
            </div>
            <p className="text-slate-400">
              {costBacktest.activeResult.tacticalAdvice}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION: 主力大戶持倉佔比分佈圓餅圖 (Major Shareholder Holding Distribution Pie Chart) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/20 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Glow ambient accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-4 relative z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600/25 border border-rose-500/50 flex items-center justify-center text-rose-400 shadow-inner">
              <PieChart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-slate-100 flex items-center">
                  主力大戶持倉佔比分佈圓餅圖
                  <span className="text-xs font-normal text-rose-400 ml-2 font-mono">
                    (Major Shareholder Holding Distribution & 30-Day Dynamics)
                  </span>
                </h3>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${holderDist.flowPatternBadge}`}>
                  {holderDist.flowPatternLabel}
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${holderDist.concentrationBadge}`}>
                  {holderDist.concentrationLabel}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                深度拆解個股近 30 日股權結構：主力大戶（≥400張）、中實戶（100~400張）與一般散戶（&lt;100張）持倉比例，動態透視主力籌碼增減與市場浮額流向
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <div className="bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-1.5">
              <span className="text-slate-400">總發行張數:</span>
              <strong className="text-slate-200">{(holderDist.totalSharesLots / 10000).toFixed(1)} 萬張</strong>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-1.5">
              <span className="text-slate-400">估算市值:</span>
              <strong className="text-amber-400">${holderDist.totalMarketValueBillion} 億元</strong>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-1.5">
              <span className="text-slate-400">大戶淨增減:</span>
              <strong className={holderDist.netMajorLotDelta30d >= 0 ? 'text-rose-400' : 'text-emerald-400'}>
                {holderDist.netMajorLotDelta30d >= 0 ? '+' : ''}{holderDist.netMajorLotDelta30d.toLocaleString()} 張
              </strong>
            </div>
          </div>
        </div>

        {/* 2-Column Core Visualization: Left Donut + Right Detailed Tier Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5 relative z-10">
          {/* Left Column: Interactive Donut Chart */}
          <div className="lg:col-span-5 bg-slate-950/80 rounded-xl p-4 border border-slate-800/90 flex flex-col items-center justify-center relative">
            <div className="w-full flex items-center justify-between text-xs text-slate-400 mb-2 px-1">
              <span className="font-semibold text-slate-300 flex items-center">
                <PieChart className="w-3.5 h-3.5 mr-1 text-rose-400" />
                股權結構分佈佔比
              </span>
              <span className="text-[11px] text-slate-400">
                點擊或懸停區塊切換明細
              </span>
            </div>

            {/* Recharts Donut Pie Chart */}
            <div className="w-full h-56 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={holderDist.tiers}
                    dataKey="ratio"
                    nameKey="shortName"
                    cx="50%"
                    cy="50%"
                    innerRadius={68}
                    outerRadius={96}
                    paddingAngle={4}
                    onMouseEnter={(_, index) => setActiveHolderTierId(holderDist.tiers[index].id)}
                    onMouseLeave={() => setActiveHolderTierId(null)}
                    onClick={(_, index) => {
                      const clickedId = holderDist.tiers[index].id;
                      setActiveHolderTierId(prev => prev === clickedId ? null : clickedId);
                    }}
                  >
                    {holderDist.tiers.map((tier) => {
                      const isHovered = activeHolderTierId === tier.id;
                      return (
                        <Cell
                          key={`pie-cell-${tier.id}`}
                          fill={tier.color}
                          stroke={isHovered ? '#ffffff' : '#0f172a'}
                          strokeWidth={isHovered ? 2.5 : 1}
                          className="cursor-pointer transition-all duration-200"
                        />
                      );
                    })}
                  </Pie>
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0]?.payload;
                      if (!data) return null;
                      return (
                        <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl p-2.5 shadow-xl text-xs font-mono backdrop-blur-sm z-50">
                          <div className="text-slate-200 font-bold mb-1">{data.name}</div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-400">持股比例:</span>
                            <span className="text-amber-400 font-bold">{data.ratio}%</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-400">持股人數:</span>
                            <span className="text-slate-300">{data.peopleCount?.toLocaleString()} 人</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>

              {/* Center Donut Overlay HUD */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[11px] text-slate-400 font-medium">
                  {selectedTier ? selectedTier.shortName : '主力大戶持股'}
                </span>
                <span className="text-2xl sm:text-3xl font-bold font-mono text-slate-100 tracking-tight">
                  {selectedTier ? `${selectedTier.ratio}%` : `${holderDist.tiers[0].ratio}%`}
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full mt-0.5 border ${
                  (selectedTier ? selectedTier.change30d : holderDist.tiers[0].change30d) >= 0
                    ? 'text-rose-300 bg-rose-500/20 border-rose-500/40'
                    : 'text-emerald-300 bg-emerald-500/20 border-emerald-500/40'
                }`}>
                  30日 {(selectedTier ? selectedTier.change30d : holderDist.tiers[0].change30d) >= 0 ? '+' : ''}
                  {(selectedTier ? selectedTier.change30d : holderDist.tiers[0].change30d)}%
                </span>
              </div>
            </div>

            {/* Quick Interactive Legend Pills */}
            <div className="w-full grid grid-cols-3 gap-2 mt-2 pt-3 border-t border-slate-800/80">
              {holderDist.tiers.map((tier) => {
                const isSelected = activeHolderTierId === tier.id;
                return (
                  <button
                    key={`legend-${tier.id}`}
                    onClick={() => setActiveHolderTierId(prev => prev === tier.id ? null : tier.id)}
                    className={`p-2 rounded-lg text-left transition-all border ${
                      isSelected 
                        ? 'bg-slate-900 border-slate-600 ring-1 ring-slate-500' 
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: tier.color }} />
                      <span className="text-slate-300 font-semibold truncate text-[11px]">{tier.shortName}</span>
                    </div>
                    <div className="mt-1 flex items-baseline justify-between font-mono">
                      <strong className="text-sm font-bold" style={{ color: tier.color }}>{tier.ratio}%</strong>
                      <span className={`text-[10px] ${tier.change30d >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {tier.change30d >= 0 ? '+' : ''}{tier.change30d}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: 3 Tier Comprehensive Breakdown Cards */}
          <div className="lg:col-span-7 flex flex-col space-y-3">
            {holderDist.tiers.map((tier) => {
              const isSelected = activeHolderTierId === tier.id;
              return (
                <div
                  key={`card-${tier.id}`}
                  onClick={() => setActiveHolderTierId(prev => prev === tier.id ? null : tier.id)}
                  className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-slate-950/95 border-slate-600 ring-1 ring-slate-500 shadow-lg shadow-black/40'
                      : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700 hover:bg-slate-950/90'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tier.color }} />
                      <h4 className="text-sm font-bold text-slate-100 flex items-center">
                        {tier.name}
                        <span className="text-[11px] font-normal text-slate-400 ml-2 font-mono">
                          [{tier.shareBracket}]
                        </span>
                      </h4>
                    </div>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${tier.badgeClass}`}>
                      {tier.statusLabel}
                    </span>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">當前持股佔比</span>
                      <strong className="text-sm font-bold" style={{ color: tier.color }}>
                        {tier.ratio}%
                      </strong>
                    </div>

                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">30 日持股消長</span>
                      <strong className={`text-sm font-bold flex items-center ${
                        tier.change30d >= 0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}>
                        {tier.change30d >= 0 ? (
                          <TrendingUp className="w-3.5 h-3.5 mr-0.5 inline" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5 mr-0.5 inline" />
                        )}
                        {tier.change30d >= 0 ? '+' : ''}{tier.change30d}%
                      </strong>
                    </div>

                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">估算持股張數</span>
                      <strong className="text-slate-200 text-xs">
                        {tier.sharesEstimateLots.toLocaleString()} 張
                      </strong>
                    </div>

                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">估算股東人數</span>
                      <strong className="text-slate-200 text-xs">
                        {tier.holderCountEstimate.toLocaleString()} 人
                        <span className={`text-[10px] ml-1 ${tier.holderCountChange30d >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          ({tier.holderCountChange30d >= 0 ? '+' : ''}{tier.holderCountChange30d.toLocaleString()})
                        </span>
                      </strong>
                    </div>
                  </div>

                  <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
                    {tier.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 30-Day Shareholder Migration & Dynamic Shift (近 30 日股權遷移趨勢進度條) */}
        <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800/90 mb-4 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-rose-400" />
              <h4 className="text-xs font-bold text-slate-200">
                近 30 日股權遷移結構消長對照 (30-Day Shareholder Migration Progress)
              </h4>
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              大戶籌碼移轉: <span className={holderDist.netMajorLotDelta30d >= 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                {holderDist.netMajorLotDelta30d >= 0 ? '+' : ''}{holderDist.netMajorLotDelta30d.toLocaleString()} 張
              </span>
              <span className="mx-2 text-slate-600">|</span>
              散戶籌碼沉澱: <span className={holderDist.netRetailLotDelta30d <= 0 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                {holderDist.netRetailLotDelta30d >= 0 ? '+' : ''}{holderDist.netRetailLotDelta30d.toLocaleString()} 張
              </span>
            </div>
          </div>

          {/* Dual Stacked Progress Bars: 30 Days Ago vs Today */}
          <div className="space-y-3 font-mono text-xs">
            {/* 30 Days Ago */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>30 天前股權基準</span>
                <span>
                  大戶: {holderDist.tiers[0].ratio30dPrior}% · 中實: {holderDist.tiers[1].ratio30dPrior}% · 散戶: {holderDist.tiers[2].ratio30dPrior}%
                </span>
              </div>
              <div className="h-3.5 w-full bg-slate-900 rounded-md overflow-hidden flex">
                <div 
                  className="bg-rose-500/70 h-full transition-all duration-500" 
                  style={{ width: `${holderDist.tiers[0].ratio30dPrior}%` }} 
                  title={`主力大戶: ${holderDist.tiers[0].ratio30dPrior}%`}
                />
                <div 
                  className="bg-sky-500/70 h-full transition-all duration-500" 
                  style={{ width: `${holderDist.tiers[1].ratio30dPrior}%` }} 
                  title={`中實戶: ${holderDist.tiers[1].ratio30dPrior}%`}
                />
                <div 
                  className="bg-emerald-500/70 h-full transition-all duration-500" 
                  style={{ width: `${holderDist.tiers[2].ratio30dPrior}%` }} 
                  title={`散戶: ${holderDist.tiers[2].ratio30dPrior}%`}
                />
              </div>
            </div>

            {/* Today */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-200 font-bold mb-1">
                <span className="flex items-center text-amber-400">
                  <Sparkles className="w-3 h-3 mr-1 inline" />
                  今日最新股權結構 (大戶{holderDist.tiers[0].change30d >= 0 ? '增持' : '減碼'} {Math.abs(holderDist.tiers[0].change30d)}%)
                </span>
                <span>
                  大戶: <strong className="text-rose-400">{holderDist.tiers[0].ratio}%</strong> · 中實: <strong className="text-sky-400">{holderDist.tiers[1].ratio}%</strong> · 散戶: <strong className="text-emerald-400">{holderDist.tiers[2].ratio}%</strong>
                </span>
              </div>
              <div className="h-4 w-full bg-slate-900 rounded-md overflow-hidden flex shadow-inner">
                <div 
                  className="bg-rose-500 h-full transition-all duration-500 flex items-center justify-center text-[10px] font-bold text-white shadow-sm" 
                  style={{ width: `${holderDist.tiers[0].ratio}%` }} 
                  title={`主力大戶: ${holderDist.tiers[0].ratio}%`}
                >
                  {holderDist.tiers[0].ratio >= 25 ? `${holderDist.tiers[0].ratio}%` : ''}
                </div>
                <div 
                  className="bg-sky-500 h-full transition-all duration-500 flex items-center justify-center text-[10px] font-bold text-white shadow-sm" 
                  style={{ width: `${holderDist.tiers[1].ratio}%` }} 
                  title={`中實戶: ${holderDist.tiers[1].ratio}%`}
                >
                  {holderDist.tiers[1].ratio >= 15 ? `${holderDist.tiers[1].ratio}%` : ''}
                </div>
                <div 
                  className="bg-emerald-500 h-full transition-all duration-500 flex items-center justify-center text-[10px] font-bold text-white shadow-sm" 
                  style={{ width: `${holderDist.tiers[2].ratio}%` }} 
                  title={`散戶: ${holderDist.tiers[2].ratio}%`}
                >
                  {holderDist.tiers[2].ratio >= 15 ? `${holderDist.tiers[2].ratio}%` : ''}
                </div>
              </div>
            </div>
          </div>

          {/* 6-Milestone Timeline */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 mt-3 pt-3 border-t border-slate-800 text-[11px] font-mono">
            {holderDist.trendPoints.map((pt, idx) => (
              <div key={`milestone-${idx}`} className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 block text-[10px]">{pt.periodLabel}</span>
                <div className="flex items-baseline justify-between mt-0.5">
                  <span className="text-slate-400">大戶:</span>
                  <strong className="text-rose-400 font-bold">{pt.majorRatio}%</strong>
                </div>
                <div className="flex items-baseline justify-between text-[10px] text-slate-400">
                  <span>股價:</span>
                  <strong className="text-cyan-400">${pt.price}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Strategic Quant Diagnosis & Actionable Tactics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs leading-relaxed relative z-10">
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80">
            <div className="font-bold text-slate-200 mb-1.5 flex items-center">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-rose-400" />
              主力大戶籌碼沈澱與流向深度剖析
            </div>
            <p className="text-slate-400">
              {holderDist.diagnosis}
            </p>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80">
            <div className="font-bold text-slate-200 mb-1.5 flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
              三竹首席籌碼跟單與防守操盤指引
            </div>
            <p className="text-slate-400">
              {holderDist.tacticalAdvice}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION: 主力籌碼近 20 日累積熱力圖 (Major Chip Accumulation Heatmap) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/20 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-inner ${
              chipSummary.overallPhase === 'accumulating'
                ? 'bg-rose-600/25 border-rose-500/50 text-rose-400'
                : chipSummary.overallPhase === 'dumping'
                ? 'bg-emerald-600/25 border-emerald-500/50 text-emerald-400'
                : 'bg-amber-600/25 border-amber-500/50 text-amber-400'
            }`}>
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">
                  主力籌碼近 20 日累積熱力圖 (Major Chip Flow Heatmap)
                </h3>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${chipSummary.phaseBadgeClass}`}>
                  {chipSummary.phaseTitle}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                將近 20 日主力大戶買賣超轉化為即時色階，一眼洞察主力是在【佈局、盤整還是倒貨】
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <div className="bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-1.5">
              <span className="text-slate-400">20日囤貨:</span>
              <strong className={chipSummary.totalAccumulation >= 0 ? 'text-red-400' : 'text-emerald-400'}>
                {chipSummary.totalAccumulation >= 0 ? '+' : ''}{chipSummary.totalAccumulation.toLocaleString()} 張
              </strong>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-1.5">
              <span className="text-slate-400">近5日加速:</span>
              <strong className={chipSummary.accumulation5d >= 0 ? 'text-red-400' : 'text-emerald-400'}>
                {chipSummary.accumulation5d >= 0 ? '+' : ''}{chipSummary.accumulation5d.toLocaleString()} 張
              </strong>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-1.5">
              <span className="text-slate-400">主力均價:</span>
              <strong className="text-amber-400">${majorCost.toFixed(1)}</strong>
            </div>
          </div>
        </div>

        {/* 20-Day Heatmap Grid */}
        <div className="space-y-3 mt-2">
          {/* Tile Grid */}
          <div className="grid grid-cols-5 sm:grid-cols-10 lg:grid-cols-20 gap-1.5 sm:gap-2">
            {chipSummary.days.map((item, idx) => {
              const isSelected = activeDayIndex === idx;
              return (
                <button
                  key={idx}
                  onMouseEnter={() => setHoveredDayIndex(idx)}
                  onMouseLeave={() => setHoveredDayIndex(null)}
                  onClick={() => setSelectedDayIndex(idx)}
                  className={`flex flex-col items-center justify-between p-2 rounded-xl border transition-all duration-200 text-center relative group cursor-pointer ${item.bgClass} ${item.borderClass} ${
                    isSelected ? 'ring-2 ring-white scale-105 z-10 shadow-lg' : 'hover:scale-102 hover:border-slate-500'
                  }`}
                  title={`${item.date} (第 ${item.dayNumber} 日): ${item.statusLabel} ${item.netShares >= 0 ? '+' : ''}${item.netShares} 張`}
                >
                  <span className="text-[10px] font-mono opacity-80 text-slate-300">{item.date}</span>
                  <div className="my-1.5 flex flex-col items-center">
                    {item.intensity >= 3 ? (
                      <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                    ) : item.intensity >= 1 ? (
                      <TrendingUp className="w-3.5 h-3.5 text-red-400" />
                    ) : item.intensity <= -2 ? (
                      <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
                    ) : item.intensity <= -1 ? (
                      <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Minus className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span className="text-[11px] font-mono font-bold mt-0.5 leading-tight">
                      {Math.abs(item.netShares) >= 1000 
                        ? `${item.netShares > 0 ? '+' : ''}${(item.netShares / 1000).toFixed(1)}k`
                        : `${item.netShares > 0 ? '+' : ''}${item.netShares}`}
                    </span>
                  </div>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-black/40 font-medium whitespace-nowrap">
                    {item.statusLabel}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Interactive Inspection Probe / Detail Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-slate-300 font-bold flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                {inspectedDay.date} (第 {inspectedDay.dayNumber} 日)
                {inspectedDay.dayNumber === 20 ? ' · 今日最新' : ''}
              </span>
              <span className="text-slate-400">
                當日主力進出: <strong className={inspectedDay.textClass}>
                  {inspectedDay.netShares >= 0 ? '+' : ''}{inspectedDay.netShares.toLocaleString()} 張
                </strong>
              </span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${inspectedDay.bgClass} border ${inspectedDay.borderClass}`}>
                {inspectedDay.statusLabel}
              </span>
              <span className="text-slate-400">
                累計庫存水位: <strong className={inspectedDay.cumulativeShares >= 0 ? 'text-red-400' : 'text-emerald-400'}>
                  {inspectedDay.cumulativeShares >= 0 ? '+' : ''}{inspectedDay.cumulativeShares.toLocaleString()} 張
                </strong>
              </span>
            </div>

            <div className="text-[11px] text-slate-500 font-sans">
              （游標懸停或點選任一日色塊，可鎖定該日進出與累計水位）
            </div>
          </div>

          {/* Cumulative Inventory Trend Sparkline (20-Day Trajectory) */}
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center space-x-1.5">
                <Activity className="w-3 h-3 text-indigo-400" />
                <span>近 20 日主力累計鎖碼水位演進線 (累積庫存曲線)</span>
              </span>
              <span className="font-mono">
                起始: <strong className="text-slate-300">0 張</strong> ➔ 
                最新: <strong className={chipSummary.totalAccumulation >= 0 ? 'text-red-400' : 'text-emerald-400'}>
                  {chipSummary.totalAccumulation >= 0 ? '+' : ''}{chipSummary.totalAccumulation.toLocaleString()} 張
                </strong>
              </span>
            </div>

            {/* Sparkline SVG */}
            {(() => {
              const allCum = chipSummary.days.map((d) => d.cumulativeShares);
              const minCum = Math.min(...allCum, 0);
              const maxCum = Math.max(...allCum, 0);
              const cumRange = maxCum - minCum || 1;
              const getCumX = (idx: number) => 25 + (idx / 19) * 750;
              const getCumY = (val: number) => 8 + (1 - (val - minCum) / cumRange) * 32;
              const zeroY = getCumY(0);
              const linePoints = chipSummary.days.map((d, i) => `${getCumX(i)},${getCumY(d.cumulativeShares)}`).join(' ');
              const areaPoints = `${getCumX(0)},${zeroY} ${linePoints} ${getCumX(19)},${zeroY}`;
              const isPositiveNet = chipSummary.totalAccumulation >= 0;

              return (
                <svg viewBox="0 0 800 48" className="w-full h-12 overflow-visible select-none">
                  <defs>
                    <linearGradient id="cumSparkline" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={isPositiveNet ? '#f43f5e' : '#10b981'} stopOpacity="0.35" />
                      <stop offset="100%" stopColor={isPositiveNet ? '#f43f5e' : '#10b981'} stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Zero reference axis */}
                  <line
                    x1="25"
                    y1={zeroY}
                    x2="775"
                    y2={zeroY}
                    stroke="#475569"
                    strokeDasharray="3,3"
                    strokeWidth="1"
                    strokeOpacity="0.6"
                  />

                  {/* Fill polygon */}
                  <polygon points={areaPoints} fill="url(#cumSparkline)" />

                  {/* Trajectory Polyline */}
                  <polyline
                    fill="none"
                    stroke={isPositiveNet ? '#f43f5e' : '#10b981'}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={linePoints}
                  />

                  {/* Active day marker */}
                  <circle
                    cx={getCumX(activeDayIndex)}
                    cy={getCumY(inspectedDay.cumulativeShares)}
                    r="4"
                    fill="#ffffff"
                    stroke={isPositiveNet ? '#f43f5e' : '#10b981'}
                    strokeWidth="2"
                    className="animate-pulse"
                  />
                </svg>
              );
            })()}
          </div>

          {/* Heatmap Legend & Summary Statistics */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 text-xs text-slate-400">
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-slate-500 mr-1">圖例色階：</span>
              <span className="flex items-center px-1.5 py-0.5 rounded bg-rose-600/30 text-rose-300 border border-rose-500/50">
                🔥 強力佈局 (&gt;2千張)
              </span>
              <span className="flex items-center px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40">
                🔴 偏多吸籌
              </span>
              <span className="flex items-center px-1.5 py-0.5 rounded bg-red-500/10 text-red-200 border border-red-500/20">
                📕 溫和加碼
              </span>
              <span className="flex items-center px-1.5 py-0.5 rounded bg-slate-800/60 text-slate-400 border border-slate-700/60">
                ◽ 盤整換手
              </span>
              <span className="flex items-center px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                📗 調節減碼
              </span>
              <span className="flex items-center px-1.5 py-0.5 rounded bg-emerald-600/30 text-emerald-300 border border-emerald-500/50">
                🟩 主力倒貨 (&lt;-1.5千張)
              </span>
            </div>

            {/* Ratio counts */}
            <div className="flex items-center space-x-2 font-mono text-[11px]">
              <span className="text-red-400 font-bold">{chipSummary.accumulateDays} 買</span>
              <span>/</span>
              <span className="text-slate-400">{chipSummary.neutralDays} 平</span>
              <span>/</span>
              <span className="text-emerald-400 font-bold">{chipSummary.distributeDays} 賣</span>
              <span className="text-slate-500 pl-1 border-l border-slate-800">
                (偏多佈局佔比: {Math.round((chipSummary.accumulateDays / 20) * 100)}%)
              </span>
            </div>
          </div>

          {/* Smart Diagnosis Text */}
          <div className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 flex items-start space-x-2.5">
            <Info className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-100 font-semibold mr-1.5">主力意圖診斷：</strong>
              <span>{chipSummary.diagnosis}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: 三大法人與主力持倉變化歷史趨勢 (Institutional & Major Holdings Trends) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/20 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/25 border border-blue-500/50 flex items-center justify-center text-blue-400 shadow-inner">
              <LineChart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-slate-100">
                  三大法人與主力持倉變化歷史趨勢 (Institutional & Major Holdings Trends)
                </h3>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                  instTrends.concentrationTrend === 'rising'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                    : instTrends.concentrationTrend === 'falling'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  {instTrends.concentrationLabel}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                對照近 20 日股價走勢與法人大戶持倉消長，實時追蹤籌碼集中度變化與土洋多空力道
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <div className="bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-1.5">
              <span className="text-slate-400">土洋共識:</span>
              <strong className="text-slate-200">{instTrends.institutionalCohesion}</strong>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-1.5">
              <span className="text-slate-400">籌碼集中度:</span>
              <strong className="text-purple-400">{instTrends.latestConcentration}%</strong>
            </div>
            <div className="bg-slate-950/70 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-1.5">
              <span className="text-slate-400">外資20日:</span>
              <strong className={instTrends.foreignTotal20d >= 0 ? 'text-red-400' : 'text-emerald-400'}>
                {instTrends.foreignTotal20d >= 0 ? '+' : ''}{instTrends.foreignTotal20d.toLocaleString()} 張
              </strong>
            </div>
          </div>
        </div>

        {/* Dynamic HUD Indicator */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800 text-xs font-mono mb-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-300 font-bold flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
              {activeInstDay.date} (第 {activeInstDay.dayIndex} 日)
              {activeInstDay.dayIndex === 20 ? ' · 今日最新' : ''}
            </span>
            <span>
              股價: <strong className="text-cyan-400">${activeInstDay.price}</strong>
            </span>
            <span className="text-purple-400 flex items-center">
              <span className="w-2.5 h-0.5 bg-purple-400 mr-1 rounded" />
              籌碼集中度: <strong>{activeInstDay.concentrationRate}%</strong>
            </span>
            <span className="text-blue-400 flex items-center">
              <span className="w-2.5 h-0.5 bg-blue-400 mr-1 rounded" />
              外資累計: <strong>{activeInstDay.foreignCum >= 0 ? '+' : ''}{activeInstDay.foreignCum.toLocaleString()} 張</strong>
            </span>
            <span className="text-amber-400 flex items-center">
              <span className="w-2.5 h-0.5 bg-amber-400 mr-1 rounded" />
              投信累計: <strong>{activeInstDay.trustCum >= 0 ? '+' : ''}{activeInstDay.trustCum.toLocaleString()} 張</strong>
            </span>
            <span className="text-rose-400 flex items-center">
              <span className="w-2.5 h-0.5 bg-rose-400 mr-1 rounded" />
              主力累計: <strong>{activeInstDay.majorCum >= 0 ? '+' : ''}{activeInstDay.majorCum.toLocaleString()} 張</strong>
            </span>
          </div>

          <div className="text-[11px] text-slate-400">
            當日三大法人合計: <strong className={activeInstDay.totalNet >= 0 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
              {activeInstDay.totalNet >= 0 ? '+' : ''}{activeInstDay.totalNet.toLocaleString()} 張
            </strong>
          </div>
        </div>

        {/* Dual-Axis SVG Chart */}
        <div className="bg-slate-950/90 rounded-xl border border-slate-800 p-3 relative cursor-crosshair">
          {(() => {
            const svgW = 800;
            const topH = 120;
            const botH = 110;
            const totalH = topH + botH + 30;
            const pad = { top: 15, right: 55, bottom: 25, left: 55 };
            const cW = svgW - pad.left - pad.right;

            // Price & Concentration scale (Top half)
            const allP = instTrends.days.map((d) => d.price);
            const minP = Math.min(...allP) * 0.985;
            const maxP = Math.max(...allP) * 1.015;
            const rangeP = maxP - minP || 1;

            const allConc = instTrends.days.map((d) => d.concentrationRate);
            const minConc = Math.min(...allConc) * 0.95;
            const maxConc = Math.max(...allConc) * 1.05;
            const rangeConc = maxConc - minConc || 1;

            const getX = (i: number) => pad.left + (i / 19) * cW;
            const getPriceY = (val: number) => pad.top + (1 - (val - minP) / rangeP) * (topH - 25);
            const getConcY = (val: number) => pad.top + (1 - (val - minConc) / rangeConc) * (topH - 25);

            // Cumulative Holdings scale (Bottom half)
            const allCumHoldings = instTrends.days.flatMap((d) => [d.foreignCum, d.trustCum, d.majorCum]);
            const minHold = Math.min(...allCumHoldings);
            const maxHold = Math.max(...allCumHoldings);
            const rangeHold = maxHold - minHold || 1;

            const botTop = pad.top + topH + 10;
            const botChartH = botH - 20;
            const getHoldY = (val: number) => botTop + (1 - (val - minHold) / rangeHold) * botChartH;
            const zeroHoldY = getHoldY(0);

            // Max daily net for bars
            const maxNetBar = Math.max(...instTrends.days.map((d) => Math.abs(d.totalNet)), 500);

            const pricePoly = instTrends.days.map((d, i) => `${getX(i)},${getPriceY(d.price)}`).join(' ');
            const concPoly = instTrends.days.map((d, i) => `${getX(i)},${getConcY(d.concentrationRate)}`).join(' ');
            const foreignPoly = instTrends.days.map((d, i) => `${getX(i)},${getHoldY(d.foreignCum)}`).join(' ');
            const trustPoly = instTrends.days.map((d, i) => `${getX(i)},${getHoldY(d.trustCum)}`).join(' ');
            const majorPoly = instTrends.days.map((d, i) => `${getX(i)},${getHoldY(d.majorCum)}`).join(' ');

            return (
              <svg
                viewBox={`0 0 ${svgW} ${totalH}`}
                className="w-full h-72 select-none"
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const relX = (e.clientX - rect.left) / rect.width;
                  const svgX = relX * svgW;
                  const clampedX = Math.max(0, Math.min(cW, svgX - pad.left));
                  const idx = Math.round((clampedX / cW) * 19);
                  setHoveredInstDayIdx(idx);
                }}
                onMouseLeave={() => setHoveredInstDayIdx(null)}
              >
                <defs>
                  <linearGradient id="priceGradientInst" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* --- TOP HALF: 股價 vs 籌碼集中度 --- */}
                {/* Horizontal reference lines */}
                {[0, 0.5, 1].map((pct) => {
                  const y = pad.top + pct * (topH - 25);
                  const pLabel = (maxP - pct * rangeP).toFixed(1);
                  const cLabel = (maxConc - pct * rangeConc).toFixed(1);
                  return (
                    <g key={pct}>
                      <line x1={pad.left} y1={y} x2={svgW - pad.right} y2={y} stroke="#1e293b" strokeDasharray="3,3" />
                      <text x={pad.left - 6} y={y + 3} fill="#38bdf8" fontSize="9" textAnchor="end" fontFamily="monospace">
                        ${pLabel}
                      </text>
                      <text x={svgW - pad.right + 6} y={y + 3} fill="#c084fc" fontSize="9" textAnchor="start" fontFamily="monospace">
                        {cLabel}%
                      </text>
                    </g>
                  );
                })}

                {/* Sub-chart divider */}
                <line x1={pad.left} y1={pad.top + topH} x2={svgW - pad.right} y2={pad.top + topH} stroke="#334155" strokeWidth="1" />
                <text x={pad.left} y={pad.top + topH - 4} fill="#64748b" fontSize="9">
                  上圖：股價走勢 (左軸 $) vs 籌碼集中度 (右軸 %)
                </text>
                <text x={pad.left} y={botTop - 4} fill="#64748b" fontSize="9">
                  下圖：外資 (藍) · 投信 (金) · 主力 (紅) 累計持股消長 (張) + 單日買賣超柱狀
                </text>

                {/* Price Area Fill */}
                <polygon
                  points={`${getX(0)},${pad.top + topH - 25} ${pricePoly} ${getX(19)},${pad.top + topH - 25}`}
                  fill="url(#priceGradientInst)"
                />

                {/* Price Line (Cyan) */}
                <polyline fill="none" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" points={pricePoly} />

                {/* Chip Concentration Line (Purple) */}
                <polyline fill="none" stroke="#c084fc" strokeWidth="2" strokeDasharray="4,2" strokeLinecap="round" strokeLinejoin="round" points={concPoly} />

                {/* --- BOTTOM HALF: 法人與主力持倉累積消長 --- */}
                {/* Zero line */}
                <line x1={pad.left} y1={zeroHoldY} x2={svgW - pad.right} y2={zeroHoldY} stroke="#475569" strokeDasharray="3,3" strokeOpacity="0.5" />

                {/* Daily Total Institutional Net Flow Histogram Bars */}
                {instTrends.days.map((d, i) => {
                  const x = getX(i);
                  const barH = (Math.abs(d.totalNet) / maxNetBar) * 28;
                  const isBuy = d.totalNet >= 0;
                  const barY = isBuy ? zeroHoldY - barH : zeroHoldY;
                  return (
                    <rect
                      key={i}
                      x={x - 3}
                      y={barY}
                      width="6"
                      height={Math.max(2, barH)}
                      fill={isBuy ? '#ef4444' : '#10b981'}
                      opacity={i === hoveredInstDayIdx ? 1 : 0.65}
                      rx="1"
                    />
                  );
                })}

                {/* Foreign Cumulative Line (Blue) */}
                <polyline fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={foreignPoly} />

                {/* Trust Cumulative Line (Amber) */}
                <polyline fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={trustPoly} />

                {/* Major Smart Money Cumulative Line (Rose) */}
                <polyline fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={majorPoly} />

                {/* Timeline Date Labels */}
                {instTrends.days
                  .filter((_, i) => i % 4 === 0 || i === 19)
                  .map((d, idx) => {
                    const originalIdx = instTrends.days.indexOf(d);
                    return (
                      <text
                        key={idx}
                        x={getX(originalIdx)}
                        y={totalH - 6}
                        fill="#64748b"
                        fontSize="9"
                        textAnchor="middle"
                        fontFamily="monospace"
                      >
                        {d.date}
                      </text>
                    );
                  })}

                {/* Interactive Crosshair & Inspection Points */}
                {hoveredInstDayIdx !== null && (
                  <g>
                    <line
                      x1={getX(hoveredInstDayIdx)}
                      y1={pad.top}
                      x2={getX(hoveredInstDayIdx)}
                      y2={totalH - pad.bottom}
                      stroke="#f8fafc"
                      strokeWidth="1"
                      strokeDasharray="3,3"
                      opacity="0.8"
                    />
                    {/* Top markers */}
                    <circle cx={getX(hoveredInstDayIdx)} cy={getPriceY(activeInstDay.price)} r="4" fill="#38bdf8" stroke="#ffffff" strokeWidth="2" />
                    <circle cx={getX(hoveredInstDayIdx)} cy={getConcY(activeInstDay.concentrationRate)} r="3.5" fill="#c084fc" stroke="#ffffff" strokeWidth="1.5" />
                    {/* Bottom markers */}
                    <circle cx={getX(hoveredInstDayIdx)} cy={getHoldY(activeInstDay.majorCum)} r="4" fill="#f43f5e" stroke="#ffffff" strokeWidth="2" />
                    <circle cx={getX(hoveredInstDayIdx)} cy={getHoldY(activeInstDay.foreignCum)} r="3.5" fill="#3b82f6" />
                    <circle cx={getX(hoveredInstDayIdx)} cy={getHoldY(activeInstDay.trustCum)} r="3.5" fill="#f59e0b" />
                  </g>
                )}
              </svg>
            );
          })()}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <span className="flex items-center text-cyan-400">
              <span className="w-2.5 h-0.5 bg-cyan-400 mr-1 rounded" /> 股價 ($)
            </span>
            <span className="flex items-center text-purple-400">
              <span className="w-2.5 h-0.5 bg-purple-400 mr-1 rounded" /> 籌碼集中度 (%)
            </span>
            <span className="flex items-center text-blue-400">
              <span className="w-2.5 h-0.5 bg-blue-500 mr-1 rounded" /> 外資累計持股
            </span>
            <span className="flex items-center text-amber-400">
              <span className="w-2.5 h-0.5 bg-amber-500 mr-1 rounded" /> 投信累計買賣超
            </span>
            <span className="flex items-center text-rose-400 font-bold">
              <span className="w-2.5 h-0.5 bg-rose-500 mr-1 rounded" /> 主力大戶累計庫存
            </span>
            <span className="flex items-center text-slate-400">
              <span className="w-2 h-2 bg-red-500 mr-1 rounded-sm" /> 當日法人買超
              <span className="w-2 h-2 bg-emerald-500 ml-1.5 mr-1 rounded-sm" /> 當日法人賣超
            </span>
          </div>

          <div className="text-[11px] text-slate-500 font-sans">
            （游標滑動可實時對比該日股價與各法人持倉水庫）
          </div>
        </div>
      </div>

      {/* SECTION 4: 近期法人進出軌跡 (Three Institutional Investors) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center space-x-2.5">
            <Users className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold text-slate-100">
              近期三大法人進出軌跡 (Institutional Trajectory)
            </h3>
          </div>
          <div className="text-xs text-slate-400">
            外資持股比率: <strong className="font-mono text-slate-200">{foreignHoldingRatio}%</strong>
          </div>
        </div>

        {/* 3 Major Institutional Investors Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {/* 外資 */}
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-slate-400 font-semibold">外資 (FINI)</span>
              <span className={`text-[11px] font-bold px-1.5 py-0.2 rounded ${foreignStreak > 0 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                {foreignStreak > 0 ? `連 ${foreignStreak} 買` : `連 ${Math.abs(foreignStreak)} 賣`}
              </span>
            </div>
            <div className={`text-xl font-mono font-bold ${foreignNetBuy >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {foreignNetBuy >= 0 ? '+' : ''}{foreignNetBuy.toLocaleString()} <span className="text-xs text-slate-400 font-normal">張</span>
            </div>
          </div>

          {/* 投信 */}
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-slate-400 font-semibold">投信 (SITCA)</span>
              <span className={`text-[11px] font-bold px-1.5 py-0.2 rounded ${trustStreak > 0 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                {trustStreak > 0 ? `連 ${trustStreak} 買` : `連 ${Math.abs(trustStreak)} 賣`}
              </span>
            </div>
            <div className={`text-xl font-mono font-bold ${trustNetBuy >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {trustNetBuy >= 0 ? '+' : ''}{trustNetBuy.toLocaleString()} <span className="text-xs text-slate-400 font-normal">張</span>
            </div>
          </div>

          {/* 自營商 */}
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-slate-400 font-semibold">自營商 (Dealers)</span>
              <span className="text-[10px] text-slate-500 font-medium">短線避險與造市</span>
            </div>
            <div className={`text-xl font-mono font-bold ${dealerNetBuy >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {dealerNetBuy >= 0 ? '+' : ''}{dealerNetBuy.toLocaleString()} <span className="text-xs text-slate-400 font-normal">張</span>
            </div>
          </div>
        </div>

        {/* Institutional Daily Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                <th className="py-2 px-3 font-semibold">日期</th>
                <th className="py-2 px-3 font-semibold">外資買賣超</th>
                <th className="py-2 px-3 font-semibold">投信買賣超</th>
                <th className="py-2 px-3 font-semibold">自營商買賣超</th>
                <th className="py-2 px-3 font-semibold">三大法人合計</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {stock.institutionalHistory.map((day) => (
                <tr key={day.date} className="hover:bg-slate-800/30">
                  <td className="py-2 px-3 font-bold text-slate-300">{day.date}</td>
                  <td className={`py-2 px-3 ${day.foreign >= 0 ? 'text-red-400 font-bold' : 'text-emerald-400'}`}>
                    {day.foreign >= 0 ? '+' : ''}{day.foreign.toLocaleString()}
                  </td>
                  <td className={`py-2 px-3 ${day.trust >= 0 ? 'text-red-400 font-bold' : 'text-emerald-400'}`}>
                    {day.trust >= 0 ? '+' : ''}{day.trust.toLocaleString()}
                  </td>
                  <td className={`py-2 px-3 ${day.dealer >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {day.dealer >= 0 ? '+' : ''}{day.dealer.toLocaleString()}
                  </td>
                  <td className={`py-2 px-3 font-bold ${day.total >= 0 ? 'text-red-400 bg-red-950/20' : 'text-emerald-400 bg-emerald-950/20'}`}>
                    {day.total >= 0 ? '+' : ''}{day.total.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
