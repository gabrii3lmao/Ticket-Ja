import { useQueryClient } from '@tanstack/vue-query';
import { useToast } from '#imports';

export function useAdminApplicationMutation() {
  const queryClient = useQueryClient();
  const { apiPatch } = useApi();
  const toast = useToast();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['admin-applications'] });
    queryClient.invalidateQueries({ queryKey: ['admin-application'] });
  }

  function approve(id: string) {
    return apiPatch(`/admin/organizer-application/${id}/approve`)
      .then(() => {
        invalidate();
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
    return apiPatch(`/admin/organizer-application/${id}/reject`, {
      rejectReason: reason,
    })
      .then(() => {
        invalidate();
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
