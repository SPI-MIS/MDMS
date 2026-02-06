// Utilities for formatting date/time consistently for API responses
// 注意：時間戳直接存儲，不添加假設的時區偏移
// 前端和後端需要根據用戶設定的時區來進行轉換

const DEFAULT_TZ_OFFSET = process.env.DEFAULT_TZ_OFFSET || '+08:00'

function pad(n) { return String(n).padStart(2,'0') }

/**
 * 將 MySQL DATETIME 轉換為 ISO 字符串，不添加時區假設
 * 儲存時間的牆上時間，讓前端根據用戶時區進行轉換
 */
function formatToISO(dateValue) {
  if (!dateValue) return null

  let d
  if (dateValue instanceof Date) d = dateValue
  else if (typeof dateValue === 'string') {
    // 嘗試解析 YYYY-MM-DD HH:MM:SS 或 ISO 字符串
    const s = dateValue.trim()
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/) 
    if (m) {
      const year = parseInt(m[1],10)
      const month = parseInt(m[2],10)-1
      const day = parseInt(m[3],10)
      const hour = parseInt(m[4] || '0',10)
      const minute = parseInt(m[5] || '0',10)
      const second = parseInt(m[6] || '0',10)
      d = new Date(year, month, day, hour, minute, second)
    } else {
      d = new Date(s)
      if (isNaN(d.getTime())) return dateValue
    }
  } else {
    return String(dateValue)
  }

  const yyyy = d.getFullYear()
  const MM = pad(d.getMonth()+1)
  const dd = pad(d.getDate())
  const hh = pad(d.getHours())
  const mm = pad(d.getMinutes())
  const ss = pad(d.getSeconds())

  // 返回 ISO 格式，不帶時區（讓前端根據用戶設定進行轉換）
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}:${ss}`
}

/**
 * 舊方法保留為向後相容 - 返回帶時區偏移的格式
 */
function formatToISOWithOffset(dateValue, offset = DEFAULT_TZ_OFFSET) {
  const iso = formatToISO(dateValue)
  if (!iso) return null
  return iso + offset
}

module.exports = { formatToISO, formatToISOWithOffset, DEFAULT_TZ_OFFSET }
