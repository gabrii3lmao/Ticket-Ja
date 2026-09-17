import { useQuery } from '@tanstack/vue-query';
import type { OrganizerApplication } from '~/types/organizer';

export function useAdminApplicationQuery(id: Ref<string>) {
  const { apiGet } = useApi();

  return useQuery({
    queryKey: computed(() => ['admin-application', id.value]),
    queryFn: () =>
      apiGet<OrganizerApplication>(`/admin/organizer-application/${id.value}`),
    enabled: computed(() => !!id.value),
  });
}
