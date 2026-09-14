import { useQuery } from '@tanstack/vue-query'
import type { PaginatedResponse } from '~/types/api'

interface OrganizerApplication {
  id: string
  legalName: string
  tradeName?: string | null
  document: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  rejectedReason?: string | null
  createdAt: string
  user: { id: string; email: string; name: string; createdAt: string }
}

interface ApplicationFilters {
  page?: number
  limit?: number
  status?: string
  legalName?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export function useAdminApplicationsQuery(filters: Ref<ApplicationFilters>) {
  const { apiGet } = useApi()

  return useQuery({
    queryKey: computed(() => ['admin-applications', filters.value]),
    queryFn: () =>
      apiGet<PaginatedResponse<OrganizerApplication>>('/admin/organizer-application', filters.value),
  })
}
