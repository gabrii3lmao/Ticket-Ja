<template>
  <div class="flex flex-col items-center justify-center py-16 text-center">
    <div class="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
      <UIcon :name="icon" class="h-8 w-8 text-gray-400 dark:text-gray-500" />
    </div>
    <h3 class="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{{ title }}</h3>
    <p v-if="description" class="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
      {{ description }}
    </p>
    <UButton
      v-if="actionLabel"
      :to="actionTo"
      color="primary"
      variant="outline"
      :label="actionLabel"
      class="mt-6"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  description?: string
  actionLabel?: string
  actionTo?: string
}>()
</script>
