export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,

  modules: [
    '@nuxt/ui',
    '@peterbud/nuxt-query',
    '@pinia/nuxt',
    '@vueuse/nuxt',
  ],

  css: ['~/assets/css/main.css'],

  components: [{ path: '~/components', pathPrefix: false }],

  imports: {
    dirs: [
      'composables/catalog',
      'composables/events',
      'composables/venues',
      'composables/orders',
      'composables/organizers',
      'composables/payments',
    ],
  },

  devServer: { port: 5173 },

  runtimeConfig: {
    public: { apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api' },
  },

  nitro: {
    devProxy: {
      '/api': { target: 'http://localhost:3000/api', changeOrigin: true },
      '/docs': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },

  vueQueryPluginOptions: {
    queryClientConfig: {
      defaultOptions: {
        queries: {
          staleTime: 60_000,
          retry: 1,
        },
      },
    },
  },

  pinia: {
    storesDirs: ['./app/stores/**'],
  },

  future: {
    compatibilityVersion: 4,
  },
})
