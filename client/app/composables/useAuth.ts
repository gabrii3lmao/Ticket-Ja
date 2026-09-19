import { useAuthStore } from '~/stores/auth';
import type { LoginInput, RegisterInput, AuthResponse, User } from '~/types/api';

export function useAuth() {
  const authStore = useAuthStore();
  const config = useRuntimeConfig();
  const toast = useToast();
  const router = useRouter();
  const route = useRoute();

  const baseURL = config.public.apiBase as string;
  const loading = ref(false);

  async function login(input: LoginInput) {
    loading.value = true;
    try {
      const response = await $fetch<AuthResponse>(`${baseURL}/auth/signin`, {
        method: 'POST',
        body: { email: input.email, password: input.password },
      });
      authStore.setSession(
        response.accessToken,
        response.refreshToken,
        response.user,
      );
      toast.add({ title: 'Login realizado com sucesso!', color: 'success' });
      const redirect = (route.query.redirect as string) || '/';
      router.push(redirect);
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Credenciais inválidas');
      toast.add({
        title: 'Erro ao fazer login',
        description: message,
        color: 'error',
      });
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function register(input: RegisterInput) {
    loading.value = true;
    try {
      const response = await $fetch<AuthResponse>(`${baseURL}/auth/register`, {
        method: 'POST',
        body: input,
      });
      authStore.setSession(
        response.accessToken,
        response.refreshToken,
        response.user,
      );
      toast.add({ title: 'Conta criada com sucesso!', color: 'success' });
      const redirect = route.query.redirect as string | undefined;
      if (redirect) {
        router.push(redirect);
      } else if (input.role === 'ORGANIZER') {
        router.push('/minha-conta/organizador');
      } else {
        router.push('/');
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Erro ao criar conta');
      toast.add({
        title: 'Erro ao criar conta',
        description: message,
        color: 'error',
      });
      throw error;
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    try {
      if (authStore.refreshToken) {
        await $fetch(`${baseURL}/auth/logout`, {
          method: 'POST',
          body: { refreshToken: authStore.refreshToken },
        });
      }
    } catch {
      // Ignore logout API errors, clear locally anyway
    } finally {
      authStore.clearSession();
      toast.add({ title: 'Logout realizado', color: 'info' });
      router.push('/');
    }
  }

  async function refreshUser() {
    if (!authStore.token) return;
    try {
      const headers = { Authorization: `Bearer ${authStore.token}` };
      const fresh = await $fetch<User>(`${baseURL}/auth/me`, { headers });

      if (
        fresh.role !== authStore.user?.role &&
        authStore.refreshToken
      ) {
        const tokens = await $fetch<{
          accessToken: string;
          refreshToken: string;
        }>(`${baseURL}/auth/refresh`, {
          method: 'POST',
          body: { refreshToken: authStore.refreshToken },
        });
        authStore.setSession(tokens.accessToken, tokens.refreshToken, fresh);
      } else {
        authStore.setUser(fresh);
      }
    } catch {
      // Keep the current session if the refresh fails
    }
  }

  return {
    user: computed(() => authStore.user),
    isAuthenticated: computed(() => authStore.isAuthenticated),
    loading: readonly(loading),
    login,
    register,
    logout,
    refreshUser,
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (
    error &&
    typeof error === 'object' &&
    'data' in error &&
    error.data &&
    typeof error.data === 'object'
  ) {
    const data = error.data as Record<string, unknown>;
    if (typeof data.message === 'string') return data.message;
    if (Array.isArray(data.message)) return data.message.join(', ');
    if (
      data.error &&
      typeof data.error === 'object' &&
      'message' in data.error
    ) {
      return String((data.error as Record<string, unknown>).message);
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}
