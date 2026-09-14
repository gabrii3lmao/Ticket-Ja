import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { Order, CreateOrderInput } from '~/types/api'

export function useCreateOrderMutation() {
  const queryClient = useQueryClient()
  const { apiPost } = useApi()

  return useMutation({
    mutationFn: (data: CreateOrderInput) =>
      apiPost<Order>('/order', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] })
      queryClient.invalidateQueries({ queryKey: ['my-orders'] })
    },
  })
}
