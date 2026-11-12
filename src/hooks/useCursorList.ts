import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, isAbortError } from '../services/http'
import type { CursorPage } from '../types/api'

interface State<T> {
  /** Request key this state belongs to; a mismatch with the current key means "loading". */
  key: string
  items: T[]
  hasMore: boolean
  nextAfterId: number | null
  error: ApiError | null
  loadMoreError: ApiError | null
  loadingMore: boolean
}

function toError(error: unknown) {
  return error instanceof ApiError
    ? error
    : new ApiError(error instanceof Error ? error.message : 'Unexpected error', -1)
}

/**
 * Loads a keyset-paginated list (afterId/hasMore/nextAfterId) and accumulates pages.
 * `key` must change whenever the filters change; obsolete requests are aborted and
 * their results are discarded so stale data never overwrites newer results.
 */
export function useCursorList<T>(
  key: string,
  fetchPage: (afterId: number | null, signal: AbortSignal) => Promise<CursorPage<T>>,
) {
  const [reloadToken, setReloadToken] = useState(0)
  const [state, setState] = useState<State<T> | null>(null)
  const fetchRef = useRef(fetchPage)
  const moreController = useRef<AbortController | null>(null)
  const currentKey = `${key}#${reloadToken}`

  useEffect(() => {
    fetchRef.current = fetchPage
  })

  useEffect(() => {
    const controller = new AbortController()
    fetchRef
      .current(null, controller.signal)
      .then((page) =>
        setState({
          key: currentKey,
          items: page.items,
          hasMore: page.hasMore,
          nextAfterId: page.nextAfterId,
          error: null,
          loadMoreError: null,
          loadingMore: false,
        }),
      )
      .catch((error: unknown) => {
        if (isAbortError(error)) return
        setState({
          key: currentKey,
          items: [],
          hasMore: false,
          nextAfterId: null,
          error: toError(error),
          loadMoreError: null,
          loadingMore: false,
        })
      })
    return () => {
      controller.abort()
      moreController.current?.abort()
    }
  }, [currentKey])

  const current = state?.key === currentKey ? state : null

  const loadMore = useCallback(() => {
    if (!current || !current.hasMore || current.loadingMore || current.nextAfterId === null) return
    const afterId = current.nextAfterId
    const controller = new AbortController()
    moreController.current = controller
    setState((s) => (s ? { ...s, loadingMore: true, loadMoreError: null } : s))
    fetchRef
      .current(afterId, controller.signal)
      .then((page) =>
        setState((s) =>
          s && s.key === currentKey
            ? {
                ...s,
                items: [...s.items, ...page.items],
                hasMore: page.hasMore,
                nextAfterId: page.nextAfterId,
                loadingMore: false,
              }
            : s,
        ),
      )
      .catch((error: unknown) => {
        if (isAbortError(error)) return
        setState((s) =>
          s && s.key === currentKey
            ? { ...s, loadingMore: false, loadMoreError: toError(error) }
            : s,
        )
      })
  }, [current, currentKey])

  const reload = useCallback(() => setReloadToken((t) => t + 1), [])

  return {
    items: current?.items ?? [],
    hasMore: current?.hasMore ?? false,
    isLoading: current === null,
    isLoadingMore: current?.loadingMore ?? false,
    error: current?.error ?? null,
    loadMoreError: current?.loadMoreError ?? null,
    loadMore,
    reload,
  }
}
