import type {
  QueueImeisResult,
  StatusCursorPage,
  StatusListQuery,
  SurakshaMitrCredential,
  UpdateSurakshaMitrCredentialRequest,
} from '../types/api'
import { request } from './http'

/** Vehicles with their latest status, filtered/searched/sorted by the API. */
export function getVehicles(query: StatusListQuery, signal?: AbortSignal) {
  return request<StatusCursorPage>('/api/Vehicles', { query: { ...query }, signal })
}

/** Puts the given IMEIs at the front of the queue for a fresh status fetch. */
export function queueImeis(imeis: string[]) {
  return request<QueueImeisResult | undefined>('/api/Vehicles/status/imeis', { method: 'POST', body: imeis })
}

export function getSurakshaMitrCredential(signal?: AbortSignal) {
  return request<SurakshaMitrCredential>('/api/SurakshaMitrCredential', { signal })
}

export function updateSurakshaMitrCredential(body: UpdateSurakshaMitrCredentialRequest) {
  return request<SurakshaMitrCredential | undefined>('/api/SurakshaMitrCredential', { method: 'PUT', body })
}
