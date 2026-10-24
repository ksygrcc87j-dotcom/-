import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Target, 
  ShieldAlert, 
  TrendingUp, 
  TrendingDown,
  FileText, 
  Copy, 
  Check, 
  RefreshCw, 
  Send, 
  MessageSquare, 
  Compass, 
  Cpu,
  Layers,
  Printer,
  Activity,
  AlertTriangle,
  Gauge,
  ArrowDownRight,
  ShieldCheck
} from 'lucide-react';
import { StockData, AIInvestmentReport } from '../types/stock';

interface AIReportSectionProps {
  stock: StockData;
  report: AIInvestmentReport | null;
  isLoading: boolean;
  onGenerateReport: () => void;
  error?: string | null;
}

type StressScenarioKey = '5pct' | '10pct';

interface StressTestResult {
  key: 'base' | '5pct' | '10pct';
  label: string;
  tag: string;
  sellRatioPct: number;
  extraSellLots: number;
  simulatedMajorNet: number;
  simulatedPowerRatio: number;
  estimatedPriceImpactPct: number;
  simulatedPrice: number;
  adjustedSupportPrice: number;
  supportShiftPct: number;
  adjustedStopLossPrice: number;
  riskCoefficient: number; // 0 - 100
  riskDelta: number;
  riskLevel: '低度風險' | '中度警戒' | '高度警戒' | '極端破線預警';
  bidBookMultiple: number; // 賣壓相當於五檔委買總量的幾倍
  breachMajorCost: boolean;
  breachMA20: boolean;
  breachMA60: boolean;
  defenseStatusText: string;
  tacticalAction: string;
}

export const AIReportSection: React.FC<AIReportSectionProps> = ({
  stock,
  report,
  isLoading,
  onGenerateReport,
  error,
}) => {
  const [copied, setCopied] = useState(false);
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [qaList, setQaList] = useState<{ q: string; a: string }[]>([]);
  const [selectedStressScenario, setSelectedStressScenario] = useState<StressScenarioKey>('5pct');

  // Compute quantitative Chip Stress Test (籌碼壓力測試：基準 vs 主力大舉賣超 5% vs 10%)
  const stressTest = useMemo(() => {
    const baseSupport = report?.supportPrice || stock.supportLevel || Number((stock.price * 0.94).toFixed(2));
    const baseStopLoss = report?.stopLossPrice || Number((baseSupport * 0.96).toFixed(2));

    const majorBuy = (stock.orderFlow?.superLargeBuy ?? 0) + (stock.orderFlow?.largeBuy ?? 0);
    const majorSell = (stock.orderFlow?.superLargeSell ?? 0) + (stock.orderFlow?.largeSell ?? 0);
    const baseMajorNet = (stock.orderFlow?.superLargeNet ?? 0) + (stock.orderFlow?.largeNet ?? 0) || (majorBuy - majorSell);
    const basePowerRatio = majorSell > 0 ? Number((majorBuy / majorSell).toFixed(2)) : majorBuy > 0 ? 1.85 : 1.0;

    const totalBidFiveVolume = Math.max(
      50,
      (stock.orderBook?.bids || []).reduce((acc, b) => acc + (b.volume || 0), 0)
    );

    // Base risk coefficient (0-100) derived from beta, valuation stage, concentration, and order flow
    const betaFactor = Math.min(25, Math.max(5, Math.round((stock.beta || 1.0) * 14)));
    const stageFactor = Math.round((stock.valuationScore || 50) * 0.28);
    const flowFactor = baseMajorNet < 0 ? 18 : basePowerRatio < 1.1 ? 12 : 6;
    const baseRisk = Math.min(72, Math.max(18, betaFactor + stageFactor + flowFactor));

    const buildScenario = (key: 'base' | '5pct' | '10pct', sellRatioPct: number): StressTestResult => {
      if (key === 'base') {
        const breachMajorCost = stock.price < stock.majorCost;
        const breachMA20 = stock.price < stock.ma20;
        const breachMA60 = stock.price < stock.ma60;
        const riskLevel =
          baseRisk >= 75
            ? '極端破線預警'
            : baseRisk >= 55
            ? '高度警戒'
            : baseRisk >= 38
            ? '中度警戒'
            : '低度風險';

        return {
          key: 'base',
          label: '目前收盤基準 (0%)',
          tag: '常態基準',
          sellRatioPct: 0,
          extraSellLots: 0,
          simulatedMajorNet: baseMajorNet,
          simulatedPowerRatio: basePowerRatio,
          estimatedPriceImpactPct: 0,
          simulatedPrice: stock.price,
          adjustedSupportPrice: Number(baseSupport.toFixed(2)),
          supportShiftPct: 0,
          adjustedStopLossPrice: Number(baseStopLoss.toFixed(2)),
          riskCoefficient: baseRisk,
          riskDelta: 0,
          riskLevel,
          bidBookMultiple: Number((Math.max(0, -baseMajorNet) / totalBidFiveVolume).toFixed(1)),
          breachMajorCost,
          breachMA20,
          breachMA60,
          defenseStatusText: breachMajorCost
            ? '現價低於主力成本線，防守以技術支撐位為主'
            : '守穩主力成本線與月線支撐之上',
          tacticalAction: '依原有支撐與停損紀律操作，留意盤後主力買賣超延續性。',
        };
      }

      // Additional major dump volume based on daily volume + 20D major holding pool
      const holdingPool = Math.max(stock.volume, Math.abs(stock.majorAccumulation) * 1.4);
      const extraSellLots = Math.max(
        Math.round(stock.volume * (sellRatioPct / 100)),
        Math.round(holdingPool * (sellRatioPct / 100) * 0.85)
      );
      const newMajorSell = majorSell + extraSellLots;
      const simulatedMajorNet = baseMajorNet - extraSellLots;
      const simulatedPowerRatio = Number((majorBuy / Math.max(1, newMajorSell)).toFixed(2));
      const bidBookMultiple = Number((extraSellLots / totalBidFiveVolume).toFixed(1));

      // Sensitivity based on Beta, liquidity缓冲, and concentration
      const betaMultiplier = Math.max(0.75, Math.min(1.65, stock.beta || 1.05));
      const liquidityPenalty = bidBookMultiple > 3.5 ? 1.18 : bidBookMultiple > 2.0 ? 1.08 : 0.96;
      const rawPriceDropPct = sellRatioPct * 0.62 * betaMultiplier * liquidityPenalty;
      const estimatedPriceImpactPct = -Number(Math.min(9.8, Math.max(1.8, rawPriceDropPct)).toFixed(2));
      const simulatedPrice = Number((stock.price * (1 + estimatedPriceImpactPct / 100)).toFixed(2));

      // Support shift analysis: if major dumps 5% or 10%, original first support weakens and shifts toward MA20 / MajorCost / MA60
      const supportDropFactor = sellRatioPct === 5 ? 0.032 * betaMultiplier : 0.068 * betaMultiplier;
      const rawAdjustedSupport = baseSupport * (1 - Math.min(0.085, supportDropFactor));
      // Anchor near key structural defense lines (MA60 or lower PE band) when 10% dump occurs
      const structuralFloor = sellRatioPct === 5
        ? Math.min(rawAdjustedSupport, Math.max(stock.ma20 * 0.985, stock.ma60 * 0.99))
        : Math.min(rawAdjustedSupport, stock.ma60 * 0.965);
      const adjustedSupportPrice = Number(Math.max(stock.price * 0.82, structuralFloor).toFixed(2));
      const supportShiftPct = Number((((adjustedSupportPrice - baseSupport) / baseSupport) * 100).toFixed(2));
      const adjustedStopLossPrice = Number((adjustedSupportPrice * 0.965).toFixed(2));

      const breachMajorCost = simulatedPrice < stock.majorCost;
      const breachMA20 = simulatedPrice < stock.ma20;
      const breachMA60 = simulatedPrice < stock.ma60;

      // Risk coefficient jump
      const baseJump = sellRatioPct === 5 ? 16 : 31;
      const breachPenalty = (breachMajorCost ? 5 : 0) + (breachMA20 ? 4 : 0) + (breachMA60 ? 6 : 0);
      const riskCoefficient = Math.min(98, Math.round(baseRisk + baseJump * betaMultiplier * 0.85 + breachPenalty));
      const riskDelta = riskCoefficient - baseRisk;

      const riskLevel: StressTestResult['riskLevel'] =
        riskCoefficient >= 80
          ? '極端破線預警'
          : riskCoefficient >= 62
          ? '高度警戒'
          : riskCoefficient >= 42
          ? '中度警戒'
          : '低度風險';

      const defenseStatusText = breachMA60
        ? `跌破月線 ($${stock.ma20.toFixed(1)}) 與季線 ($${stock.ma60.toFixed(1)})，支撐退守至 $${adjustedSupportPrice.toFixed(1)}`
        : breachMajorCost || breachMA20
        ? `貫破主力成本 ($${stock.majorCost.toFixed(1)}) 與月線，回測次級支撐 $${adjustedSupportPrice.toFixed(1)}`
        : `雖回檔測試 $${simulatedPrice.toFixed(1)}，但仍守於季線 ($${stock.ma60.toFixed(1)}) 防線之上`;

      const tacticalAction =
        sellRatioPct === 5
          ? breachMajorCost
            ? `若盤中大單淨賣超擴大達 ${extraSellLots.toLocaleString()} 張且失守主力成本 $${stock.majorCost.toFixed(1)}，建議先減碼 1/3 鎖住風險，靜待 $${adjustedSupportPrice.toFixed(1)} 止穩訊號。`
            : `主力調節 5% 情境下支撐下移至 $${adjustedSupportPrice.toFixed(1)}，可將防守停損收緊至 $${adjustedStopLossPrice.toFixed(1)}，未破月線前不追殺。`
          : `極端拋壓 (10% / 約 ${extraSellLots.toLocaleString()} 張) 將消耗五檔委買達 ${bidBookMultiple} 倍，引發流動性滑價並測試 $${adjustedSupportPrice.toFixed(1)} 強支撐；一旦放量跌破 $${baseSupport.toFixed(1)} 應立即執行停損或避險。`;

      return {
        key,
        label: sellRatioPct === 5 ? '主力大舉賣超 5%' : '主力大舉賣超 10%',
        tag: sellRatioPct === 5 ? '中度拋壓情境' : '極端倒貨情境',
        sellRatioPct,
        extraSellLots,
        simulatedMajorNet,
        simulatedPowerRatio,
        estimatedPriceImpactPct,
        simulatedPrice,
        adjustedSupportPrice,
        supportShiftPct,
        adjustedStopLossPrice,
        riskCoefficient,
        riskDelta,
        riskLevel,
        bidBookMultiple,
        breachMajorCost,
        breachMA20,
        breachMA60,
        defenseStatusText,
        tacticalAction,
      };
    };

    const base = buildScenario('base', 0);
    const s5 = buildScenario('5pct', 5);
    const s10 = buildScenario('10pct', 10);

    return {
      base,
      s5,
      s10,
      active: selectedStressScenario === '5pct' ? s5 : s10,
      totalBidFiveVolume,
    };
  }, [stock, report, selectedStressScenario]);

  const handleCopyReport = () => {
    if (!report) return;
    const text = `【三竹智投 AI 投資建議分析報告 - ${stock.name} (${stock.symbol})】
投資評等: ${report.rating} (信心度: ${report.confidenceLevel})
目標價位: $${report.targetPrice} | 支撐位: $${report.supportPrice} | 壓力位: $${report.resistancePrice} | 停損位: $${report.stopLossPrice}

【核心摘要】
${report.executiveSummary}

【籌碼面核心解析】
${report.chipAnalysis}

【基本面與營收財報解析】
${report.fundamentalAnalysis}

【股價位階與量化指標評估】
${report.technicalAndStageAnalysis}

【籌碼壓力測試 (主力賣超 5% / 10% 預警模擬)】
- 基準狀態: 支撐位 $${stressTest.base.adjustedSupportPrice} | 風險係數 ${stressTest.base.riskCoefficient}/100 (${stressTest.base.riskLevel})
- 主力大舉賣超 5% (約 ${stressTest.s5.extraSellLots.toLocaleString()} 張): 預估衝擊 ${stressTest.s5.estimatedPriceImpactPct}% -> 修正支撐位 $${stressTest.s5.adjustedSupportPrice} (${stressTest.s5.supportShiftPct}%) | 風險係數升至 ${stressTest.s5.riskCoefficient}/100 (+${stressTest.s5.riskDelta}, ${stressTest.s5.riskLevel})
- 主力大舉賣超 10% (約 ${stressTest.s10.extraSellLots.toLocaleString()} 張): 預估衝擊 ${stressTest.s10.estimatedPriceImpactPct}% -> 修正支撐位 $${stressTest.s10.adjustedSupportPrice} (${stressTest.s10.supportShiftPct}%) | 風險係數升至 ${stressTest.s10.riskCoefficient}/100 (+${stressTest.s10.riskDelta}, ${stressTest.s10.riskLevel})

【操作策略指引】
短線策略: ${report.shortTermStrategy}
中長線策略: ${report.mediumLongTermStrategy}

【風險警示】
${report.riskFactors.map((r, i) => `${i + 1}. ${r}`).join('\n')}
(由 Google Gemini 3.8 Flash 即時分析產出)`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleAskAnalyst = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isAsking) return;

    const userQ = question.trim();
    setQuestion('');
    setIsAsking(true);

    try {
      const res = await fetch('/api/ai/ask-analyst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock, question: userQ }),
      });
      const data = await res.json();
      if (data.success && data.answer) {
        setQaList((prev) => [...prev, { q: userQ, a: data.answer }]);
      } else {
        setQaList((prev) => [...prev, { q: userQ, a: '抱歉，分析師目前忙碌中，請稍後重試。' }]);
      }
    } catch {
      setQaList((prev) => [...prev, { q: userQ, a: '連線伺服器失敗，請確認網路連線。' }]);
    } finally {
      setIsAsking(false);
    }
  };

  // Color mapping for rating badge
  const getRatingBadgeClass = (rating: string = '') => {
    if (rating.includes('強力買進') || rating.includes('偏多')) {
      return 'bg-red-500/20 text-red-400 border-red-500/40 ring-2 ring-red-500/30';
    }
    if (rating.includes('調節') || rating.includes('避開') || rating.includes('賣出')) {
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 ring-2 ring-emerald-500/30';
    }
    return 'bg-amber-500/20 text-amber-300 border-amber-500/40 ring-2 ring-amber-500/30';
  };

  const getRiskBadgeStyle = (level: StressTestResult['riskLevel']) => {
    switch (level) {
      case '極端破線預警':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case '高度警戒':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case '中度警戒':
        return 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30';
      default:
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    }
  };

  // Render the Chip Stress Test Panel (籌碼壓力測試模組)
  const renderChipStressTestPanel = () => {
    const active = stressTest.active;
    const allScenarios = [stressTest.base, stressTest.s5, stressTest.s10];

    return (
      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Top bar & Scenario Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/90">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-100">
                  籌碼壓力測試 (Chip Stress Test)
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                  主力大舉賣超 5% / 10% 風險預警模擬
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                結合 Beta 波動敏感度 ({stock.beta.toFixed(2)})、五檔委買承接量 ({stressTest.totalBidFiveVolume} 張) 與主力成本線 ($
                {stock.majorCost.toFixed(1)})，模擬大戶倒貨時之支撐位移與風險係數變化
              </p>
            </div>
          </div>

          {/* Scenario Toggle Buttons */}
          <div className="flex items-center space-x-2 self-start lg:self-auto bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setSelectedStressScenario('5pct')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                selectedStressScenario === '5pct'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>模擬賣超 5% (中度拋壓)</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedStressScenario('10pct')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                selectedStressScenario === '10pct'
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>模擬賣超 10% (極端倒貨)</span>
            </button>
          </div>
        </div>

        {/* Highlight Cards for Active Stress Scenario */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {/* Card 1: Simulated Major Sell Volume & Power Ratio */}
          <div className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>模擬新增主力賣壓 ({active.sellRatioPct}%)</span>
              <span className="font-mono text-emerald-400 font-semibold">空方衝擊</span>
            </div>
            <div className="flex items-baseline space-x-2 mt-1.5">
              <span className="font-mono text-lg sm:text-xl font-black text-emerald-400">
                -{active.extraSellLots.toLocaleString()} 張
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                (五檔委買 {active.bidBookMultiple}x)
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">模擬籌碼多空比</span>
              <span className="font-mono font-bold text-emerald-400">
                {stressTest.base.simulatedPowerRatio.toFixed(2)}x → {active.simulatedPowerRatio.toFixed(2)}x
              </span>
            </div>
          </div>

          {/* Card 2: Dynamic Support Shift */}
          <div className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>壓力測試後支撐位變動</span>
              <span className="font-mono text-amber-400 font-semibold">{active.supportShiftPct}% 下移</span>
            </div>
            <div className="flex items-baseline space-x-2 mt-1.5">
              <span className="font-mono text-sm text-slate-500 line-through">
                ${stressTest.base.adjustedSupportPrice.toFixed(1)}
              </span>
              <span className="font-mono text-lg sm:text-xl font-black text-amber-300">
                ${active.adjustedSupportPrice.toFixed(1)}
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">動態修正停損位</span>
              <span className="font-mono font-bold text-slate-200">
                ${active.adjustedStopLossPrice.toFixed(1)}
              </span>
            </div>
          </div>

          {/* Card 3: Simulated Price Shock & Defense Line */}
          <div className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>模擬當日價格衝擊測算</span>
              <span className="font-mono text-emerald-400 font-semibold">{active.estimatedPriceImpactPct}%</span>
            </div>
            <div className="flex items-baseline space-x-2 mt-1.5">
              <span className="font-mono text-lg sm:text-xl font-black text-emerald-400">
                ${active.simulatedPrice.toFixed(2)}
              </span>
              <span className="text-[11px] text-slate-400">
                (現價 ${stock.price.toFixed(2)})
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-400">主力成本線 (${stock.majorCost.toFixed(1)})</span>
              <span
                className={`font-bold ${
                  active.breachMajorCost ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {active.breachMajorCost ? '⚠️ 跌破成本防線' : '✓ 守穩成本之上'}
              </span>
            </div>
          </div>

          {/* Card 4: Risk Coefficient & Warning Level */}
          <div className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>籌碼風險係數變動</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getRiskBadgeStyle(active.riskLevel)}`}>
                {active.riskLevel}
              </span>
            </div>
            <div className="flex items-baseline space-x-2 mt-1.5">
              <span className="font-mono text-lg sm:text-xl font-black text-slate-100">
                {active.riskCoefficient}
                <span className="text-xs text-slate-500 font-normal"> / 100</span>
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                (+{active.riskDelta} 風險值)
              </span>
            </div>
            {/* Risk Progress Bar */}
            <div className="mt-2.5">
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                <div
                  className="bg-blue-500/80 h-full transition-all"
                  style={{ width: `${stressTest.base.riskCoefficient}%` }}
                  title={`基準風險係數: ${stressTest.base.riskCoefficient}`}
                />
                <div
                  className={`${
                    active.sellRatioPct === 10 ? 'bg-emerald-400' : 'bg-amber-400'
                  } h-full transition-all`}
                  style={{ width: `${Math.max(0, active.riskDelta)}%` }}
                  title={`壓力測試新增風險: +${active.riskDelta}`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 3-Scenario Comparison Table (0% vs 5% vs 10%) */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-400 bg-slate-900/60">
                <th className="py-2.5 px-3 font-semibold">壓力測試情境</th>
                <th className="py-2.5 px-3 font-semibold text-right">模擬主力淨買賣</th>
                <th className="py-2.5 px-3 font-semibold text-right">籌碼多空比</th>
                <th className="py-2.5 px-3 font-semibold text-right">預估衝擊股價</th>
                <th className="py-2.5 px-3 font-semibold text-right">關鍵支撐位變動</th>
                <th className="py-2.5 px-3 font-semibold text-right">風險係數 (0-100)</th>
                <th className="py-2.5 px-3 font-semibold">防線狀態與預警診斷</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {allScenarios.map((row) => {
                const isSelected =
                  (row.key === '5pct' && selectedStressScenario === '5pct') ||
                  (row.key === '10pct' && selectedStressScenario === '10pct');
                return (
                  <tr
                    key={row.key}
                    onClick={() => {
                      if (row.key === '5pct' || row.key === '10pct') {
                        setSelectedStressScenario(row.key);
                      }
                    }}
                    className={`transition-colors ${
                      row.key !== 'base' ? 'cursor-pointer' : ''
                    } ${
                      isSelected
                        ? 'bg-emerald-950/20 hover:bg-emerald-950/30'
                        : 'hover:bg-slate-900/50'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-slate-200 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {row.key === 'base' ? (
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                        ) : (
                          <ArrowDownRight
                            className={`w-3.5 h-3.5 flex-shrink-0 ${
                              row.key === '10pct' ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          />
                        )}
                        <span>{row.label}</span>
                        {isSelected && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            檢視中
                          </span>
                        )}
                      </div>
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono font-semibold whitespace-nowrap ${
                        row.simulatedMajorNet >= 0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {row.simulatedMajorNet > 0 ? '+' : ''}
                      {row.simulatedMajorNet.toLocaleString()} 張
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono font-semibold whitespace-nowrap ${
                        row.simulatedPowerRatio >= 1.0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {row.simulatedPowerRatio.toFixed(2)}x
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">
                      <span className="font-bold text-slate-200">${row.simulatedPrice.toFixed(2)}</span>
                      {row.estimatedPriceImpactPct !== 0 && (
                        <span className="ml-1 text-[11px] text-emerald-400">
                          ({row.estimatedPriceImpactPct}%)
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">
                      <span className="font-bold text-amber-300">${row.adjustedSupportPrice.toFixed(1)}</span>
                      {row.supportShiftPct !== 0 && (
                        <span className="ml-1 text-[11px] text-slate-400">
                          ({row.supportShiftPct}%)
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap">
                      <span className="font-bold text-slate-100">{row.riskCoefficient}</span>
                      {row.riskDelta > 0 && (
                        <span className="ml-1 text-[11px] text-emerald-400 font-semibold">
                          (+{row.riskDelta})
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 min-w-[220px]">
                      <div className="flex items-center space-x-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap ${getRiskBadgeStyle(row.riskLevel)}`}>
                          {row.riskLevel}
                        </span>
                        <span className="text-[11px] text-slate-300">{row.defenseStatusText}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Actionable Stress Test Warning Banner */}
        <div className="mt-4 bg-slate-900/90 border border-emerald-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-2.5">
            <Activity className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed">
              <strong className="text-emerald-300">
                【{active.label}・風險預警應對方案】
              </strong>{' '}
              {active.tacticalAction}
            </div>
          </div>
          <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-400 flex-shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
            <span>月線: ${stock.ma20.toFixed(1)}</span>
            <span>|</span>
            <span>季線: ${stock.ma60.toFixed(1)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-100">
                AI 簡明投資建議分析報告
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                {report?.generatedBy || '三竹AI投研核心 (Gemini 3.8 Flash)'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              整合三竹大單籌碼、主力賣超壓力測試、營收財報、股價位階評估與法人軌跡
            </p>
          </div>
        </div>

        {report && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyReport}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已複製報告' : '複製報告'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="列印報告"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={onGenerateReport}
              disabled={isLoading}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 border border-blue-500/30 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>重新分析</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="space-y-6 mt-6">
          <div className="py-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center mx-auto animate-bounce shadow-xl">
              <Cpu className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-200">
                AI 首席投研大腦正在診斷 {stock.name} ({stock.symbol})...
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                正在交叉運算特大單買賣比、主力 5%/10% 壓力測試、近20日主力囤貨均價與法人連續進出軌跡...
              </p>
            </div>
          </div>
          {renderChipStressTestPanel()}
        </div>
      ) : error ? (
        <div className="space-y-6 mt-6">
          <div className="py-8 text-center space-y-3">
            <div className="text-red-400 text-sm font-semibold">生成報告發生問題：{error}</div>
            <button
              onClick={onGenerateReport}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all"
            >
              點此重試生成
            </button>
          </div>
          {renderChipStressTestPanel()}
        </div>
      ) : !report ? (
        <div className="space-y-6 mt-6">
          <div className="py-8 text-center space-y-4 bg-slate-950/50 border border-slate-800/80 rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-200">
                尚未產生 {stock.name} 完整 AI 投資分析報告
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                下方已為您即時運算出當日「籌碼壓力測試（主力賣超 5% / 10%）」支撐與風險係數；點擊按鈕即可結合 Gemini 3.8 Flash 產出完整投資建議！
              </p>
            </div>
            <button
              onClick={onGenerateReport}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/20 transition-all inline-flex items-center space-x-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>立即產出簡明投資報告</span>
            </button>
          </div>
          {renderChipStressTestPanel()}
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* Rating & Target Prices Row */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Rating Card */}
            <div className="lg:col-span-2 bg-slate-950/70 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="text-xs text-slate-400 font-semibold mb-1">AI 綜合投資評等</div>
                <div className="flex items-center space-x-3 mt-1">
                  <span className={`text-2xl font-black px-4 py-1.5 rounded-xl border ${getRatingBadgeClass(report.rating)}`}>
                    {report.rating}
                  </span>
                  <div className="text-xs text-slate-400">
                    <div>信心水準: <strong className="text-slate-200 font-bold">{report.confidenceLevel}</strong></div>
                    <div className="text-[11px] text-slate-500">模型權重計算完備</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-300 leading-relaxed font-medium">
                {report.executiveSummary}
              </div>
            </div>

            {/* Target & Defense Prices */}
            <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl flex flex-col justify-between">
                <div className="text-[11px] text-slate-400 font-semibold">預估波段目標價</div>
                <div className="font-mono text-xl font-black text-red-400 mt-1">${report.targetPrice.toFixed(1)}</div>
                <div className="text-[10px] text-slate-500 mt-1">向上潛在空間</div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl flex flex-col justify-between">
                <div className="text-[11px] text-slate-400 font-semibold">關鍵技術支撐位</div>
                <div className="font-mono text-xl font-black text-emerald-400 mt-1">${report.supportPrice.toFixed(1)}</div>
                <div className="text-[10px] text-slate-500 mt-1">
                  賣超5%下移至 ${stressTest.s5.adjustedSupportPrice.toFixed(1)}
                </div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl flex flex-col justify-between">
                <div className="text-[11px] text-slate-400 font-semibold">關鍵反壓挑戰位</div>
                <div className="font-mono text-xl font-black text-amber-400 mt-1">${report.resistancePrice.toFixed(1)}</div>
                <div className="text-[10px] text-slate-500 mt-1">前高套牢關卡</div>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl flex flex-col justify-between">
                <div className="text-[11px] text-slate-400 font-semibold">建議防守停損位</div>
                <div className="font-mono text-xl font-black text-slate-300 mt-1">${report.stopLossPrice.toFixed(1)}</div>
                <div className="text-[10px] text-slate-500 mt-1">破位嚴格離場</div>
              </div>
            </div>
          </div>

          {/* Chip Stress Test Module (籌碼壓力測試) */}
          {renderChipStressTestPanel()}

          {/* Detailed 3-Pillars Analysis Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Pillar 1: 籌碼面核心解析 */}
            <div className="bg-slate-950/60 border border-slate-800 p-4 sm:p-5 rounded-2xl">
              <div className="flex items-center space-x-2 text-blue-400 font-bold text-sm mb-2.5">
                <Layers className="w-4 h-4" />
                <span>三竹籌碼面核心解析</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {report.chipAnalysis}
              </p>
            </div>

            {/* Pillar 2: 基本面與財報營收 */}
            <div className="bg-slate-950/60 border border-slate-800 p-4 sm:p-5 rounded-2xl">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm mb-2.5">
                <TrendingUp className="w-4 h-4" />
                <span>基本面與營收財報解析</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {report.fundamentalAnalysis}
              </p>
            </div>

            {/* Pillar 3: 股價位階與技術指標 */}
            <div className="bg-slate-950/60 border border-slate-800 p-4 sm:p-5 rounded-2xl">
              <div className="flex items-center space-x-2 text-purple-400 font-bold text-sm mb-2.5">
                <Compass className="w-4 h-4" />
                <span>股價位階與量化指標</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {report.technicalAndStageAnalysis}
              </p>
            </div>
          </div>

          {/* Action Strategies: Short-term vs Medium/Long-term */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-950/60 border border-blue-900/40 p-4.5 rounded-2xl">
              <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <Target className="w-4 h-4" />
                <span>短線波段操作指引 (Short-term Tactics)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {report.shortTermStrategy}
              </p>
            </div>

            <div className="bg-slate-950/60 border border-indigo-900/40 p-4.5 rounded-2xl">
              <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                <TrendingUp className="w-4 h-4" />
                <span>中長線價值投資指引 (Medium & Long-term Strategy)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {report.mediumLongTermStrategy}
              </p>
            </div>
          </div>

          {/* Key Risk Warnings */}
          <div className="bg-amber-950/20 border border-amber-600/30 p-4 rounded-2xl">
            <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs mb-2">
              <ShieldAlert className="w-4 h-4" />
              <span>關鍵投資風險提醒 (Risk Warnings)</span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {report.riskFactors.map((risk, idx) => (
                <li key={idx} className="flex items-start space-x-2">
                  <span className="text-amber-500 font-bold">•</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Interactive AI Chat / Ask the Analyst Panel */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="flex items-center space-x-2 text-slate-200 font-bold text-sm mb-3">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              <span>與 AI 投研顧問直接對話</span>
              <span className="text-[11px] text-slate-500 font-normal">
                針對 {stock.name} 籌碼、位階或進出點位隨時發問
              </span>
            </div>

            {/* QA Log */}
            {qaList.length > 0 && (
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-1">
                {qaList.map((qa, i) => (
                  <div key={i} className="space-y-2 text-xs">
                    <div className="bg-blue-600/20 border border-blue-500/30 text-blue-200 p-2.5 rounded-xl ml-6">
                      <strong className="text-blue-300">問：</strong> {qa.q}
                    </div>
                    <div className="bg-slate-950/80 border border-slate-800 text-slate-300 p-3 rounded-xl mr-6 leading-relaxed">
                      <strong className="text-indigo-400">三竹顧問答：</strong> {qa.a}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAskAnalyst} className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={`對 ${stock.name} 的籌碼或位階有任何疑問？（例如：現在買進安全邊際高嗎？跌破成本線怎麼防守？）`}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={isAsking || !question.trim()}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isAsking ? '思考中...' : '送出'}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

