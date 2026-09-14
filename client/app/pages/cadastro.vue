<template>
  <div class="flex min-h-[80vh] items-center justify-center px-4">
    <div class="w-full max-w-md">
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white font-[family-name:var(--font-family-display)]">
          Criar Conta
        </h1>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Cadastre-se para comprar ingressos
        </p>
      </div>

      <form class="mt-8 space-y-5" @submit.prevent="onSubmit">
        <UFormField label="Nome completo" name="name" :error="errors.name">
          <UInput
            v-model="name"
            placeholder="Seu nome"
            icon="i-lucide-user"
            size="lg"
            class="w-full"
          />
        </UFormField>

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
            placeholder="Mínimo 8 caracteres"
            icon="i-lucide-lock"
            size="lg"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Confirmar senha" name="confirmPassword" :error="errors.confirmPassword">
          <UInput
            v-model="confirmPassword"
            type="password"
            placeholder="Repita a senha"
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
          label="Criar conta"
        />

        <p class="text-center text-sm text-gray-500 dark:text-gray-400">
          Já tem uma conta?
          <NuxtLink to="/login" class="font-medium text-brand-600 hover:text-brand-500 dark:text-brand-400">
            Entrar
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

const { register, loading } = useAuth()

const registerSchema = toTypedSchema(
  z.object({
    name: z.string().min(1, 'Nome é obrigatório').min(3, 'Nome deve ter pelo menos 3 caracteres'),
    email: z.string().min(1, 'E-mail é obrigatório').email('E-mail inválido'),
    password: z
      .string()
      .min(1, 'Senha é obrigatória')
      .min(6, 'Senha deve ter pelo menos 6 caracteres'),
    confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
  }).refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  }),
)

const { handleSubmit, errors, defineField } = useForm({
  validationSchema: registerSchema,
  initialValues: {
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  },
})

const [name] = defineField('name')
const [email] = defineField('email')
const [password] = defineField('password')
const [confirmPassword] = defineField('confirmPassword')

const onSubmit = handleSubmit(async (formValues) => {
  await register({
    name: formValues.name,
    email: formValues.email,
    password: formValues.password,
  })
})
</script>
