import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/integration/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts", "./tests/integration/setup.ts"],
    fileParallelism: false,
    env: {
      DATABASE_URL: "postgresql://vitriny:vitriny@localhost:5432/orcafacil_test",
      AUTH_SECRET: "integration-test-secret-32chars!",
      AUTH_URL: "http://localhost:3000",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000"
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./")
    }
  }
});
