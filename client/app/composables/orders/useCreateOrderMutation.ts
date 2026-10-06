import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { CreateOrderInput, CreateOrderResponse } from '~/types/api'

interface CreateOrderVariables {
  data: CreateOrderInput
  idempotencyKey: string
}

export function useCreateOrderMutation() {
  const queryClient = useQueryClient()
  const { apiPost } = useApi()
  const { notifyError } = useApiError()

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
      notifyError(error, {
        title: 'Erro ao finalizar compra',
        fallback: 'Não foi possível finalizar a compra. Tente novamente.',
      })
    },
  })
}
