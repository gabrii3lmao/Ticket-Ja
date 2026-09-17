<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'organizer',
})
</script>

<template>
  <EventListPage title="Meus Eventos" base-path="/organizador/eventos" show-empty-action />
</template>
