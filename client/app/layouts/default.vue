<template>
  <div class="min-h-screen flex flex-col bg-white dark:bg-gray-950">
    <AppHeader />
    <main class="flex-1">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
