import { useQuery } from '@tanstack/vue-query'
import type { PaginatedResponse } from '~/types/api'

interface AdminEvent {
  id: string
  name: string
  description?: string | null
  artists: string[]
  startDate: string
  endDate?: string | null
  imageUrl?: string | null
  status: string
  createdAt: string
  venue?: { id: string; name: string; city?: string | null } | null
  organizerProfile?: { id: string; legalName: string } | null
  categories?: { id: string; name: string; price: string; quantity: number }[]
}

interface AdminEventFilters {
  page?: number
  limit?: number
  name?: string
  status?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export function useAdminEventsQuery(filters: Ref<AdminEventFilters>) {
  const { apiGet } = useApi()

  return useQuery({
    queryKey: computed(() => ['admin-events', filters.value]),
    queryFn: () =>
      apiGet<PaginatedResponse<AdminEvent>>('/event', filters.value),
  })
}
