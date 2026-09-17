<template>
  <footer class="border-t border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
    <div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div class="grid grid-cols-2 gap-8 md:grid-cols-4">
        <div>
          <div class="flex items-center gap-2">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-bold text-sm">
              TJ
            </div>
            <span class="text-lg font-bold text-gray-900 dark:text-white">Ticket Já</span>
          </div>
          <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">
            A maneira mais fácil de comprar ingressos para os melhores eventos.
          </p>
        </div>
        <div>
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Eventos</h3>
          <ul class="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li><NuxtLink to="/eventos" class="hover:text-gray-900 dark:hover:text-white transition-colors">Ver todos</NuxtLink></li>
          </ul>
        </div>
        <div>
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Minha Conta</h3>
          <ul class="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li><NuxtLink to="/minha-conta/ingressos" class="hover:text-gray-900 dark:hover:text-white transition-colors">Meus Ingressos</NuxtLink></li>
            <li><NuxtLink to="/minha-conta/pedidos" class="hover:text-gray-900 dark:hover:text-white transition-colors">Meus Pedidos</NuxtLink></li>
          </ul>
        </div>
        <div>
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Suporte</h3>
          <ul class="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li><a href="mailto:contato@ticketja.com.br" class="hover:text-gray-900 dark:hover:text-white transition-colors">contato@ticketja.com.br</a></li>
          </ul>
        </div>
      </div>
      <div class="mt-8 border-t border-gray-200 pt-8 dark:border-gray-800">
        <p class="text-center text-sm text-gray-500 dark:text-gray-400">
          &copy; {{ new Date().getFullYear() }} Ticket Já. Todos os direitos reservados.
        </p>
      </div>
    </div>
  </footer>
</template>
