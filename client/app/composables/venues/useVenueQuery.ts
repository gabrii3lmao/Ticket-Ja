import { useQuery } from '@tanstack/vue-query';
import type { Venue } from '~/types/api';

export function useVenueQuery(id: Ref<string>) {
  const { apiGet } = useApi();

  return useQuery({
    queryKey: computed(() => ['venue', id.value]),
    queryFn: () => apiGet<Venue>(`/venue/${id.value}`),
    enabled: computed(() => !!id.value),
  });
}
