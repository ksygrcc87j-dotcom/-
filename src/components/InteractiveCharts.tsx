import React, { useState } from 'react';
import { 
  TrendingUp, 
  BarChart2, 
  Layers, 
  Activity, 
  GitCommit, 
  Sliders
} from 'lucide-react';
import { StockData, IntradayTick } from '../types/stock';

interface InteractiveChartsProps {
  stock: StockData;
  latestTick: IntradayTick | null;
}

export const InteractiveCharts: React.FC<InteractiveChartsProps> = ({ stock, latestTick }) => {
  const [activeTab, setActiveTab] = useState<'intraday' | 'orderFlow' | 'institutional' | 'peBand' | 'orderBook'>('intraday');

  const {
    price,
    yesterdayClose,
    highPrice,
    lowPrice,
    intradayTicks,
    orderFlow,
    institutionalHistory,
    peBands,
    orderBook,
  } = stock;

  // Intraday SVG dimensions
  const svgWidth = 800;
  const svgHeight = 260;
  const padding = { top: 20, right: 30, bottom: 30, left: 50 };
  const chartW = svgWidth - padding.left - padding.right;
  const chartH = svgHeight - padding.top - padding.bottom;

  // Min and max for Intraday scale
  const allPrices = intradayTicks.map((t) => t.price);
  const minPrice = Math.min(...allPrices, lowPrice, yesterdayClose * 0.985);
  const maxPrice = Math.max(...allPrices, highPrice, yesterdayClose * 1.015);
  const priceRange = maxPrice - minPrice || 1;

  // Coordinate mapper
  const getX = (idx: number) => padding.left + (idx / Math.max(1, intradayTicks.length - 1)) * chartW;
  const getY = (val: number) => padding.top + (1 - (val - minPrice) / priceRange) * chartH;

  const points = intradayTicks.map((t, idx) => `${getX(idx)},${getY(t.price)}`).join(' ');
  const areaPoints = `${getX(0)},${padding.top + chartH} ${points} ${getX(intradayTicks.length - 1)},${padding.top + chartH}`;

  const yesterdayY = getY(yesterdayClose);
  const isUp = price >= yesterdayClose;

  // Max volume for bottom sub-chart
  const maxVol = Math.max(...intradayTicks.map((t) => t.volume), 100);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Chart Nav Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 sm:px-6 py-3 bg-slate-950/60 overflow-x-auto">
        <div className="flex items-center space-x-1 sm:space-x-2 min-w-max">
          <button
            onClick={() => setActiveTab('intraday')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'intraday'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>分時即時走勢</span>
          </button>

          <button
            onClick={() => setActiveTab('orderFlow')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'orderFlow'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>大小單能量分布</span>
          </button>

          <button
            onClick={() => setActiveTab('institutional')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'institutional'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>法人進出軌跡圖</span>
          </button>

          <button
            onClick={() => setActiveTab('peBand')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'peBand'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>本益比河流圖</span>
          </button>

          <button
            onClick={() => setActiveTab('orderBook')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'orderBook'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <GitCommit className="w-3.5 h-3.5" />
            <span>五檔即時撮合</span>
          </button>
        </div>

        <div className="text-xs text-slate-400 hidden sm:flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono">即時數據連線中</span>
        </div>
      </div>

      {/* Chart Canvas Content */}
      <div className="p-4 sm:p-6">
        {/* TAB 1: 分時即時走勢圖 */}
        {activeTab === 'intraday' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <div className="flex items-center space-x-4">
                <span className="flex items-center">
                  <span className="w-3 h-0.5 bg-red-400 mr-1.5" /> 現價走勢
                </span>
                <span className="flex items-center">
                  <span className="w-3 h-0.5 border-t border-dashed border-slate-500 mr-1.5" /> 昨收平盤線 (${yesterdayClose})
                </span>
              </div>
              <div className="font-mono">
                最高: <span className="text-red-400 font-bold">${highPrice}</span> | 
                最低: <span className="text-emerald-400 font-bold ml-1">${lowPrice}</span>
              </div>
            </div>

            <div className="w-full overflow-hidden bg-slate-950/80 rounded-xl border border-slate-800 p-2">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-64 sm:h-72">
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isUp ? '#ef4444' : '#10b981'} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={isUp ? '#ef4444' : '#10b981'} stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal reference grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                  const y = padding.top + pct * chartH;
                  const priceLabel = (maxPrice - pct * priceRange).toFixed(1);
                  return (
                    <g key={pct}>
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={svgWidth - padding.right}
                        y2={y}
                        stroke="#1e293b"
                        strokeDasharray="3,3"
                      />
                      <text
                        x={padding.left - 6}
                        y={y + 4}
                        fill="#64748b"
                        fontSize="10"
                        textAnchor="end"
                        fontFamily="monospace"
                      >
                        {priceLabel}
                      </text>
                    </g>
                  );
                })}

                {/* Yesterday close reference line */}
                <line
                  x1={padding.left}
                  y1={yesterdayY}
                  x2={svgWidth - padding.right}
                  y2={yesterdayY}
                  stroke="#94a3b8"
                  strokeDasharray="4,4"
                  strokeWidth="1.2"
                />

                {/* Shaded Area */}
                <polygon points={areaPoints} fill="url(#priceGradient)" />

                {/* Price Line */}
                <polyline
                  fill="none"
                  stroke={isUp ? '#ef4444' : '#10b981'}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={points}
                />

                {/* Latest Tick Pulse Marker */}
                {intradayTicks.length > 0 && (
                  <g>
                    <circle
                      cx={getX(intradayTicks.length - 1)}
                      cy={getY(intradayTicks[intradayTicks.length - 1].price)}
                      r="4"
                      fill={isUp ? '#ef4444' : '#10b981'}
                      className="animate-ping"
                    />
                    <circle
                      cx={getX(intradayTicks.length - 1)}
                      cy={getY(intradayTicks[intradayTicks.length - 1].price)}
                      r="4"
                      fill="#ffffff"
                    />
                  </g>
                )}

                {/* Bottom Volume bars */}
                {intradayTicks.map((t, idx) => {
                  const x = getX(idx);
                  const barH = (t.volume / maxVol) * 45;
                  const barY = padding.top + chartH - barH;
                  const col = t.type === 'buy' ? '#ef4444' : t.type === 'sell' ? '#10b981' : '#64748b';
                  return (
                    <rect
                      key={idx}
                      x={x - 2}
                      y={barY}
                      width="4"
                      height={barH}
                      fill={col}
                      opacity="0.75"
                    />
                  );
                })}

                {/* Time Axis Labels */}
                <text x={padding.left} y={svgHeight - 8} fill="#64748b" fontSize="10" textAnchor="start">09:00</text>
                <text x={padding.left + chartW * 0.33} y={svgHeight - 8} fill="#64748b" fontSize="10" textAnchor="middle">10:30</text>
                <text x={padding.left + chartW * 0.66} y={svgHeight - 8} fill="#64748b" fontSize="10" textAnchor="middle">12:00</text>
                <text x={svgWidth - padding.right} y={svgHeight - 8} fill="#64748b" fontSize="10" textAnchor="end">13:30</text>
              </svg>
            </div>
          </div>
        )}

        {/* TAB 2: 大小單能量分布圖 */}
        {activeTab === 'orderFlow' && (
          <div className="space-y-6">
            <div className="text-xs text-slate-400">
              三竹專屬大小單多空力道矩陣：以委託筆數與撮合張數精準劃分「特大單、大單、中單、散單」意向。
            </div>

            <div className="space-y-4">
              {[
                { name: '特大單 (>50張 / >500萬)', buy: orderFlow.superLargeBuy, sell: orderFlow.superLargeSell, net: orderFlow.superLargeNet, tag: '主力核心手筆' },
                { name: '大單 (10~50張)', buy: orderFlow.largeBuy, sell: orderFlow.largeSell, net: orderFlow.largeNet, tag: '法人與大戶' },
                { name: '中單 (3~10張)', buy: orderFlow.mediumBuy, sell: orderFlow.mediumSell, net: orderFlow.mediumNet, tag: '中實戶與積極短線' },
                { name: '散單小單 (1~2張)', buy: orderFlow.smallBuy, sell: orderFlow.smallSell, net: orderFlow.smallNet, tag: '一般散戶小額' },
              ].map((row, idx) => {
                const total = row.buy + row.sell || 1;
                const buyPct = Number(((row.buy / total) * 100).toFixed(1));
                const sellPct = Number(((row.sell / total) * 100).toFixed(1));

                return (
                  <div key={idx} className="bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs mb-2 gap-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-200">{row.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {row.tag}
                        </span>
                      </div>
                      <div className="font-mono text-xs flex items-center space-x-3">
                        <span className="text-red-400">買進: {row.buy.toLocaleString()} 張</span>
                        <span className="text-emerald-400">賣出: {row.sell.toLocaleString()} 張</span>
                        <span className={`font-bold ${row.net >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                          差額: {row.net >= 0 ? '+' : ''}{row.net.toLocaleString()} 張
                        </span>
                      </div>
                    </div>

                    {/* Dual bar for Buy vs Sell */}
                    <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
                      <div
                        className="bg-red-500 flex items-center justify-start pl-2 text-[10px] font-bold text-white transition-all duration-500"
                        style={{ width: `${buyPct}%` }}
                      >
                        {buyPct > 15 ? `${buyPct}%` : ''}
                      </div>
                      <div
                        className="bg-emerald-500 flex items-center justify-end pr-2 text-[10px] font-bold text-white transition-all duration-500"
                        style={{ width: `${sellPct}%` }}
                      >
                        {sellPct > 15 ? `${sellPct}%` : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: 法人進出軌跡柱狀圖 */}
        {activeTab === 'institutional' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>近期 10 日三大法人買賣超柱狀圖 (外資 + 投信 + 自營商)</span>
              <div className="flex items-center space-x-3 text-[11px]">
                <span className="flex items-center"><span className="w-2.5 h-2.5 rounded bg-blue-500 mr-1" /> 外資</span>
                <span className="flex items-center"><span className="w-2.5 h-2.5 rounded bg-amber-500 mr-1" /> 投信</span>
                <span className="flex items-center"><span className="w-2.5 h-2.5 rounded bg-purple-500 mr-1" /> 自營商</span>
              </div>
            </div>

            <div className="h-64 flex items-end justify-between gap-2 pt-6 pb-2 px-4 bg-slate-950/80 rounded-xl border border-slate-800">
              {institutionalHistory.map((item, idx) => {
                const maxVal = 15000;
                const totalH = Math.min(100, Math.max(10, (Math.abs(item.total) / maxVal) * 90));
                const isNetBuy = item.total >= 0;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] p-1.5 rounded pointer-events-none whitespace-nowrap z-20 shadow-lg border border-slate-700">
                      <div>合計: {item.total >= 0 ? '+' : ''}{item.total} 張</div>
                      <div>外資: {item.foreign} | 投信: {item.trust}</div>
                    </div>

                    <div
                      className={`w-full max-w-[28px] rounded-t-sm transition-all duration-300 ${
                        isNetBuy ? 'bg-gradient-to-t from-red-600 to-red-400' : 'bg-gradient-to-t from-emerald-600 to-emerald-400'
                      }`}
                      style={{ height: `${totalH}%` }}
                    />
                    <span className="text-[10px] font-mono text-slate-400 mt-2">{item.date}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: 本益比河流圖 */}
        {activeTab === 'peBand' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>歷史本益比河流圖 (P/E River Bands)</span>
              <span className="text-slate-300">目前本益比: <strong className="text-amber-400 font-mono">{stock.pe} 倍</strong></span>
            </div>

            <div className="bg-slate-950/80 p-5 rounded-xl border border-slate-800 space-y-3">
              {[
                { label: '32x 本益比天花板 (極昂貴)', price: peBands.pe32, color: 'bg-red-500/20 text-red-300 border-red-500/30' },
                { label: '28x 本益比高估區 (獲利了結)', price: peBands.pe28, color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
                { label: '24x 本益比合理偏高', price: peBands.pe24, color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
                { label: '20x 本益比合理估值中軸', price: peBands.pe20, color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
                { label: '16x 本益比安全邊際區 (嚴重低估)', price: peBands.pe16, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
              ].map((band, idx) => {
                const isCurrentInside = price >= (band.price * 0.92) && (idx === 0 || price < (band.price * 1.08));
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-xl border ${band.color} ${
                      isCurrentInside ? 'ring-2 ring-white/50 shadow-md' : 'opacity-85'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold">{band.label}</span>
                      {isCurrentInside && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-slate-950 font-black animate-pulse">
                          現價位階落在本區間
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-sm font-bold">${band.price.toFixed(1)} 元</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: 五檔即時報價 */}
        {activeTab === 'orderBook' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>三竹即時五檔委託買賣盤深</span>
              <div className="font-mono">
                外盤量: <span className="text-red-400 font-bold">{orderBook.outerVolume.toLocaleString()}</span> (
                {((orderBook.outerVolume / (orderBook.outerVolume + orderBook.innerVolume)) * 100).toFixed(1)}%) | 
                內盤量: <span className="text-emerald-400 font-bold ml-1">{orderBook.innerVolume.toLocaleString()}</span>
              </div>
            </div>

            {/* Inner / Outer Bar */}
            <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
              <div
                className="bg-red-500 transition-all duration-300"
                style={{
                  width: `${(orderBook.outerVolume / (orderBook.outerVolume + orderBook.innerVolume)) * 100}%`,
                }}
              />
              <div
                className="bg-emerald-500 transition-all duration-300"
                style={{
                  width: `${(orderBook.innerVolume / (orderBook.outerVolume + orderBook.innerVolume)) * 100}%`,
                }}
              />
            </div>

            {/* Bid / Ask Table */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              {/* Bids 買盤 */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <div className="text-slate-400 font-bold mb-2 flex justify-between">
                  <span>買盤委託</span>
                  <span>掛單量 (張)</span>
                </div>
                <div className="space-y-1.5">
                  {orderBook.bids.map((b, i) => (
                    <div key={i} className="flex justify-between items-center text-red-400">
                      <span>買{i + 1}: ${b.price.toFixed(1)}</span>
                      <span className="font-bold text-slate-200">{b.volume}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Asks 賣盤 */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <div className="text-slate-400 font-bold mb-2 flex justify-between">
                  <span>賣盤委託</span>
                  <span>掛單量 (張)</span>
                </div>
                <div className="space-y-1.5">
                  {orderBook.asks.map((a, i) => (
                    <div key={i} className="flex justify-between items-center text-emerald-400">
                      <span>賣{i + 1}: ${a.price.toFixed(1)}</span>
                      <span className="font-bold text-slate-200">{a.volume}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
