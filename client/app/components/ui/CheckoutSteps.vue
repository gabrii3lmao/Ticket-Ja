<template>
  <div class="flex items-center justify-center">
    <ol class="flex items-center gap-4">
      <li
        v-for="(step, index) in steps"
        :key="step.label"
        class="flex items-center gap-2"
      >
        <div
          class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors"
          :class="[
            currentStep > index
              ? 'bg-brand-600 text-white'
              : currentStep === index
                ? 'bg-brand-600 text-white ring-2 ring-brand-300 dark:ring-brand-700'
                : 'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
          ]"
        >
          <UIcon v-if="currentStep > index" name="i-lucide-check" class="h-4 w-4" />
          <span v-else>{{ index + 1 }}</span>
        </div>
        <span
          class="hidden text-sm font-medium sm:inline"
          :class="[
            currentStep >= index
              ? 'text-gray-900 dark:text-white'
              : 'text-gray-400 dark:text-gray-500',
          ]"
        >
          {{ step.label }}
        </span>
        <UIcon
          v-if="index < steps.length - 1"
          name="i-lucide-chevron-right"
          class="h-4 w-4 text-gray-300 dark:text-gray-600"
        />
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  steps: { label: string }[]
  currentStep: number
}>()
</script>
