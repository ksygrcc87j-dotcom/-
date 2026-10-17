export interface OrderFlowBreakdown {
  superLargeBuy: number;    // 特大單買進 (張)
  superLargeSell: number;   // 特大單賣出 (張)
  superLargeNet: number;    // 特大單買賣超 (張)
  largeBuy: number;         // 大單買進 (張)
  largeSell: number;        // 大單賣出 (張)
  largeNet: number;         // 大單買賣超 (張)
  mediumBuy: number;        // 中單買進 (張)
  mediumSell: number;       // 中單賣出 (張)
  mediumNet: number;        // 中單買賣超 (張)
  smallBuy: number;         // 散單小單買進 (張)
  smallSell: number;        // 散單小單賣出 (張)
  smallNet: number;         // 散單小單買賣超 (張)
}

export interface QuarterlyEPS {
  quarter: string;
  eps: number;
  yoy: number;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number; // 億元
  yoy: number;     // %
  mom: number;     // %
}

export interface InstitutionalDay {
  date: string;
  foreign: number;    // 外資買賣超 (張)
  trust: number;      // 投信買賣超 (張)
  dealer: number;     // 自營商買賣超 (張)
  total: number;      // 合計買賣超 (張)
}

export interface IntradayTick {
  time: string;
  price: number;
  volume: number;
  type: 'buy' | 'sell' | 'neutral';
  orderSizeCategory?: 'superLarge' | 'large' | 'medium' | 'small';
}

export interface OrderBookEntry {
  price: number;
  volume: number;
}

export interface OrderBook {
  bids: OrderBookEntry[]; // 買盤 五檔
  asks: OrderBookEntry[]; // 賣盤 五檔
  outerVolume: number;    // 外盤量 (張)
  innerVolume: number;    // 內盤量 (張)
}

export interface StockMasterItem {
  symbol: string;
  name: string;
  industry: string;
  market: '上市' | '上櫃';
  price: number;
  yesterdayClose: number;
  change: number;
  changePercent: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  categoryTag?: string;
}

export interface StockData {
  symbol: string;             // 股票代號 (例: 2330)
  name: string;               // 股票名稱 (例: 台積電)
  market: '上市' | '上櫃' | '興櫃';
  industry: string;           // 產業類別 (例: 半導體業)
  marginTrading?: string;     // 交易與現沖註記 (例: 上市-其他電子-買賣現沖)
  categoryTags?: string[];    // 三竹智選股特徵標籤 (例: ['AI伺服器', '外資連買', '月營收高'])
  estimatedVolume?: number;   // 預估量 (張)
  volumeRatio?: number;       // 估量比 (例: 0.78)
  price: number;              // 現價 / 當日收盤價
  change: number;             // 漲跌
  changePercent: number;      // 漲跌幅 %
  openPrice: number;          // 開盤價
  highPrice: number;          // 最高價
  lowPrice: number;           // 最低價
  yesterdayClose: number;     // 昨收價
  volume: number;             // 總成交量 (張)
  totalAmount: number;        // 成交金額 (億元)
  
  // 籌碼：大小單
  orderFlow: OrderFlowBreakdown;
  largeOrderBuyRatio: number;   // 大單買進比例 %
  largeOrderSellRatio: number;  // 大單賣出比例 %
  smallOrderBuyRatio: number;   // 散單買進比例 %
  smallOrderSellRatio: number;  // 散單賣出比例 %
  majorConcentration: number;   // 主力籌碼集中度 %

  // 基本面與財務
  bookValue: number;          // 每股淨值 (元)
  pb: number;                 // 股價淨值比 (P/B)
  eps: number;                // 近四季累計每股盈餘 (元)
  pe: number;                 // 本益比 (P/E)
  epsQuarterly: QuarterlyEPS[];
  peBands: {
    pe16: number;
    pe20: number;
    pe24: number;
    pe28: number;
    pe32: number;
  };
  
  // 營收表現
  revenueCurrent: number;     // 最新單月營收 (億元)
  revenueMonth: string;       // 最新營收月份 (例: 2026/09)
  revenueMoM: number;         // 營收月增率 %
  revenueYoY: number;         // 營收年增率 %
  revenueHistory: MonthlyRevenue[];

  // 股價位階評估
  valuationScore: number;     // 0 ~ 100 位階分數
  stageLabel: string;         // '低檔築底' | '初升起漲' | '主升強勢' | '高檔震盪' | '歷史高估過熱'
  stageAssessment: string;    // 位階文字評估詳情
  supportLevel: number;       // 技術支撐位
  resistanceLevel: number;    // 技術壓力位
  ma5: number;
  ma20: number;
  ma60: number;

  // 專業指標
  alpha: number;              // 阿法值 % (超額報酬)
  beta: number;               // 貝塔值 (波動敏感度)
  majorAccumulation: number;  // 近20日主力囤貨張數
  majorAccumulation5d: number;// 近5日主力囤貨張數
  majorCost: number;          // 主力均價 (成本線 元)
  turnoverRate: number;       // 當日周轉率 %
  turnoverRate5dAvg: number;  // 5日平均周轉率 %

  // 近期法人進出軌跡
  foreignNetBuy: number;      // 外資今日買賣超 (張)
  foreignStreak: number;      // 外資連續天數 (+買 / -賣)
  trustNetBuy: number;        // 投信今日買賣超 (張)
  trustStreak: number;        // 投信連續天數
  dealerNetBuy: number;       // 自營商今日買賣超 (張)
  dealerStreak: number;
  foreignHoldingRatio: number;// 外資持股比例 %
  institutionalHistory: InstitutionalDay[]; // 近10日法人明細

  // 即時走勢與五檔
  intradayTicks: IntradayTick[];
  orderBook: OrderBook;
  lastUpdated: string;
}

export type AlertType = 
  | 'price_above' 
  | 'price_below' 
  | 'change_percent_above' 
  | 'change_percent_below' 
  | 'super_large_order' 
  | 'turnover_above';

export interface AlertRule {
  id: string;
  symbol: string;
  stockName: string;
  type: AlertType;
  targetValue: number;
  note: string;
  enabled: boolean;
  triggerCount: number;
  lastTriggeredAt?: string;
}

export interface TriggeredAlert {
  id: string;
  timestamp: string;
  symbol: string;
  stockName: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'danger' | 'success';
}

export interface AIInvestmentReport {
  rating: string;
  ratingTone: 'bullish' | 'neutral' | 'bearish';
  confidenceLevel: string;
  targetPrice: number;
  supportPrice: number;
  resistancePrice: number;
  stopLossPrice: number;
  executiveSummary: string;
  chipAnalysis: string;
  fundamentalAnalysis: string;
  technicalAndStageAnalysis: string;
  shortTermStrategy: string;
  mediumLongTermStrategy: string;
  riskFactors: string[];
  generatedBy?: string;
  isRealtimeGenerated?: boolean;
}
