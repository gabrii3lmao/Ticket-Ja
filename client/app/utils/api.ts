type RequestHeaders = Record<string, string>

export interface ApiClient {
  get: <T>(url: string, params?: Record<string, unknown>) => Promise<T>
  post: <T>(url: string, body?: unknown, extraHeaders?: RequestHeaders) => Promise<T>
  put: <T>(url: string, body?: unknown) => Promise<T>
  patch: <T>(url: string, body?: unknown) => Promise<T>
  del: <T>(url: string, body?: unknown) => Promise<T>
}

function cleanParams(
  params?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!params) return undefined
  const entries = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== null && value !== '',
  )
  return entries.length ? Object.fromEntries(entries) : undefined
}

export function createApiClient(baseURL: string, token: string | null | undefined): ApiClient {
  const headers: RequestHeaders = token ? { Authorization: `Bearer ${token}` } : {}

  return {
    get: <T>(url: string, params?: Record<string, unknown>) =>
      $fetch<T>(`${baseURL}${url}`, { method: 'GET', params: cleanParams(params), headers }),
    post: <T>(url: string, body?: unknown, extraHeaders?: RequestHeaders) =>
      $fetch<T>(`${baseURL}${url}`, {
        method: 'POST',
        body,
        headers: { ...headers, ...extraHeaders },
      }),
    put: <T>(url: string, body?: unknown) =>
      $fetch<T>(`${baseURL}${url}`, { method: 'PUT', body, headers }),
    patch: <T>(url: string, body?: unknown) =>
      $fetch<T>(`${baseURL}${url}`, { method: 'PATCH', body, headers }),
    del: <T>(url: string, body?: unknown) =>
      $fetch<T>(`${baseURL}${url}`, { method: 'DELETE', body, headers }),
  }
}
