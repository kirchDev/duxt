import { defineConfig } from 'vitest/config';

// Node environment only: what is tested here is the layer's pure logic — the
// source resolver and the icon lookup. Component rendering needs a Nuxt
// environment and belongs in its own project once there is something worth
// asserting about the markup.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node'
  }
});
