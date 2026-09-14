import { useQuery } from '@tanstack/vue-query'
import type { PaginatedResponse, Order } from '~/types/api'

interface PaymentFilters {
  page?: number
  limit?: number
  status?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export function useAdminPaymentsQuery(filters: Ref<PaymentFilters>) {
  const { apiGet } = useApi()

  return useQuery({
    queryKey: computed(() => ['admin-payments', filters.value]),
    queryFn: () =>
      apiGet<PaginatedResponse<Order>>('/admin/payments-requests', filters.value),
  })
}
