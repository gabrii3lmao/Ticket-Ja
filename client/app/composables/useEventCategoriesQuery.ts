import { useQuery } from '@tanstack/vue-query'
import type { Category, PaginatedResponse } from '~/types/api'

export function useEventCategoriesQuery(eventId: Ref<string>) {
  const { apiGet } = useApi()

  return useQuery({
    queryKey: computed(() => ['event-categories', eventId.value]),
    queryFn: () =>
      apiGet<PaginatedResponse<Category>>(`/event/${eventId.value}/category`, { limit: 100 }),
    enabled: computed(() => !!eventId.value),
  })
}
