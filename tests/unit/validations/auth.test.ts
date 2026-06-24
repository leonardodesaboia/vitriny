import { describe, it, expect } from "vitest";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from "@/lib/validations/auth";

describe("registerSchema", () => {
  const valid = {
    name: "João Silva",
    email: "joao@example.com",
    password: "senha123",
    confirmPassword: "senha123"
  };

  it("aceita dados válidos", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("rejeita nome com menos de 2 caracteres", () => {
    expect(registerSchema.safeParse({ ...valid, name: "J" }).success).toBe(false);
  });

  it("rejeita nome com mais de 120 caracteres", () => {
    expect(registerSchema.safeParse({ ...valid, name: "J".repeat(121) }).success).toBe(false);
  });

  it("rejeita e-mail inválido", () => {
    expect(registerSchema.safeParse({ ...valid, email: "nao-é-email" }).success).toBe(false);
  });

  it("rejeita senha com menos de 8 caracteres", () => {
    expect(
      registerSchema.safeParse({ ...valid, password: "123", confirmPassword: "123" }).success
    ).toBe(false);
  });

  it("rejeita senhas que não coincidem", () => {
    expect(
      registerSchema.safeParse({ ...valid, confirmPassword: "outra-senha" }).success
    ).toBe(false);
  });

  it("remove espaços extras do nome e e-mail", () => {
    const result = registerSchema.safeParse({ ...valid, name: "  João  ", email: "  joao@example.com  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("João");
      expect(result.data.email).toBe("joao@example.com");
    }
  });
});

describe("loginSchema", () => {
  const valid = { email: "joao@example.com", password: "qualquercoisa" };

  it("aceita dados válidos", () => {
    expect(loginSchema.safeParse(valid).success).toBe(true);
  });

  it("rejeita e-mail inválido", () => {
    expect(loginSchema.safeParse({ ...valid, email: "invalido" }).success).toBe(false);
  });

  it("rejeita senha vazia", () => {
    expect(loginSchema.safeParse({ ...valid, password: "" }).success).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  it("aceita e-mail válido", () => {
    expect(forgotPasswordSchema.safeParse({ email: "joao@example.com" }).success).toBe(true);
  });

  it("rejeita e-mail inválido", () => {
    expect(forgotPasswordSchema.safeParse({ email: "invalido" }).success).toBe(false);
  });

  it("rejeita campo vazio", () => {
    expect(forgotPasswordSchema.safeParse({ email: "" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  const valid = {
    token: "abc123",
    password: "novaSenha123",
    confirmPassword: "novaSenha123"
  };

  it("aceita dados válidos", () => {
    expect(resetPasswordSchema.safeParse(valid).success).toBe(true);
  });

  it("rejeita token vazio", () => {
    expect(resetPasswordSchema.safeParse({ ...valid, token: "" }).success).toBe(false);
  });

  it("rejeita senha com menos de 8 caracteres", () => {
    expect(
      resetPasswordSchema.safeParse({ ...valid, password: "curta", confirmPassword: "curta" }).success
    ).toBe(false);
  });

  it("rejeita senhas que não coincidem", () => {
    expect(
      resetPasswordSchema.safeParse({ ...valid, confirmPassword: "diferente" }).success
    ).toBe(false);
  });
});
