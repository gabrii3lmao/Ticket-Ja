<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Pedidos</h1>
    </div>

    <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl">
      <div class="p-4 border-b border-gray-200 dark:border-gray-800 flex flex-wrap gap-3">
        <USelect v-model="filters.status" :items="statusOptions" placeholder="Status" class="w-full sm:w-40" />
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-800">
              <th class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Pedido</th>
              <th class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Valor</th>
              <th class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
              <th class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Data</th>
              <th class="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading" v-for="i in 5" :key="i" class="border-b border-gray-100 dark:border-gray-800 animate-pulse">
              <td class="px-4 py-3"><div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div></td>
              <td class="px-4 py-3"><div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div></td>
              <td class="px-4 py-3"><div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div></td>
              <td class="px-4 py-3"><div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div></td>
              <td class="px-4 py-3"></td>
            </tr>
            <tr v-else-if="orders.length === 0">
              <td colspan="5" class="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                Nenhum pedido encontrado.
              </td>
            </tr>
            <tr v-else v-for="order in orders" :key="order.id" class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">#{{ order.id.slice(0, 8) }}</td>
              <td class="px-4 py-3 text-gray-600 dark:text-gray-300">R$ {{ Number(order.total).toFixed(2) }}</td>
              <td class="px-4 py-3"><StatusBadge :status="order.status" /></td>
              <td class="px-4 py-3 text-gray-600 dark:text-gray-300">{{ formatDate(order.createdAt) }}</td>
              <td class="px-4 py-3 text-right">
                <NuxtLink :to="`/admin/pedidos/${order.id}`">
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

const filters = ref({ page: 1, limit: 15, status: 'PENDING', sortBy: 'createdAt', sortOrder: 'desc' as const })

const { data, isLoading } = useAdminPaymentsQuery(filters)
const orders = computed(() => data.value?.data || [])
const totalPages = computed(() => data.value?.meta?.totalPages || 1)
const loading = computed(() => isLoading.value)

const statusOptions = [
  { label: 'Pendente', value: 'PENDING' },
  { label: 'Pago', value: 'PAID' },
  { label: 'Cancelado', value: 'CANCELED' },
]

watch(() => filters.value.status, () => { filters.value.page = 1 })

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>
