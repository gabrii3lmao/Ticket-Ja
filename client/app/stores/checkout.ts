import { defineStore } from 'pinia'

interface TicketSelection {
  categoryId: string
  quantity: number
}

interface CheckoutState {
  eventId: string | null
  items: TicketSelection[]
  couponCode: string | null
}

export const useCheckoutStore = defineStore('checkout', () => {
  const state = ref<CheckoutState>({
    eventId: null,
    items: [],
    couponCode: null,
  })

  function setEventId(id: string) {
    state.value.eventId = id
  }

  function setItems(items: TicketSelection[]) {
    state.value.items = items
  }

  function setCouponCode(code: string | null) {
    state.value.couponCode = code
  }

  function clear() {
    state.value = { eventId: null, items: [], couponCode: null }
  }

  return {
    ...toRefs(state.value),
    setEventId,
    setItems,
    setCouponCode,
    clear,
  }
})
