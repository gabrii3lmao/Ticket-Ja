import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useToast } from '#imports'
import type { CreateOrderInput, CreateOrderResponse } from '~/types/api'

interface CreateOrderVariables {
  data: CreateOrderInput
  idempotencyKey: string
}

export function useCreateOrderMutation() {
  const queryClient = useQueryClient()
  const { apiPost } = useApi()
  const toast = useToast()

  return useMutation({
    mutationFn: ({ data, idempotencyKey }: CreateOrderVariables) =>
      apiPost<CreateOrderResponse>('/order', data, {
        'Idempotency-Key': idempotencyKey,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] })
      queryClient.invalidateQueries({ queryKey: ['my-orders'] })
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(
        error,
        'Não foi possível finalizar a compra. Tente novamente.',
      )
      toast.add({
        title: 'Erro ao finalizar compra',
        description: message,
        color: 'error',
      })
    },
  })
}
