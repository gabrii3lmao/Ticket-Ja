import { useQuery } from '@tanstack/vue-query'
import type { Order } from '~/types/api'

interface PaymentDetail extends Order {
  user: { id: string; name: string; email: string; taxId?: string | null; phone?: string | null }
}

export function useAdminPaymentDetailQuery(id: Ref<string>) {
  const { apiGet } = useApi()

  return useQuery({
    queryKey: computed(() => ['admin-payment', id.value]),
    queryFn: () => apiGet<PaymentDetail>(`/admin/payments-requests/${id.value}`),
    enabled: computed(() => !!id.value),
  })
}
