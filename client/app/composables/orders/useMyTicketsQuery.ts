import { useQuery } from '@tanstack/vue-query'
import type { Ticket, PaginatedResponse } from '~/types/api'

export function useMyTicketsQuery() {
  const { apiGet } = useApi()

  return useQuery({
    queryKey: ['my-tickets'],
    queryFn: () => apiGet<PaginatedResponse<Ticket>>('/ticket'),
  })
}
