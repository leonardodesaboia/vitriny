import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["lib/**", "types/**"],
      exclude: [
        "lib/prisma.ts",
        "lib/stripe.ts",
        "lib/stripe-client.ts",
        "lib/email.ts"
      ]
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./")
    }
  }
});
