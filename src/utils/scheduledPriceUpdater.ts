/**
 * 每日收盤價定時更新排程引擎 (Daily Closing Price Updater - 13:30)
 * 依據台股集中市場與櫃買中心交易制度：
 * - 每日更新時間：下午 13:30 (13:30:00 每日收盤價正式結算)
 * - 當時間到達每日下午 13:30 時，系統自動同步更新全市場最新收盤價與籌碼指標。
 */

export interface ScheduleStatus {
  currentPhaseTitle: string;     // 當前資料版本 (例: 今日下午 13:30 每日收盤價已更新)
  currentPhaseBadge: string;     // 標籤樣式
  nextScheduleTitle: string;     // 下次更新名稱 (例: 今日下午 13:30 每日收盤價更新)
  nextScheduleTimeStr: string;   // 下次更新時間點 (例: 每日下午 13:30:00)
  timeRemainingSeconds: number;  // 距離下次 13:30 更新剩餘秒數
  countdownFormatted: string;    // 格式化倒數計時 (例: 02:45:18)
  slotKey: string;               // 唯一時段識別碼 (例如: 2026-10-22_post1330)
  isMarketOpenHours: boolean;    // 是否處於台股常態開盤時段 (09:00 ~ 13:30)
}

/**
 * 取得當前「每日下午 13:30 收盤價」定時更新排程狀態
 */
export function getScheduleStatus(currentDate = new Date()): ScheduleStatus {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const date = currentDate.getDate();

  // 構造當日 09:00 與 13:30 (每日收盤價更新時間)
  const time0900 = new Date(year, month, date, 9, 0, 0, 0);
  const time1330 = new Date(year, month, date, 13, 30, 0, 0);
  const isMarketOpenHours = currentDate >= time0900 && currentDate < time1330;

  let currentPhaseTitle = '';
  let currentPhaseBadge = '';
  let nextScheduleTitle = '';
  let nextScheduleTimeStr = '下午 13:30 (每日收盤價)';
  let nextTargetDate: Date;
  let slotKey = '';

  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${year}-${pad(month + 1)}-${pad(date)}`;

  if (currentDate < time1330) {
    // 00:00 ~ 13:29: 尚未到達今日 13:30 收盤時間，下次更新為今日下午 13:30
    if (isMarketOpenHours) {
      currentPhaseTitle = '盤中交易進行中 (下午 13:30 更新收盤價)';
      currentPhaseBadge = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    } else {
      currentPhaseTitle = '前一日 13:30 每日收盤價基準';
      currentPhaseBadge = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
    }
    nextScheduleTitle = '今日下午 13:30 每日收盤價更新';
    nextTargetDate = time1330;
    slotKey = `${dateStr}_pre1330`;
  } else {
    // 13:30 ~ 23:59: 今日 13:30 收盤價已更新，下次更新為明日下午 13:30
    currentPhaseTitle = '今日下午 13:30 每日收盤價已更新';
    currentPhaseBadge = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    nextScheduleTitle = '明日下午 13:30 每日收盤價更新';
    nextTargetDate = new Date(year, month, date + 1, 13, 30, 0, 0);
    slotKey = `${dateStr}_post1330`;
  }

  const diffMs = Math.max(0, nextTargetDate.getTime() - currentDate.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const countdownFormatted = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return {
    currentPhaseTitle,
    currentPhaseBadge,
    nextScheduleTitle,
    nextScheduleTimeStr,
    timeRemainingSeconds: totalSeconds,
    countdownFormatted,
    slotKey,
    isMarketOpenHours,
  };
}

/**
 * 檢查是否跨越了每日下午 13:30 收盤價更新時間點
 */
export function checkHasCrossedSchedule(lastSlotKey: string | null): { shouldSync: boolean; newSlotKey: string } {
  const current = getScheduleStatus();
  if (!lastSlotKey) {
    return { shouldSync: false, newSlotKey: current.slotKey };
  }
  if (lastSlotKey !== current.slotKey) {
    return { shouldSync: true, newSlotKey: current.slotKey };
  }
  return { shouldSync: false, newSlotKey: lastSlotKey };
}
