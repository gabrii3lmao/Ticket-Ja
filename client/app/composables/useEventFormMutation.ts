import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useToast } from '#imports'

interface EventInput {
  name: string
  description?: string
  artists: string[]
  startDate: string
  endDate?: string
  imageUrl?: string
  minimumAge?: number
  venueId: string
}

export function useEventFormMutation() {
  const queryClient = useQueryClient()
  const { apiPost, client } = useApi()
  const toast = useToast()

  function create(data: EventInput) {
    return apiPost<{ id: string }>('/event', data)
      .then((result) => {
        queryClient.invalidateQueries({ queryKey: ['admin-events'] })
        queryClient.invalidateQueries({ queryKey: ['organizer-events'] })
        toast.add({ title: 'Evento criado com sucesso!', color: 'success' })
        return result
      })
      .catch((error) => {
        const msg = error?.data?.message || 'Erro ao criar evento'
        toast.add({ title: 'Erro', description: Array.isArray(msg) ? msg.join(', ') : msg, color: 'error' })
        throw error
      })
  }

  function update(id: string, data: Partial<EventInput>) {
    return client.put(`/event/${id}`, data)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['admin-events'] })
        queryClient.invalidateQueries({ queryKey: ['organizer-events'] })
        queryClient.invalidateQueries({ queryKey: ['event', id] })
        toast.add({ title: 'Evento atualizado!', color: 'success' })
      })
      .catch((error) => {
        const msg = error?.data?.message || 'Erro ao atualizar evento'
        toast.add({ title: 'Erro', description: Array.isArray(msg) ? msg.join(', ') : msg, color: 'error' })
        throw error
      })
  }

  function updateStatus(id: string, status: string) {
    return client.patch(`/event/${id}/status`, { status })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['admin-events'] })
        queryClient.invalidateQueries({ queryKey: ['organizer-events'] })
        queryClient.invalidateQueries({ queryKey: ['event', id] })
        toast.add({ title: 'Status atualizado!', color: 'success' })
      })
      .catch((error) => {
        const msg = error?.data?.message || 'Erro ao atualizar status'
        toast.add({ title: 'Erro', description: Array.isArray(msg) ? msg.join(', ') : msg, color: 'error' })
        throw error
      })
  }

  function remove(id: string) {
    return client.del(`/event/${id}`)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['admin-events'] })
        queryClient.invalidateQueries({ queryKey: ['organizer-events'] })
        toast.add({ title: 'Evento removido', color: 'info' })
      })
      .catch((error) => {
        const msg = error?.data?.message || 'Erro ao remover evento'
        toast.add({ title: 'Erro', description: Array.isArray(msg) ? msg.join(', ') : msg, color: 'error' })
        throw error
      })
  }

  return { create, update, updateStatus, remove }
}
