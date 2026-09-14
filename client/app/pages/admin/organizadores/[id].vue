<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <NuxtLink to="/admin/organizadores">
        <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left" />
      </NuxtLink>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Revisar Candidatura</h1>
    </div>

    <div v-if="loading" class="animate-pulse space-y-4 max-w-2xl">
      <div class="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
      <div class="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
    </div>

    <div v-else-if="application" class="max-w-2xl space-y-6">
      <div class="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">{{ application.legalName }}</h2>
          <StatusBadge :status="application.status" />
        </div>

        <dl class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt class="text-gray-500 dark:text-gray-400">Nome Fantasia</dt>
            <dd class="text-gray-900 dark:text-white">{{ application.tradeName || '—' }}</dd>
          </div>
          <div>
            <dt class="text-gray-500 dark:text-gray-400">Documento</dt>
            <dd class="text-gray-900 dark:text-white">{{ application.document }}</dd>
          </div>
          <div>
            <dt class="text-gray-500 dark:text-gray-400">Solicitante</dt>
            <dd class="text-gray-900 dark:text-white">{{ application.user.name }}</dd>
          </div>
          <div>
            <dt class="text-gray-500 dark:text-gray-400">Email</dt>
            <dd class="text-gray-900 dark:text-white">{{ application.user.email }}</dd>
          </div>
        </dl>

        <div v-if="application.rejectedReason" class="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p class="text-sm text-red-700 dark:text-red-300"><strong>Motivo da rejeição:</strong> {{ application.rejectedReason }}</p>
        </div>
      </div>

      <div v-if="application.status === 'PENDING'" class="flex gap-3">
        <UButton color="success" label="Aprovar" :loading="isApproving" @click="onApprove" />
        <UButton color="error" variant="outline" label="Rejeitar" :loading="isRejecting" @click="rejectModalOpen = true" />
      </div>

      <UModal v-model:open="rejectModalOpen" title="Rejeitar Candidatura">
        <template #default>
          <div class="space-y-4 p-4">
            <UFormField label="Motivo da rejeição (opcional)">
              <UTextarea v-model="rejectReason" placeholder="Explique o motivo..." :rows="3" class="w-full" />
            </UFormField>
          </div>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="outline" label="Cancelar" @click="rejectModalOpen = false" />
            <UButton color="error" label="Rejeitar" :loading="isRejecting" @click="onReject" />
          </div>
        </template>
      </UModal>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'admin',
})

const route = useRoute()
const appId = route.params.id as string
const { apiGet } = useApi()
const { approve, reject } = useAdminApplicationMutation()

const { data: application, isLoading: loading } = useQuery({
  queryKey: ['admin-application', appId],
  queryFn: () => apiGet(`/admin/organizer-application/${appId}`),
})

const isApproving = ref(false)
const isRejecting = ref(false)
const rejectModalOpen = ref(false)
const rejectReason = ref('')

async function onApprove() {
  isApproving.value = true
  try {
    await approve(appId)
    navigateTo('/admin/organizadores')
  } finally {
    isApproving.value = false
  }
}

async function onReject() {
  isRejecting.value = true
  try {
    await reject(appId, rejectReason.value || undefined)
    navigateTo('/admin/organizadores')
  } finally {
    isRejecting.value = false
  }
}
</script>
