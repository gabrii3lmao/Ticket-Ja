<template>
  <div class="space-y-4">
    <div v-for="category in categories" :key="category.id" class="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <div class="flex items-center justify-between">
        <div>
          <h4 class="font-semibold text-gray-900 dark:text-white">{{ category.name }}</h4>
          <p v-if="category.description" class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {{ category.description }}
          </p>
          <p class="mt-1 text-lg font-bold text-brand-600 dark:text-brand-400">
            R$ {{ formatPrice(category.price) }}
          </p>
          <p class="text-xs text-gray-400">
            {{ availableQuantity(category) }} ingressos disponíveis
          </p>
        </div>
        <div class="flex items-center gap-3">
          <UButton
            icon="i-lucide-minus"
            color="neutral"
            variant="outline"
            size="xs"
            :disabled="getQuantity(category.id) <= 0"
            @click="decrement(category.id)"
          />
          <span class="min-w-[2rem] text-center text-lg font-semibold text-gray-900 dark:text-white">
            {{ getQuantity(category.id) }}
          </span>
          <UButton
            icon="i-lucide-plus"
            color="primary"
            variant="outline"
            size="xs"
            :disabled="getQuantity(category.id) >= availableQuantity(category)"
            @click="increment(category.id)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Category } from '~/types/api'

interface TicketSelection {
  categoryId: string
  quantity: number
}

const props = defineProps<{
  categories: Category[]
}>()

const selected = defineModel<TicketSelection[]>({ default: () => [] })

function getQuantity(categoryId: string): number {
  return selected.value.find((s) => s.categoryId === categoryId)?.quantity || 0
}

function availableQuantity(category: Category): number {
  return category.quantity
}

function increment(categoryId: string) {
  const existing = selected.value.find((s) => s.categoryId === categoryId)
  if (existing) {
    existing.quantity++
  } else {
    selected.value.push({ categoryId, quantity: 1 })
  }
}

function decrement(categoryId: string) {
  const existing = selected.value.find((s) => s.categoryId === categoryId)
  if (existing) {
    if (existing.quantity <= 1) {
      selected.value = selected.value.filter((s) => s.categoryId !== categoryId)
    } else {
      existing.quantity--
    }
  }
}

function formatPrice(price: string): string {
  return Number.parseFloat(price).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
</script>
