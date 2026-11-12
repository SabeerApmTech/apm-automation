import type {
  CursorPage,
  ListQuery,
  StatusCursorPage,
  StatusListQuery,
  Vehicle,
} from '../types/api'
import { API_BASE_URL } from '../lib/config'
import { getAuthHeader } from './auth'
import { ApiError, extractMessage, failIfUnauthorized, readPayload, request } from './http'

export function getVehicles(query: ListQuery, signal?: AbortSignal, authorization?: string) {
  return request<CursorPage<Vehicle>>('/api/vehicles', { query: { ...query }, signal, authorization })
}

export function getVehicleStatuses(query: StatusListQuery, signal?: AbortSignal) {
  return request<StatusCursorPage>('/api/vehicles/status', { query: { ...query }, signal })
}

export const APP_FILE_NAME = 'Automation.exe'

/**
 * Downloads the Automation desktop app. A plain link can't send the Basic auth header,
 * so the file is fetched with it and handed back as a Blob.
 */
export async function downloadApp(onProgress: (received: number, total: number | null) => void) {
  const auth = getAuthHeader()
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}/api/vehicles/download-app`, {
      headers: auth ? { Authorization: auth } : {},
    })
  } catch {
    throw new ApiError('Unable to reach the server. Check your connection or try again shortly.', 0)
  }

  if (!response.ok) {
    failIfUnauthorized(response)
    const fallback =
      response.status === 404 ? 'The app is not available for download right now.' : `Download failed (${response.status})`
    throw new ApiError(extractMessage(await readPayload(response), fallback), response.status)
  }

  const length = Number(response.headers.get('content-length'))
  const total = Number.isFinite(length) && length > 0 ? length : null
  if (!response.body) return response.blob()

  const reader = response.body.getReader()
  const chunks: Uint8Array<ArrayBuffer>[] = []
  let received = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value as Uint8Array<ArrayBuffer>)
      received += value.byteLength
      onProgress(received, total)
    }
  } catch {
    throw new ApiError('The download was interrupted. Please try again.', 0)
  }
  return new Blob(chunks, { type: 'application/octet-stream' })
}
