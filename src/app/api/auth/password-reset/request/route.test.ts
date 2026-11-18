import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requestCustomerPasswordReset = vi.fn();
const sanitizeCpf = vi.fn();
const isValidCpf = vi.fn();

vi.mock("@/lib/customer-password-reset", () => ({
  requestCustomerPasswordReset,
}));

vi.mock("@/lib/user-repository", () => ({
  sanitizeCpf,
  isValidCpf,
}));

describe("auth/password-reset/request route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://estanciadayuse.com.br");
    sanitizeCpf.mockImplementation((value: string) => value.replace(/\D/g, ""));
    isValidCpf.mockReturnValue(true);
  });

  afterEach(() => vi.unstubAllEnvs());

  it("uses the configured public origin for password resets behind IIS", async () => {
    requestCustomerPasswordReset.mockResolvedValue({
      blocked: false,
      userFound: true,
      email: "cliente@example.com",
    });

    const { POST } = await import("@/app/api/auth/password-reset/request/route");
    const response = await POST(
      new Request("http://127.0.0.1:3001/api/auth/password-reset/request", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          cpf: "529.982.247-25",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(requestCustomerPasswordReset).toHaveBeenCalledWith({
      cpf: "52998224725",
      origin: "https://estanciadayuse.com.br",
    });
    expect(body).toEqual({
      ok: true,
      data: {
        sent: true,
        email: "cliente@example.com",
      },
    });
  });

  it("rejects an invalid cpf", async () => {
    isValidCpf.mockReturnValue(false);

    const { POST } = await import("@/app/api/auth/password-reset/request/route");
    const response = await POST(
      new Request("https://example.com/api/auth/password-reset/request", {
        method: "POST",
        body: JSON.stringify({
          cpf: "111",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(requestCustomerPasswordReset).not.toHaveBeenCalled();
    expect(body).toEqual({
      ok: false,
      error: {
        code: "invalid_cpf",
        message: "CPF invalido.",
      },
    });
  });

  it("returns not found when the cpf is not registered", async () => {
    requestCustomerPasswordReset.mockResolvedValue({
      blocked: false,
      userFound: false,
    });

    const { POST } = await import("@/app/api/auth/password-reset/request/route");
    const response = await POST(
      new Request("https://example.com/api/auth/password-reset/request", {
        method: "POST",
        body: JSON.stringify({
          cpf: "529.982.247-25",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({
      ok: false,
      error: {
        code: "user_not_found",
        message: "Nenhum usuario foi encontrado utilizando este CPF.",
      },
    });
  });
});
