<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})
</script>

<template>
  <EventFormPage base-path="/admin/eventos" manage-categories />
</template>
