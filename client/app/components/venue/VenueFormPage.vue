<template>
  <div>
    <div class="flex items-center gap-3 mb-6">
      <NuxtLink :to="basePath">
        <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left" />
      </NuxtLink>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        {{ isEdit ? 'Editar Local' : 'Novo Local' }}
      </h1>
    </div>

    <div v-if="isEdit && loading" class="animate-pulse space-y-4 max-w-2xl">
      <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
      <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>

    <div v-else-if="!isEdit || venue" class="space-y-6">
      <div class="max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <VenueForm
          :initial-data="isEdit ? venue : undefined"
          :loading="isPending"
          @submit="onSubmit"
          @cancel="navigateTo(basePath)"
        />
      </div>

      <div v-if="isEdit" class="max-w-2xl">
        <UButton color="error" variant="outline" label="Excluir Local" :loading="isDeleting" @click="onDelete" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  basePath: string
}>()

const route = useRoute()
const venueId = computed(() => (route.params.id as string) || '')
const isEdit = computed(() => !!venueId.value)

const venueMutation = useVenueFormMutation()
const { data: venue, isLoading: loading } = useVenueQuery(venueId)

const isPending = computed(() => venueMutation.isPending.value)
const isDeleting = ref(false)

async function onSubmit(data: Record<string, unknown>) {
  if (isEdit.value) {
    await venueMutation.update(venueId.value, data as any)
  } else {
    await venueMutation.create(data as any)
  }
  navigateTo(props.basePath)
}

async function onDelete() {
  if (!confirm('Tem certeza que deseja excluir este local?')) return
  isDeleting.value = true
  try {
    await venueMutation.remove(venueId.value)
    navigateTo(props.basePath)
  } finally {
    isDeleting.value = false
  }
}
</script>
