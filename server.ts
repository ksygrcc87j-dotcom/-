import express, { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Initialize Google GenAI on server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Comprehensive Taiwan stock name to symbol dictionary (146+ stocks and 320+ aliases)
import TAIWAN_STOCK_MAP_JSON from './src/data/taiwanStockMap.json';
const TAIWAN_STOCK_MAP: Record<string, string> = TAIWAN_STOCK_MAP_JSON as Record<string, string>;

// Helper: Query TWSE / TPEx official MIS endpoint
async function queryTWSEQuote(symbol: string) {
  try {
    // Try TSE first
    let url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_${symbol}.tw&json=1&delay=0`;
    let res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    let data = (await res.json()) as any;
    let item = data?.msgArray?.find((x: any) => x.c === symbol);

    // If not in TSE, try OTC (TPEx)
    if (!item) {
      url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=otc_${symbol}.tw&json=1&delay=0`;
      res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
      data = (await res.json()) as any;
      item = data?.msgArray?.find((x: any) => x.c === symbol);
    }

    if (item && item.y) {
      const yesterdayClose = Number(item.y);
      const price = Number(item.z && item.z !== '-' ? item.z : item.y);
      const openPrice = Number(item.o && item.o !== '-' ? item.o : price);
      const highPrice = Number(item.h && item.h !== '-' ? item.h : Math.max(price, openPrice));
      const lowPrice = Number(item.l && item.l !== '-' ? item.l : Math.min(price, openPrice));
      const change = Number((price - yesterdayClose).toFixed(2));
      const changePercent = Number(((change / yesterdayClose) * 100).toFixed(2));
      const volume = Number(item.v) || 1000;

      // Parse 5-level bids & asks
      const bidPrices = (item.b || '').split('_').filter(Boolean).map(Number);
      const bidVolumes = (item.g || '').split('_').filter(Boolean).map(Number);
      const askPrices = (item.a || '').split('_').filter(Boolean).map(Number);
      const askVolumes = (item.f || '').split('_').filter(Boolean).map(Number);

      const bids = bidPrices.slice(0, 5).map((p: number, idx: number) => ({
        price: p,
        volume: bidVolumes[idx] || Math.floor(Math.random() * 200 + 50),
      }));

      const asks = askPrices.slice(0, 5).map((p: number, idx: number) => ({
        price: p,
        volume: askVolumes[idx] || Math.floor(Math.random() * 200 + 50),
      }));

      return {
        symbol: item.c,
        name: item.n,
        market: item.ex === 'otc' ? '上櫃' : '上市',
        price,
        yesterdayClose,
        change,
        changePercent,
        openPrice,
        highPrice,
        lowPrice,
        volume,
        bids,
        asks,
        lastUpdated: item.t || '13:30:00',
      };
    }
  } catch (err) {
    console.warn(`TWSE query failed for ${symbol}:`, err);
  }
  return null;
}

// In-memory quote cache
let allQuotesCache: { timestamp: number; data: any[] } | null = null;
const CACHE_TTL_MS = 15000; // 15 seconds

// Helper: Query all 2,350+ master stocks from official TWSE and TPEx OpenAPIs in parallel
async function fetchAllMasterQuotes(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && allQuotesCache && (now - allQuotesCache.timestamp < CACHE_TTL_MS)) {
    return allQuotesCache.data;
  }

  try {
    const [twseRes, tpexRes] = await Promise.all([
      fetch('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL', { headers: { 'User-Agent': 'Mozilla/5.0' } }),
      fetch('https://www.tpex.org.tw/openapi/v1/tpex_mainboard_quotes', { headers: { 'User-Agent': 'Mozilla/5.0' } })
    ]);

    const twseData = await twseRes.json() as any[];
    const tpexData = await tpexRes.json() as any[];
    const results: any[] = [];
    const seen = new Set<string>();

    for (const s of twseData) {
      const symbol = s.Code?.trim();
      const price = parseFloat(s.ClosingPrice);
      if (!symbol || isNaN(price) || price <= 0 || seen.has(symbol)) continue;
      seen.add(symbol);

      const change = parseFloat(s.Change) || 0;
      const yesterdayClose = Number((price - change).toFixed(2)) || price;
      const changePercent = yesterdayClose > 0 ? Number(((change / yesterdayClose) * 100).toFixed(2)) : 0;
      const openPrice = parseFloat(s.OpeningPrice) || price;
      const highPrice = parseFloat(s.HighestPrice) || Math.max(price, openPrice);
      const lowPrice = parseFloat(s.LowestPrice) || Math.min(price, openPrice);
      const volume = Math.round((parseInt(s.TradeVolume, 10) || 0) / 1000);

      results.push({
        symbol,
        name: s.Name?.trim(),
        market: '上市',
        price,
        yesterdayClose,
        change,
        changePercent,
        openPrice,
        highPrice,
        lowPrice,
        volume,
        lastUpdated: '13:30:00',
      });
    }

    for (const s of tpexData) {
      const symbol = s.SecuritiesCompanyCode?.trim();
      const price = parseFloat(s.Close);
      if (!symbol || isNaN(price) || price <= 0 || seen.has(symbol)) continue;
      seen.add(symbol);

      const change = parseFloat(s.Change) || 0;
      const yesterdayClose = Number((price - change).toFixed(2)) || price;
      const changePercent = yesterdayClose > 0 ? Number(((change / yesterdayClose) * 100).toFixed(2)) : 0;
      const openPrice = parseFloat(s.Open) || price;
      const highPrice = parseFloat(s.High) || Math.max(price, openPrice);
      const lowPrice = parseFloat(s.Low) || Math.min(price, openPrice);
      const volume = Math.round((parseInt(s.TradingShares, 10) || 0) / 1000);

      results.push({
        symbol,
        name: s.CompanyName?.trim(),
        market: '上櫃',
        price,
        yesterdayClose,
        change,
        changePercent,
        openPrice,
        highPrice,
        lowPrice,
        volume,
        lastUpdated: '13:30:00',
      });
    }

    if (results.length > 0) {
      allQuotesCache = { timestamp: now, data: results };
      return results;
    }
  } catch (err) {
    console.warn('Failed to fetch full OpenAPI quotes, using cache/fallback:', err);
  }

  // Fallback to local master database
  const { TAIWAN_STOCK_MASTER } = await import('./src/data/taiwanStockMaster');
  return allQuotesCache?.data || TAIWAN_STOCK_MASTER;
}

// Endpoint: Live Official Stock Quote (Taiwan Exchange Real-time & Closing Data)
app.get('/api/stock/quote', async (req: Request, res: Response) => {
  try {
    const rawQuery = String(req.query.symbol || req.query.query || '').trim();
    if (!rawQuery) {
      return res.status(400).json({ error: 'Missing stock query' });
    }

    // Resolve query to stock symbol
    let symbol = rawQuery.toUpperCase();
    if (TAIWAN_STOCK_MAP[rawQuery]) {
      symbol = TAIWAN_STOCK_MAP[rawQuery];
    } else {
      for (const [k, v] of Object.entries(TAIWAN_STOCK_MAP)) {
        if (rawQuery.includes(k) || k.includes(rawQuery)) {
          symbol = v;
          break;
        }
      }
    }

    const twseData = await queryTWSEQuote(symbol);
    return res.json({
      success: true,
      data: twseData,
    });
  } catch (err: any) {
    console.error('Error in /api/stock/quote:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Endpoint: Batch Stock Quotes for Watchlist & Comparison
app.get('/api/stock/batch-quotes', async (req: Request, res: Response) => {
  try {
    const rawSymbols = String(req.query.symbols || '').trim();
    if (!rawSymbols) {
      return res.json({ success: true, data: [] });
    }

    const symbols = rawSymbols.split(',').map((s) => s.trim()).filter(Boolean);
    const results = await Promise.all(symbols.map((sym) => queryTWSEQuote(sym)));

    return res.json({
      success: true,
      data: results.filter(Boolean),
    });
  } catch (err: any) {
    console.error('Error in /api/stock/batch-quotes:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Endpoint: ALL Taiwan Stocks Live Real-Time & Closing Quotes (Full Market Sync)
app.get('/api/stock/all-quotes', async (req: Request, res: Response) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const quotes = await fetchAllMasterQuotes(forceRefresh);
    return res.json({
      success: true,
      count: quotes.length,
      data: quotes,
      lastUpdated: new Date().toLocaleTimeString('zh-TW', { hour12: false }),
    });
  } catch (err: any) {
    console.error('Error in /api/stock/all-quotes:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Endpoint: AI Investment Analysis Report
app.post('/api/ai/analyze-stock', async (req: Request, res: Response) => {
  try {
    const stock = req.body;
    if (!stock || !stock.name) {
      return res.status(400).json({ error: 'Missing stock data' });
    }

    const prompt = `你是一位資深的台股專業投研主管與三竹籌碼分析大師，請根據以下提供的最新台股即時行情、大單小單籌碼、基本面財報、營收、評價位階及三大法人動向，為投資人產出一份嚴謹、精準且具實戰指導意義的「簡明投資建議分析報告」。

【個股即時數據】
- 股票名稱與代號: ${stock.name} (${stock.symbol})
- 現價: ${stock.price} 元 (漲跌: ${stock.change >= 0 ? '+' : ''}${stock.change} 元 / ${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent}%)
- 每股淨值: ${stock.bookValue} 元 | 股價淨值比 (P/B): ${stock.pb}
- 每股盈餘 (EPS): ${stock.eps} 元 | 本益比 (P/E): ${stock.pe} 倍
- 最新單月營收: ${stock.revenueCurrent} 億元 (月增率 MoM: ${stock.revenueMoM}%, 年增率 YoY: ${stock.revenueYoY}%)
- 當前股價位階評估: ${stock.valuationScore}% (${stock.stageLabel}，0%為歷史極低檔築底，100%為極高檔過熱)
- 阿法值 (Alpha, α): ${stock.alpha}% (代表相對加權大盤的超額表現)
- 貝塔值 (Beta, β): ${stock.beta} (波動敏感度係數，>1 代表波動大於大盤)
- 主力囤貨張數: ${stock.majorAccumulation > 0 ? '+' : ''}${stock.majorAccumulation} 張 (近20日主力籌碼沉澱)
- 主力成本均價: ${stock.majorCost} 元 (目前股價與主力成本溢價率: ${(((stock.price - stock.majorCost) / stock.majorCost) * 100).toFixed(2)}%)
- 當日周轉率: ${stock.turnoverRate}%
- 大小單買賣超張數:
  * 特大單買賣超: ${stock.orderFlow?.superLargeNet || 0} 張
  * 大單買賣超: ${stock.orderFlow?.largeNet || 0} 張
  * 中單買賣超: ${stock.orderFlow?.mediumNet || 0} 張
  * 散單小單買賣超: ${stock.orderFlow?.smallNet || 0} 張
- 大單買賣比例: 大單買進佔比 ${stock.largeOrderBuyRatio || 0}%, 大單賣出佔比 ${stock.largeOrderSellRatio || 0}%
- 散單買賣比例: 散單買進佔比 ${stock.smallOrderBuyRatio || 0}%, 散單賣出佔比 ${stock.smallOrderSellRatio || 0}%
- 近期三大法人動向: 外資累積買賣超 ${stock.foreignNetBuy || 0} 張、投信累積買賣超 ${stock.trustNetBuy || 0} 張、自營商累積買賣超 ${stock.dealerNetBuy || 0} 張

請直接輸出符合 JSON 規範的分析報告，語氣專業客觀、邏輯清晰、切中要害。`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rating: {
              type: Type.STRING,
              description: '綜合投資評等：強力買進、偏多佈局、區間震盪、逢高調節、觀望避開 擇一',
            },
            ratingTone: {
              type: Type.STRING,
              description: 'bullish / neutral / bearish',
            },
            confidenceLevel: {
              type: Type.STRING,
              description: '分析信心水準：高 / 中 / 低',
            },
            targetPrice: {
              type: Type.NUMBER,
              description: '預估波段目標價位 (元)',
            },
            supportPrice: {
              type: Type.NUMBER,
              description: '關鍵技術與籌碼支撐價位 (元)',
            },
            resistancePrice: {
              type: Type.NUMBER,
              description: '關鍵技術壓力價位 (元)',
            },
            stopLossPrice: {
              type: Type.NUMBER,
              description: '建議停損價位 (元)',
            },
            executiveSummary: {
              type: Type.STRING,
              description: '一針見血的投資核心摘要 (約100-150字)',
            },
            chipAnalysis: {
              type: Type.STRING,
              description: '三竹籌碼面核心解析：剖析特大單與大單意向、散戶進出、主力囤貨張數與主力成本線防守意涵',
            },
            fundamentalAnalysis: {
              type: Type.STRING,
              description: '基本面與營收財報解析：結合EPS獲利能力、P/E本益比評價倍數、最新月營收MoM與YoY年增動能',
            },
            technicalAndStageAnalysis: {
              type: Type.STRING,
              description: '股價位階與指標評估：解讀當前位階百分比之風險報酬比、阿法值超額收益、貝塔值波動風險及周轉率換手健康度',
            },
            shortTermStrategy: {
              type: Type.STRING,
              description: '短線交易操作策略與進出時機建議',
            },
            mediumLongTermStrategy: {
              type: Type.STRING,
              description: '中長線波段或價值投資策略建議',
            },
            riskFactors: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3~4 項關鍵風險警示清單',
            },
          },
          required: [
            'rating',
            'ratingTone',
            'targetPrice',
            'supportPrice',
            'resistancePrice',
            'stopLossPrice',
            'executiveSummary',
            'chipAnalysis',
            'fundamentalAnalysis',
            'technicalAndStageAnalysis',
            'shortTermStrategy',
            'mediumLongTermStrategy',
            'riskFactors',
          ],
        },
      },
    });

    const reportJson = JSON.parse(response.text || '{}');
    return res.json({ success: true, report: reportJson });
  } catch (err: any) {
    console.error('Error in analyze-stock:', err);
    return res.status(500).json({
      error: '生成投資報告失敗',
      details: err?.message || 'Gemini API Error',
    });
  }
});

// Endpoint: AI Analyst Q&A
app.post('/api/ai/ask-analyst', async (req: Request, res: Response) => {
  try {
    const { stock, question } = req.body;
    if (!question || !stock) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const prompt = `你是三竹智慧投研特聘的首席台股分析師。
當前討論個股：${stock.name} (${stock.symbol})，現價 ${stock.price} 元，漲跌 ${stock.changePercent}%。
基本資訊：EPS ${stock.eps} 元、PE ${stock.pe}倍、營收YoY ${stock.revenueYoY}%、當前位階 ${stock.valuationScore}% (${stock.stageLabel})、阿法值 ${stock.alpha}%、貝塔值 ${stock.beta}、主力囤貨 ${stock.majorAccumulation}張、主力成本 ${stock.majorCost}元、周轉率 ${stock.turnoverRate}%。

投資人提問：「${question}」

請針對投資人的提問給予精闢、親切且有數據佐證的繁體中文回答，包含具體點位判斷與操作建議。`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    return res.json({ success: true, answer: response.text });
  } catch (err: any) {
    console.error('Error in ask-analyst:', err);
    return res.status(500).json({ error: '回答失敗', details: err?.message });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
