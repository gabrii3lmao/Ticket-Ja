import { useQueryClient } from '@tanstack/vue-query';
import { useToast } from '#imports';
import type { OrganizerApplicationInput } from '~/types/api';
import type { OrganizerApplication } from '~/types/organizer';

export function useSubmitOrganizerApplicationMutation() {
  const queryClient = useQueryClient();
  const { apiPost } = useApi();
  const toast = useToast();
  const isPending = ref(false);

  async function submit(data: OrganizerApplicationInput) {
    isPending.value = true;
    try {
      const result = await apiPost<OrganizerApplication>(
        '/auth/organizer-application',
        data,
      );
      queryClient.invalidateQueries({ queryKey: ['my-organizer-application'] });
      toast.add({ title: 'Candidatura enviada!', color: 'success' });
      return result;
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: getErrorMessage(error, 'Erro ao enviar candidatura'),
        color: 'error',
      });
      throw error;
    } finally {
      isPending.value = false;
    }
  }

  return { isPending, submit };
}
