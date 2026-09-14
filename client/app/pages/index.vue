<template>
  <div>
    <section class="relative overflow-hidden bg-gradient-to-br from-brand-600 to-brand-800 px-4 py-20 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-7xl text-center">
        <h1 class="text-4xl font-bold text-white sm:text-5xl lg:text-6xl font-[family-name:var(--font-family-display)]">
          Encontre os melhores eventos
        </h1>
        <p class="mx-auto mt-4 max-w-2xl text-lg text-brand-100">
          Shows, teatro, esportes, festas e muito mais. Compre seus ingressos de forma rápida e segura.
        </p>
        <div class="mx-auto mt-8 max-w-xl">
          <SearchBar v-model="searchQuery" @search="applySearch" />
        </div>
      </div>
    </section>

    <section class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white font-[family-name:var(--font-family-display)]">
          Categorias
        </h2>
      </div>
      <div class="mt-4">
        <CategoryFilter v-model="selectedCategory" />
      </div>
    </section>

    <section class="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white font-[family-name:var(--font-family-display)]">
          Eventos em destaque
        </h2>
        <NuxtLink
          to="/eventos"
          class="text-sm font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400"
        >
          Ver todos →
        </NuxtLink>
      </div>
      <div class="mt-6">
        <EventGrid :events="data?.data" :is-loading="isLoading" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const searchQuery = ref('')
const selectedCategory = ref('')

const filters = computed(() => ({
  page: 1,
  limit: 12,
  sortBy: 'startDate' as const,
  sortOrder: 'asc' as const,
  ...(searchQuery.value ? { name: searchQuery.value } : {}),
}))

const { data, isLoading } = useEventsQuery(filters)

function applySearch() {
  // triggers reactive filter update
}
</script>
