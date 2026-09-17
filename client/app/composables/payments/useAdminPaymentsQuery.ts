import { useQuery } from '@tanstack/vue-query';
import type { PaginatedResponse, Order } from '~/types/api';
import type { PaymentFilters } from '~/types/admin';

export function useAdminPaymentsQuery(filters: Ref<PaymentFilters>) {
  const { apiGet } = useApi();

  return useQuery({
    queryKey: computed(() => ['admin-payments', filters.value]),
    queryFn: () =>
      apiGet<PaginatedResponse<Order>>(
        '/admin/payments-requests',
        filters.value,
      ),
  });
}
