import React from 'react';
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
  Info
} from 'lucide-react';
import { StockData } from '../types/stock';

interface KeyMetricsGridProps {
  stock: StockData;
}

export const KeyMetricsGrid: React.FC<KeyMetricsGridProps> = ({ stock }) => {
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
