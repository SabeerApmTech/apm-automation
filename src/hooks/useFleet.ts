import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ApiError, isAbortError } from '../services/http'
import { getVehicles } from '../services/vehicles'
import type { StatusCursorPage, Vehicle, VehicleListItem, VehicleStatusView } from '../types/api'

/** Status records requested per click: the first chunk on open, then one more per "Load more". */
export const CHUNK_SIZE = 100

export interface FleetFilters {
  search: string
  /** true = active only, false = inactive only, undefined = all. */
  surakshaMitrActive?: boolean
  apmConnectActive?: boolean
  /** Order by Suraksha Mitr time. */
  order: 'asc' | 'desc'
}

export interface FleetRow {
  vehicle: Vehicle
  /** Null until the automation has fetched a status for the vehicle. */
  status: VehicleStatusView | null
}

interface State {
  key: string
  items: VehicleListItem[]
  hasMore: boolean
  total: number | null
  nextSkip: number
  error: ApiError | null
  loadingMore: boolean
}

function toRow({ status, portalStatus, ...vehicle }: VehicleListItem): FleetRow {
  return { vehicle: { ...vehicle, status: portalStatus }, status }
}

/** Every row matching the filters (not just the loaded ones), fetched in the largest pages the API allows. */
export async function fetchEveryRow(filters: FleetFilters): Promise<FleetRow[]> {
  const items: VehicleListItem[] = []
  let skip = 0
  for (;;) {
    const page = await getVehicles(pageQuery(filters, skip, 1000))
    items.push(...page.items)
    // A page that adds nothing would repeat forever; treat it as the end.
    if (!page.hasMore || page.items.length === 0) break
    skip = page.nextSkip ?? skip + page.items.length
  }
  return items.map(toRow)
}

function toError(error: unknown) {
  return error instanceof ApiError
    ? error
    : new ApiError(error instanceof Error ? error.message : 'Unexpected error', -1)
}

function pageQuery(filters: FleetFilters, skip: number, take = CHUNK_SIZE) {
  return {
    take,
    skip,
    search: filters.search || undefined,
    isSurakshaMitrActive: filters.surakshaMitrActive,
    isApmConnectActive: filters.apmConnectActive,
    sort: filters.order === 'asc' ? ('surakshaMitrDateTime_asc' as const) : ('surakshaMitrDateTime_desc' as const),
  }
}

function toState(key: string, page: StatusCursorPage, previous: VehicleListItem[], skip: number): State {
  const items = previous.concat(page.items)
  // A page that adds nothing would repeat forever; treat it as the end.
  const advanced = page.items.length > 0
  return {
    key,
    items,
    hasMore: page.hasMore && advanced,
    total: page.totalCount,
    nextSkip: page.nextSkip ?? skip + page.items.length,
    error: null,
    loadingMore: false,
  }
}

/**
 * Status records filtered, searched and ordered by the API, loaded in chunks of CHUNK_SIZE:
 * only the first chunk loads on its own, every further chunk needs an explicit loadMore().
 */
export function useFleet(filters: FleetFilters) {
  const key = JSON.stringify(filters)
  const [reloadToken, setReloadToken] = useState(0)
  const [state, setState] = useState<State | null>(null)
  const fullKey = `${key}#${reloadToken}`
  const filtersRef = useRef(filters)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    filtersRef.current = filters
  })

  useEffect(() => {
    const controller = new AbortController()
    controllerRef.current = controller
    getVehicles(pageQuery(filtersRef.current, 0), controller.signal)
      .then((page) => setState(toState(fullKey, page, [], 0)))
      .catch((error: unknown) => {
        if (isAbortError(error)) return
        setState({ key: fullKey, items: [], hasMore: false, total: null, nextSkip: 0, error: toError(error), loadingMore: false })
      })
    return () => controller.abort()
  }, [fullKey])

  const current = state?.key === fullKey ? state : null

  const loadMore = useCallback(() => {
    if (!current || current.loadingMore || !current.hasMore) return
    const controller = new AbortController()
    controllerRef.current = controller
    setState({ ...current, loadingMore: true, error: null })
    getVehicles(pageQuery(filtersRef.current, current.nextSkip), controller.signal)
      .then((page) => setState(toState(fullKey, page, current.items, current.nextSkip)))
      .catch((error: unknown) => {
        if (isAbortError(error)) return
        // Keep what is loaded; Load more retries the same chunk.
        setState({ ...current, loadingMore: false, error: toError(error) })
      })
  }, [current, fullKey])

  const rows = useMemo<FleetRow[]>(() => (current?.items ?? []).map(toRow), [current?.items])

  const reload = useCallback(() => {
    controllerRef.current?.abort()
    setReloadToken((t) => t + 1)
  }, [])

  return {
    rows,
    /** True until the first chunk (or an error) has arrived for the current filters. */
    isLoading: current === null,
    loadingMore: current?.loadingMore ?? false,
    hasMore: current?.hasMore ?? false,
    /** Status records matching the filters on the server, not just the loaded ones. */
    total: current?.total ?? null,
    error: current?.error ?? null,
    reload,
    loadMore,
  }
}
