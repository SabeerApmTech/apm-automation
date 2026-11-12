import type {
  CursorPage,
  ListQuery,
  StatusCursorPage,
  StatusListQuery,
  SurakshaMitrCredential,
  UpdateSurakshaMitrCredentialRequest,
  Vehicle,
} from '../types/api'
import { request } from './http'

export function getVehicles(query: ListQuery, signal?: AbortSignal) {
  return request<CursorPage<Vehicle>>('/api/Vehicles', { query: { ...query }, signal })
}

export function getVehicleStatuses(query: StatusListQuery, signal?: AbortSignal) {
  return request<StatusCursorPage>('/api/Vehicles/status', { query: { ...query }, signal })
}

export function getSurakshaMitrCredential(signal?: AbortSignal) {
  return request<SurakshaMitrCredential>('/api/SurakshaMitrCredential', { signal })
}

export function updateSurakshaMitrCredential(body: UpdateSurakshaMitrCredentialRequest) {
  return request<SurakshaMitrCredential | undefined>('/api/SurakshaMitrCredential', { method: 'PUT', body })
}
