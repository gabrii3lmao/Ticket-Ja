import { useQuery } from '@tanstack/vue-query';
import type { PaginatedResponse } from '~/types/api';
import type { AdminVenue, AdminVenueFilters } from '~/types/admin';

export function useAdminVenuesQuery(filters: Ref<AdminVenueFilters>) {
  const { apiGet } = useApi();

  return useQuery({
    queryKey: computed(() => ['admin-venues', filters.value]),
    queryFn: () =>
      apiGet<PaginatedResponse<AdminVenue>>('/venue', filters.value),
  });
}
