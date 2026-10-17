import { StockMasterItem } from '../components/StockDirectoryView';

export type HeatCategory = 'all' | 'strong' | 'volatile' | 'volume' | 'neutral';

export interface StockHeatBadgeInfo {
  category: 'strong' | 'volatile' | 'volume' | 'pullback' | 'neutral';
  label: '強勢' | '異常波動' | '人氣巨量' | '拉回整理' | '量縮盤整';
  subLabel: string;
  volumeStatus: string;
  badgeBg: string;
  borderColor: string;
  textColor: string;
  glowEffect: string;
  pulseColor: string;
  iconType: 'flame' | 'zap' | 'volume' | 'activity';
  summary: string;
  score: number; // for sorting by heat
}

/**
 * 計算即時股價熱度標籤與成交量視覺提示
 * 依據股價漲跌幅、日內振幅、總成交量及量價互動關係判定：
 * 1. 『強勢』: 價漲且成交量能放大 (量增價揚、強勢多頭)
 * 2. 『異常波動』: 日內振幅劇烈、爆量急震或急拉急殺 (異常波動預警)
 * 3. 『人氣巨量』: 單日成交量居前或大額換手
 * 4. 『量縮盤整』: 價量平穩、區間震盪
 */
export function calculateStockHeatBadge(stock: StockMasterItem): StockHeatBadgeInfo {
  const yesterdayClose = stock.yesterdayClose || stock.price;
  const amplitudePercent = yesterdayClose > 0 
    ? ((Math.max(stock.highPrice, stock.price) - Math.min(stock.lowPrice, stock.price)) / yesterdayClose) * 100 
    : Math.abs(stock.changePercent);

  const vol = stock.volume || 0;
  const changePct = stock.changePercent || 0;

  // 1. 異常波動 (Abnormal Volatility / Volume Spike & wide swing)
  // 判定條件：振幅 >= 3.5% 或 跌幅 <= -3.0% 或 (量大於 25,000 張且振幅 >= 3.0%) 或 |漲跌幅| >= 5.0%
  const isExtremeAmplitude = amplitudePercent >= 3.5;
  const isSevereDrop = changePct <= -3.0;
  const isHeavyChurnSwing = vol >= 25000 && (amplitudePercent >= 3.0 || Math.abs(changePct) >= 2.5);
  const isExtremeSwing = Math.abs(changePct) >= 5.0;

  if (isExtremeAmplitude || isSevereDrop || isHeavyChurnSwing || isExtremeSwing) {
    let sub = `振幅 ${amplitudePercent.toFixed(1)}%`;
    let volStatus = '爆量急震';

    if (vol >= 30000) {
      volStatus = '巨量換手';
      sub = '爆量震盪';
    } else if (isSevereDrop) {
      volStatus = '承壓放量';
      sub = `${changePct.toFixed(1)}% 急震`;
    } else if (amplitudePercent >= 4.5) {
      volStatus = '多空劇鬥';
      sub = `高低差 ${amplitudePercent.toFixed(1)}%`;
    }

    return {
      category: 'volatile',
      label: '異常波動',
      subLabel: sub,
      volumeStatus: volStatus,
      badgeBg: 'bg-amber-950/60',
      borderColor: 'border-amber-500/50',
      textColor: 'text-amber-300',
      glowEffect: 'shadow-[0_0_12px_rgba(245,158,11,0.25)]',
      pulseColor: 'bg-amber-400',
      iconType: 'zap',
      summary: `成交量 ${vol.toLocaleString()} 張，日內震幅 ${amplitudePercent.toFixed(1)}%，波動劇烈，請留意短線籌碼洗盤`,
      score: 900 + amplitudePercent * 10 + (vol / 5000),
    };
  }

  // 2. 強勢 (Strong Bullish / Volume expansion with price surge)
  // 判定條件：漲幅 >= 2.0% 且成交量活絡，或漲幅 >= 3.0%
  const isStrongUp = changePct >= 2.0;
  const isVolumeSupportedGain = changePct >= 1.2 && vol >= 15000;

  if (isStrongUp || isVolumeSupportedGain) {
    let sub = '量增價揚';
    let volStatus = '量能激增';

    if (changePct >= 4.0) {
      sub = '強勢攻堅';
      volStatus = '多頭暴量';
    } else if (vol >= 30000) {
      sub = '巨量推升';
      volStatus = '大單湧入';
    } else if (changePct >= 2.5) {
      sub = `+${changePct.toFixed(1)}% 突破`;
      volStatus = '買盤強勁';
    }

    return {
      category: 'strong',
      label: '強勢',
      subLabel: sub,
      volumeStatus: volStatus,
      badgeBg: 'bg-rose-950/60',
      borderColor: 'border-rose-500/50',
      textColor: 'text-rose-300',
      glowEffect: 'shadow-[0_0_12px_rgba(244,63,94,0.25)]',
      pulseColor: 'bg-rose-500',
      iconType: 'flame',
      summary: `今日漲幅 +${changePct.toFixed(2)}%，量能活絡 (${vol.toLocaleString()} 張)，多方控盤動能強勢`,
      score: 1000 + changePct * 20 + (vol / 5000),
    };
  }

  // 3. 人氣巨量 (High Volume Leader)
  if (vol >= 35000) {
    return {
      category: 'volume',
      label: '人氣巨量',
      subLabel: `${(vol / 1000).toFixed(0)}k 張交投`,
      volumeStatus: '高流動性',
      badgeBg: 'bg-cyan-950/50',
      borderColor: 'border-cyan-500/40',
      textColor: 'text-cyan-300',
      glowEffect: 'shadow-[0_0_8px_rgba(6,182,212,0.2)]',
      pulseColor: 'bg-cyan-400',
      iconType: 'volume',
      summary: `市場核心焦點標的，單日成交量突破 ${vol.toLocaleString()} 張，流動性充沛`,
      score: 600 + (vol / 2000),
    };
  }

  // 4. 拉回整理 (Pullback)
  if (changePct <= -1.5) {
    return {
      category: 'pullback',
      label: '拉回整理',
      subLabel: `${changePct.toFixed(1)}%`,
      volumeStatus: vol > 20000 ? '放量拉回' : '量縮回測',
      badgeBg: 'bg-emerald-950/40',
      borderColor: 'border-emerald-700/40',
      textColor: 'text-emerald-300',
      glowEffect: '',
      pulseColor: 'bg-emerald-500',
      iconType: 'activity',
      summary: `股價拉回整理 ${changePct.toFixed(2)}%，成交量 ${vol.toLocaleString()} 張`,
      score: 200 + Math.abs(changePct) * 10,
    };
  }

  // 5. 量縮盤整 (Neutral Consolidation)
  return {
    category: 'neutral',
    label: '量縮盤整',
    subLabel: '平穩區間',
    volumeStatus: '量縮整理',
    badgeBg: 'bg-slate-900/80',
    borderColor: 'border-slate-800',
    textColor: 'text-slate-400',
    glowEffect: '',
    pulseColor: 'bg-slate-600',
    iconType: 'activity',
    summary: `股價於平盤區間窄幅整理，成交量溫和穩定 (${vol.toLocaleString()} 張)`,
    score: 100,
  };
}
