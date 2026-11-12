import { useCallback, useEffect, useState } from 'react'
import { ApiError, isAbortError } from '../services/http'
import { getSurakshaMitrCredential } from '../services/vehicles'
import type { SurakshaMitrCredential } from '../types/api'

/** Loads the Suraksha Mitr login (and its remarks) once, with a manual reload. */
export function useCredential() {
  const [reloadToken, setReloadToken] = useState(0)
  const [credential, setCredential] = useState<SurakshaMitrCredential | null>(null)
  const [error, setError] = useState<ApiError | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    getSurakshaMitrCredential(controller.signal)
      .then((result) => {
        setCredential(result ?? null)
        setError(null)
      })
      .catch((e: unknown) => {
        if (isAbortError(e)) return
        setError(e instanceof ApiError ? e : new ApiError('Unexpected error', -1))
      })
    return () => controller.abort()
  }, [reloadToken])

  const reload = useCallback(() => setReloadToken((t) => t + 1), [])
  return { credential, error, reload }
}
