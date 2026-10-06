<template>
  <UApp :toaster="{ position: 'top-right', duration: 5000 }">
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth';

const authStore = useAuthStore();
authStore.restoreSession();

const { refreshUser } = useAuth();

onMounted(() => {
  refreshUser();
});
</script>
