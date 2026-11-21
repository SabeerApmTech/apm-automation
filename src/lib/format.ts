export const dash = '—'

/**
 * Shows the time as the API recorded it (no timezone shift) in 12-hour form,
 * e.g. "2026-11-19T17:04:46" becomes "2026-11-19 05:04:46 PM".
 */
export function formatDateTime(value: string | null | undefined) {
  if (!value) return dash
  const match = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(value)
  if (!match) return value
  const [, day, hours, minutes, seconds = '00'] = match
  const hour = Number(hours)
  const clock = String(hour % 12 || 12).padStart(2, '0')
  return `${day} ${clock}:${minutes}:${seconds} ${hour < 12 ? 'AM' : 'PM'}`
}

export function formatNumber(value: number | null | undefined) {
  return value === null || value === undefined ? dash : value.toLocaleString()
}

export function formatSpeed(value: number | null | undefined) {
  return value === null || value === undefined ? dash : `${value} km/h`
}

export function text(value: string | null | undefined) {
  return value && value.trim() ? value : dash
}

/** Formats a .NET TimeSpan string ("[d.]hh:mm:ss[.fffffff]") as e.g. "1m 12s". */
export function formatDuration(value: string | null | undefined) {
  if (!value) return dash
  const match = /^(?:(\d+)\.)?(\d+):(\d+):(\d+)(?:\.\d+)?$/.exec(value)
  if (!match) return value
  const [, d, h, m, s] = match
  const parts: string[] = []
  if (d && Number(d)) parts.push(`${Number(d)}d`)
  if (Number(h)) parts.push(`${Number(h)}h`)
  if (Number(m)) parts.push(`${Number(m)}m`)
  if (Number(s) || parts.length === 0) parts.push(`${Number(s)}s`)
  return parts.join(' ')
}

export type Tone = 'teal' | 'red' | 'yellow' | 'gray'

/** Maps free-text device states such as "ON", "Connected" or "Disconnected" to a badge tone. */
export function stateTone(value: string | null | undefined): Tone {
  const v = value?.trim().toLowerCase()
  if (!v) return 'gray'
  if (/^(off|no|false|disconnect|not|low)/.test(v)) return 'red'
  if (/^(on|yes|true|connect|ok|good)/.test(v)) return 'teal'
  return 'gray'
}
