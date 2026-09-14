<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <NuxtLink to="/organizador/eventos">
        <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left" />
      </NuxtLink>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Editar Evento</h1>
    </div>

    <div v-if="loading" class="animate-pulse space-y-4 max-w-2xl">
      <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>

    <div v-else-if="event" class="space-y-6">
      <div class="max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <EventForm
          :initial-data="event"
          :venues="venues"
          :loading="isPending"
          :show-status="true"
          @submit="onSubmit"
          @cancel="navigateTo('/organizador/eventos')"
        />
      </div>

      <div class="max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Categorias</h2>
        <div v-if="event.categories?.length" class="space-y-2">
          <div v-for="cat in event.categories" :key="cat.id" class="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800">
            <div>
              <span class="font-medium text-gray-900 dark:text-white">{{ cat.name }}</span>
              <span class="ml-2 text-sm text-gray-500 dark:text-gray-400">R$ {{ Number(cat.price).toFixed(2) }} · {{ cat.quantity }} ingressos</span>
            </div>
          </div>
        </div>
        <p v-else class="text-sm text-gray-500 dark:text-gray-400">Nenhuma categoria ainda.</p>
      </div>

      <div class="max-w-2xl">
        <UButton color="error" variant="outline" label="Excluir Evento" :loading="isDeleting" @click="onDelete" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'organizer',
})

const route = useRoute()
const eventId = route.params.id as string
const { apiGet } = useApi()
const eventMutation = useEventFormMutation()

const { data: event, isLoading: loading } = useEventQuery(eventId)

const { data: venuesData } = await useAsyncQuery(['venues'], () => apiGet('/venue', { limit: 100 }))
const venues = computed(() => (venuesData.value as any)?.data || [])

const isPending = computed(() => eventMutation.isPending.value)
const isDeleting = ref(false)

async function onSubmit(data: Record<string, unknown>) {
  const { status, ...rest } = data
  await eventMutation.update(eventId, rest as any)
  if (status && status !== event.value?.status) {
    await eventMutation.updateStatus(eventId, status as string)
  }
}

async function onDelete() {
  if (!confirm('Tem certeza que deseja excluir este evento?')) return
  isDeleting.value = true
  try {
    await eventMutation.remove(eventId)
    navigateTo('/organizador/eventos')
  } finally {
    isDeleting.value = false
  }
}
</script>
