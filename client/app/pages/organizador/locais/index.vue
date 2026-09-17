<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'organizer',
})
</script>

<template>
  <VenueListPage title="Meus Locais" base-path="/organizador/locais" show-empty-action />
</template>
