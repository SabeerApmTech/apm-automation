const dateTime = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export const dash = '—'

export function formatDateTime(value: string | null | undefined) {
  if (!value) return dash
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  // The API sends 0001-01-01 for "no time recorded".
  return date.getFullYear() < 1970 ? dash : dateTime.format(date)
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
