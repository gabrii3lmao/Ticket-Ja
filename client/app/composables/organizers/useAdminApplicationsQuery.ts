import { useQuery } from '@tanstack/vue-query';
import type { PaginatedResponse } from '~/types/api';
import type {
  OrganizerApplication,
  ApplicationFilters,
} from '~/types/organizer';

export function useAdminApplicationsQuery(filters: Ref<ApplicationFilters>) {
  const { apiGet } = useApi();

  return useQuery({
    queryKey: computed(() => ['admin-applications', filters.value]),
    queryFn: () =>
      apiGet<PaginatedResponse<OrganizerApplication>>(
        '/admin/organizer-application',
        filters.value,
      ),
  });
}
