<template>
  <div class="rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Resumo do Pedido</h3>
    <div class="mt-4 space-y-3">
      <div v-for="item in items" :key="item.categoryId" class="flex items-center justify-between text-sm">
        <span class="text-gray-600 dark:text-gray-400">
          {{ item.name }} x {{ item.quantity }}
        </span>
        <span class="font-medium text-gray-900 dark:text-white">
          R$ {{ formatPrice(item.subtotal) }}
        </span>
      </div>
    </div>
    <div class="mt-4 border-t border-gray-200 pt-4 dark:border-gray-800">
      <div class="flex justify-between text-sm">
        <span class="text-gray-500">Subtotal</span>
        <span class="text-gray-900 dark:text-white">R$ {{ formatPrice(subtotal) }}</span>
      </div>
      <div class="mt-2 flex justify-between text-sm">
        <span class="text-gray-500">Taxa de serviço</span>
        <span class="text-gray-900 dark:text-white">R$ {{ formatPrice(fee) }}</span>
      </div>
      <div v-if="discount > 0" class="mt-2 flex justify-between text-sm">
        <span class="text-green-600">Desconto</span>
        <span class="text-green-600">-R$ {{ formatPrice(discount) }}</span>
      </div>
      <div class="mt-3 flex justify-between border-t border-gray-200 pt-3 dark:border-gray-800">
        <span class="font-semibold text-gray-900 dark:text-white">Total</span>
        <span class="text-xl font-bold text-brand-600 dark:text-brand-400">R$ {{ formatPrice(total) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface OrderItem {
  categoryId: string
  name: string
  quantity: number
  unitPrice: number
  subtotal: number
}

defineProps<{
  items: OrderItem[]
  subtotal: number
  fee: number
  discount: number
  total: number
}>()

</script>
