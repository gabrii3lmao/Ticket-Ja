<template>
  <div class="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
    <h1 class="mb-8 text-3xl font-bold text-gray-900 dark:text-white font-[family-name:var(--font-family-display)]">
      Minha Conta
    </h1>

    <div class="space-y-6">
      <div class="rounded-xl border border-gray-200 p-6 dark:border-gray-800">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Perfil</h2>
        <div class="mt-4 space-y-4">
          <div>
            <label class="text-sm font-medium text-gray-500 dark:text-gray-400">Nome</label>
            <p class="mt-1 text-gray-900 dark:text-white">{{ user?.name }}</p>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-500 dark:text-gray-400">E-mail</label>
            <p class="mt-1 text-gray-900 dark:text-white">{{ user?.email }}</p>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-500 dark:text-gray-400">Tipo de conta</label>
            <p class="mt-1">
              <UBadge :color="roleColor" variant="soft">{{ roleLabel }}</UBadge>
            </p>
          </div>
        </div>
      </div>

      <div class="rounded-xl border border-gray-200 p-6 dark:border-gray-800">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Acesso rápido</h2>
        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <NuxtLink
            to="/minha-conta/ingressos"
            class="flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
          >
            <UIcon name="i-lucide-ticket" class="h-5 w-5 text-brand-600 dark:text-brand-400" />
            <div>
              <p class="font-medium text-gray-900 dark:text-white">Meus Ingressos</p>
              <p class="text-sm text-gray-500 dark:text-gray-400">Visualize seus ingressos comprados</p>
            </div>
          </NuxtLink>
          <NuxtLink
            to="/minha-conta/pedidos"
            class="flex items-center gap-3 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
          >
            <UIcon name="i-lucide-receipt" class="h-5 w-5 text-brand-600 dark:text-brand-400" />
            <div>
              <p class="font-medium text-gray-900 dark:text-white">Meus Pedidos</p>
              <p class="text-sm text-gray-500 dark:text-gray-400">Histórico de compras</p>
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'default',
})

const { user } = useAuth()

const roleColor = computed(() => {
  switch (user.value?.role) {
    case 'ADMIN': return 'error'
    case 'ORGANIZER': return 'warning'
    default: return 'primary'
  }
})

const roleLabel = computed(() => {
  switch (user.value?.role) {
    case 'ADMIN': return 'Administrador'
    case 'ORGANIZER': return 'Organizador'
    default: return 'Comprador'
  }
})
</script>
