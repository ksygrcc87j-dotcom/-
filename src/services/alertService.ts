import { AlertRule, StockData, TriggeredAlert, IntradayTick } from '../types/stock';

const ALERTS_STORAGE_KEY = 'sanzhu_stock_alerts_v1';
const HISTORY_STORAGE_KEY = 'sanzhu_stock_alerts_history_v1';

export function loadAlertRules(): AlertRule[] {
  try {
    const raw = localStorage.getItem(ALERTS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load alert rules', e);
  }
  // Default sample alerts
  return [
    {
      id: 'default-1',
      symbol: '2330',
      stockName: '台積電',
      type: 'price_above',
      targetValue: 1050,
      note: '突破千零五十歷史壓力關卡',
      enabled: true,
      triggerCount: 0,
    },
    {
      id: 'default-2',
      symbol: '2330',
      stockName: '台積電',
      type: 'super_large_order',
      targetValue: 300,
      note: '單筆特大買單湧入超過 300 張',
      enabled: true,
      triggerCount: 0,
    },
    {
      id: 'default-3',
      symbol: '2317',
      stockName: '鴻海',
      type: 'price_above',
      targetValue: 215,
      note: '挑戰波段新高 215 元',
      enabled: true,
      triggerCount: 0,
    },
  ];
}

export function saveAlertRules(rules: AlertRule[]) {
  try {
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(rules));
  } catch (e) {
    console.warn('Failed to save alert rules', e);
  }
}

export function loadAlertHistory(): TriggeredAlert[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load alert history', e);
  }
  return [
    {
      id: 'hist-1',
      timestamp: '13:15:22',
      symbol: '2330',
      stockName: '台積電',
      title: '特大單湧入警示',
      message: '盤中撮合出現 450 張特大外盤買單，推升價格至 1,045 元！',
      severity: 'success',
    },
    {
      id: 'hist-2',
      timestamp: '11:42:10',
      symbol: '2317',
      stockName: '鴻海',
      title: '主力大單吃貨',
      message: '特大單與大單累積買超突破 16,000 張，大單買比高達 59%！',
      severity: 'info',
    },
  ];
}

export function saveAlertHistory(history: TriggeredAlert[]) {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 50)));
  } catch (e) {
    console.warn('Failed to save alert history', e);
  }
}

// Request browser notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return await Notification.requestPermission();
}

// Send system native notification if allowed
export function sendBrowserPushNotification(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
      });
    } catch (e) {
      console.warn('Browser notification error:', e);
    }
  }
}

// Play alert audio beep (synthesized via Web Audio API)
export function playAlertBeep(isPositive = true) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (isPositive) {
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
    } else {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(330, ctx.currentTime + 0.1);
    }

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Ignore audio context autoplay limitations
  }
}

// Evaluates rules for current stock tick
export function evaluateRules(
  stock: StockData,
  latestTick: IntradayTick | null,
  rules: AlertRule[]
): { triggeredAlerts: TriggeredAlert[]; updatedRules: AlertRule[] } {
  const triggeredAlerts: TriggeredAlert[] = [];
  const now = new Date().toLocaleTimeString('zh-TW', { hour12: false });
  const updatedRules = rules.map((rule) => {
    if (!rule.enabled || rule.symbol !== stock.symbol) return rule;

    let isTriggered = false;
    let title = '';
    let message = '';
    let severity: 'info' | 'warning' | 'danger' | 'success' = 'info';

    switch (rule.type) {
      case 'price_above':
        if (stock.price >= rule.targetValue) {
          isTriggered = true;
          title = `🎯 突破目標價：${stock.name} (${stock.symbol})`;
          message = `現價 ${stock.price} 元已突破設定目標價 ${rule.targetValue} 元！(備註: ${rule.note || '無'})`;
          severity = 'success';
        }
        break;
      case 'price_below':
        if (stock.price <= rule.targetValue) {
          isTriggered = true;
          title = `⚠️ 跌破停損價：${stock.name} (${stock.symbol})`;
          message = `現價 ${stock.price} 元已跌破設定防守價 ${rule.targetValue} 元！(備註: ${rule.note || '無'})`;
          severity = 'danger';
        }
        break;
      case 'change_percent_above':
        if (stock.changePercent >= rule.targetValue) {
          isTriggered = true;
          title = `🚀 漲幅突破：${stock.name} (${stock.symbol})`;
          message = `當前漲幅 +${stock.changePercent}% 超過警戒標準 +${rule.targetValue}%！`;
          severity = 'success';
        }
        break;
      case 'change_percent_below':
        if (stock.changePercent <= rule.targetValue) {
          isTriggered = true;
          title = `📉 跌幅警戒：${stock.name} (${stock.symbol})`;
          message = `當前跌幅 ${stock.changePercent}% 超過下行警戒 ${rule.targetValue}%！`;
          severity = 'danger';
        }
        break;
      case 'super_large_order':
        if (latestTick && latestTick.volume >= rule.targetValue && latestTick.type === 'buy') {
          isTriggered = true;
          title = `🔥 特大買單湧入：${stock.name} (${stock.symbol})`;
          message = `盤中瞬間撮合 ${latestTick.volume} 張大買單 (成交價 ${latestTick.price} 元)！`;
          severity = 'warning';
        }
        break;
      case 'turnover_above':
        if (stock.turnoverRate >= rule.targetValue) {
          isTriggered = true;
          title = `⚡ 周轉率過熱：${stock.name} (${stock.symbol})`;
          message = `今日換手周轉率已達 ${stock.turnoverRate}%，超過設定的 ${rule.targetValue}% 換手警戒線！`;
          severity = 'warning';
        }
        break;
    }

    if (isTriggered) {
      triggeredAlerts.push({
        id: `trig-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        timestamp: now,
        symbol: stock.symbol,
        stockName: stock.name,
        title,
        message,
        severity,
      });

      return {
        ...rule,
        triggerCount: rule.triggerCount + 1,
        lastTriggeredAt: now,
      };
    }
    return rule;
  });

  return { triggeredAlerts, updatedRules };
}
