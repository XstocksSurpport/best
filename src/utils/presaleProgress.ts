// Presale progress: deterministic from a fixed start time (same for all users).
// - Before start: 96.78%
// - From 2026-06-16 18:00 UTC+8: +0.02% per hour until 99.99%
// - At end of cycle (99.99%): resets to 96.78%, repeats forever

/** 2026/06/16 18:00 UTC+8 */
const PROGRESS_START_MS = new Date('2026-06-16T18:00:00+08:00').getTime()

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

const INITIAL_PROGRESS = 96.78
const PROGRESS_CAP = 99.99
const HOURLY_STEP = 0.02
/** 从 96.78% 增至 99.99% 所需小时数 = 3.21 / 0.02 */
const CYCLE_MS = ((PROGRESS_CAP - INITIAL_PROGRESS) / HOURLY_STEP) * HOUR_MS

/** 首次预售截止：北京时间 2026-04-15 日末；过期后每 15 天顺延，直至当前时间落在某一截止时刻之前 */
const FIRST_DEADLINE_MS = new Date('2026-04-15T23:59:59.999+08:00').getTime()
const PRESALE_EXTENSION_MS = 15 * DAY_MS

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function computeProgressAt(nowMs: number): number {
  if (nowMs < PROGRESS_START_MS) return round2(INITIAL_PROGRESS)

  const elapsed = nowMs - PROGRESS_START_MS
  const posMs = elapsed % CYCLE_MS
  const posHours = posMs / HOUR_MS
  return round2(INITIAL_PROGRESS + posHours * HOURLY_STEP)
}

export function getPresaleProgress(): number {
  const now = typeof window !== 'undefined' ? Date.now() : PROGRESS_START_MS
  return computeProgressAt(now)
}

export function getPresaleDeadline(): Date {
  const now = typeof window !== 'undefined' ? Date.now() : FIRST_DEADLINE_MS
  let deadlineMs = FIRST_DEADLINE_MS
  while (now > deadlineMs) {
    deadlineMs += PRESALE_EXTENSION_MS
  }
  return new Date(deadlineMs)
}

export function formatDeadline(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
