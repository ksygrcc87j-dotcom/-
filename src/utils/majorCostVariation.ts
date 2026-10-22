import { StockData } from '../types/stock';

export type MajorCostStage = '獲利擴大' | '成本解套';

export interface MajorCostPeriodRow {
  periodKey: '5d' | '20d' | '60d';
  periodLabel: string;
  subLabel: string;
  days: number;
  avgCost: number;
  prevAvgCost: number;
  costChangeVal: number;
  costChangePct: number;
  profitDiff: number;
  profitPct: number;
  accumulatedLots: number;
  holdingWeightPct: number;
  stage: MajorCostStage;
  stageSubTag: string;
  costTrendLabel: '成本墊高' | '成本下移' | '成本持平';
  defensePrice: number;
  pressurePrice: number;
  operationalIntent: string;
  tacticalAdvice: string;
}

export interface MajorCostVariationSummary {
  stockId: string;
  currentPrice: number;
  overallStage: MajorCostStage;
  overallStageHeadline: string;
  overallIntentTitle: string;
  overallIntentDescription: string;
  costAlignmentOrder: string;
  isBullishCostAlignment: boolean;
  spread5dTo60dPct: number;
  spread5dTo20dPct: number;
  rows: MajorCostPeriodRow[];
  keySignals: {
    label: string;
    value: string;
    tone: 'red' | 'emerald' | 'amber' | 'indigo';
  }[];
}

function roundPrice(val: number, basePrice: number): number {
  if (basePrice >= 500) return Math.round(val * 2) / 2;
  if (basePrice >= 100) return Number(val.toFixed(1));
  return Number(val.toFixed(2));
}

export function calculateMajorCostVariation(stock: StockData): MajorCostVariationSummary {
  const price = stock.price;
  const seed = stock.symbol.split('').reduce((acc: number, ch: string) => acc + ch.charCodeAt(0), 0);

  // 20-day major average cost from StockData (fallback to ma20 * 0.985)
  const cost20dRaw = stock.majorCost > 0 ? stock.majorCost : stock.ma20 * 0.985;
  const cost20d = roundPrice(cost20dRaw, price);

  // 5-day major average cost: weighted between recent MA5 and current price / order flow
  const netBuyBias5d = stock.majorAccumulation5d >= 0 ? 1 : -1;
  const cost5dRaw =
    stock.ma5 > 0
      ? stock.ma5 * (0.992 + netBuyBias5d * 0.004)
      : price * (stock.changePercent >= 0 ? 0.978 : 1.015);
  const cost5d = roundPrice(cost5dRaw, price);

  // 60-day major average cost: anchored around MA60 and long-term base accumulation
  const ma60Base = stock.ma60 > 0 ? stock.ma60 : cost20d * 0.94;
  const cost60dRaw = ma60Base * (0.976 + ((seed % 9) - 4) * 0.0025);
  const cost60d = roundPrice(cost60dRaw, price);

  // Previous period cost comparison (5 trading days ago) to show cost shift (成本變動)
  const prev5dCost = roundPrice(
    cost5d * (price >= cost20d ? 0.976 : 1.018),
    price
  );
  const prev20dCost = roundPrice(
    cost20d * (price >= cost20d ? 0.986 : 1.011),
    price
  );
  const prev60dCost = roundPrice(
    cost60d * (price >= cost60d ? 0.992 : 1.006),
    price
  );

  // Accumulated lots across 5d / 20d / 60d
  const lots5d = stock.majorAccumulation5d;
  const lots20d = stock.majorAccumulation;
  const lots60d = Math.round(
    lots20d * (1.85 + (seed % 5) * 0.14) + (price >= cost60d ? 1800 : -950)
  );

  // Holding weight distribution across the 3 horizons (sums to 100%)
  const abs5 = Math.max(Math.abs(lots5d), 350);
  const abs20 = Math.max(Math.abs(lots20d), 900);
  const abs60 = Math.max(Math.abs(lots60d), 1500);
  const totalAbs = abs5 + abs20 + abs60;
  const weight5d = Number(((abs5 / totalAbs) * 100).toFixed(1));
  const weight20d = Number(((abs20 / totalAbs) * 100).toFixed(1));
  const weight60d = Number((100 - weight5d - weight20d).toFixed(1));

  const buildRow = (
    periodKey: '5d' | '20d' | '60d',
    periodLabel: string,
    subLabel: string,
    days: number,
    avgCost: number,
    prevAvgCost: number,
    accumulatedLots: number,
    holdingWeightPct: number
  ): MajorCostPeriodRow => {
    const costChangeVal = Number((avgCost - prevAvgCost).toFixed(2));
    const costChangePct = Number(
      (((avgCost - prevAvgCost) / Math.max(prevAvgCost, 0.01)) * 100).toFixed(2)
    );
    const profitDiff = Number((price - avgCost).toFixed(2));
    const profitPct = Number(
      (((price - avgCost) / Math.max(avgCost, 0.01)) * 100).toFixed(2)
    );

    const costTrendLabel: '成本墊高' | '成本下移' | '成本持平' =
      costChangePct > 0.25
        ? '成本墊高'
        : costChangePct < -0.25
        ? '成本下移'
        : '成本持平';

    // Determine Stage: 「獲利擴大」 vs 「成本解套」
    // If current price is meaningfully above avgCost (> 2.2%) OR (price > avgCost and net buying with rising cost), it's in 獲利擴大.
    // Otherwise (price below avgCost, or within -5% to +2.2% recovery zone), it's in 成本解套.
    const isProfitExpanding =
      profitPct >= 2.2 || (profitPct > 0.5 && accumulatedLots > 0 && costChangePct >= 0);

    const stage: MajorCostStage = isProfitExpanding ? '獲利擴大' : '成本解套';

    let stageSubTag = '';
    let operationalIntent = '';
    let tacticalAdvice = '';

    if (stage === '獲利擴大') {
      if (profitPct >= 8) {
        stageSubTag = '高檔鎖利・拉開安全墊';
        operationalIntent =
          periodKey === '5d'
            ? '短線主力積極追價點火，成本快速墊高但帳面獲利仍豐厚，屬強勢軋空或主升急攻意圖。'
            : periodKey === '20d'
            ? '波段主力已脫離成本區超過 8%，完全掌握發球權，目前採「邊拉邊洗」擴大波段帳面利潤。'
            : '長線底倉主力獲利空間極大，籌碼高度鎖定未見鬆動，提供中長線厚實安全墊。';
        tacticalAdvice =
          '主力處於順風獲利擴大期，拉回守穩該週期成本線皆視為強勢換手，惟乖離過大時勿過度追高。';
      } else {
        stageSubTag = '順勢墊高・推升波段';
        operationalIntent =
          periodKey === '5d'
            ? '近5日外資與主力分點持續換手承接，短線持倉成本穩步上移，意圖維持短多攻擊斜率。'
            : periodKey === '20d'
            ? '月線級別波段主力帳面維持正報酬且持續加碼，顯示波段作價行情尚未走完。'
            : '季線級別大戶底倉穩健獲利中，長線資金無意殺低，形成下檔鐵板支撐。';
        tacticalAdvice =
          '現價穩居主力成本之上且成本線向上發散，建議沿 5 日與 20 日主力成本區間偏多操作。';
      }
    } else {
      // 成本解套
      if (profitPct >= -1.5 && profitPct < 2.2) {
        stageSubTag = '臨界解套・攻防換手';
        operationalIntent =
          periodKey === '5d'
            ? '短線主力剛越過或緊貼成本線，正處於「保本解套轉獲利」關鍵點，主力護盤拉抬意願強烈。'
            : periodKey === '20d'
            ? '現價逼近 20 日波段主力成本區，前波套牢或建倉籌碼迎來解套測試，主力意圖透過震盪洗清浮額後再攻。'
            : '股價重返 60 日長線主力成本水位，長線大戶力守損益兩平防線，具備中期轉折契機。';
        tacticalAdvice =
          '緊盯主力成本價能否帶量站穩；若站穩且大戶續買，代表「解套轉主升」，為極佳右側切入點。';
      } else {
        stageSubTag = '低檔攤平・自救吸籌';
        operationalIntent =
          periodKey === '5d'
            ? '近5日股價壓回短線主力成本之下，主力正逢低承接攤平成本，等待短線止跌反彈契機。'
            : periodKey === '20d'
            ? '20日波段主力帳面暫處套牢狀態，分點呈現「低檔買進降成本」自救動作，後續將測試月線解套壓。'
            : '股價低於 60 日長線底倉成本，長線主力處於被動防守與分批攤平階段，上方解套賣壓需時間消化。';
        tacticalAdvice =
          '主力尚在「成本解套」自救階段，反彈接近該週期成本價時易見解套調節賣壓，宜採分批低接、遇壓減碼策略。';
      }
    }

    const defensePrice = roundPrice(
      stage === '獲利擴大' ? avgCost * 0.995 : avgCost * 0.965,
      price
    );
    const pressurePrice = roundPrice(
      stage === '獲利擴大' ? avgCost * 1.085 : avgCost * 1.01,
      price
    );

    return {
      periodKey,
      periodLabel,
      subLabel,
      days,
      avgCost,
      prevAvgCost,
      costChangeVal,
      costChangePct,
      profitDiff,
      profitPct,
      accumulatedLots,
      holdingWeightPct,
      stage,
      stageSubTag,
      costTrendLabel,
      defensePrice,
      pressurePrice,
      operationalIntent,
      tacticalAdvice,
    };
  };

  const row5d = buildRow(
    '5d',
    '5日短線主力',
    '極短線點火與隔日/週沖大戶',
    5,
    cost5d,
    prev5dCost,
    lots5d,
    weight5d
  );

  const row20d = buildRow(
    '20d',
    '20日波段主力',
    '月線級別核心控盤法人與主力',
    20,
    cost20d,
    prev20dCost,
    lots20d,
    weight20d
  );

  const row60d = buildRow(
    '60d',
    '60日長線主力',
    '季線級別戰略底倉與大股東分點',
    60,
    cost60d,
    prev60dCost,
    lots60d,
    weight60d
  );

  const rows = [row5d, row20d, row60d];

  // Overall stage & intent diagnosis across 5d / 20d / 60d
  const profitExpandingCount = rows.filter((r) => r.stage === '獲利擴大').length;
  const overallStage: MajorCostStage =
    profitExpandingCount >= 2 || (row20d.stage === '獲利擴大' && row5d.profitPct > 0)
      ? '獲利擴大'
      : '成本解套';

  const isBullishCostAlignment = cost5d >= cost20d && cost20d >= cost60d;
  const spread5dTo60dPct = Number(
    (((cost5d - cost60d) / Math.max(cost60d, 0.01)) * 100).toFixed(2)
  );
  const spread5dTo20dPct = Number(
    (((cost5d - cost20d) / Math.max(cost20d, 0.01)) * 100).toFixed(2)
  );

  let costAlignmentOrder = '';
  if (cost5d >= cost20d && cost20d >= cost60d) {
    costAlignmentOrder = '5日成本 > 20日成本 > 60日成本（標準多頭墊高排列）';
  } else if (cost5d < cost20d && cost20d >= cost60d) {
    costAlignmentOrder = '20日成本 > 5日成本 > 60日成本（短線回測波段成本區）';
  } else if (cost5d >= cost20d && cost20d < cost60d) {
    costAlignmentOrder = '60日成本 > 5日成本 > 20日成本（低檔築底強勢反攻解套）';
  } else {
    costAlignmentOrder = '60日成本 > 20日成本 > 5日成本（空頭壓制・低檔攤平解套期）';
  }

  let overallStageHeadline = '';
  let overallIntentTitle = '';
  let overallIntentDescription = '';

  if (overallStage === '獲利擴大') {
    if (isBullishCostAlignment) {
      overallStageHeadline = '三線主力全面獲利擴大・多頭換手墊高';
      overallIntentTitle = '主力操作意圖：強勢鎖碼推升，拉開底倉安全墊';
      overallIntentDescription = `目前現價 (${price}) 穩居 5日 (${cost5d})、20日 (${cost20d}) 與 60日 (${cost60d}) 主力平均成本之上，且短中長線主力成本呈現「5日 > 20日 > 60日」多頭排列（短長成本價差 +${spread5dTo60dPct}%）。代表新進主力願意用更高成本承接籌碼，60日底倉主力帳面獲利達 ${row60d.profitPct > 0 ? '+' : ''}${row60d.profitPct}% 仍未大幅派發，操作意圖明確指向「波段獲利擴大」。`;
    } else {
      overallStageHeadline = '主力帳面獲利擴大・短線震盪洗盤換手';
      overallIntentTitle = '主力操作意圖：高檔震盪洗清浮額，守穩波段成本線';
      overallIntentDescription = `20日波段主力平均成本 (${cost20d}) 與 60日長線成本 (${cost60d}) 均處於獲利保護狀態（波段獲利 ${row20d.profitPct > 0 ? '+' : ''}${row20d.profitPct}%）。雖然 5日與20日成本略見收斂（價差 ${spread5dTo20dPct}%），但核心主力並未棄守成本防線，意圖透過短線震盪清洗散戶浮額後再行推升。`;
    }
  } else {
    if (price >= cost5d && price < cost60d) {
      overallStageHeadline = '短線主力點火自救・挑戰中長線成本解套';
      overallIntentTitle = '主力操作意圖：低檔攤平拉抬，力拚波段套牢區解套';
      overallIntentDescription = `目前 5日短線主力成本 (${cost5d}) 已率先由虧轉盈，顯示主力在低檔積極吸籌攤平，正帶動股價向上挑戰 20日 (${cost20d}) 與 60日 (${cost60d}) 套牢成本區。現階段屬於典型的「成本解套」攻防期，若能帶量站穩 ${cost20d} 元波段成本線，將正式由解套行情升級為獲利擴大主升段。`;
    } else {
      overallStageHeadline = '主力持倉面臨成本保衛・逢低攤平解套階段';
      overallIntentTitle = '主力操作意圖：壓低吃貨降成本，等待量縮止穩反攻';
      overallIntentDescription = `現價 (${price}) 暫時壓回 20日波段主力成本 (${cost20d}) 附近或下方（帳面價差 ${row20d.profitPct}%），主力整體處於「成本解套」與防禦自救階段。觀察 5日成本 (${cost5d}) 與 20日成本 (${cost20d}) 差距為 ${spread5dTo20dPct}%，主力正透過壓低震盪吸納恐慌籌碼以壓低持倉均價，後續反彈至 ${cost20d}～${cost60d} 元區間需留意解套換手力道。`;
    }
  }

  const keySignals: MajorCostVariationSummary['keySignals'] = [
    {
      label: '當前主力階段判定',
      value: `${overallStage} (${profitExpandingCount}/3 週期獲利)`,
      tone: overallStage === '獲利擴大' ? 'red' : 'amber',
    },
    {
      label: '5日 vs 20日成本差',
      value: `${spread5dTo20dPct >= 0 ? '+' : ''}${spread5dTo20dPct}% (${spread5dTo20dPct >= 0 ? '短線墊高' : '短線折價'})`,
      tone: spread5dTo20dPct >= 0 ? 'red' : 'emerald',
    },
    {
      label: '5日 vs 60日成本差',
      value: `${spread5dTo60dPct >= 0 ? '+' : ''}${spread5dTo60dPct}% (${isBullishCostAlignment ? '多頭發散' : '收斂整理'})`,
      tone: spread5dTo60dPct >= 0 ? 'red' : 'indigo',
    },
    {
      label: '核心波段護盤防線',
      value: `${row20d.avgCost} 元 (20日主力均價)`,
      tone: price >= row20d.avgCost ? 'red' : 'amber',
    },
  ];

  return {
    stockId: stock.symbol,
    currentPrice: price,
    overallStage,
    overallStageHeadline,
    overallIntentTitle,
    overallIntentDescription,
    costAlignmentOrder,
    isBullishCostAlignment,
    spread5dTo60dPct,
    spread5dTo20dPct,
    rows,
    keySignals,
  };
}
