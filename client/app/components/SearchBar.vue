<template>
  <div class="relative">
    <UInput
      :model-value="modelValue"
      placeholder="Buscar eventos..."
      icon="i-lucide-search"
      size="lg"
      class="w-full"
      :ui="{ root: 'w-full' }"
      @update:model-value="$emit('update:modelValue', $event)"
      @keyup.enter="$emit('search')"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
  search: []
}>()
</script>
