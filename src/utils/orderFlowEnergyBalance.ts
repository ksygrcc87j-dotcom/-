import { StockData, OrderFlowBreakdown } from '../types/stock';

export type MomentumState = 
  | 'bull_surge'        // 強力多頭控盤：主力特大單暴買，散戶退場或觀望
  | 'major_absorbing'   // 主力暗中吸籌：主力逆勢承接，低檔量縮洗浮額
  | 'balanced_tussle'   // 多空勢均力敵：買賣能量均衡，區間震盪洗盤
  | 'retail_fomo'       // 誘多高檔派發：主力大單暗中出貨，散戶瘋狂搶進接刀
  | 'bear_dump';        // 空方全面摜壓：大單連鎖殺盤，籌碼呈現極度空頭

export interface OrderTierEnergyRow {
  id: 'superLarge' | 'large' | 'medium' | 'small';
  name: string;
  orderBracket: string;
  participantType: string;
  buyLots: number;
  sellLots: number;
  totalLots: number;
  netLots: number;
  netAmountMillion: number;    // 預估淨金額 (百萬元)
  turnoverShare: number;       // 佔總成交量 %
  powerRatio: number;          // 多空強弱比率 = 買進 / 賣出 (倍)
  bullEnergyPct: number;       // 買方能量佔比 %
  bearEnergyPct: number;       // 賣方能量佔比 %
  statusLabel: string;
  statusBadgeClass: string;
}

export interface EnergyBalanceSummary {
  buyLots: number;
  sellLots: number;
  netLots: number;
  netAmountMillion: number;
  powerRatio: number;
  bullEnergyPct: number;
  bearEnergyPct: number;
}

export interface OrderFlowEnergyBalanceResult {
  // 表格明細列
  rows: OrderTierEnergyRow[];
  
  // 核心分組匯總
  majorSummary: EnergyBalanceSummary;   // 主力大戶合計 (特大單 + 大單)
  retailSummary: EnergyBalanceSummary;  // 散戶合計 (中單 + 散單)
  totalSummary: EnergyBalanceSummary;   // 全市場總計

  // 能量綜合指標
  energyScore: number;                  // 0 ~ 100 多空能量綜合分數
  powerRatio: number;                   // 整體多空強弱比率
  majorPowerRatio: number;              // 主力專屬多空強弱比率
  retailPowerRatio: number;             // 散戶專屬多空強弱比率

  // 勢頭判定
  momentumState: MomentumState;
  momentumTitle: string;
  momentumBadgeClass: string;
  momentumDescription: string;
  
  // 多空結構解讀與操盤手建言
  structureDiagnosis: string;
  tacticalPlaybook: string;
  divergenceAlert: string | null;
  keySupportResistanceTip: string;
}

/**
 * 計算主力多空能量平衡表與多空強弱勢頭
 */
export function calculateOrderFlowEnergyBalance(stock: StockData): OrderFlowEnergyBalanceResult {
  const price = stock.price || 100;
  const flow: OrderFlowBreakdown = stock.orderFlow || {
    superLargeBuy: Math.round((stock.volume || 1000) * 0.18),
    superLargeSell: Math.round((stock.volume || 1000) * 0.12),
    superLargeNet: Math.round((stock.volume || 1000) * 0.06),
    largeBuy: Math.round((stock.volume || 1000) * 0.25),
    largeSell: Math.round((stock.volume || 1000) * 0.20),
    largeNet: Math.round((stock.volume || 1000) * 0.05),
    mediumBuy: Math.round((stock.volume || 1000) * 0.30),
    mediumSell: Math.round((stock.volume || 1000) * 0.32),
    mediumNet: -Math.round((stock.volume || 1000) * 0.02),
    smallBuy: Math.round((stock.volume || 1000) * 0.27),
    smallSell: Math.round((stock.volume || 1000) * 0.36),
    smallNet: -Math.round((stock.volume || 1000) * 0.09)
  };

  const totalVol = Math.max(1, (stock.volume || (flow.superLargeBuy + flow.largeBuy + flow.mediumBuy + flow.smallBuy)));

  // Helper to build row
  function createRow(
    id: 'superLarge' | 'large' | 'medium' | 'small',
    name: string,
    orderBracket: string,
    participantType: string,
    buy: number,
    sell: number
  ): OrderTierEnergyRow {
    const buyLots = Math.max(0, buy);
    const sellLots = Math.max(0, sell);
    const netLots = buyLots - sellLots;
    const totalLots = buyLots + sellLots;
    
    // 金額 (百萬台幣) = 張數 * 1000股 * 現價 / 1,000,000
    const netAmountMillion = Number(((netLots * 1000 * price) / 1000000).toFixed(1));
    const turnoverShare = Number(((totalLots / 2 / totalVol) * 100).toFixed(1));
    
    // 多空強弱比率 (買 / 賣)
    const powerRatio = Number((buyLots / Math.max(1, sellLots)).toFixed(2));
    
    // 買賣能量佔比
    const denom = Math.max(1, totalLots);
    const bullEnergyPct = Number(((buyLots / denom) * 100).toFixed(1));
    const bearEnergyPct = Number(((sellLots / denom) * 100).toFixed(1));

    let statusLabel = '多空膠著';
    let statusBadgeClass = 'bg-slate-800 text-slate-300 border-slate-700';

    if (powerRatio >= 1.6) {
      statusLabel = '多方強攻';
      statusBadgeClass = 'bg-rose-500/20 text-rose-400 border-rose-500/40';
    } else if (powerRatio >= 1.15) {
      statusLabel = '多方優勢';
      statusBadgeClass = 'bg-rose-500/10 text-rose-300 border-rose-500/30';
    } else if (powerRatio <= 0.65) {
      statusLabel = '空方摜壓';
      statusBadgeClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    } else if (powerRatio <= 0.85) {
      statusLabel = '空方佔優';
      statusBadgeClass = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
    }

    return {
      id,
      name,
      orderBracket,
      participantType,
      buyLots,
      sellLots,
      totalLots,
      netLots,
      netAmountMillion,
      turnoverShare,
      powerRatio,
      bullEnergyPct,
      bearEnergyPct,
      statusLabel,
      statusBadgeClass
    };
  }

  const superLargeRow = createRow(
    'superLarge',
    '特大單',
    '> 50 張 / > 500萬',
    '外資/投信核心主力',
    flow.superLargeBuy,
    flow.superLargeSell
  );

  const largeRow = createRow(
    'large',
    '大單',
    '10 ~ 50 張',
    '實力大戶/公司派',
    flow.largeBuy,
    flow.largeSell
  );

  const mediumRow = createRow(
    'medium',
    '中單',
    '3 ~ 10 張',
    '中實戶/積極短線',
    flow.mediumBuy,
    flow.mediumSell
  );

  const smallRow = createRow(
    'small',
    '散單小單',
    '1 ~ 2 張',
    '一般散戶/零股客',
    flow.smallBuy,
    flow.smallSell
  );

  const rows = [superLargeRow, largeRow, mediumRow, smallRow];

  // Helper for summaries
  function summarizeRows(selectedRows: OrderTierEnergyRow[]): EnergyBalanceSummary {
    const buyLots = selectedRows.reduce((acc, r) => acc + r.buyLots, 0);
    const sellLots = selectedRows.reduce((acc, r) => acc + r.sellLots, 0);
    const netLots = buyLots - sellLots;
    const netAmountMillion = Number(((netLots * 1000 * price) / 1000000).toFixed(1));
    const powerRatio = Number((buyLots / Math.max(1, sellLots)).toFixed(2));
    const denom = Math.max(1, buyLots + sellLots);
    const bullEnergyPct = Number(((buyLots / denom) * 100).toFixed(1));
    const bearEnergyPct = Number(((sellLots / denom) * 100).toFixed(1));

    return {
      buyLots,
      sellLots,
      netLots,
      netAmountMillion,
      powerRatio,
      bullEnergyPct,
      bearEnergyPct
    };
  }

  const majorSummary = summarizeRows([superLargeRow, largeRow]);
  const retailSummary = summarizeRows([mediumRow, smallRow]);
  const totalSummary = summarizeRows(rows);

  // 全市場多空強弱比率
  const powerRatio = totalSummary.powerRatio;
  const majorPowerRatio = majorSummary.powerRatio;
  const retailPowerRatio = retailSummary.powerRatio;

  // 計算能量綜合評分 (0 ~ 100)
  // 加權權重: 特大單 40%, 大單 30%, 中單 15%, 散單 15% (散戶買超對多頭分數為負向權重)
  let rawScore = 50;
  rawScore += (superLargeRow.netLots / Math.max(10, totalVol * 0.2)) * 25;
  rawScore += (largeRow.netLots / Math.max(10, totalVol * 0.25)) * 20;
  rawScore += (mediumRow.netLots / Math.max(10, totalVol * 0.3)) * 8;
  // 散戶若大買，則扣分 (籌碼散落)；散戶賣超，則加分 (籌碼集中)
  rawScore -= (smallRow.netLots / Math.max(10, totalVol * 0.25)) * 15;

  const energyScore = Math.max(10, Math.min(95, Math.round(rawScore)));

  // 勢頭判定
  let momentumState: MomentumState = 'balanced_tussle';
  let momentumTitle = '多空勢均力敵 (籌碼拉鋸)';
  let momentumBadgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  let momentumDescription = '主力與散戶多空買賣力量大致平衡，尚未出現單向突破性單筆大單，行情維持區間震盪整理。';
  let structureDiagnosis = '特大單與散單互有攻防，量能換手未失衡，等待突破關鍵價位帶動趨勢。';
  let tacticalPlaybook = '暫以區間高出低進思維應對，未見大單明確偏向發動前不宜過度追高。';

  const isMajorNetBuy = majorSummary.netLots > 0;
  const isRetailNetBuy = retailSummary.netLots > 0;

  if (isMajorNetBuy && !isRetailNetBuy && majorPowerRatio >= 1.3) {
    momentumState = 'bull_surge';
    momentumTitle = '強力多頭控盤 (主力強攻 · 散戶退散)';
    momentumBadgeClass = 'bg-rose-500/20 text-rose-400 border-rose-500/40';
    momentumDescription = `主力特大單與大單狂買超合計 +${majorSummary.netLots.toLocaleString()} 張 (多空比率 ${majorPowerRatio}x)，且散戶持續拋售賣超 ${Math.abs(retailSummary.netLots).toLocaleString()} 張。此為最標準且健康的「籌碼換手沉澱」多頭攻擊訊號。`;
    structureDiagnosis = `籌碼正快速自散戶流向法人與主力金庫，浮額大幅洗淨，多方能量佔比達 ${majorSummary.bullEnergyPct}%，上攻無套牢反壓阻力。`;
    tacticalPlaybook = '順勢作多或抱牢核心持股，逢拉回量縮測試 5 日線均為優質加碼點，停損設於主力防守線。';
  } else if (isMajorNetBuy && isRetailNetBuy && majorPowerRatio >= 1.15) {
    momentumState = 'major_absorbing';
    momentumTitle = '主力暗中吸籌 (順勢吃貨 · 多方墊高)';
    momentumBadgeClass = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
    momentumDescription = `主力大單買超力道持續大於賣方 (多空比 ${majorPowerRatio}x)，呈現良性吃貨推升。全市場買氣活絡，多空動能朝多方傾斜。`;
    structureDiagnosis = '特大單維持穩定承接，但中單與散單亦有跟進跡象，籌碼尚未完全鎖死但偏多格局確立。';
    tacticalPlaybook = '沿均線偏多操作，若見急拉乖離過大時切勿追高，以回測量縮支撐布局為主。';
  } else if (!isMajorNetBuy && isRetailNetBuy && majorPowerRatio <= 0.8) {
    momentumState = 'retail_fomo';
    momentumTitle = '高檔誘多出貨 (主力倒貨 · 散戶接刀)';
    momentumBadgeClass = 'bg-purple-500/20 text-purple-300 border-purple-500/40';
    momentumDescription = `高度警訊！特大單與主力大單淨賣超 -${Math.abs(majorSummary.netLots).toLocaleString()} 張 (主力多空比僅 ${majorPowerRatio}x)，而散戶小單卻大幅湧入買超 +${retailSummary.netLots.toLocaleString()} 張，形成典型主力倒貨、散戶瘋狂接刀格局。`;
    structureDiagnosis = '籌碼嚴重鬆動渙散，大單趁市場熱絡暗中獲利派發，後續極易引發多殺多停損賣壓。';
    tacticalPlaybook = '逢反彈堅決分批獲利了結或退場觀望，嚴格杜絕散戶追價思維，嚴守停損停利底線。';
  } else if (!isMajorNetBuy && !isRetailNetBuy && majorPowerRatio <= 0.75) {
    momentumState = 'bear_dump';
    momentumTitle = '空方全面摜壓 (主力摜破 · 多方棄守)';
    momentumBadgeClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    momentumDescription = `特大單與大單主動市價摜殺，賣單全面籠罩，主力多空比僅 ${majorPowerRatio}x，空方能量佔比高達 ${majorSummary.bearEnergyPct}%。買盤委縮棄守，空方趨勢顯著。`;
    structureDiagnosis = '大額賣單連鎖觸發，無有效大戶買盤支撐，下檔支撐面臨嚴峻考驗。';
    tacticalPlaybook = '嚴格執行停損，切勿隨意盲目抄底摸底，靜待主力賣壓竭盡並出現止跌打底訊號。';
  }

  // 價量背離提示
  let divergenceAlert: string | null = null;
  if (stock.changePercent > 1.5 && majorSummary.netLots < -50) {
    divergenceAlert = '⚠️ 價漲籌碼空 (負背離)：股價上漲但主力大單反向賣超，提防虛拉實出。';
  } else if (stock.changePercent < -1.5 && majorSummary.netLots > 50) {
    divergenceAlert = '🔥 價跌籌碼多 (正背離)：股價回檔但主力特大單強勢吃貨，屬於黃金洗盤黃金坑。';
  }

  const keySupportResistanceTip = `當日主力多空比率為 ${majorPowerRatio}x，${
    majorPowerRatio >= 1.2 
      ? '買盤力道充沛，下方 $ ' + (stock.supportLevel || (price * 0.97).toFixed(1)) + ' 元具備堅實買單墊檔支撐。' 
      : majorPowerRatio <= 0.8
      ? '賣盤壓制沉重，上方 $ ' + (stock.resistanceLevel || (price * 1.03).toFixed(1)) + ' 元套牢反壓沉重。'
      : '多空拉鋸，關注現價與均線之支撐壓力互動。'
  }`;

  return {
    rows,
    majorSummary,
    retailSummary,
    totalSummary,
    energyScore,
    powerRatio,
    majorPowerRatio,
    retailPowerRatio,
    momentumState,
    momentumTitle,
    momentumBadgeClass,
    momentumDescription,
    structureDiagnosis,
    tacticalPlaybook,
    divergenceAlert,
    keySupportResistanceTip
  };
}
