<template>
  <div class="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
    <h1 class="mb-8 text-3xl font-bold text-gray-900 dark:text-white font-[family-name:var(--font-family-display)]">
      Checkout
    </h1>

    <CheckoutSteps :steps="steps" :current-step="currentStep" class="mb-8" />

    <div v-if="!checkoutStore.eventId" class="py-16">
      <EmptyState
        icon="i-lucide-shopping-cart"
        title="Nenhum ingresso selecionado"
        description="Volte à página do evento para selecionar seus ingressos."
        action-label="Ver eventos"
        action-to="/eventos"
      />
    </div>

    <div v-else class="grid gap-8 lg:grid-cols-3">
      <div class="lg:col-span-2 space-y-6">
        <div v-if="currentStep === 0">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Seus ingressos</h2>
          <p v-if="checkoutStore.eventName" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {{ checkoutStore.eventName }}
          </p>
          <div class="mt-4 space-y-3">
            <div
              v-for="item in selectedItems"
              :key="item.categoryId"
              class="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-800"
            >
              <div>
                <p class="font-medium text-gray-900 dark:text-white">{{ item.name }}</p>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  R$ {{ formatPrice(item.unitPrice) }} x {{ item.quantity }}
                </p>
              </div>
              <span class="font-semibold text-gray-900 dark:text-white">
                R$ {{ formatPrice(item.unitPrice * item.quantity) }}
              </span>
            </div>
          </div>
          <UButton color="primary" size="lg" class="mt-6" label="Continuar" @click="currentStep = 1" />
        </div>

        <div v-if="currentStep === 1">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Dados do comprador</h2>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Os ingressos serão emitidos para a conta autenticada.
          </p>
          <div class="mt-4 space-y-4">
            <UFormField label="Nome completo" name="buyerName">
              <UInput :model-value="user?.name" readonly size="lg" class="w-full" />
            </UFormField>
            <UFormField label="E-mail" name="buyerEmail">
              <UInput :model-value="user?.email" readonly size="lg" class="w-full" />
            </UFormField>
            <div class="flex gap-3">
              <UButton color="neutral" variant="outline" label="Voltar" @click="currentStep = 0" />
              <UButton color="primary" size="lg" label="Continuar" @click="currentStep = 2" />
            </div>
          </div>
        </div>

        <div v-if="currentStep === 2">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Confirmação</h2>
          <div class="mt-4 space-y-4">
            <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
              <h3 class="font-medium text-gray-900 dark:text-white">Dados do comprador</h3>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ user?.name }}</p>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ user?.email }}</p>
            </div>

            <UFormField label="Cupom de desconto" name="couponCode">
              <UInput
                placeholder="Cupons estarão disponíveis em breve"
                size="lg"
                class="w-full"
                disabled
              />
            </UFormField>

            <div class="flex gap-3">
              <UButton color="neutral" variant="outline" label="Voltar" @click="currentStep = 1" />
              <UButton
                color="primary"
                size="lg"
                :loading="createOrder.isPending.value"
                label="Finalizar compra"
                @click="submitOrder"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="lg:col-span-1">
        <div class="sticky top-24">
          <OrderSummary
            :items="summaryItems"
            :subtotal="checkoutStore.subtotal"
            :fee="checkoutStore.fee"
            :discount="checkoutStore.discount"
            :total="checkoutStore.total"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCheckoutStore } from '~/stores/checkout'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'auth',
  layout: 'default',
})

const checkoutStore = useCheckoutStore()
const authStore = useAuthStore()
const router = useRouter()

const user = computed(() => authStore.user)

const currentStep = ref(0)
const idempotencyKey = ref(generateIdempotencyKey())

const steps = [
  { label: 'Ingressos' },
  { label: 'Dados' },
  { label: 'Confirmação' },
]

const selectedItems = computed(() => checkoutStore.items)

const summaryItems = computed(() =>
  checkoutStore.items.map((item) => ({
    ...item,
    subtotal: item.unitPrice * item.quantity,
  })),
)

const createOrder = useCreateOrderMutation()

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

async function submitOrder() {
  if (!checkoutStore.items.length) return

  try {
    const response = await createOrder.mutateAsync({
      data: {
        items: checkoutStore.items.map(({ categoryId, quantity }) => ({
          categoryId,
          quantity,
        })),
      },
      idempotencyKey: idempotencyKey.value,
    })

    checkoutStore.setLastOrder(response)
    checkoutStore.clear()
    idempotencyKey.value = generateIdempotencyKey()
    router.push(`/checkout/confirmacao?orderId=${response.order.id}`)
  } catch {
    // Error handled by the mutation toast
  }
}
</script>
