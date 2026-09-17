import { useQuery } from '@tanstack/vue-query'
import { useAuthStore } from '~/stores/auth'
import type { PaginatedResponse } from '~/types/api'
import type { AdminEvent, AdminEventFilters } from '~/types/admin'

export function useAdminEventsQuery(filters: Ref<AdminEventFilters>) {
  const { apiGet } = useApi()
  const authStore = useAuthStore()

  const endpoint = computed(() =>
    authStore.user?.role === 'ADMIN' ? '/admin/events' : '/event/mine',
  )

  return useQuery({
    queryKey: computed(() => ['managed-events', endpoint.value, filters.value]),
    queryFn: () =>
      apiGet<PaginatedResponse<AdminEvent>>(endpoint.value, filters.value),
  })
}
