<template>
  <div>
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Tornar-se Organizador</h1>
    <p class="text-gray-500 dark:text-gray-400 mb-6">Preencha os dados da sua empresa para solicitar acesso de organizador.</p>

    <div v-if="isLoading" class="max-w-xl animate-pulse space-y-4">
      <div class="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
    </div>

    <div v-else-if="isOrganizer" class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 max-w-xl">
      <div class="flex items-center gap-3">
        <UIcon name="i-lucide-check-circle" class="w-6 h-6 text-green-600 dark:text-green-400" />
        <div>
          <p class="font-medium text-green-800 dark:text-green-200">Você já é um organizador!</p>
          <NuxtLink v-if="user?.role === 'ORGANIZER'" to="/organizador" class="text-sm text-green-700 dark:text-green-300 hover:underline">
            Acessar painel do organizador →
          </NuxtLink>
          <NuxtLink v-else to="/admin" class="text-sm text-green-700 dark:text-green-300 hover:underline">
            Acessar painel admin →
          </NuxtLink>
        </div>
      </div>
    </div>

    <div v-else-if="application && !resubmitting" class="max-w-xl space-y-6">
      <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Sua Candidatura</h2>
          <StatusBadge :status="application.status" />
        </div>

        <dl class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt class="text-gray-500 dark:text-gray-400">Razão Social</dt>
            <dd class="text-gray-900 dark:text-white">{{ application.legalName }}</dd>
          </div>
          <div>
            <dt class="text-gray-500 dark:text-gray-400">Nome Fantasia</dt>
            <dd class="text-gray-900 dark:text-white">{{ application.tradeName || '—' }}</dd>
          </div>
          <div>
            <dt class="text-gray-500 dark:text-gray-400">Documento</dt>
            <dd class="text-gray-900 dark:text-white">{{ application.document }}</dd>
          </div>
          <div>
            <dt class="text-gray-500 dark:text-gray-400">Enviada em</dt>
            <dd class="text-gray-900 dark:text-white">{{ formatDate(application.createdAt, { month: 'long' }) }}</dd>
          </div>
        </dl>

        <div v-if="application.status === 'PENDING'" class="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <p class="text-sm text-amber-700 dark:text-amber-300">Sua candidatura está sendo analisada. Você receberá uma retorno quando for aprovada ou rejeitada.</p>
        </div>

        <div v-if="application.status === 'REJECTED'" class="mt-4 space-y-4">
          <div v-if="application.rejectedReason" class="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p class="text-sm text-red-700 dark:text-red-300"><strong>Motivo da rejeição:</strong> {{ application.rejectedReason }}</p>
          </div>
          <UButton color="primary" label="Reenviar candidatura" @click="startResubmit" />
        </div>
      </div>
    </div>

    <div v-else class="max-w-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
      <form class="space-y-5" @submit.prevent="onSubmit">
        <UFormField label="Razão Social" name="legalName" :error="errors.legalName" required>
          <UInput v-model="legalName" placeholder="Nome da empresa" size="lg" class="w-full" />
        </UFormField>

        <UFormField label="Nome Fantasia" name="tradeName" :error="errors.tradeName">
          <UInput v-model="tradeName" placeholder="Nome que aparece para o público (opcional)" size="lg" class="w-full" />
        </UFormField>

        <UFormField label="CPF ou CNPJ" name="document" :error="errors.document" required>
          <UInput v-model="document" placeholder="Apenas números" size="lg" class="w-full" />
        </UFormField>

        <UButton type="submit" color="primary" size="lg" block :loading="isSubmitting" label="Enviar Candidatura" />
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'

definePageMeta({
  middleware: 'auth',
})

const { user } = useAuth()

const { data: application, isLoading } = useMyOrganizerApplicationQuery()
const submitMutation = useSubmitOrganizerApplicationMutation()

const isOrganizer = computed(
  () => user.value?.role === 'ORGANIZER' || user.value?.role === 'ADMIN',
)
const resubmitting = ref(false)

const schema = toTypedSchema(
  z.object({
    legalName: z.string().min(1, 'Razão social é obrigatória'),
    tradeName: z.string().optional(),
    document: z.string().min(1, 'Documento é obrigatório').min(11, 'Documento inválido'),
  }),
)

const { handleSubmit, errors, defineField, setValues } = useForm({
  validationSchema: schema,
  initialValues: {
    legalName: '',
    tradeName: '',
    document: '',
  },
})

const [legalName] = defineField('legalName')
const [tradeName] = defineField('tradeName')
const [document] = defineField('document')

const isSubmitting = computed(() => submitMutation.isPending.value)

function startResubmit() {
  setValues({
    legalName: application.value?.legalName || '',
    tradeName: application.value?.tradeName || '',
    document: application.value?.document || '',
  })
  resubmitting.value = true
}

const onSubmit = handleSubmit(async (formValues) => {
  try {
    await submitMutation.submit({
      legalName: formValues.legalName,
      tradeName: formValues.tradeName || undefined,
      document: formValues.document,
    })
    resubmitting.value = false
  } catch {
    // Errors are surfaced by the mutation toast
  }
})
</script>
