import { useCallback, useEffect, useState } from 'react'
import { ApiError, isAbortError } from '../services/http'
import { getVehicles } from '../services/vehicles'

export interface StatusSummary {
  vehicles: number
  /** Vehicles with Suraksha Mitr or APM Connect active. */
  active: number
  /** Vehicles with both Suraksha Mitr and APM Connect inactive. */
  inactive: number
  surakshaMitrActive: number
  surakshaMitrInactive: number
  apmConnectActive: number
  apmConnectInactive: number
}

interface State {
  token: number
  summary: StatusSummary | null
  error: ApiError | null
}

/** Fleet-wide totals straight from the API: one tiny request. */
export function useStatusSummary() {
  const [reloadToken, setReloadToken] = useState(0)
  const [state, setState] = useState<State | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    getVehicles({ take: 1 }, signal)
      .then((page) =>
        setState({
          token: reloadToken,
          summary: {
            vehicles: page.totalCount,
            // Every vehicle is active on at least one product unless it is inactive on both.
            active: Math.max(page.totalCount - page.inactiveInBothCount, 0),
            inactive: page.inactiveInBothCount,
            surakshaMitrActive: page.surakshaMitrActiveCount,
            surakshaMitrInactive: page.surakshaMitrInactiveCount,
            apmConnectActive: page.apmConnectActiveCount,
            apmConnectInactive: page.apmConnectInactiveCount,
          },
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
