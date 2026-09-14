<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <NuxtLink to="/organizador/locais">
        <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left" />
      </NuxtLink>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Novo Local</h1>
    </div>

    <div class="max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
      <VenueForm :loading="isPending" @submit="onSubmit" @cancel="navigateTo('/organizador/locais')" />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'organizer',
})

const venueMutation = useVenueFormMutation()
const isPending = computed(() => venueMutation.isPending.value)

async function onSubmit(data: Record<string, unknown>) {
  await venueMutation.create(data as any)
  navigateTo('/organizador/locais')
}
</script>
