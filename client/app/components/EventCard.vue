<template>
  <NuxtLink
    :to="`/eventos/${event.id}`"
    class="group block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
  >
    <div class="aspect-[16/9] overflow-hidden bg-gray-100 dark:bg-gray-800">
      <img
        v-if="event.imageUrl"
        :src="event.imageUrl"
        :alt="event.name"
        class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <div v-else class="flex h-full items-center justify-center">
        <UIcon name="i-lucide-image" class="h-12 w-12 text-gray-300 dark:text-gray-600" />
      </div>
    </div>
    <div class="p-4">
      <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <UIcon name="i-lucide-calendar" class="h-3.5 w-3.5" />
        <span>{{ formatDate(event.startDate) }}</span>
      </div>
      <h3 class="mt-2 line-clamp-2 text-lg font-semibold text-gray-900 dark:text-white">
        {{ event.name }}
      </h3>
      <div v-if="event.venue" class="mt-1 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
        <UIcon name="i-lucide-map-pin" class="h-3.5 w-3.5" />
        <span class="line-clamp-1">{{ event.venue.name }}{{ event.venue.city ? `, ${event.venue.city}` : '' }}</span>
      </div>
      <div v-if="event.categories?.length" class="mt-3 flex items-center gap-1">
        <span class="text-sm font-medium text-brand-600 dark:text-brand-400">
          A partir de R$ {{ lowestPrice }}
        </span>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { Event } from '~/types/api'

const props = defineProps<{
  event: Event
}>()

const lowestPrice = computed(() => {
  if (!props.event.categories?.length) return '0,00'
  const prices = props.event.categories.map((c) => Number.parseFloat(c.price))
  const min = Math.min(...prices)
  return min.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
})

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>
