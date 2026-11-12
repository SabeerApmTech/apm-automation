const DEFAULT_API_BASE_URL = 'https://automationapi.apmiot.com'

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL
).replace(/\/+$/, '')

/** Rows requested per page from the keyset-paginated list endpoints. */
export const PAGE_SIZE = 100
