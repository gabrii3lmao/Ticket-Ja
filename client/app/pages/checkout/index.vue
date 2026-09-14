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
          <form class="mt-4 space-y-4" @submit.prevent="goToConfirmation">
            <UFormField label="Nome completo" name="buyerName" :error="buyerErrors.name">
              <UInput v-model="buyerValues.name" placeholder="Seu nome completo" size="lg" class="w-full" />
            </UFormField>
            <UFormField label="E-mail" name="buyerEmail" :error="buyerErrors.email">
              <UInput v-model="buyerValues.email" type="email" placeholder="seu@email.com" size="lg" class="w-full" />
            </UFormField>
            <UFormField label="CPF (opcional)" name="buyerDocument">
              <UInput v-model="buyerValues.document" placeholder="000.000.000-00" size="lg" class="w-full" />
            </UFormField>
            <div class="flex gap-3">
              <UButton color="neutral" variant="outline" label="Voltar" @click="currentStep = 0" />
              <UButton type="submit" color="primary" size="lg" label="Continuar" />
            </div>
          </form>
        </div>

        <div v-if="currentStep === 2">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Confirmação</h2>
          <div class="mt-4 space-y-4">
            <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
              <h3 class="font-medium text-gray-900 dark:text-white">Dados do comprador</h3>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ buyerValues.name }}</p>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ buyerValues.email }}</p>
              <p v-if="buyerValues.document" class="text-sm text-gray-500 dark:text-gray-400">
                CPF: {{ buyerValues.document }}
              </p>
            </div>

            <UFormField label="Cupom de desconto" name="couponCode">
              <div class="flex gap-2">
                <UInput v-model="couponCode" placeholder="Código do cupom" size="lg" class="flex-1" />
                <UButton color="neutral" variant="outline" label="Aplicar" @click="applyCoupon" />
              </div>
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
            :subtotal="subtotal"
            :fee="fee"
            :discount="discount"
            :total="total"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'
import { useCheckoutStore } from '~/stores/checkout'

definePageMeta({
  middleware: 'auth',
  layout: 'default',
})

const checkoutStore = useCheckoutStore()
const router = useRouter()

const currentStep = ref(0)
const couponCode = ref('')

const steps = [
  { label: 'Ingressos' },
  { label: 'Dados' },
  { label: 'Confirmação' },
]

const buyerSchema = toTypedSchema(
  z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    email: z.string().min(1, 'E-mail é obrigatório').email('E-mail inválido'),
    document: z.string().optional(),
  }),
)

const { handleSubmit: handleBuyerSubmit, errors: buyerErrors, values: buyerValues } = useForm({
  validationSchema: buyerSchema,
  initialValues: { name: '', email: '', document: '' },
})

// Mock categories data - in real app this would come from useEventCategoriesQuery
const mockCategories = ref<Record<string, { name: string; price: number }>>({})

const selectedItems = computed(() =>
  checkoutStore.items.map((item) => {
    const cat = mockCategories.value[item.categoryId]
    return {
      categoryId: item.categoryId,
      name: cat?.name || 'Ingresso',
      quantity: item.quantity,
      unitPrice: cat?.price || 0,
    }
  }),
)

const summaryItems = computed(() =>
  selectedItems.value.map((item) => ({
    ...item,
    subtotal: item.unitPrice * item.quantity,
  })),
)

const subtotal = computed(() => summaryItems.value.reduce((sum, item) => sum + item.subtotal, 0))
const fee = computed(() => subtotal.value * 0.05)
const discount = ref(0)
const total = computed(() => subtotal.value + fee.value - discount.value)

const createOrder = useCreateOrderMutation()

function formatPrice(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function goToConfirmation() {
  handleBuyerSubmit(() => {
    currentStep.value = 2
  })()
}

function applyCoupon() {
  // TODO: validate coupon via API
}

async function submitOrder() {
  try {
    const order = await createOrder.mutateAsync({
      items: checkoutStore.items,
      ...(couponCode.value ? { couponCode: couponCode.value } : {}),
    })
    checkoutStore.clear()
    router.push(`/checkout/confirmacao?orderId=${order.id}`)
  } catch {
    // Error handled by mutation
  }
}
</script>
