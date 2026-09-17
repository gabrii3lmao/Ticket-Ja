<template>
  <div>
    <div v-if="isLoading" class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <SkeletonEventCard v-for="n in 6" :key="n" />
    </div>
    <div v-else-if="events?.length" class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <EventCard v-for="event in events" :key="event.id" :event="event" />
    </div>
    <EmptyState
      v-else
      icon="i-lucide-calendar-x"
      title="Nenhum evento encontrado"
      description="Tente buscar com outros filtros ou volte mais tarde."
    />
  </div>
</template>

<script setup lang="ts">
import type { Event } from '~/types/api'

defineProps<{
  events?: Event[]
  isLoading: boolean
}>()
</script>
