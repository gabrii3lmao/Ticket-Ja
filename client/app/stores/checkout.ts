import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import type { Order, Payment } from '~/types/api'

export interface CheckoutItem {
  categoryId: string
  name: string
  unitPrice: number
  quantity: number
}

export interface LastOrder {
  order: Order
  payment: Payment
}

interface CheckoutState {
  eventId: string | null
  eventName: string | null
  items: CheckoutItem[]
  couponCode: string | null
  discount: number
  lastOrder: LastOrder | null
}

const FEE_RATE = 0.05

function createEmptyState(): CheckoutState {
  return {
    eventId: null,
    eventName: null,
    items: [],
    couponCode: null,
    discount: 0,
    lastOrder: null,
  }
}

export const useCheckoutStore = defineStore('checkout', () => {
  const state = useLocalStorage<CheckoutState>('ticket-ja:checkout', createEmptyState())

  const eventId = computed(() => state.value.eventId)
  const eventName = computed(() => state.value.eventName)
  const items = computed(() => state.value.items)
  const couponCode = computed(() => state.value.couponCode)
  const discount = computed(() => state.value.discount)
  const lastOrder = computed(() => state.value.lastOrder)

  const subtotal = computed(() =>
    state.value.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
  )
  const fee = computed(() => subtotal.value * FEE_RATE)
  const total = computed(() => subtotal.value + fee.value - state.value.discount)
  const itemCount = computed(() =>
    state.value.items.reduce((sum, item) => sum + item.quantity, 0),
  )

  function setEvent(id: string, name: string | null) {
    state.value.eventId = id
    state.value.eventName = name
  }

  function setItems(newItems: CheckoutItem[]) {
    state.value.items = newItems
    state.value.discount = 0
  }

  function setCouponCode(code: string | null) {
    state.value.couponCode = code
  }

  function setLastOrder(lastOrder: LastOrder) {
    state.value.lastOrder = lastOrder
  }

  function clear() {
    state.value = { ...createEmptyState(), lastOrder: state.value.lastOrder }
  }

  function clearAll() {
    state.value = createEmptyState()
  }

  return {
    eventId,
    eventName,
    items,
    couponCode,
    discount,
    lastOrder,
    subtotal,
    fee,
    total,
    itemCount,
    setEvent,
    setItems,
    setCouponCode,
    setLastOrder,
    clear,
    clearAll,
  }
})
