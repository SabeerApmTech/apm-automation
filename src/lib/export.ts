export type ExportFormat = 'csv' | 'xlsx'

const NUMERIC = /^-?\d+(\.\d+)?$/
const FORMULA_START = /^[=+\-@\t\r]/

/** Stops spreadsheet apps from running cell text as a formula (CSV injection). */
function safeCell(value: string) {
  return FORMULA_START.test(value) && !NUMERIC.test(value) ? `'${value}` : value
}

function toCsv(headers: string[], rows: string[][]) {
  const escape = (value: string) => {
    const safe = safeCell(value)
    return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
  }
  const lines = [headers, ...rows].map((line) => line.map(escape).join(','))
  // BOM keeps Excel from mangling non-ASCII text.
  return new Blob(['﻿', lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
}

async function toXlsx(headers: string[], rows: string[][]) {
  const { default: writeExcelFile } = await import('write-excel-file/browser')
  const sheet = [
    headers.map((value) => ({ value, fontWeight: 'bold' as const })),
    // Everything is written as text so long IMEIs keep every digit.
    ...rows.map((line) => line.map((value) => ({ value, type: String }))),
  ]
  return writeExcelFile(sheet).toBlob()
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function exportTable(format: ExportFormat, baseName: string, headers: string[], rows: string[][]) {
  const stamp = new Date().toISOString().slice(0, 10)
  const blob = format === 'csv' ? toCsv(headers, rows) : await toXlsx(headers, rows)
  saveBlob(blob, `${baseName}-${stamp}.${format}`)
}
