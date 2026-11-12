import { useSyncExternalStore } from 'react'

/**
 * HTTP Basic credentials for the API. They live only in this tab's sessionStorage
 * (cleared when the tab closes) and are never bundled or logged.
 */
const STORAGE_KEY = 'automation.session'

interface AuthState {
  token: string | null
  username: string | null
  /** Why the user was signed out, shown on the sign-in screen. */
  notice: string | null
}

function load(): AuthState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AuthState>
      if (typeof parsed.token === 'string' && typeof parsed.username === 'string') {
        return { token: parsed.token, username: parsed.username, notice: null }
      }
    }
  } catch {
    // Storage unavailable or corrupt: start signed out.
  }
  return { token: null, username: null, notice: null }
}

let state = load()
const listeners = new Set<() => void>()

function set(next: AuthState) {
  state = next
  try {
    if (next.token) sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ token: next.token, username: next.username }))
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Non-fatal: the session just won't survive a refresh.
  }
  listeners.forEach((listener) => listener())
}

/** Builds the `Authorization` header value; UTF-8 safe so non-ASCII passwords work. */
export function basicHeader(username: string, password: string) {
  const bytes = new TextEncoder().encode(`${username}:${password}`)
  return `Basic ${btoa(String.fromCharCode(...bytes))}`
}

export function getAuthHeader() {
  return state.token ? `Basic ${state.token}` : null
}

export function signIn(username: string, header: string) {
  set({ token: header.replace(/^Basic /, ''), username, notice: null })
}

export function signOut(notice: string | null = null) {
  if (!state.token && state.notice === notice) return
  set({ token: null, username: null, notice })
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useAuth() {
  const current = useSyncExternalStore(subscribe, () => state)
  return { isSignedIn: current.token !== null, username: current.username, notice: current.notice }
}
