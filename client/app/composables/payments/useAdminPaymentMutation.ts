import { useQueryClient } from '@tanstack/vue-query';
import { useToast } from '#imports';

export function useAdminPaymentMutation() {
  const queryClient = useQueryClient();
  const { apiPatch } = useApi();
  const { notifyError } = useApiError();
  const toast = useToast();

  function confirm(id: string) {
    return apiPatch(`/admin/payments-requests/${id}/confirm`)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
        queryClient.invalidateQueries({ queryKey: ['admin-payment'] });
        toast.add({ title: 'Pagamento confirmado!', color: 'success' });
      })
      .catch((error) => {
        notifyError(error, { title: 'Erro', fallback: 'Erro ao confirmar pagamento' });
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
        notifyError(error, { title: 'Erro', fallback: 'Erro ao rejeitar pagamento' });
        throw error;
      });
  }

  return { confirm, reject };
}
