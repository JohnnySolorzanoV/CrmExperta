import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'


export default defineConfig({
  plugins: [vue()],
css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ["import", 'global-builtin', 'color-functions', 'mixed-decls', 'if-function']
        }
      }
    }
  }
);




