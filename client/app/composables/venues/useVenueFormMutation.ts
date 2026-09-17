import { useQueryClient } from '@tanstack/vue-query';
import { useToast } from '#imports';

interface VenueInput {
  name: string;
  street?: string;
  number?: string;
  district?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  capacity: number;
}

export function useVenueFormMutation() {
  const queryClient = useQueryClient();
  const { apiPost, apiPut, apiDel } = useApi();
  const toast = useToast();
  const isPending = ref(false);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['managed-venues'] })
  }

  async function create(data: VenueInput) {
    isPending.value = true;
    try {
      const result = await apiPost<{ id: string }>('/venue', data);
      invalidate();
      toast.add({ title: 'Local criado com sucesso!', color: 'success' });
      return result;
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: getErrorMessage(error, 'Erro ao criar local'),
        color: 'error',
      });
      throw error;
    } finally {
      isPending.value = false;
    }
  }

  async function update(id: string, data: Partial<VenueInput>) {
    isPending.value = true;
    try {
      await apiPut(`/venue/${id}`, data);
      invalidate();
      toast.add({ title: 'Local atualizado!', color: 'success' });
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: getErrorMessage(error, 'Erro ao atualizar local'),
        color: 'error',
      });
      throw error;
    } finally {
      isPending.value = false;
    }
  }

  async function remove(id: string) {
    isPending.value = true;
    try {
      await apiDel(`/venue/${id}`);
      invalidate();
      toast.add({ title: 'Local removido', color: 'info' });
    } catch (error) {
      toast.add({
        title: 'Erro',
        description: getErrorMessage(error, 'Erro ao remover local'),
        color: 'error',
      });
      throw error;
    } finally {
      isPending.value = false;
    }
  }

  return { isPending, create, update, remove };
}
