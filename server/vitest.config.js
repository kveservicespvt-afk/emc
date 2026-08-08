import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    // Integration tests hit a real (remote) Postgres instance over the network,
    // so the default 5s timeout is too tight — round trips can take a few seconds.
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
