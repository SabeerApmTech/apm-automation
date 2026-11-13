/** Types mirror the Automation API (Automation.dll DTOs and models, JSON camelCase). */

export interface LoginResponse {
  token: string | null
  expiresAt?: string
  username: string | null
}

export interface Vehicle {
  id: number
  vehicleNo: string | null
  chassisNo: string | null
  imei: string | null
  owner: string | null
  ownerAddress: string | null
  ownerMobile: string | null
  rto: string | null
  state: string | null
  vehicleClass: string | null
  vltModel: string | null
  manufacturer: string | null
  status: string | null
  franchisee: string | null
  createdAt: string
  updatedAt: string | null
}

export interface VehicleStatusView {
  id: number
  vehicleListId: number
  imei: string | null
  surakshaMitrDateTime: string | null
  apmDeviceTime: string | null
  mainPower: string | null
  ignition: string | null
  speed: number | null
  isSurakshaMitrActive: boolean | null
  isApmConnectActive: boolean | null
  alerts: string | null
  updatedAt: string | null
}

export interface CursorPage<T> {
  /** Records matching the search (not just this page). */
  totalCount: number
  items: T[]
  hasMore: boolean
  nextAfterId: number | null
}

export interface StatusCursorPage extends CursorPage<VehicleStatusView> {
  /** Fleet-wide per-product totals returned with every status page. */
  surakshaMitrActiveCount: number
  apmConnectActiveCount: number
  surakshaMitrInactiveCount: number
  apmConnectInactiveCount: number
  /** Vehicles inactive in both Suraksha Mitr and APM Connect. */
  inactiveInBothCount: number
  /** Next `skip` when paging a surakshaMitrDateTime sort; null for the id sort. */
  nextSkip: number | null
}

export interface ListQuery {
  afterId?: number | null
  take?: number
  search?: string
}

export type StatusSort = 'id_asc' | 'surakshaMitrDateTime_asc' | 'surakshaMitrDateTime_desc'

export interface StatusListQuery extends ListQuery {
  /** Filter on the Suraksha Mitr / APM Connect active flags (combined with AND). */
  isSurakshaMitrActive?: boolean
  isApmConnectActive?: boolean
  /** Default is id_asc (page with afterId). The surakshaMitrDateTime sorts are paged with skip instead. */
  sort?: StatusSort
  skip?: number
}

/** The Suraksha Mitr portal login the automation uses. */
export interface SurakshaMitrCredential {
  username: string | null
  password: string | null
  remarks: string | null
  updatedAt: string | null
}

export interface UpdateSurakshaMitrCredentialRequest {
  username: string
  password: string
}
