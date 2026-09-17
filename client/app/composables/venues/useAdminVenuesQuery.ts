import { useQuery } from '@tanstack/vue-query';
import { useAuthStore } from '~/stores/auth';
import type { PaginatedResponse } from '~/types/api';
import type { AdminVenue, AdminVenueFilters } from '~/types/admin';

export function useAdminVenuesQuery(filters: Ref<AdminVenueFilters>) {
  const { apiGet } = useApi();
  const authStore = useAuthStore();

  const endpoint = computed(() =>
    authStore.user?.role === 'ADMIN' ? '/admin/venues' : '/venue/mine',
  );

  return useQuery({
    queryKey: computed(() => ['managed-venues', endpoint.value, filters.value]),
    queryFn: () =>
      apiGet<PaginatedResponse<AdminVenue>>(endpoint.value, filters.value),
  });
}
