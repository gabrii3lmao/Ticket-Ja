import { useQuery } from '@tanstack/vue-query'
import type { Event } from '~/types/api'

export function useEventQuery(id: Ref<string>) {
  const { apiGet } = useApi()

  return useQuery({
    queryKey: computed(() => ['event', id.value]),
    queryFn: () => apiGet<Event>(`/event/${id.value}`),
    enabled: computed(() => !!id.value),
  })
}
