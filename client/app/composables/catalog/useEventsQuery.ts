import { useQuery } from '@tanstack/vue-query'
import type { Event, PaginatedResponse, EventFilters } from '~/types/api'

export function useEventsQuery(filters: Ref<EventFilters>) {
  const { apiGet } = useApi()

  return useQuery({
    queryKey: computed(() => ['events', filters.value]),
    queryFn: () =>
      apiGet<PaginatedResponse<Event>>('/event', filters.value),
  })
}
