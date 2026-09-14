<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <div v-if="isLoading" class="animate-pulse space-y-6">
      <div class="h-8 w-64 rounded bg-gray-200 dark:bg-gray-800" />
      <div class="aspect-[21/9] rounded-xl bg-gray-200 dark:bg-gray-800" />
      <div class="h-4 w-96 rounded bg-gray-200 dark:bg-gray-800" />
    </div>

    <div v-else-if="event">
      <NuxtLink
        to="/eventos"
        class="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
      >
        <UIcon name="i-lucide-arrow-left" class="h-4 w-4" />
        Voltar para eventos
      </NuxtLink>

      <div class="grid gap-8 lg:grid-cols-3">
        <div class="lg:col-span-2 space-y-6">
          <div class="aspect-[21/9] overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
            <img
              v-if="event.imageUrl"
              :src="event.imageUrl"
              :alt="event.name"
              class="h-full w-full object-cover"
            />
            <div v-else class="flex h-full items-center justify-center">
              <UIcon name="i-lucide-image" class="h-16 w-16 text-gray-300 dark:text-gray-600" />
            </div>
          </div>

          <div>
            <div class="flex items-center gap-2 text-sm text-brand-600 dark:text-brand-400">
              <UBadge :color="statusColor" variant="soft" size="sm">
                {{ statusLabel }}
              </UBadge>
              <span v-if="event.minimumAge" class="text-gray-500 dark:text-gray-400">
                {{ event.minimumAge }}+ anos
              </span>
            </div>
            <h1 class="mt-2 text-3xl font-bold text-gray-900 dark:text-white font-[family-name:var(--font-family-display)]">
              {{ event.name }}
            </h1>
            <div v-if="event.artists?.length" class="mt-2 flex flex-wrap gap-2">
              <UBadge v-for="artist in event.artists" :key="artist" color="neutral" variant="outline" size="sm">
                {{ artist }}
              </UBadge>
            </div>
          </div>

          <div class="space-y-4 rounded-xl border border-gray-200 p-6 dark:border-gray-800">
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-calendar" class="h-5 w-5 text-gray-400" />
              <div>
                <p class="font-medium text-gray-900 dark:text-white">{{ formatDate(event.startDate) }}</p>
                <p v-if="event.endDate" class="text-sm text-gray-500 dark:text-gray-400">
                  até {{ formatDate(event.endDate) }}
                </p>
              </div>
            </div>
            <div v-if="event.venue" class="flex items-center gap-3">
              <UIcon name="i-lucide-map-pin" class="h-5 w-5 text-gray-400" />
              <div>
                <p class="font-medium text-gray-900 dark:text-white">{{ event.venue.name }}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ [event.venue.street, event.venue.number, event.venue.district, event.venue.city, event.venue.state]
                    .filter(Boolean)
                    .join(', ') }}
                </p>
              </div>
            </div>
          </div>

          <div v-if="event.description" class="rounded-xl border border-gray-200 p-6 dark:border-gray-800">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Sobre o evento</h2>
            <p class="mt-3 whitespace-pre-line text-gray-600 dark:text-gray-400">{{ event.description }}</p>
          </div>
        </div>

        <div class="lg:col-span-1">
          <div class="sticky top-24 space-y-4">
            <div class="rounded-xl border border-gray-200 p-6 dark:border-gray-800">
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Ingressos</h2>
              <div v-if="categories?.data?.length" class="mt-4">
                <TicketSelector v-model="selectedTickets" :categories="categories.data" />
                <UButton
                  color="primary"
                  size="lg"
                  block
                  class="mt-4"
                  :disabled="!selectedTickets.length"
                  label="Comprar ingressos"
                  @click="goToCheckout"
                />
              </div>
              <p v-else class="mt-4 text-sm text-gray-500 dark:text-gray-400">
                Nenhum ingresso disponível no momento.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <EmptyState
      v-else
      icon="i-lucide-calendar-x"
      title="Evento não encontrado"
      description="Este evento pode ter sido removido ou não existe."
      action-label="Ver eventos"
      action-to="/eventos"
    />
  </div>
</template>

<script setup lang="ts">
import type { TicketSelection } from '~/components/TicketSelector.vue'
import { useCheckoutStore } from '~/stores/checkout'

definePageMeta({
  layout: 'default',
})

const route = useRoute()
const router = useRouter()

const eventId = computed(() => route.params.id as string)

const { data: event, isLoading } = useEventQuery(eventId)
const { data: categories } = useEventCategoriesQuery(eventId)

const selectedTickets = ref<TicketSelection[]>([])

const statusColor = computed(() => {
  switch (event.value?.status) {
    case 'PUBLISHED': return 'success'
    case 'FINISHED': return 'neutral'
    case 'CANCELED': return 'error'
    default: return 'warning'
  }
})

const statusLabel = computed(() => {
  switch (event.value?.status) {
    case 'PUBLISHED': return 'Ingressos à venda'
    case 'FINISHED': return 'Encerrado'
    case 'CANCELED': return 'Cancelado'
    case 'DRAFT': return 'Em breve'
    default: return event.value?.status
  }
})

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function goToCheckout() {
  const checkoutStore = useCheckoutStore()
  checkoutStore.setItems(selectedTickets.value)
  checkoutStore.setEventId(eventId.value)
  router.push('/checkout')
}
</script>
