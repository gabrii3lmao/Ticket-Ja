import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(() => {
  const authStore = useAuthStore()

  if (!authStore.isAuthenticated) {
    return navigateTo({ path: '/login', query: { redirect: '/organizador' } })
  }

  const role = authStore.user?.role
  if (role !== 'ORGANIZER' && role !== 'ADMIN') {
    return navigateTo('/')
  }
})
