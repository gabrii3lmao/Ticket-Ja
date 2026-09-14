export interface ApiClient {
  get: <T>(url: string, params?: Record<string, unknown>) => Promise<T>
  post: <T>(url: string, body?: unknown) => Promise<T>
  put: <T>(url: string, body?: unknown) => Promise<T>
  patch: <T>(url: string, body?: unknown) => Promise<T>
  del: <T>(url: string, body?: unknown) => Promise<T>
}

export function createApiClient(baseURL: string, token: string | null | undefined): ApiClient {
  const headers = token ? { Authorization: `Bearer ${token}` } : {}

  return {
    get: <T>(url: string, params?: Record<string, unknown>) =>
      $fetch<T>(`${baseURL}${url}`, { method: 'GET', params, headers }),
    post: <T>(url: string, body?: unknown) =>
      $fetch<T>(`${baseURL}${url}`, { method: 'POST', body, headers }),
    put: <T>(url: string, body?: unknown) =>
      $fetch<T>(`${baseURL}${url}`, { method: 'PUT', body, headers }),
    patch: <T>(url: string, body?: unknown) =>
      $fetch<T>(`${baseURL}${url}`, { method: 'PATCH', body, headers }),
    del: <T>(url: string, body?: unknown) =>
      $fetch<T>(`${baseURL}${url}`, { method: 'DELETE', body, headers }),
  }
}
