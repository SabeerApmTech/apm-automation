import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useDebouncedValue } from './useDebouncedValue'

/**
 * Search box + extra filters persisted in the URL query string, so filters survive
 * refreshes, back/forward navigation and shared links. Typing is debounced before it
 * reaches the URL (and therefore the API).
 */
export function useUrlFilters(extraKeys: readonly string[] = []) {
  const [params, setParams] = useSearchParams()
  const committedSearch = params.get('q') ?? ''
  const [input, setInput] = useState(committedSearch)
  const debounced = useDebouncedValue(input)

  useEffect(() => {
    const next = debounced.trim()
    setParams(
      (prev) => {
        if ((prev.get('q') ?? '') === next) return prev
        const updated = new URLSearchParams(prev)
        if (next) updated.set('q', next)
        else updated.delete('q')
        return updated
      },
      { replace: true },
    )
  }, [debounced, setParams])

  const setParam = useCallback(
    (key: string, value: string | null) => {
      setParams(
        (prev) => {
          const updated = new URLSearchParams(prev)
          if (value) updated.set(key, value)
          else updated.delete(key)
          return updated
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const reset = useCallback(() => {
    setInput('')
    setParams(new URLSearchParams(), { replace: true })
  }, [setParams])

  const extras = Object.fromEntries(extraKeys.map((k) => [k, params.get(k)]))
  const isFiltered = committedSearch !== '' || extraKeys.some((k) => params.get(k) !== null)

  return { input, setInput, search: committedSearch, extras, setParam, reset, isFiltered }
}
