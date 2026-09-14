import { useQuery } from '@tanstack/vue-query'
import type { PaginatedResponse } from '~/types/api'

interface AdminVenue {
  id: string
  name: string
  street?: string | null
  number?: string | null
  district?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
  capacity: number
  createdAt: string
  organizerProfile?: { id: string; legalName: string } | null
}

interface AdminVenueFilters {
  page?: number
  limit?: number
  name?: string
  city?: string
  state?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export function useAdminVenuesQuery(filters: Ref<AdminVenueFilters>) {
  const { apiGet } = useApi()

  return useQuery({
    queryKey: computed(() => ['admin-venues', filters.value]),
    queryFn: () =>
      apiGet<PaginatedResponse<AdminVenue>>('/venue', filters.value),
  })
}
