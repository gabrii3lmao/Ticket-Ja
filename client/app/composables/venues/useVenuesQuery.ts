import { useQuery } from '@tanstack/vue-query';
import { useAuthStore } from '~/stores/auth';
import type { Venue, PaginatedResponse } from '~/types/api';

export function useVenuesQuery() {
  const { apiGet } = useApi();
  const authStore = useAuthStore();

  const endpoint = computed(() =>
    authStore.user?.role === 'ADMIN' ? '/admin/venues' : '/venue/mine',
  );

  return useQuery({
    queryKey: computed(() => ['managed-venues', endpoint.value, { limit: 100 }]),
    queryFn: () => apiGet<PaginatedResponse<Venue>>(endpoint.value, { limit: 100 }),
  });
}
