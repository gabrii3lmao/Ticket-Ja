import { useQueryClient } from '@tanstack/vue-query';
import { useToast } from '#imports';

export function useAdminPaymentMutation() {
  const queryClient = useQueryClient();
  const { apiPatch } = useApi();
  const toast = useToast();

  function confirm(id: string) {
    return apiPatch(`/admin/payments-requests/${id}/confirm`)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
        queryClient.invalidateQueries({ queryKey: ['admin-payment'] });
        toast.add({ title: 'Pagamento confirmado!', color: 'success' });
      })
      .catch((error) => {
        toast.add({
          title: 'Erro',
          description: getErrorMessage(error, 'Erro ao confirmar pagamento'),
          color: 'error',
        });
        throw error;
      });
  }

  function reject(id: string, reason?: string) {
    return apiPatch(`/admin/payments-requests/${id}/reject`, { reason })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
        queryClient.invalidateQueries({ queryKey: ['admin-payment'] });
        toast.add({ title: 'Pagamento rejeitado', color: 'warning' });
      })
      .catch((error) => {
        toast.add({
          title: 'Erro',
          description: getErrorMessage(error, 'Erro ao rejeitar pagamento'),
          color: 'error',
        });
        throw error;
      });
  }

  return { confirm, reject };
}
