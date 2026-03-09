import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  base: '/try-peerjs/', // <-- github pages base path (repo name)
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss() as any, // <-- workaround for https://github.com/tailwindlabs/tailwindcss/issues/19729
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
