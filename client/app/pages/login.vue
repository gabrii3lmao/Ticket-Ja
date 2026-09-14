<template>
  <div class="flex min-h-[80vh] items-center justify-center px-4">
    <div class="w-full max-w-md">
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white font-[family-name:var(--font-family-display)]">
          Entrar
        </h1>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Acesse sua conta para comprar ingressos
        </p>
      </div>

      <form class="mt-8 space-y-5" @submit.prevent="onSubmit">
        <UFormField label="E-mail" name="email" :error="errors.email">
          <UInput
            v-model="email"
            type="email"
            placeholder="seu@email.com"
            icon="i-lucide-mail"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Senha" name="password" :error="errors.password">
          <UInput
            v-model="password"
            type="password"
            placeholder="Sua senha"
            icon="i-lucide-lock"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <UButton
          type="submit"
          color="primary"
          size="lg"
          block
          :loading="loading"
          label="Entrar"
        />

        <p class="text-center text-sm text-gray-500 dark:text-gray-400">
          Não tem uma conta?
          <NuxtLink to="/cadastro" class="font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400">
            Cadastre-se
          </NuxtLink>
        </p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import * as z from 'zod'

definePageMeta({
  layout: 'default',
})

const { login, loading } = useAuth()

const loginSchema = toTypedSchema(
  z.object({
    email: z.string().min(1, 'E-mail é obrigatório').email('E-mail inválido'),
    password: z.string().min(1, 'Senha é obrigatória'),
  }),
)

const { handleSubmit, errors, defineField } = useForm({
  validationSchema: loginSchema,
  initialValues: {
    email: '',
    password: '',
  },
})

const [email] = defineField('email')
const [password] = defineField('password')

const onSubmit = handleSubmit(async (formValues) => {
  await login(formValues)
})
</script>
