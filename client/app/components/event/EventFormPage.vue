<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <NuxtLink :to="basePath">
        <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left" />
      </NuxtLink>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        {{ isEdit ? 'Editar Evento' : 'Novo Evento' }}
      </h1>
    </div>

    <div v-if="isEdit && loading" class="animate-pulse space-y-4 max-w-2xl">
      <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>

    <div v-else-if="!isEdit || event" class="space-y-6">
      <div class="max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <EventForm
          :initial-data="initialData"
          :venues="venues"
          :loading="isPending"
          :show-status="isEdit"
          :allowed-statuses="allowedStatuses"
          @submit="onSubmit"
          @cancel="navigateTo(basePath)"
        />
      </div>

      <div
        v-if="isEdit && manageCategories"
        class="max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6"
      >
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Categorias</h2>
        <div v-if="event?.categories?.length" class="space-y-2 mb-4">
          <div v-for="cat in event.categories" :key="cat.id" class="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800">
            <div>
              <span class="font-medium text-gray-900 dark:text-white">{{ cat.name }}</span>
              <span class="ml-2 text-sm text-gray-500 dark:text-gray-400">R$ {{ Number(cat.price).toFixed(2) }} · {{ cat.quantity }} ingressos</span>
            </div>
          </div>
        </div>
        <p v-else class="text-sm text-gray-500 dark:text-gray-400 mb-4">Nenhuma categoria ainda.</p>
        <NuxtLink :to="`${basePath}/categorias/${eventId}`">
          <UButton color="primary" variant="outline" size="sm" label="Gerenciar Categorias" />
        </NuxtLink>
      </div>

      <div v-if="isEdit" class="max-w-2xl">
        <UButton color="error" variant="outline" label="Excluir Evento" :loading="isDeleting" @click="onDelete" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  basePath: string
  manageCategories?: boolean
}>()

const route = useRoute()
const eventId = computed(() => (route.params.id as string) || '')
const isEdit = computed(() => !!eventId.value)

const eventMutation = useEventFormMutation()
const { data: venuesData } = useVenuesQuery()
const venues = computed(() => venuesData.value?.data ?? [])

const { data: event, isLoading: loading } = useEventQuery(eventId)

const initialData = computed(() => {
  if (!event.value) return undefined
  return {
    name: event.value.name,
    description: event.value.description ?? undefined,
    startDate: event.value.startDate,
    endDate: event.value.endDate ?? undefined,
    artists: event.value.artists,
    minimumAge: event.value.minimumAge ?? null,
    imageUrl: event.value.imageUrl ?? null,
    venueId: event.value.venue?.id,
    status: event.value.status,
  }
})

const isPending = computed(() => eventMutation.isPending.value)
const isDeleting = ref(false)

const STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['DRAFT', 'PUBLISHED', 'CANCELED'],
  PUBLISHED: ['PUBLISHED', 'FINISHED', 'CANCELED'],
  FINISHED: ['FINISHED', 'CANCELED'],
  CANCELED: ['CANCELED'],
}

const allowedStatuses = computed(() => {
  const current = event.value?.status
  return current ? STATUS_TRANSITIONS[current] ?? [current] : undefined
})

async function onSubmit(data: Record<string, unknown>) {
  const { status, ...rest } = data
  try {
    if (isEdit.value) {
      await eventMutation.update(eventId.value, rest as any)
      if (status && status !== event.value?.status) {
        await eventMutation.updateStatus(eventId.value, status as string)
      }
      navigateTo(props.basePath)
    } else {
      const result = await eventMutation.create(rest as any)
      navigateTo(`${props.basePath}/categorias/${result.id}`)
    }
  } catch {
    // Errors are surfaced by the mutation toasts
  }
}

async function onDelete() {
  if (!confirm('Tem certeza que deseja excluir este evento?')) return
  isDeleting.value = true
  try {
    await eventMutation.remove(eventId.value)
    navigateTo(props.basePath)
  } finally {
    isDeleting.value = false
  }
}
</script>
