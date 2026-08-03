import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isAdminEmail } from "@/lib/admin";

describe("isAdminEmail", () => {
  const original = process.env.ADMIN_EMAIL;

  beforeEach(() => {
    process.env.ADMIN_EMAIL = "admin@vitriny.app";
  });

  afterEach(() => {
    process.env.ADMIN_EMAIL = original;
  });

  it("retorna true quando o e-mail bate com ADMIN_EMAIL", () => {
    expect(isAdminEmail("admin@vitriny.app")).toBe(true);
  });

  it("retorna false quando o e-mail não bate", () => {
    expect(isAdminEmail("outro@exemplo.com")).toBe(false);
  });

  it("retorna false quando o e-mail é null ou undefined", () => {
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
  });

  it("retorna false quando ADMIN_EMAIL não está configurada", () => {
    process.env.ADMIN_EMAIL = "";
    expect(isAdminEmail("admin@vitriny.app")).toBe(false);
  });
});
