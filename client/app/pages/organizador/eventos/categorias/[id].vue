<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'organizer',
})

const route = useRoute()
const eventId = computed(() => (route.params.id as string) || '')
</script>

<template>
  <CategoryManager :event-id="eventId" base-path="/organizador/eventos" />
</template>
