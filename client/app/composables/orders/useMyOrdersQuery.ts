import { useQuery } from '@tanstack/vue-query'
import type { Ticket, PaginatedResponse } from '~/types/api'

export function useMyOrdersQuery() {
  const { apiGet } = useApi()

  return useQuery({
    queryKey: ['my-orders'],
    queryFn: () =>
      apiGet<PaginatedResponse<Ticket>>('/ticket', {
        limit: 100,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
  })
}
