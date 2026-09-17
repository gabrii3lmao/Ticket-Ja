<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <div v-for="n in count" :key="n" class="animate-pulse rounded-xl border border-gray-200 dark:border-gray-800">
      <div class="aspect-[16/9] bg-gray-200 dark:bg-gray-800" />
      <div class="p-4 space-y-3">
        <div class="h-3 w-24 rounded bg-gray-200 dark:bg-gray-800" />
        <div class="h-5 w-3/4 rounded bg-gray-200 dark:bg-gray-800" />
        <div class="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-800" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  count?: number
}>()
</script>
