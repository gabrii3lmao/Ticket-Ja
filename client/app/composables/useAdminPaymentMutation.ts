import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useToast } from '#imports'

export function useAdminPaymentMutation() {
  const queryClient = useQueryClient()
  const { apiPost } = useApi()
  const toast = useToast()

  function confirm(id: string) {
    return apiPost(`/admin/payments-requests/${id}/confirm`)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['admin-payments'] })
        queryClient.invalidateQueries({ queryKey: ['admin-payment'] })
        toast.add({ title: 'Pagamento confirmado!', color: 'success' })
      })
      .catch((error) => {
        const msg = error?.data?.message || 'Erro ao confirmar pagamento'
        toast.add({ title: 'Erro', description: Array.isArray(msg) ? msg.join(', ') : msg, color: 'error' })
        throw error
      })
  }

  function reject(id: string, reason?: string) {
    return apiPost(`/admin/payments-requests/${id}/reject`, { reason })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['admin-payments'] })
        queryClient.invalidateQueries({ queryKey: ['admin-payment'] })
        toast.add({ title: 'Pagamento rejeitado', color: 'warning' })
      })
      .catch((error) => {
        const msg = error?.data?.message || 'Erro ao rejeitar pagamento'
        toast.add({ title: 'Erro', description: Array.isArray(msg) ? msg.join(', ') : msg, color: 'error' })
        throw error
      })
  }

  return { confirm, reject }
}
