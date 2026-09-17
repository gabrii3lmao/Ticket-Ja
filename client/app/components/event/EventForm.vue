<template>
  <form class="space-y-6" @submit.prevent="onSubmit">
    <UFormField label="Nome do evento" name="name" :error="errors.name" required>
      <UInput v-model="name" placeholder="Ex: Rock in Rio 2026" size="lg" class="w-full" />
    </UFormField>

    <UFormField label="Descrição" name="description" :error="errors.description">
      <UTextarea v-model="description" placeholder="Descreva o evento..." :rows="3" class="w-full" />
    </UFormField>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <UFormField label="Data de início" name="startDate" :error="errors.startDate" required>
        <UInput v-model="startDate" type="datetime-local" size="lg" class="w-full" />
      </UFormField>

      <UFormField label="Data de término" name="endDate" :error="errors.endDate">
        <UInput v-model="endDate" type="datetime-local" size="lg" class="w-full" />
      </UFormField>
    </div>

    <UFormField label="Artistas (separe por vírgula)" name="artists" :error="errors.artists">
      <UInput v-model="artistsInput" placeholder="Ex: Iron Maiden, Slipknot" size="lg" class="w-full" />
    </UFormField>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <UFormField label="Idade mínima" name="minimumAge" :error="errors.minimumAge">
        <UInput v-model.number="minimumAge" type="number" placeholder="Ex: 18" size="lg" class="w-full" />
      </UFormField>

      <UFormField label="URL da imagem" name="imageUrl" :error="errors.imageUrl">
        <UInput v-model="imageUrl" placeholder="https://..." size="lg" class="w-full" />
      </UFormField>
    </div>

    <UFormField label="Local" name="venueId" :error="errors.venueId" required>
      <USelect
        v-model="venueId"
        :items="venueOptions"
        placeholder="Selecione um local"
        size="lg"
        class="w-full"
      />
    </UFormField>

    <div v-if="showStatus" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <UFormField label="Status" name="status" :error="errors.status">
        <USelect
          v-model="status"
          :items="statusOptions"
          size="lg"
          class="w-full"
        />
      </UFormField>
    </div>

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

interface VenueOption {
  id: string
  name: string
  city?: string | null
}

const props = defineProps<{
  initialData?: {
    name?: string
    description?: string
    startDate?: string
    endDate?: string
    artists?: string[]
    minimumAge?: number | null
    imageUrl?: string | null
    venueId?: string
    status?: string
  }
  venues: VenueOption[]
  loading?: boolean
  showStatus?: boolean
}>()

const emit = defineEmits<{
  submit: [data: Record<string, unknown>]
  cancel: []
}>()

const eventSchema = toTypedSchema(
  z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    description: z.string().optional(),
    startDate: z.string().min(1, 'Data de início é obrigatória'),
    endDate: z.string().optional(),
    artistsInput: z.string().optional(),
    minimumAge: z.number().optional().nullable(),
    imageUrl: z.string().url('URL inválida').optional().or(z.literal('')),
    venueId: z.string().min(1, 'Local é obrigatório'),
    status: z.string().optional(),
  }),
)

const { handleSubmit, errors, defineField } = useForm({
  validationSchema: eventSchema,
  initialValues: {
    name: props.initialData?.name || '',
    description: props.initialData?.description || '',
    startDate: props.initialData?.startDate ? formatDateTimeLocal(props.initialData.startDate) : '',
    endDate: props.initialData?.endDate ? formatDateTimeLocal(props.initialData.endDate) : '',
    artistsInput: props.initialData?.artists?.join(', ') || '',
    minimumAge: props.initialData?.minimumAge || null,
    imageUrl: props.initialData?.imageUrl || '',
    venueId: props.initialData?.venueId || '',
    status: props.initialData?.status || 'DRAFT',
  },
})

const [name] = defineField('name')
const [description] = defineField('description')
const [startDate] = defineField('startDate')
const [endDate] = defineField('endDate')
const [artistsInput] = defineField('artistsInput')
const [minimumAge] = defineField('minimumAge')
const [imageUrl] = defineField('imageUrl')
const [venueId] = defineField('venueId')
const [status] = defineField('status')

const venueOptions = computed(() =>
  props.venues.map(v => ({
    label: v.city ? `${v.name} — ${v.city}` : v.name,
    value: v.id,
  }))
)

const statusOptions = [
  { label: 'Rascunho', value: 'DRAFT' },
  { label: 'Publicado', value: 'PUBLISHED' },
  { label: 'Finalizado', value: 'FINISHED' },
  { label: 'Cancelado', value: 'CANCELED' },
]

const onSubmit = handleSubmit((formValues) => {
  const artists = formValues.artistsInput
    ? formValues.artistsInput.split(',').map(a => a.trim()).filter(Boolean)
    : []

  emit('submit', {
    name: formValues.name,
    description: formValues.description || undefined,
    startDate: new Date(formValues.startDate).toISOString(),
    endDate: formValues.endDate ? new Date(formValues.endDate).toISOString() : undefined,
    artists,
    minimumAge: formValues.minimumAge || undefined,
    imageUrl: formValues.imageUrl || undefined,
    venueId: formValues.venueId,
    status: formValues.status,
  })
})

</script>
