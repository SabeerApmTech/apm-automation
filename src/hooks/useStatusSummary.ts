import { useCallback, useEffect, useState } from 'react'
import { ApiError, isAbortError } from '../services/http'
import { getVehicles, getVehicleStatuses } from '../services/vehicles'

export interface StatusSummary {
  vehicles: number
  active: number
  inactive: number
}

interface State {
  token: number
  summary: StatusSummary | null
  error: ApiError | null
}

/** Fleet-wide totals straight from the API (one tiny request each), no paging needed. */
export function useStatusSummary() {
  const [reloadToken, setReloadToken] = useState(0)
  const [state, setState] = useState<State | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([getVehicles({ take: 1 }, controller.signal), getVehicleStatuses({ take: 1 }, controller.signal)])
      .then(([vehicles, statuses]) =>
        setState({
          token: reloadToken,
          summary: { vehicles: vehicles.totalCount, active: statuses.activeCount, inactive: statuses.inactiveCount },
          error: null,
        }),
      )
      .catch((error: unknown) => {
        if (isAbortError(error)) return
        setState({
          token: reloadToken,
          summary: null,
          error: error instanceof ApiError ? error : new ApiError('Unexpected error', -1),
        })
      })
    return () => controller.abort()
  }, [reloadToken])

  const current = state?.token === reloadToken ? state : null
  const reload = useCallback(() => setReloadToken((t) => t + 1), [])
  return { summary: current?.summary ?? null, error: current?.error ?? null, isLoading: current === null, reload }
}
