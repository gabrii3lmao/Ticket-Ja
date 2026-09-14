<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">Dashboard</h1>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div v-for="card in cards" :key="card.label" class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-lg" :class="card.bgClass">
            <UIcon :name="card.icon" class="w-5 h-5" :class="card.iconClass" />
          </div>
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ card.label }}</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ card.value }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Candidaturas Pendentes</h2>
        <div v-if="pendingApps.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
          Nenhuma candidatura pendente.
        </div>
        <div v-else class="space-y-3">
          <NuxtLink
            v-for="app in pendingApps"
            :key="app.id"
            :to="`/admin/organizadores/${app.id}`"
            class="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">{{ app.legalName }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ app.user.name }}</p>
            </div>
            <StatusBadge status="PENDING" />
          </NuxtLink>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pedidos Pendentes</h2>
        <div v-if="pendingPayments.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
          Nenhum pedido pendente.
        </div>
        <div v-else class="space-y-3">
          <NuxtLink
            v-for="order in pendingPayments"
            :key="order.id"
            :to="`/admin/pedidos/${order.id}`"
            class="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
          >
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">Pedido #{{ order.id.slice(0, 8) }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">R$ {{ Number(order.total).toFixed(2) }}</p>
            </div>
            <StatusBadge status="PENDING" />
          </NuxtLink>
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

const eventsQuery = ref({ page: 1, limit: 100 })
const appsQuery = ref({ page: 1, limit: 5, status: 'PENDING' })
const paymentsQuery = ref({ page: 1, limit: 5, status: 'PENDING' })

const { data: eventsData } = useAdminEventsQuery(eventsQuery)
const { data: appsData } = useAdminApplicationsQuery(appsQuery)
const { data: paymentsData } = useAdminPaymentsQuery(paymentsQuery)

const cards = computed(() => [
  { label: 'Eventos', value: eventsData.value?.meta?.total ?? '—', icon: 'i-lucide-calendar', bgClass: 'bg-blue-50 dark:bg-blue-900/30', iconClass: 'text-blue-600 dark:text-blue-400' },
  { label: 'Candidaturas Pendentes', value: appsData.value?.meta?.total ?? '—', icon: 'i-lucide-users', bgClass: 'bg-amber-50 dark:bg-amber-900/30', iconClass: 'text-amber-600 dark:text-amber-400' },
  { label: 'Pedidos Pendentes', value: paymentsData.value?.meta?.total ?? '—', icon: 'i-lucide-credit-card', bgClass: 'bg-green-50 dark:bg-green-900/30', iconClass: 'text-green-600 dark:text-green-400' },
  { label: 'Locais', value: '—', icon: 'i-lucide-map-pin', bgClass: 'bg-purple-50 dark:bg-purple-900/30', iconClass: 'text-purple-600 dark:text-purple-400' },
])

const pendingApps = computed(() => appsData.value?.data || [])
const pendingPayments = computed(() => paymentsData.value?.data || [])
</script>
