<template>
  <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white font-[family-name:var(--font-family-display)]">
        Eventos
      </h1>
      <p class="mt-2 text-gray-500 dark:text-gray-400">
        Encontre o evento perfeito para você
      </p>
    </div>

    <div class="mb-6 space-y-4">
      <SearchBar v-model="searchQuery" @search="resetPage" />
      <CategoryFilter v-model="selectedCategory" />
    </div>

    <EventGrid :events="data?.data" :is-loading="isLoading" />

    <div v-if="data?.meta && data.meta.totalPages > 1" class="mt-8 flex justify-center">
      <UPagination
        v-model:page="currentPage"
        :items-per-page="12"
        :total="data.meta.total"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const searchQuery = ref('')
const selectedCategory = ref('')
const currentPage = ref(1)

const filters = computed(() => ({
  page: currentPage.value,
  limit: 12,
  sortBy: 'startDate' as const,
  sortOrder: 'asc' as const,
  ...(searchQuery.value ? { name: searchQuery.value } : {}),
}))

const { data, isLoading } = useEventsQuery(filters)

function resetPage() {
  currentPage.value = 1
}

watch(selectedCategory, () => {
  currentPage.value = 1
})
</script>
