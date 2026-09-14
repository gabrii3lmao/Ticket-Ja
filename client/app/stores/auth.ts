import { defineStore } from 'pinia'
import type { User } from '~/types/api'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const refreshToken = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  function setSession(accessToken: string, refreshTokenValue: string, userData: User) {
    token.value = accessToken
    refreshToken.value = refreshTokenValue
    user.value = userData

    const tokenCookie = useCookie('auth_token', { maxAge: 60 * 60 * 24 * 7 })
    tokenCookie.value = accessToken

    const refreshCookie = useCookie('auth_refresh_token', { maxAge: 60 * 60 * 24 * 7 })
    refreshCookie.value = refreshTokenValue

    const userCookie = useCookie('auth_user', { maxAge: 60 * 60 * 24 * 7 })
    userCookie.value = JSON.stringify(userData)
  }

  function clearSession() {
    user.value = null
    token.value = null
    refreshToken.value = null

    const tokenCookie = useCookie('auth_token')
    tokenCookie.value = null

    const refreshCookie = useCookie('auth_refresh_token')
    refreshCookie.value = null

    const userCookie = useCookie('auth_user')
    userCookie.value = null
  }

  function restoreSession() {
    const tokenCookie = useCookie('auth_token')
    const refreshCookie = useCookie('auth_refresh_token')
    const userCookie = useCookie('auth_user')

    if (tokenCookie.value && userCookie.value) {
      token.value = tokenCookie.value as string
      refreshToken.value = (refreshCookie.value as string) || null
      try {
        user.value = JSON.parse(userCookie.value as string) as User
      } catch {
        clearSession()
      }
    }
  }

  return {
    user,
    token,
    refreshToken,
    isAuthenticated,
    setSession,
    clearSession,
    restoreSession,
  }
})
