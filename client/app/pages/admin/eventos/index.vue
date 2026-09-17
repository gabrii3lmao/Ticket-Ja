<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})
</script>

<template>
  <EventListPage title="Eventos" base-path="/admin/eventos" />
</template>
