import { defineConfig } from 'vitest/config';

// Run tests in a far-away time zone on purpose: opening-hours checks must use the
// destination's wall-clock time and must not depend on the server's own time zone.
process.env.TZ = 'Pacific/Auckland';

export default defineConfig({
  test: { include: ['test/**/*.test.ts'] },
});
