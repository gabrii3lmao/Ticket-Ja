<template>
  <div class="min-h-screen flex bg-white dark:bg-gray-950">
    <AdminSidebar />
    <div class="flex-1 flex flex-col min-w-0">
      <header class="flex items-center gap-4 px-6 py-4 border-b border-gray-200 dark:border-gray-800 lg:hidden">
        <UButton icon="i-lucide-menu" color="neutral" variant="ghost" @click="mobileMenuOpen = true" />
        <NuxtLink to="/" class="text-lg font-bold text-brand-600 dark:text-brand-400 font-[family-name:var(--font-family-display)]">
          Ticket Ja
        </NuxtLink>
      </header>

      <main class="flex-1 overflow-y-auto p-6">
        <slot />
      </main>
    </div>

    <UModal v-model:open="mobileMenuOpen" title="Menu">
      <template #default>
        <nav class="space-y-1 p-4">
          <NuxtLink
            v-for="item in visibleItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            :class="isActive(item.to)
              ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'"
            @click="mobileMenuOpen = false"
          >
            <UIcon :name="item.icon" class="w-5 h-5" />
            {{ item.label }}
          </NuxtLink>
          <NuxtLink
            to="/"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
            @click="mobileMenuOpen = false"
          >
            <UIcon name="i-lucide-arrow-left" class="w-5 h-5" />
            Voltar ao site
          </NuxtLink>
        </nav>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const route = useRoute()
const authStore = useAuthStore()
const mobileMenuOpen = ref(false)

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
