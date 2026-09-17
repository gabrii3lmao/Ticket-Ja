import { useQuery } from '@tanstack/vue-query';
import type { PaymentDetail } from '~/types/admin';

export function useAdminPaymentDetailQuery(id: Ref<string>) {
  const { apiGet } = useApi();

  return useQuery({
    queryKey: computed(() => ['admin-payment', id.value]),
    queryFn: () =>
      apiGet<PaymentDetail>(`/admin/payments-requests/${id.value}`),
    enabled: computed(() => !!id.value),
  });
}
