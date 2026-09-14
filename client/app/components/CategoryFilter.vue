<template>
  <div class="flex flex-wrap gap-2">
    <UButton
      v-for="cat in categories"
      :key="cat.value"
      :color="modelValue === cat.value ? 'primary' : 'neutral'"
      :variant="modelValue === cat.value ? 'solid' : 'outline'"
      size="sm"
      :label="cat.label"
      @click="$emit('update:modelValue', modelValue === cat.value ? '' : cat.value)"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()

const categories = [
  { label: 'Shows', value: 'shows' },
  { label: 'Teatro', value: 'teatro' },
  { label: 'Esportes', value: 'esportes' },
  { label: 'Festas', value: 'festas' },
  { label: 'Congressos', value: 'congressos' },
  { label: 'Infantil', value: 'infantil' },
]
</script>
