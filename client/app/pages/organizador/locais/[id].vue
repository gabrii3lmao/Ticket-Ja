<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'organizer',
})
</script>

<template>
  <VenueFormPage base-path="/organizador/locais" />
</template>
