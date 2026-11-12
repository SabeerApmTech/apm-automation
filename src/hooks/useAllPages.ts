import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, isAbortError } from '../services/http'
import type { CursorPage } from '../types/api'

/** Largest page the API allows; used to pull a whole list in few requests. */
export const FETCH_SIZE = 1000

export interface Source<T> {
  items: T[]
  /** True once the last page arrived or loading stopped on an error. */
  done: boolean
  error: ApiError | null
}

const NOTHING: Source<never> = { items: [], done: false, error: null }

function toError(error: unknown) {
  return error instanceof ApiError
    ? error
    : new ApiError(error instanceof Error ? error.message : 'Unexpected error', -1)
}

/** Walks every page of a keyset list, reporting after each one so the UI can fill in progressively. */
async function loadAll<T>(
  fetchPage: (afterId: number | null, signal: AbortSignal) => Promise<CursorPage<T>>,
  signal: AbortSignal,
  onUpdate: (source: Source<T>) => void,
) {
  let items: T[] = []
  let afterId: number | null = null
  try {
    for (;;) {
      const page: CursorPage<T> = await fetchPage(afterId, signal)
      items = items.concat(page.items)
      // A cursor that does not advance would loop forever; treat it as the end.
      const done = !page.hasMore || page.nextAfterId === null || page.nextAfterId === afterId
      onUpdate({ items, done, error: null })
      if (done) return
      afterId = page.nextAfterId
    }
  } catch (error) {
    if (isAbortError(error)) return
    // Keep what was loaded so far; the caller shows the error next to the partial data.
    onUpdate({ items, done: true, error: toError(error) })
  }
}

/** Fetches every page of a keyset list in one go and resolves with all items. */
export function fetchEveryPage<T>(
  fetchPage: (afterId: number | null, signal: AbortSignal) => Promise<CursorPage<T>>,
) {
  return new Promise<T[]>((resolve, reject) => {
    void loadAll(fetchPage, new AbortController().signal, (source) => {
      if (!source.done) return
      if (source.error) reject(source.error)
      else resolve(source.items)
    })
  })
}

/**
 * Loads an entire keyset list in the background. `key` must change whenever the query
 * changes; stale results are dropped and in-flight requests aborted.
 */
export function useAllPages<T>(
  key: string,
  fetchPage: (afterId: number | null, signal: AbortSignal) => Promise<CursorPage<T>>,
) {
  const [reloadToken, setReloadToken] = useState(0)
  const [state, setState] = useState<{ key: string; source: Source<T> } | null>(null)
  const fetchRef = useRef(fetchPage)
  const fullKey = `${key}#${reloadToken}`

  useEffect(() => {
    fetchRef.current = fetchPage
  })

  useEffect(() => {
    const controller = new AbortController()
    void loadAll(
      (afterId, signal) => fetchRef.current(afterId, signal),
      controller.signal,
      (source) => setState({ key: fullKey, source }),
    )
    return () => controller.abort()
  }, [fullKey])

  const reload = useCallback(() => setReloadToken((t) => t + 1), [])
  const source: Source<T> = state?.key === fullKey ? state.source : NOTHING
  return { ...source, reload }
}
