import { useQuery } from '@tanstack/vue-query'
import type { PaginatedResponse } from '~/types/api'
import type { AdminEvent, AdminEventFilters } from '~/types/admin'

export function useAdminEventsQuery(filters: Ref<AdminEventFilters>) {
  const { apiGet } = useApi()

  return useQuery({
    queryKey: computed(() => ['admin-events', filters.value]),
    queryFn: () =>
      apiGet<PaginatedResponse<AdminEvent>>('/event', filters.value),
  })
}
