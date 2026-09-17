<template>
  <UBadge :color="color" :variant="variant" size="sm">
    {{ label }}
  </UBadge>
</template>

<script setup lang="ts">
const props = defineProps<{
  status: string
}>()

type BadgeColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
type BadgeVariant = 'solid' | 'outline' | 'soft' | 'subtle'

const statusMap: Record<string, { label: string; color: BadgeColor; variant: BadgeVariant }> = {
  PENDING: { label: 'Pendente', color: 'warning', variant: 'subtle' },
  APPROVED: { label: 'Aprovado', color: 'success', variant: 'subtle' },
  REJECTED: { label: 'Rejeitado', color: 'error', variant: 'subtle' },
  DRAFT: { label: 'Rascunho', color: 'neutral', variant: 'subtle' },
  PUBLISHED: { label: 'Publicado', color: 'info', variant: 'subtle' },
  FINISHED: { label: 'Finalizado', color: 'neutral', variant: 'subtle' },
  CANCELED: { label: 'Cancelado', color: 'error', variant: 'subtle' },
  PAID: { label: 'Pago', color: 'success', variant: 'subtle' },
  VALID: { label: 'Válido', color: 'success', variant: 'subtle' },
  USED: { label: 'Utilizado', color: 'neutral', variant: 'subtle' },
}

const config = computed(() => statusMap[props.status] || { label: props.status, color: 'neutral' as const, variant: 'subtle' as const })
const label = computed(() => config.value.label)
const color = computed(() => config.value.color)
const variant = computed(() => config.value.variant)
</script>
