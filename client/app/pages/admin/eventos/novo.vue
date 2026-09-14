<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <NuxtLink to="/admin/eventos">
        <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left" />
      </NuxtLink>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Novo Evento</h1>
    </div>

    <div class="max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
      <EventForm :venues="venues" :loading="isPending" :show-status="true" @submit="onSubmit" @cancel="navigateTo('/admin/eventos')" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMutation } from '@tanstack/vue-query'

definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const { apiGet } = useApi()
const eventMutation = useEventFormMutation()

const { data: venuesData } = await useAsyncQuery(['venues'], () => apiGet('/venue', { limit: 100 }))
const venues = computed(() => (venuesData.value as any)?.data || [])

const isPending = computed(() => eventMutation.isPending.value)

async function onSubmit(data: Record<string, unknown>) {
  const { status, ...rest } = data
  const result = await eventMutation.create(rest as any)
  if (status && status !== 'DRAFT') {
    await eventMutation.updateStatus(result.id, status as string)
  }
  navigateTo('/admin/eventos')
}
</script>
