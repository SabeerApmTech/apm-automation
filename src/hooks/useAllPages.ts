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

/** Finished lists are kept for a while so revisiting a page doesn't download them again. */
const CACHE_MS = 10 * 60 * 1000
const cache = new Map<string, { at: number; items: unknown[] }>()

function cached<T>(key: string): Source<T> | null {
  const hit = cache.get(key)
  if (!hit || Date.now() - hit.at > CACHE_MS) return null
  return { items: hit.items as T[], done: true, error: null }
}

/** Progress is reported every few pages: each report re-renders everything that shows the list. */
const REPORT_EVERY = 4

export interface LoadOptions<T> {
  /**
   * Pages requested at once after the first. Needs keyOf (ascending ids). Each guessed cursor is
   * the previous one plus FETCH_SIZE; a page holds FETCH_SIZE ids, so neighbouring guesses always
   * overlap or touch and nothing is skipped. Overlaps are dropped by id.
   */
  concurrency?: number
  keyOf?: (item: T) => number
}

/** Walks every page of a keyset list, reporting as it goes so the UI can fill in progressively. */
async function loadAll<T>(
  fetchPage: (afterId: number | null, signal: AbortSignal) => Promise<CursorPage<T>>,
  signal: AbortSignal,
  onUpdate: (source: Source<T>) => void,
  { concurrency = 1, keyOf }: LoadOptions<T> = {},
) {
  const parallel = concurrency > 1 && keyOf !== undefined
  const byKey = new Map<number, T>()
  let items: T[] = []
  let afterId: number | null = null
  let pages = 0
  try {
    for (;;) {
      let done: boolean
      let next: number | null
      if (parallel && afterId !== null) {
        const cursor: number = afterId
        const batch = await Promise.all(
          Array.from({ length: concurrency }, (_, i) => fetchPage(cursor + FETCH_SIZE * i, signal)),
        )
        for (const page of batch) for (const item of page.items) byKey.set(keyOf(item), item)
        items = [...byKey.values()]
        // The page that got furthest decides whether anything remains.
        const furthest = batch.reduce<CursorPage<T> | null>(
          (best, page) => (page.nextAfterId !== null && (!best || page.nextAfterId > (best.nextAfterId ?? 0)) ? page : best),
          null,
        )
        next = furthest?.nextAfterId ?? null
        done = !furthest || !furthest.hasMore || next === afterId
      } else {
        const page: CursorPage<T> = await fetchPage(afterId, signal)
        if (parallel) for (const item of page.items) byKey.set(keyOf(item), item)
        items = parallel ? [...byKey.values()] : items.concat(page.items)
        next = page.nextAfterId
        // A cursor that does not advance would loop forever; treat it as the end.
        done = !page.hasMore || next === null || next === afterId
      }
      pages += 1
      if (done || parallel || pages === 1 || pages % REPORT_EVERY === 0) onUpdate({ items, done, error: null })
      if (done) return
      afterId = next
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
  /** Hold the download back, e.g. until more important data has arrived. */
  enabled = true,
  options?: LoadOptions<T>,
) {
  const [reloadToken, setReloadToken] = useState(0)
  const [state, setState] = useState<{ key: string; source: Source<T> } | null>(null)
  const fetchRef = useRef(fetchPage)
  const optionsRef = useRef(options)
  const fullKey = `${key}#${reloadToken}`

  useEffect(() => {
    fetchRef.current = fetchPage
    optionsRef.current = options
  })

  const hit = cached<T>(key)

  useEffect(() => {
    if (!enabled || cached(key)) return
    const controller = new AbortController()
    void loadAll(
      (afterId, signal) => fetchRef.current(afterId, signal),
      controller.signal,
      (source) => {
        if (source.done && !source.error) cache.set(key, { at: Date.now(), items: source.items })
        setState({ key: fullKey, source })
      },
      optionsRef.current,
    )
    return () => controller.abort()
  }, [fullKey, key, enabled])

  const reload = useCallback(() => {
    cache.delete(key)
    setReloadToken((t) => t + 1)
  }, [key])
  const source: Source<T> = hit && reloadToken === 0 ? hit : state?.key === fullKey ? state.source : NOTHING
  return { ...source, reload }
}
