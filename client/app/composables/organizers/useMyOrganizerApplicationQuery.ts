import { useQuery } from '@tanstack/vue-query';
import type { OrganizerApplication } from '~/types/organizer';

export function useMyOrganizerApplicationQuery() {
  const { apiGet } = useApi();

  return useQuery({
    queryKey: ['my-organizer-application'],
    queryFn: () =>
      apiGet<OrganizerApplication | null>('/auth/organizer-application'),
  });
}
