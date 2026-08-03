import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const publicKey = "NEXT_PUBLIC_MP_PUBLIC_KEY";

function readProjectFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("Mercado Pago public key no build Docker", () => {
  it("declara e exporta a public key no estagio builder", () => {
    const dockerfile = readProjectFile("Dockerfile");

    expect(dockerfile).toContain(`ARG ${publicKey}`);
    expect(dockerfile).toContain(`ENV ${publicKey}=$${publicKey}`);
  });

  it("encaminha a public key como build arg no Compose", () => {
    const compose = readProjectFile("docker-compose.yml");

    expect(compose).toContain(`${publicKey}: \${${publicKey}}`);
  });
});
