import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useToast } from '#imports'

interface VenueInput {
  name: string
  street?: string
  number?: string
  district?: string
  city?: string
  state?: string
  zipCode?: string
  capacity: number
}

export function useVenueFormMutation() {
  const queryClient = useQueryClient()
  const { apiPost, client } = useApi()
  const toast = useToast()

  function create(data: VenueInput) {
    return apiPost<{ id: string }>('/venue', data)
      .then((result) => {
        queryClient.invalidateQueries({ queryKey: ['admin-venues'] })
        queryClient.invalidateQueries({ queryKey: ['organizer-venues'] })
        queryClient.invalidateQueries({ queryKey: ['venues'] })
        toast.add({ title: 'Local criado com sucesso!', color: 'success' })
        return result
      })
      .catch((error) => {
        const msg = error?.data?.message || 'Erro ao criar local'
        toast.add({ title: 'Erro', description: Array.isArray(msg) ? msg.join(', ') : msg, color: 'error' })
        throw error
      })
  }

  function update(id: string, data: Partial<VenueInput>) {
    return client.put(`/venue/${id}`, data)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['admin-venues'] })
        queryClient.invalidateQueries({ queryKey: ['organizer-venues'] })
        queryClient.invalidateQueries({ queryKey: ['venues'] })
        toast.add({ title: 'Local atualizado!', color: 'success' })
      })
      .catch((error) => {
        const msg = error?.data?.message || 'Erro ao atualizar local'
        toast.add({ title: 'Erro', description: Array.isArray(msg) ? msg.join(', ') : msg, color: 'error' })
        throw error
      })
  }

  function remove(id: string) {
    return client.del(`/venue/${id}`)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['admin-venues'] })
        queryClient.invalidateQueries({ queryKey: ['organizer-venues'] })
        queryClient.invalidateQueries({ queryKey: ['venues'] })
        toast.add({ title: 'Local removido', color: 'info' })
      })
      .catch((error) => {
        const msg = error?.data?.message || 'Erro ao remover local'
        toast.add({ title: 'Erro', description: Array.isArray(msg) ? msg.join(', ') : msg, color: 'error' })
        throw error
      })
  }

  return { create, update, remove }
}
