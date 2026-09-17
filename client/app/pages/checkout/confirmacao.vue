<template>
  <div class="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
    <div class="text-center">
      <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
        <UIcon name="i-lucide-check-circle" class="h-8 w-8 text-green-600 dark:text-green-400" />
      </div>
      <h1 class="mt-6 text-3xl font-bold text-gray-900 dark:text-white font-[family-name:var(--font-family-display)]">
        Pedido realizado!
      </h1>
      <p class="mt-2 text-gray-500 dark:text-gray-400">
        Seu pedido foi recebido e está aguardando confirmação de pagamento.
      </p>
    </div>

    <div class="mt-10 rounded-xl border border-gray-200 p-6 dark:border-gray-800">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Detalhes do pedido</h2>
      <div class="mt-4 space-y-3">
        <div class="flex justify-between text-sm">
          <span class="text-gray-500">Número do pedido</span>
          <span class="font-mono font-medium text-gray-900 dark:text-white">{{ orderId }}</span>
        </div>
        <div v-if="order" class="flex justify-between text-sm">
          <span class="text-gray-500">Total</span>
          <span class="font-semibold text-gray-900 dark:text-white">R$ {{ formatPrice(order.total) }}</span>
        </div>
        <div class="flex justify-between text-sm">
          <span class="text-gray-500">Status</span>
          <UBadge :color="statusColor" variant="soft">{{ statusLabel }}</UBadge>
        </div>
      </div>

      <div
        v-if="remainingLabel"
        class="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
      >
        <UIcon name="i-lucide-clock" class="h-4 w-4 shrink-0" />
        <span>
          Reserva expira em <strong class="font-mono">{{ remainingLabel }}</strong>. Conclua o pagamento
          antes do prazo.
        </span>
      </div>
    </div>

    <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
      <UButton to="/minha-conta/ingressos" color="primary" label="Ver meus ingressos" />
      <UButton to="/" color="neutral" variant="outline" label="Voltar para a home" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCheckoutStore } from '~/stores/checkout'

definePageMeta({
  middleware: 'auth',
  layout: 'default',
})

const route = useRoute()
const checkoutStore = useCheckoutStore()

const orderId = computed(() => route.query.orderId as string)
const order = computed(() => checkoutStore.lastOrder?.order ?? null)
const payment = computed(() => checkoutStore.lastOrder?.payment ?? null)

const statusColor = computed(() => {
  switch (payment.value?.status) {
    case 'APPROVED': return 'success'
    case 'REJECTED': return 'error'
    default: return 'warning'
  }
})

const statusLabel = computed(() => {
  switch (payment.value?.status) {
    case 'APPROVED': return 'Pagamento aprovado'
    case 'REJECTED': return 'Pagamento rejeitado'
    default: return 'Pagamento pendente'
  }
})

const now = useNow({ interval: 1000 })

const remainingLabel = computed(() => {
  const reservedUntil = order.value?.reservedUntil
  if (!reservedUntil) return null

  const diff = new Date(reservedUntil).getTime() - now.value.getTime()
  if (diff <= 0) return null

  const totalSeconds = Math.floor(diff / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})
</script>
