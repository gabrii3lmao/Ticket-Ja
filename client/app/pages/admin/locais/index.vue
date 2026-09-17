<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})
</script>

<template>
  <VenueListPage title="Locais" base-path="/admin/locais" />
</template>
