<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const route = useRoute()
const eventId = computed(() => (route.params.id as string) || '')
</script>

<template>
  <CategoryManager :event-id="eventId" base-path="/admin/eventos" />
</template>
