import { useQueryClient } from '@tanstack/vue-query';
import { useToast } from '#imports';

export function useAdminApplicationMutation() {
  const queryClient = useQueryClient();
  const { apiPost } = useApi();
  const toast = useToast();

  function approve(id: string) {
    return apiPost(`/admin/organizer-application/${id}/approve`)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['admin-applications'] });
        toast.add({ title: 'Candidatura aprovada!', color: 'success' });
      })
      .catch((error) => {
        toast.add({
          title: 'Erro',
          description: getErrorMessage(error, 'Erro ao aprovar candidatura'),
          color: 'error',
        });
        throw error;
      });
  }

  function reject(id: string, reason?: string) {
    return apiPost(`/admin/organizer-application/${id}/reject`, {
      rejectReason: reason,
    })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['admin-applications'] });
        toast.add({ title: 'Candidatura rejeitada', color: 'warning' });
      })
      .catch((error) => {
        toast.add({
          title: 'Erro',
          description: getErrorMessage(error, 'Erro ao rejeitar candidatura'),
          color: 'error',
        });
        throw error;
      });
  }

  return { approve, reject };
}
