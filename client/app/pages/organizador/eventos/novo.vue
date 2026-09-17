<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'organizer',
})
</script>

<template>
  <EventFormPage base-path="/organizador/eventos" />
</template>
