import React, { useState } from 'react';
import { 
  Sparkles, 
  Target, 
  ShieldAlert, 
  TrendingUp, 
  FileText, 
  Copy, 
  Check, 
  RefreshCw, 
  Send, 
  MessageSquare, 
  Compass, 
  Cpu,
  Layers,
  Printer
} from 'lucide-react';
import { StockData, AIInvestmentReport } from '../types/stock';

interface AIReportSectionProps {
  stock: StockData;
  report: AIInvestmentReport | null;
  isLoading: boolean;
  onGenerateReport: () => void;
  error?: string | null;
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
                Gemini 3.8 Flash
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              整合三竹大單籌碼、營收財報、股價位階評估、阿法貝塔與法人軌跡
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
        <div className="py-16 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center mx-auto animate-bounce shadow-xl">
            <Cpu className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-200">
              AI 首席投研大腦正在診斷 {stock.name} ({stock.symbol})...
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              正在交叉運算特大單買賣比、近20日主力囤貨均價、營收成長率、股價位階評估與法人連續進出軌跡...
            </p>
          </div>
        </div>
      ) : error ? (
        <div className="py-10 text-center space-y-3">
          <div className="text-red-400 text-sm font-semibold">生成報告發生問題：{error}</div>
          <button
            onClick={onGenerateReport}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all"
          >
            點此重試生成
          </button>
        </div>
      ) : !report ? (
        <div className="py-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-200">
              尚未產生 {stock.name} 投資分析報告
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              點擊下方按鈕，由 Gemini 3.8 Flash 為您自動統整三竹籌碼面、基本面與位階風險，產出專屬實戰策略！
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
                <div className="text-[10px] text-slate-500 mt-1">下檔買盤防守</div>
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
