import type { LoginResponse } from '../types/api'
import { signIn, signOut } from './auth'
import { ApiError, request } from './http'

/** Signs in against the API and stores the returned JWT for this tab. */
export async function login(username: string, password: string, signal?: AbortSignal) {
  const result = await request<LoginResponse>('/api/Authentication/login', {
    method: 'POST',
    body: { username, password },
    authenticated: false,
    signal,
  })
  if (!result?.token) throw new ApiError('The server did not return a session token.', 500)
  signIn(result.token, result.username?.trim() || username, result.expiresAt ?? null)
}

/** Ends the session locally and tells the API (best effort: a failure never blocks sign-out). */
export async function logout() {
  try {
    await request<void>('/api/Authentication/logout', { method: 'POST' })
  } catch {
    // The token is dropped below either way.
  }
  signOut()
}
