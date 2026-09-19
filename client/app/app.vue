<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
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
