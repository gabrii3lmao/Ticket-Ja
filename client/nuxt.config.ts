// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  ssr: false,
  devServer: { port: 5173 },
  runtimeConfig: {
    public: { apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api' },
  },
  nitro: {
    devProxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/docs': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
