import { API_BASE_URL } from '../lib/config'
import { getAuthHeader, signOut } from './auth'

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }

  get isNetwork() {
    return this.status === 0
  }
}

type QueryValue = string | number | boolean | null | undefined

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT'
  query?: Record<string, QueryValue>
  /** JSON request body (POST). */
  body?: unknown
  signal?: AbortSignal
  /** Set false for calls that must not carry (or react to) the session token, such as login. */
  authenticated?: boolean
}

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value))
    }
  }
  const qs = params.toString()
  return `${API_BASE_URL}${path}${qs ? `?${qs}` : ''}`
}

/** Pulls a readable message out of ProblemDetails, validation errors, {message}, or plain text. */
export function extractMessage(payload: unknown, fallback: string): string {
  if (typeof payload === 'string' && payload.trim()) return payload.trim()
  if (payload && typeof payload === 'object') {
    const p = payload as Record<string, unknown>
    if (typeof p.message === 'string' && p.message) return p.message
    if (typeof p.detail === 'string' && p.detail) return p.detail
    if (p.errors && typeof p.errors === 'object') {
      const msgs = Object.values(p.errors as Record<string, unknown>)
        .flat()
        .filter((m): m is string => typeof m === 'string')
      if (msgs.length) return msgs.join(' ')
    }
    if (typeof p.title === 'string' && p.title) return p.title
  }
  return fallback
}

export async function readPayload(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/** A rejected token ends the session; a failed sign-in attempt just reports the error. */
export function failIfUnauthorized(response: Response, authenticated = true) {
  if (response.status === 401 && authenticated) {
    signOut('Your session has expired or the credentials were rejected. Please sign in again.')
  }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body, signal, authenticated = true } = options
  const auth = authenticated ? getAuthHeader() : null

  let response: Response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(auth ? { Authorization: auth } : {}),
      },
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(
      'Unable to reach the server. Check your connection or try again shortly.',
      0,
    )
  }

  const payload = await readPayload(response)

  if (!response.ok) {
    failIfUnauthorized(response, authenticated)
    throw new ApiError(
      extractMessage(payload, `Request failed (${response.status} ${response.statusText})`.trim()),
      response.status,
    )
  }

  return payload as T
}

export function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}
