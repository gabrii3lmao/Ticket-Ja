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
        <div class="flex justify-between text-sm">
          <span class="text-gray-500">Status</span>
          <UBadge color="warning" variant="soft">Pagamento pendente</UBadge>
        </div>
      </div>
    </div>

    <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
      <UButton to="/minha-conta/ingressos" color="primary" label="Ver meus ingressos" />
      <UButton to="/" color="neutral" variant="outline" label="Voltar para a home" />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'default',
})

const route = useRoute()
const orderId = computed(() => route.query.orderId as string)
</script>
