<template>
  <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
    <h1 class="mb-8 text-3xl font-bold text-gray-900 dark:text-white font-[family-name:var(--font-family-display)]">
      Meus Pedidos
    </h1>

    <div v-if="isLoading" class="space-y-4">
      <div v-for="n in 3" :key="n" class="animate-pulse rounded-xl border border-gray-200 p-6 dark:border-gray-800">
        <div class="space-y-3">
          <div class="h-5 w-48 rounded bg-gray-200 dark:bg-gray-800" />
          <div class="h-4 w-32 rounded bg-gray-200 dark:bg-gray-800" />
          <div class="h-4 w-24 rounded bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>
    </div>

    <div v-else-if="tickets?.data?.length" class="space-y-4">
      <div
        v-for="ticket in tickets.data"
        :key="ticket.id"
        class="rounded-xl border border-gray-200 p-6 dark:border-gray-800"
      >
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-white">
              {{ ticket.event?.name || 'Evento' }}
            </h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Ingresso: {{ ticket.code }}
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Comprado em {{ formatDateTime(ticket.createdAt) }}
            </p>
          </div>
          <UBadge :color="ticketStatusColor(ticket.status)" variant="soft">
            {{ ticketStatusLabel(ticket.status) }}
          </UBadge>
        </div>
      </div>
    </div>

    <EmptyState
      v-else
      icon="i-lucide-receipt"
      title="Nenhum pedido encontrado"
      description="Seu histórico de pedidos aparecerá aqui."
      action-label="Ver eventos"
      action-to="/eventos"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'default',
})

const { data: tickets, isLoading } = useMyOrdersQuery()

function ticketStatusColor(status: string) {
  switch (status) {
    case 'VALID': return 'success'
    case 'USED': return 'neutral'
    case 'CANCELED': return 'error'
    default: return 'neutral'
  }
}

function ticketStatusLabel(status: string) {
  switch (status) {
    case 'VALID': return 'Válido'
    case 'USED': return 'Utilizado'
    case 'CANCELED': return 'Cancelado'
    default: return status
  }
}
</script>
