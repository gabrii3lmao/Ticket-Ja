<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Organizadores</h1>
    </div>

    <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
      <div class="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-wrap gap-3">
        <UInput v-model="filters.legalName" placeholder="Buscar por razão social..." icon="i-lucide-search" class="w-full sm:w-64" />
        <USelect v-model="filters.status" :items="statusOptions" placeholder="Status" class="w-full sm:w-40" />
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-800">
              <th class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Razão Social</th>
              <th class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Solicitante</th>
              <th class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Documento</th>
              <th class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
              <th class="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading" v-for="i in 5" :key="i" class="border-b border-gray-100 dark:border-gray-800 animate-pulse">
              <td class="px-4 py-3"><div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div></td>
              <td class="px-4 py-3"><div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div></td>
              <td class="px-4 py-3"><div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div></td>
              <td class="px-4 py-3"><div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div></td>
              <td class="px-4 py-3"></td>
            </tr>
            <tr v-else-if="applications.length === 0">
              <td colspan="5" class="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                Nenhuma candidatura encontrada.
              </td>
            </tr>
            <tr v-else v-for="app in applications" :key="app.id" class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">{{ app.legalName }}</td>
              <td class="px-4 py-3 text-gray-600 dark:text-gray-300">{{ app.user.name }}</td>
              <td class="px-4 py-3 text-gray-600 dark:text-gray-300">{{ app.document }}</td>
              <td class="px-4 py-3"><StatusBadge :status="app.status" /></td>
              <td class="px-4 py-3 text-right">
                <NuxtLink :to="`/admin/organizadores/${app.id}`">
                  <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-eye" />
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="totalPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Página {{ filters.page }} de {{ totalPages }}
        </p>
        <div class="flex gap-2">
          <UButton color="neutral" variant="outline" size="xs" label="Anterior" :disabled="filters.page <= 1" @click="filters.page--" />
          <UButton color="neutral" variant="outline" size="xs" label="Próxima" :disabled="filters.page >= totalPages" @click="filters.page++" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const filters = ref({ page: 1, limit: 15, legalName: '', status: '', sortBy: 'createdAt', sortOrder: 'desc' as const })

const { data, isLoading } = useAdminApplicationsQuery(filters)
const applications = computed(() => data.value?.data || [])
const totalPages = computed(() => data.value?.meta?.totalPages || 1)
const loading = computed(() => isLoading.value)

const statusOptions = [
  { label: 'Todos', value: '' },
  { label: 'Pendente', value: 'PENDING' },
  { label: 'Aprovado', value: 'APPROVED' },
  { label: 'Rejeitado', value: 'REJECTED' },
]

watch(() => filters.value.legalName, () => { filters.value.page = 1 })
watch(() => filters.value.status, () => { filters.value.page = 1 })
</script>
