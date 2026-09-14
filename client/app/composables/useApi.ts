import { createApiClient } from '~/utils/api'
import { useAuthStore } from '~/stores/auth'

export function useApi() {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()
  const router = useRouter()

  const client = computed(() =>
    createApiClient(config.public.apiBase as string, authStore.token),
  )

  function handle401() {
    authStore.clearSession()
    router.push('/login')
  }

  async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    try {
      return await client.value.get<T>(url, params)
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) handle401()
      throw error
    }
  }

  async function apiPost<T>(url: string, body?: unknown): Promise<T> {
    try {
      return await client.value.post<T>(url, body)
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) handle401()
      throw error
    }
  }

  async function apiPut<T>(url: string, body?: unknown): Promise<T> {
    try {
      return await client.value.put<T>(url, body)
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) handle401()
      throw error
    }
  }

  async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
    try {
      return await client.value.patch<T>(url, body)
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) handle401()
      throw error
    }
  }

  async function apiDel<T>(url: string, body?: unknown): Promise<T> {
    try {
      return await client.value.del<T>(url, body)
    } catch (error: unknown) {
      if (isUnauthorizedError(error)) handle401()
      throw error
    }
  }

  return { apiGet, apiPost, apiPut, apiPatch, apiDel, client }
}

function isUnauthorizedError(error: unknown): boolean {
  if (
    error &&
    typeof error === 'object' &&
    'statusCode' in error &&
    error.statusCode === 401
  ) {
    return true
  }
  return false
}
