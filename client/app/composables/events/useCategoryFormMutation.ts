import { useQueryClient } from '@tanstack/vue-query'
import { useToast } from '#imports'
import type { CategoryInput } from '~/types/api'

export function useCategoryFormMutation(eventId: Ref<string>) {
  const queryClient = useQueryClient()
  const { apiPost, apiPatch, apiDel } = useApi()
  const toast = useToast()
  const isPending = ref(false)

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['event-categories', eventId.value] })
    queryClient.invalidateQueries({ queryKey: ['event', eventId.value] })
    queryClient.invalidateQueries({ queryKey: ['managed-events'] })
  }

  async function create(data: CategoryInput) {
    isPending.value = true
    try {
      await apiPost(`/event/${eventId.value}/category`, data)
      invalidate()
      toast.add({ title: 'Categoria criada!', color: 'success' })
    } catch (error) {
      toast.add({ title: 'Erro', description: getErrorMessage(error, 'Erro ao criar categoria'), color: 'error' })
      throw error
    } finally {
      isPending.value = false
    }
  }

  async function update(id: string, data: Partial<CategoryInput>) {
    isPending.value = true
    try {
      await apiPatch(`/event/${eventId.value}/category/${id}`, data)
      invalidate()
      toast.add({ title: 'Categoria atualizada!', color: 'success' })
    } catch (error) {
      toast.add({ title: 'Erro', description: getErrorMessage(error, 'Erro ao atualizar categoria'), color: 'error' })
      throw error
    } finally {
      isPending.value = false
    }
  }

  async function remove(id: string) {
    isPending.value = true
    try {
      await apiDel(`/event/${eventId.value}/category/${id}`)
      invalidate()
      toast.add({ title: 'Categoria removida', color: 'info' })
    } catch (error) {
      toast.add({ title: 'Erro', description: getErrorMessage(error, 'Erro ao remover categoria'), color: 'error' })
      throw error
    } finally {
      isPending.value = false
    }
  }

  return { isPending, create, update, remove }
}
