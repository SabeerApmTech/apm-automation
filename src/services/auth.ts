import { useSyncExternalStore } from 'react'

/**
 * The API's JWT bearer token. It lives only in this tab's sessionStorage
 * (cleared when the tab closes) and is never bundled or logged.
 */
const STORAGE_KEY = 'automation.session'

interface AuthState {
  token: string | null
  username: string | null
  /** ISO timestamp after which the token is no longer accepted. */
  expiresAt: string | null
  /** Why the user was signed out, shown on the sign-in screen. */
  notice: string | null
}

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return false
  const time = Date.parse(expiresAt)
  return Number.isFinite(time) && time <= Date.now()
}

function load(): AuthState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AuthState>
      if (typeof parsed.token === 'string' && typeof parsed.username === 'string') {
        const expiresAt = typeof parsed.expiresAt === 'string' ? parsed.expiresAt : null
        if (!isExpired(expiresAt)) return { token: parsed.token, username: parsed.username, expiresAt, notice: null }
      }
    }
  } catch {
    // Storage unavailable or corrupt: start signed out.
  }
  return { token: null, username: null, expiresAt: null, notice: null }
}

let state = load()
const listeners = new Set<() => void>()

function set(next: AuthState) {
  state = next
  try {
    if (next.token) sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ token: next.token, username: next.username, expiresAt: next.expiresAt }))
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Non-fatal: the session just won't survive a refresh.
  }
  listeners.forEach((listener) => listener())
}

export function getAuthHeader() {
  if (state.token && isExpired(state.expiresAt)) {
    signOut('Your session has expired. Please sign in again.')
    return null
  }
  return state.token ? `Bearer ${state.token}` : null
}

export function signIn(token: string, username: string, expiresAt: string | null) {
  set({ token, username, expiresAt, notice: null })
}

export function signOut(notice: string | null = null) {
  if (!state.token && state.notice === notice) return
  set({ token: null, username: null, expiresAt: null, notice })
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useAuth() {
  const current = useSyncExternalStore(subscribe, () => state)
  return { isSignedIn: current.token !== null, username: current.username, notice: current.notice }
}
