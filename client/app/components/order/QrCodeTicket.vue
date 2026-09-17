<template>
  <div class="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
    <div class="flex items-center justify-center">
      <canvas ref="canvasRef" />
    </div>
    <p class="mt-4 text-center font-mono text-sm font-medium text-gray-600 dark:text-gray-400">
      {{ code }}
    </p>
  </div>
</template>

<script setup lang="ts">
import QRCode from 'qrcode'

const props = defineProps<{
  code: string
  value?: string
}>()

const canvasRef = ref<HTMLCanvasElement>()

onMounted(() => {
  if (canvasRef.value) {
    QRCode.toCanvas(canvasRef.value, props.value || props.code, {
      width: 200,
      margin: 2,
      color: {
        dark: '#1f2937',
        light: '#ffffff',
      },
    })
  }
})
</script>
