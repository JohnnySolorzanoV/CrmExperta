import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup/testEnv.js'],
    include: ['tests/**/*.test.js'],
    clearMocks: true,
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
    globalTeardown: ['./tests/setup/testTeardown.js'],
  },
})
