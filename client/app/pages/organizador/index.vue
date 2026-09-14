<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">Meu Painel</h1>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/30">
            <UIcon name="i-lucide-calendar" class="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Meus Eventos</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ eventsData?.meta?.total ?? '—' }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-lg bg-green-50 dark:bg-green-900/30">
            <UIcon name="i-lucide-check-circle" class="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Publicados</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ publishedCount }}</p>
          </div>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-900/30">
            <UIcon name="i-lucide-map-pin" class="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Meus Locais</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ venuesData?.meta?.total ?? '—' }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="flex gap-3">
      <NuxtLink to="/organizador/eventos/novo">
        <UButton color="primary" icon="i-lucide-plus" label="Criar Evento" />
      </NuxtLink>
      <NuxtLink to="/organizador/locais/novo">
        <UButton color="neutral" variant="outline" icon="i-lucide-plus" label="Criar Local" />
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'organizer',
})

const eventsQuery = ref({ page: 1, limit: 100 })
const venuesQuery = ref({ page: 1, limit: 100 })

const { data: eventsData } = useAdminEventsQuery(eventsQuery)
const { data: venuesData } = useAdminVenuesQuery(venuesQuery)

const publishedCount = computed(() => {
  const events = eventsData.value?.data || []
  return events.filter((e: any) => e.status === 'PUBLISHED').length
})
</script>
