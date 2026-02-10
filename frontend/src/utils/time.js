// Utilities for parsing and formatting dates consistently across the frontend
// Reads defaults from Vite env variables: VITE_DEFAULT_TZ_OFFSET and VITE_TIMEZONE

export const DEFAULT_TZ_OFFSET = import.meta.env.VITE_DEFAULT_TZ_OFFSET || '+08:00'
export const DEFAULT_TIMEZONE = import.meta.env.VITE_TIMEZONE || 'Asia/Taipei'

export function parseDateTimeSafe(dateStr) {
  if (!dateStr) return null
  let s = String(dateStr).trim()
  // Normalize: replace space with 'T'
  if (s.includes(' ')) s = s.replace(' ', 'T')
  // Add seconds when missing
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) s = s + ':00'
  // 不再自動添加時區偏移 - 讓前端主動管理
  const d = new Date(s)
  if (isNaN(d.getTime())) return null
  return d
}

/**
 * 將 ISO 字符串轉換為台北時區的格式化字符串 (YYYY-MM-DD HH:MM)
 * 用於時間輸入欄位
 */
export function formatDateForTimezoneInput(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    
    // 使用 Intl.DateTimeFormat 以台北時區格式化為零件
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: DEFAULT_TIMEZONE
    })
    
    const parts = {}
    formatter.formatToParts(d).forEach(part => {
      parts[part.type] = part.value
    })
    
    return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`
  } catch (error) {
    console.error('Error formatting date for input:', error)
    return ''
  }
}

/**
 * 將使用者輸入的本地時間字符串轉換為 ISO 字符串
 * 例：輸入 "2026-02-06 14:30" → 輸出 "2026-02-06T14:30:00"
 * (時間戳直接在當前時區解析，後端根據需要進行時區轉換)
 */
export function parseLocalTimeInput(timeStr) {
  if (!timeStr) return ''
  try {
    // 將用戶輸入的 "YYYY-MM-DD HH:MM" 轉換為 ISO 格式
    const match = timeStr.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/)
    if (!match) return timeStr
    
    const [, year, month, day, hour, minute] = match
    // 返回 ISO 字符串，不帶時區信息（讓後端根據用戶時區設定進行轉換）
    return `${year}-${month}-${day}T${hour}:${minute}:00`
  } catch (error) {
    console.error('Error parsing user time input:', error)
    return timeStr
  }
}

export function formatDateTime(dateTime, locale = 'zh-TW', opts = {}) {
  if (!dateTime) return '-'
  const d = new Date(dateTime)
  if (isNaN(d.getTime())) return dateTime
  const formatter = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: DEFAULT_TIMEZONE,
    ...opts
  })
  return formatter.format(d)
}

export function formatDateTimeForSubmit(dateValue = new Date(), timeZone = DEFAULT_TIMEZONE) {
  const d = dateValue instanceof Date ? dateValue : new Date(dateValue)
  if (isNaN(d.getTime())) return ''

  const formatter = new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone
  })

  const parts = {}
  formatter.formatToParts(d).forEach(part => {
    parts[part.type] = part.value
  })

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`
}

export function deriveEffectiveStatus(status, startTime, endTime) {
  // Return values (tokens):
  // 'draft.unpublished' -> 草稿但尚未到開始時間（未發布（草稿））
  // 'draft.pending'     -> 草稿但已到開始時間（待發布（草稿））
  // 'notStarted'        -> 已排程/進行中設定但尚未開始
  // 'inProgress'        -> 目前進行中
  // 'ended'             -> 已結束
  // 'cancelled'         -> 已取消

  if (status === 'Cancelled') return 'cancelled'

  const start = parseDateTimeSafe(startTime)
  const end = parseDateTimeSafe(endTime)
  const now = new Date()

  if (status === 'Draft') {
    if (!start) return 'draft.unpublished'
    return now < start ? 'draft.unpublished' : 'draft.pending'
  }

  // If marked Active (已發布／進行中)
  if (status === 'Active') {
    // If start/end missing, make a best-effort decision
    if (!start && !end) return 'inProgress'
    if (start && now < start) return 'notStarted'
    if (end && now > end) return 'ended'
    return 'inProgress'
  }

  // If marked Closed or end time passed -> ended
  if (status === 'Closed') return 'ended'
  if (end && now > end) return 'ended'

  // Fallbacks
  if (start && now < start) return 'notStarted'
  return status || 'draft.unpublished'
}
