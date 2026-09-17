import { useQuery } from '@tanstack/vue-query';
import type { Venue, PaginatedResponse } from '~/types/api';

export function useVenuesQuery() {
  const { apiGet } = useApi();

  return useQuery({
    queryKey: ['venues'],
    queryFn: () => apiGet<PaginatedResponse<Venue>>('/venue', { limit: 100 }),
  });
}
