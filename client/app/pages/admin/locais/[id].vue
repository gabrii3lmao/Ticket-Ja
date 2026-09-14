<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <NuxtLink to="/admin/locais">
        <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left" />
      </NuxtLink>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Editar Local</h1>
    </div>

    <div v-if="loading" class="animate-pulse space-y-4 max-w-2xl">
      <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>

    <div v-else-if="venue" class="space-y-6">
      <div class="max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <VenueForm
          :initial-data="venue"
          :loading="isPending"
          @submit="onSubmit"
          @cancel="navigateTo('/admin/locais')"
        />
      </div>

      <div class="max-w-2xl">
        <UButton color="error" variant="outline" label="Excluir Local" :loading="isDeleting" @click="onDelete" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const route = useRoute()
const venueId = route.params.id as string
const { apiGet } = useApi()
const venueMutation = useVenueFormMutation()

const { data: venue, isLoading: loading } = useQuery({
  queryKey: ['venue', venueId],
  queryFn: () => apiGet(`/venue/${venueId}`),
})

const isPending = computed(() => venueMutation.isPending.value)
const isDeleting = ref(false)

async function onSubmit(data: Record<string, unknown>) {
  await venueMutation.update(venueId, data as any)
}

async function onDelete() {
  if (!confirm('Tem certeza que deseja excluir este local?')) return
  isDeleting.value = true
  try {
    await venueMutation.remove(venueId)
    navigateTo('/admin/locais')
  } finally {
    isDeleting.value = false
  }
}
</script>
