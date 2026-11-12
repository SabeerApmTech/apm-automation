/** Types mirror the Automation API (Automation.dll DTOs and models, JSON camelCase). */

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
  statusDateTime: string | null
  mainPower: string | null
  ignition: string | null
  speed: number | null
  isActive: boolean | null
  alerts: string | null
  createdAt: string
  updatedAt: string | null
}

export interface CursorPage<T> {
  /** Records matching the search (not just this page). */
  totalCount: number
  items: T[]
  hasMore: boolean
  nextAfterId: number | null
}

/** Status pages also carry the active/inactive totals for the current search. */
export interface StatusCursorPage extends CursorPage<VehicleStatusView> {
  activeCount: number
  inactiveCount: number
  /** Next `skip` when paging a statusDateTime sort; null for the id sort. */
  nextSkip: number | null
}

export interface ListQuery {
  afterId?: number | null
  take?: number
  search?: string
}

export type StatusSort = 'id_asc' | 'statusDateTime_asc' | 'statusDateTime_desc'

export interface StatusListQuery extends ListQuery {
  isActive?: boolean
  /** Default is id_asc (page with afterId). The statusDateTime sorts are paged with skip instead. */
  sort?: StatusSort
  skip?: number
}
