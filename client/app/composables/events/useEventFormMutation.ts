import { useQueryClient } from '@tanstack/vue-query'
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
  const { apiPost, apiPut, apiPatch, apiDel } = useApi()
  const toast = useToast()
  const isPending = ref(false)

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['admin-events'] })
    queryClient.invalidateQueries({ queryKey: ['organizer-events'] })
  }

  async function create(data: EventInput) {
    isPending.value = true
    try {
      const result = await apiPost<{ id: string }>('/event', data)
      invalidate()
      toast.add({ title: 'Evento criado com sucesso!', color: 'success' })
      return result
    } catch (error) {
      toast.add({ title: 'Erro', description: getErrorMessage(error, 'Erro ao criar evento'), color: 'error' })
      throw error
    } finally {
      isPending.value = false
    }
  }

  async function update(id: string, data: Partial<EventInput>) {
    isPending.value = true
    try {
      await apiPut(`/event/${id}`, data)
      invalidate()
      queryClient.invalidateQueries({ queryKey: ['event', id] })
      toast.add({ title: 'Evento atualizado!', color: 'success' })
    } catch (error) {
      toast.add({ title: 'Erro', description: getErrorMessage(error, 'Erro ao atualizar evento'), color: 'error' })
      throw error
    } finally {
      isPending.value = false
    }
  }

  async function updateStatus(id: string, status: string) {
    isPending.value = true
    try {
      await apiPatch(`/event/${id}/status`, { status })
      invalidate()
      queryClient.invalidateQueries({ queryKey: ['event', id] })
      toast.add({ title: 'Status atualizado!', color: 'success' })
    } catch (error) {
      toast.add({ title: 'Erro', description: getErrorMessage(error, 'Erro ao atualizar status'), color: 'error' })
      throw error
    } finally {
      isPending.value = false
    }
  }

  async function remove(id: string) {
    isPending.value = true
    try {
      await apiDel(`/event/${id}`)
      invalidate()
      toast.add({ title: 'Evento removido', color: 'info' })
    } catch (error) {
      toast.add({ title: 'Erro', description: getErrorMessage(error, 'Erro ao remover evento'), color: 'error' })
      throw error
    } finally {
      isPending.value = false
    }
  }

  return { isPending, create, update, updateStatus, remove }
}
