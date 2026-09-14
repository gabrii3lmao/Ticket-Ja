<template>
  <aside class="hidden lg:flex lg:flex-col lg:w-64 lg:border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
    <div class="flex items-center gap-2 px-6 py-5 border-b border-gray-200 dark:border-gray-800">
      <NuxtLink to="/" class="text-lg font-bold text-brand-600 dark:text-brand-400 font-[family-name:var(--font-family-display)]">
        Ticket Ja
      </NuxtLink>
      <UBadge :color="isAdmin ? 'error' : 'warning'" variant="subtle" size="sm">
        {{ isAdmin ? 'Admin' : 'Organizador' }}
      </UBadge>
    </div>

    <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      <NuxtLink
        v-for="item in visibleItems"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
        :class="isActive(item.to)
          ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'"
      >
        <UIcon :name="item.icon" class="w-5 h-5" />
        {{ item.label }}
      </NuxtLink>
    </nav>

    <div class="px-3 py-4 border-t border-gray-200 dark:border-gray-800">
      <NuxtLink
        to="/"
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
      >
        <UIcon name="i-lucide-arrow-left" class="w-5 h-5" />
        Voltar ao site
      </NuxtLink>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const route = useRoute()
const authStore = useAuthStore()

const isAdmin = computed(() => authStore.user?.role === 'ADMIN')

interface NavItem {
  to: string
  label: string
  icon: string
  adminOnly?: boolean
}

const items: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: 'i-lucide-layout-dashboard', adminOnly: true },
  { to: '/admin/eventos', label: 'Eventos', icon: 'i-lucide-calendar', adminOnly: true },
  { to: '/admin/organizadores', label: 'Organizadores', icon: 'i-lucide-users', adminOnly: true },
  { to: '/admin/pedidos', label: 'Pedidos', icon: 'i-lucide-credit-card', adminOnly: true },
  { to: '/admin/locais', label: 'Locais', icon: 'i-lucide-map-pin' },
  { to: '/organizador', label: 'Dashboard', icon: 'i-lucide-layout-dashboard', adminOnly: false },
  { to: '/organizador/eventos', label: 'Meus Eventos', icon: 'i-lucide-calendar', adminOnly: false },
  { to: '/organizador/locais', label: 'Meus Locais', icon: 'i-lucide-map-pin', adminOnly: false },
]

const visibleItems = computed(() => {
  if (isAdmin.value) {
    return items.filter(i => i.adminOnly)
  }
  return items.filter(i => !i.adminOnly)
})

function isActive(to: string): boolean {
  if (to === '/admin' || to === '/organizador') {
    return route.path === to
  }
  return route.path.startsWith(to)
}
</script>
