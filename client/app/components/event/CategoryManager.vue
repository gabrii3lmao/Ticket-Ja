<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <NuxtLink :to="basePath">
        <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left" />
      </NuxtLink>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Categorias</h1>
      <UButton class="ml-auto" color="primary" icon="i-lucide-plus" label="Nova Categoria" @click="openCreate" />
    </div>

    <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
      <div v-if="loading" class="p-4 space-y-3">
        <div v-for="i in 3" :key="i" class="h-10 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
      </div>

      <div v-else-if="categories.length === 0" class="p-12 text-center text-gray-500 dark:text-gray-400">
        Nenhuma categoria cadastrada. Adicione ao menos uma para publicar o evento.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-800">
              <th class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Nome</th>
              <th class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Preço</th>
              <th class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Quantidade</th>
              <th class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Janela de vendas</th>
              <th class="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="cat in categories" :key="cat.id" class="border-b border-gray-100 dark:border-gray-800">
              <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">
                {{ cat.name }}
                <span v-if="cat.description" class="block text-xs font-normal text-gray-500 dark:text-gray-400">{{ cat.description }}</span>
              </td>
              <td class="px-4 py-3 text-gray-600 dark:text-gray-300">R$ {{ formatPrice(cat.price) }}</td>
              <td class="px-4 py-3 text-gray-600 dark:text-gray-300">{{ cat.quantity.toLocaleString() }}</td>
              <td class="px-4 py-3 text-gray-600 dark:text-gray-300">{{ formatWindow(cat) }}</td>
              <td class="px-4 py-3">
                <div class="flex justify-end gap-1">
                  <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-pencil" @click="openEdit(cat)" />
                  <UButton color="error" variant="ghost" size="xs" icon="i-lucide-trash" @click="onDelete(cat)" />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <UModal v-model:open="modalOpen" :title="editing ? 'Editar Categoria' : 'Nova Categoria'">
      <template #default>
        <form class="space-y-4 p-4" @submit.prevent="onSubmit">
          <UFormField label="Nome" name="name" required>
            <UInput v-model="form.name" placeholder="Ex: Pista Premium" size="lg" class="w-full" />
          </UFormField>

          <UFormField label="Descrição" name="description">
            <UTextarea v-model="form.description" placeholder="Descrição da categoria" :rows="2" class="w-full" />
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Preço (R$)" name="price" required>
              <UInput v-model.number="form.price" type="number" min="0" step="0.01" size="lg" class="w-full" />
            </UFormField>
            <UFormField label="Quantidade" name="quantity" required>
              <UInput v-model.number="form.quantity" type="number" min="1" size="lg" class="w-full" />
            </UFormField>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Início das vendas" name="salesStart">
              <UInput v-model="form.salesStart" type="datetime-local" size="lg" class="w-full" />
            </UFormField>
            <UFormField label="Fim das vendas" name="salesEnd">
              <UInput v-model="form.salesEnd" type="datetime-local" size="lg" class="w-full" />
            </UFormField>
          </div>
        </form>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton color="neutral" variant="outline" label="Cancelar" @click="modalOpen = false" />
          <UButton color="primary" label="Salvar" :loading="mutation.isPending.value" @click="onSubmit" />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import type { Category } from '~/types/api'

const props = defineProps<{
  eventId: string
  basePath: string
}>()

const eventId = toRef(props, 'eventId')
const { data: categoriesData, isLoading } = useEventCategoriesQuery(eventId)
const mutation = useCategoryFormMutation(eventId)

const categories = computed(() => categoriesData.value?.data ?? [])
const loading = computed(() => isLoading.value)

const modalOpen = ref(false)
const editing = ref<Category | null>(null)

const form = reactive({
  name: '',
  description: '',
  price: 0,
  quantity: 1,
  salesStart: '',
  salesEnd: '',
})

function resetForm() {
  form.name = ''
  form.description = ''
  form.price = 0
  form.quantity = 1
  form.salesStart = ''
  form.salesEnd = ''
}

function openCreate() {
  editing.value = null
  resetForm()
  modalOpen.value = true
}

function openEdit(category: Category) {
  editing.value = category
  form.name = category.name
  form.description = category.description || ''
  form.price = Number(category.price)
  form.quantity = category.quantity
  form.salesStart = category.salesStart ? formatDateTimeLocal(category.salesStart) : ''
  form.salesEnd = category.salesEnd ? formatDateTimeLocal(category.salesEnd) : ''
  modalOpen.value = true
}

function formatWindow(category: Category): string {
  if (!category.salesStart && !category.salesEnd) return '—'
  const start = category.salesStart ? formatDate(category.salesStart) : '...'
  const end = category.salesEnd ? formatDate(category.salesEnd) : '...'
  return `${start} → ${end}`
}

async function onSubmit() {
  if (!form.name.trim()) return

  const payload = {
    name: form.name.trim(),
    description: form.description || undefined,
    price: Number(form.price),
    quantity: Number(form.quantity),
    salesStart: form.salesStart ? new Date(form.salesStart).toISOString() : undefined,
    salesEnd: form.salesEnd ? new Date(form.salesEnd).toISOString() : undefined,
  }

  if (editing.value) {
    await mutation.update(editing.value.id, payload)
  } else {
    await mutation.create(payload)
  }
  modalOpen.value = false
}

async function onDelete(category: Category) {
  if (!confirm(`Remover a categoria "${category.name}"?`)) return
  await mutation.remove(category.id)
}
</script>
