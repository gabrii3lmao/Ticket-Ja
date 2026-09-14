import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(() => {
  const authStore = useAuthStore()

  if (!authStore.isAuthenticated) {
    return navigateTo({ path: '/login', query: { redirect: '/admin' } })
  }

  if (authStore.user?.role !== 'ADMIN') {
    return navigateTo('/')
  }
})
