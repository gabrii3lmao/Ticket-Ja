<template>
  <form class="space-y-6" @submit.prevent="onSubmit">
    <UFormField label="Nome do local" name="name" :error="errors.name" required>
      <UInput v-model="name" placeholder="Ex: Estádio Maracanã" size="lg" class="w-full" />
    </UFormField>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <UFormField label="Rua" name="street" :error="errors.street">
        <UInput v-model="street" placeholder="Rua" size="lg" class="w-full" />
      </UFormField>
      <UFormField label="Número" name="number" :error="errors.number">
        <UInput v-model="number" placeholder="123" size="lg" class="w-full" />
      </UFormField>
      <UFormField label="Bairro" name="district" :error="errors.district">
        <UInput v-model="district" placeholder="Bairro" size="lg" class="w-full" />
      </UFormField>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <UFormField label="Cidade" name="city" :error="errors.city">
        <UInput v-model="city" placeholder="Cidade" size="lg" class="w-full" />
      </UFormField>
      <UFormField label="Estado" name="state" :error="errors.state">
        <UInput v-model="state" placeholder="UF" maxlength="2" size="lg" class="w-full" />
      </UFormField>
      <UFormField label="CEP" name="zipCode" :error="errors.zipCode">
        <UInput v-model="zipCode" placeholder="00000-000" size="lg" class="w-full" />
      </UFormField>
    </div>

    <UFormField label="Capacidade" name="capacity" :error="errors.capacity" required>
      <UInput v-model.number="capacity" type="number" placeholder="Ex: 50000" size="lg" class="w-full" />
    </UFormField>

    <div class="flex gap-3 pt-2">
      <UButton type="submit" color="primary" size="lg" :loading="loading" label="Salvar" />
      <UButton color="neutral" variant="outline" size="lg" label="Cancelar" @click="$emit('cancel')" />
    </div>
  </form>
</template>

<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'

const props = defineProps<{
  initialData?: {
    name?: string
    street?: string | null
    number?: string | null
    district?: string | null
    city?: string | null
    state?: string | null
    zipCode?: string | null
    capacity?: number
  }
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [data: Record<string, unknown>]
  cancel: []
}>()

const venueSchema = toTypedSchema(
  z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    street: z.string().optional(),
    number: z.string().optional(),
    district: z.string().optional(),
    city: z.string().optional(),
    state: z.string().max(2, 'UF deve ter 2 letras').optional(),
    zipCode: z.string().optional(),
    capacity: z.number().min(1, 'Capacidade deve ser maior que 0'),
  }),
)

const { handleSubmit, errors, defineField } = useForm({
  validationSchema: venueSchema,
  initialValues: {
    name: props.initialData?.name || '',
    street: props.initialData?.street || '',
    number: props.initialData?.number || '',
    district: props.initialData?.district || '',
    city: props.initialData?.city || '',
    state: props.initialData?.state || '',
    zipCode: props.initialData?.zipCode || '',
    capacity: props.initialData?.capacity || 0,
  },
})

const [name] = defineField('name')
const [street] = defineField('street')
const [number] = defineField('number')
const [district] = defineField('district')
const [city] = defineField('city')
const [state] = defineField('state')
const [zipCode] = defineField('zipCode')
const [capacity] = defineField('capacity')

const onSubmit = handleSubmit((formValues) => {
  emit('submit', {
    name: formValues.name,
    street: formValues.street || undefined,
    number: formValues.number || undefined,
    district: formValues.district || undefined,
    city: formValues.city || undefined,
    state: formValues.state || undefined,
    zipCode: formValues.zipCode || undefined,
    capacity: formValues.capacity,
  })
})
</script>
