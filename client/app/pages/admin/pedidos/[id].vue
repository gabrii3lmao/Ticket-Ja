<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <NuxtLink to="/admin/pedidos">
        <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left" />
      </NuxtLink>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Detalhe do Pedido</h1>
    </div>

    <div v-if="loading" class="animate-pulse space-y-4 max-w-2xl">
      <div class="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
      <div class="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
    </div>

    <div v-else-if="order" class="max-w-2xl space-y-6">
      <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Pedido #{{ order.id.slice(0, 8) }}</h2>
          <StatusBadge :status="order.status" />
        </div>

        <dl class="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <dt class="text-gray-500 dark:text-gray-400">Subtotal</dt>
            <dd class="text-gray-900 dark:text-white">R$ {{ Number(order.subtotal).toFixed(2) }}</dd>
          </div>
          <div>
            <dt class="text-gray-500 dark:text-gray-400">Taxa de serviço</dt>
            <dd class="text-gray-900 dark:text-white">R$ {{ Number(order.fee).toFixed(2) }}</dd>
          </div>
          <div>
            <dt class="text-gray-500 dark:text-gray-400">Desconto</dt>
            <dd class="text-gray-900 dark:text-white">R$ {{ Number(order.discount).toFixed(2) }}</dd>
          </div>
          <div>
            <dt class="text-gray-500 dark:text-gray-400">Total</dt>
            <dd class="text-lg font-bold text-gray-900 dark:text-white">R$ {{ Number(order.total).toFixed(2) }}</dd>
          </div>
        </dl>
      </div>

      <div v-if="order.user" class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <h3 class="text-md font-semibold text-gray-900 dark:text-white mb-3">Comprador</h3>
        <dl class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt class="text-gray-500 dark:text-gray-400">Nome</dt>
            <dd class="text-gray-900 dark:text-white">{{ order.user.name }}</dd>
          </div>
          <div>
            <dt class="text-gray-500 dark:text-gray-400">Email</dt>
            <dd class="text-gray-900 dark:text-white">{{ order.user.email }}</dd>
          </div>
        </dl>
      </div>

      <div v-if="order.status === 'PENDING'" class="flex gap-3">
        <UButton color="success" label="Confirmar Pagamento" :loading="isConfirming" @click="onConfirm" />
        <UButton color="error" variant="outline" label="Rejeitar" :loading="isRejecting" @click="rejectModalOpen = true" />
      </div>

      <UModal v-model:open="rejectModalOpen" title="Rejeitar Pagamento">
        <template #default>
          <div class="space-y-4 p-4">
            <UFormField label="Motivo (opcional)">
              <UTextarea v-model="rejectReason" placeholder="Explique o motivo..." :rows="3" class="w-full" />
            </UFormField>
          </div>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="outline" label="Cancelar" @click="rejectModalOpen = false" />
            <UButton color="error" label="Rejeitar" :loading="isRejecting" @click="onReject" />
          </div>
        </template>
      </UModal>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const route = useRoute()
const orderId = route.params.id as string
const { confirm, reject } = useAdminPaymentMutation()

const { data: order, isLoading: loading } = useAdminPaymentDetailQuery(ref(orderId))

const isConfirming = ref(false)
const isRejecting = ref(false)
const rejectModalOpen = ref(false)
const rejectReason = ref('')

async function onConfirm() {
  isConfirming.value = true
  try {
    await confirm(orderId)
    navigateTo('/admin/pedidos')
  } finally {
    isConfirming.value = false
  }
}

async function onReject() {
  isRejecting.value = true
  try {
    await reject(orderId, rejectReason.value || undefined)
    navigateTo('/admin/pedidos')
  } finally {
    isRejecting.value = false
  }
}
</script>
