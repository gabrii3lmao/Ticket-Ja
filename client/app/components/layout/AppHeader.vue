<template>
  <header class="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-lg dark:border-gray-800 dark:bg-gray-950/80">
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
      <NuxtLink to="/" class="flex items-center gap-2">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-bold text-sm">
          TJ
        </div>
        <span class="text-xl font-bold text-gray-900 dark:text-white font-[family-name:var(--font-family-display)]">
          Ticket Já
        </span>
      </NuxtLink>

      <nav class="hidden md:flex items-center gap-6">
        <NuxtLink
          to="/eventos"
          class="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
        >
          Eventos
        </NuxtLink>
        <NuxtLink
          v-if="user?.role === 'ADMIN'"
          to="/admin"
          class="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
        >
          Admin
        </NuxtLink>
        <NuxtLink
          v-if="user?.role === 'ORGANIZER' || user?.role === 'ADMIN'"
          :to="user?.role === 'ADMIN' ? '/admin' : '/organizador'"
          class="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
        >
          Organizador
        </NuxtLink>
      </nav>

      <div class="flex items-center gap-3">
        <template v-if="isAuthenticated">
          <UDropdownMenu
            :items="userMenuItems"
            :ui="{ content: 'w-48' }"
          >
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-user"
              :label="user?.name"
              trailing-icon="i-lucide-chevron-down"
              class="hidden sm:flex"
            />
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-user"
              class="sm:hidden"
            />
          </UDropdownMenu>
        </template>
        <template v-else>
          <UButton
            to="/login"
            color="neutral"
            variant="ghost"
            label="Entrar"
            class="hidden sm:flex"
          />
          <UButton
            to="/cadastro"
            color="primary"
            label="Cadastrar"
            class="hidden sm:flex"
          />
          <UButton
            to="/login"
            icon="i-lucide-user"
            color="primary"
            variant="ghost"
            class="sm:hidden"
          />
        </template>

        <UButton
          icon="i-lucide-menu"
          variant="ghost"
          color="neutral"
          class="md:hidden"
          @click="mobileMenuOpen = true"
        />
      </div>
    </div>

    <UModal v-model:open="mobileMenuOpen" title="Menu" :ui="{ content: 'sm:max-w-sm' }">
      <template #body>
        <nav class="flex flex-col gap-2">
          <NuxtLink
            to="/eventos"
            class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
            @click="mobileMenuOpen = false"
          >
            <UIcon name="i-lucide-calendar" class="h-4 w-4" />
            Eventos
          </NuxtLink>
          <template v-if="isAuthenticated">
            <NuxtLink
              to="/minha-conta"
              class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="mobileMenuOpen = false"
            >
              <UIcon name="i-lucide-user" class="h-4 w-4" />
              Minha Conta
            </NuxtLink>
            <NuxtLink
              to="/minha-conta/ingressos"
              class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="mobileMenuOpen = false"
            >
              <UIcon name="i-lucide-ticket" class="h-4 w-4" />
              Meus Ingressos
            </NuxtLink>
            <NuxtLink
              v-if="user?.role === 'ADMIN'"
              to="/admin"
              class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="mobileMenuOpen = false"
            >
              <UIcon name="i-lucide-shield" class="h-4 w-4" />
              Painel Admin
            </NuxtLink>
            <NuxtLink
              v-if="user?.role === 'ORGANIZER'"
              to="/organizador"
              class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="mobileMenuOpen = false"
            >
              <UIcon name="i-lucide-calendar" class="h-4 w-4" />
              Painel Organizador
            </NuxtLink>
            <NuxtLink
              v-if="user?.role === 'BUYER'"
              to="/minha-conta/organizador"
              class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="mobileMenuOpen = false"
            >
              <UIcon name="i-lucide-briefcase" class="h-4 w-4" />
              Tornar Organizador
            </NuxtLink>
            <UButton
              color="error"
              variant="ghost"
              label="Sair"
              icon="i-lucide-log-out"
              class="mt-2"
              @click="handleLogout"
            />
          </template>
          <template v-else>
            <NuxtLink
              to="/login"
              class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
              @click="mobileMenuOpen = false"
            >
              <UIcon name="i-lucide-log-in" class="h-4 w-4" />
              Entrar
            </NuxtLink>
            <NuxtLink
              to="/cadastro"
              class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950"
              @click="mobileMenuOpen = false"
            >
              <UIcon name="i-lucide-user-plus" class="h-4 w-4" />
              Cadastrar
            </NuxtLink>
          </template>
        </nav>
      </template>
    </UModal>
  </header>
</template>

<script setup lang="ts">
const { user, isAuthenticated, logout } = useAuth()
const mobileMenuOpen = ref(false)

const userMenuItems = computed(() => {
  const items = [
    [
      { label: 'Minha Conta', icon: 'i-lucide-user', to: '/minha-conta' },
      { label: 'Meus Ingressos', icon: 'i-lucide-ticket', to: '/minha-conta/ingressos' },
      { label: 'Meus Pedidos', icon: 'i-lucide-receipt', to: '/minha-conta/pedidos' },
    ],
  ]

  if (user.value?.role === 'ADMIN') {
    items[0].push({ label: 'Painel Admin', icon: 'i-lucide-shield', to: '/admin' })
  } else if (user.value?.role === 'ORGANIZER') {
    items[0].push({ label: 'Painel Organizador', icon: 'i-lucide-calendar', to: '/organizador' })
  } else {
    items[0].push({ label: 'Tornar Organizador', icon: 'i-lucide-briefcase', to: '/minha-conta/organizador' })
  }

  items.push([{ label: 'Sair', icon: 'i-lucide-log-out', onClick: () => logout() }])

  return items
})

function handleLogout() {
  mobileMenuOpen.value = false
  logout()
}
</script>
