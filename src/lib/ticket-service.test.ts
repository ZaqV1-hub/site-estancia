import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isTicketServiceConfigured,
  processConfirmedPurchaseTickets,
  syncTicketValidation,
  sendPurchaseTicketsWhatsApp,
} from "@/lib/ticket-service";

const dbQuery = vi.fn();
const originalEnv = process.env;

vi.mock("@/lib/ingresso-db", () => ({
  getIngressoDbPool: () => ({
    query: dbQuery,
  }),
}));

describe("ticket-service", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      INGRESSO_TICKET_API_BASE_URL: "https://tickets.example.test",
      INGRESSO_TICKET_API_USERNAME: "ticket-user",
      INGRESSO_TICKET_API_PASSWORD: "ticket-pass",
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  it("detects when the ticket microservice is unavailable", () => {
    delete process.env.INGRESSO_TICKET_API_BASE_URL;

    expect(isTicketServiceConfigured()).toBe(false);
  });

  it("skips processing when no ticket service config exists", async () => {
    delete process.env.INGRESSO_TICKET_API_BASE_URL;
    process.env = {
      ...process.env,
      NODE_ENV: "test",
    };

    await expect(processConfirmedPurchaseTickets(123)).resolves.toEqual({
      status: "skipped",
      purchaseId: 123,
      sentVoucherIds: [],
      skippedReason: "ticket_service_not_configured",
    });
  });

  it("uses the default ticket api base url during development when env is absent", async () => {
    delete process.env.INGRESSO_TICKET_API_BASE_URL;
    delete process.env.INGRESSO_TICKET_API_USERNAME;
    delete process.env.INGRESSO_TICKET_API_PASSWORD;
    process.env = {
      ...process.env,
      NODE_ENV: "development",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ token: "ticket-token" }))
      .mockResolvedValueOnce(Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    dbQuery.mockImplementation(async (sql: string, values?: unknown[]) => {
      if (sql.includes("FROM compra")) {
        return {
          rows: [
            {
              idcompra: 456,
              cpf: "52998224725",
              tpcompra: "bilhe",
              dtcompra: "2026-04-23",
              email: "cliente@example.com",
              nmusuario: "Cliente Teste",
              celular: "51999999999",
            },
          ],
        };
      }

      if (sql.includes("voucher.idvoucher = ANY")) {
        expect(values).toEqual([456, [9001]]);

        return {
          rows: [
            {
              idvoucher: 9001,
              numvoucher: "123456",
              tpvoucher: "norma",
              vlunicompra: "129.90",
              stusado: "n",
              voucherenviado: "n",
              identificacao: null,
              idagenda: 10,
              dtagenda: "2026-05-01",
            },
          ],
        };
      }

      return { rows: [] };
    });

    await expect(
      sendPurchaseTicketsWhatsApp(456, [9001], "(51) 99999-9999"),
    ).resolves.toEqual({
      status: "sent",
      purchaseId: 456,
      sentVoucherIds: [9001],
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://estanciaticketapi.azurewebsites.net/website/tickets/send",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("authenticates, sends tickets and marks vouchers as sent", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ token: "ticket-token" }))
      .mockResolvedValueOnce(Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    dbQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM compra")) {
        return {
          rows: [
            {
              idcompra: 456,
              cpf: "52998224725",
              tpcompra: "ponli",
              dtcompra: "2026-04-23",
              email: "cliente@example.com",
              nmusuario: "Cliente Teste",
              celular: "51999999999",
            },
          ],
        };
      }

      if (sql.includes("FROM voucher")) {
        return {
          rows: [
            {
              idvoucher: 9001,
              numvoucher: "123456",
              tpvoucher: "norma",
              vlunicompra: "129.90",
              stusado: "n",
              voucherenviado: "n",
              identificacao: null,
              idagenda: 10,
              dtagenda: "2026-05-01",
            },
          ],
        };
      }

      return { rows: [] };
    });

    const result = await processConfirmedPurchaseTickets(456);

    expect(result).toEqual({
      status: "sent",
      purchaseId: 456,
      sentVoucherIds: [9001],
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://tickets.example.test/login",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://tickets.example.test/generate-and-send-tickets",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer ticket-token",
        }),
      }),
    );
    const [, requestInit] = fetchMock.mock.calls[1] as [string, { body: string }];
    expect(JSON.parse(requestInit.body)).toMatchObject({
      vouchers: [
        {
          purchaseId: "456",
          voucherId: "9001",
          purchaseLocation: "Online",
          tpcompra: "ponli",
        },
      ],
    });
    expect(dbQuery).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE voucher"),
      [[9001]],
    );
  });

  it("uses bilheteria as purchase location for box-office tickets", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ token: "ticket-token" }))
      .mockResolvedValueOnce(Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    dbQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM compra")) {
        return {
          rows: [
            {
              idcompra: 789,
              cpf: null,
              tpcompra: "bilhe",
              dtcompra: "2026-04-23",
              email: null,
              nmusuario: null,
              celular: null,
            },
          ],
        };
      }

      if (sql.includes("FROM voucher")) {
        return {
          rows: [
            {
              idvoucher: 9101,
              numvoucher: "A2345",
              tpvoucher: "norma",
              vlunicompra: "100.00",
              stusado: "n",
              voucherenviado: "n",
              identificacao: null,
              idagenda: 88,
              dtagenda: "2026-07-25",
            },
          ],
        };
      }

      return { rows: [] };
    });

    await expect(processConfirmedPurchaseTickets(789)).resolves.toEqual({
      status: "sent",
      purchaseId: 789,
      sentVoucherIds: [9101],
    });
    const [, requestInit] = fetchMock.mock.calls[1] as [string, { body: string }];

    expect(JSON.parse(requestInit.body)).toMatchObject({
      vouchers: [
        {
          purchaseId: "789",
          voucherId: "9101",
          purchaseLocation: "Bilheteria",
          tpcompra: "bilhe",
        },
      ],
    });
  });

  it("skips confirmed purchase ticket processing when the local testing service is unreachable", async () => {
    delete process.env.INGRESSO_TICKET_API_BASE_URL;
    delete process.env.INGRESSO_TICKET_API_USERNAME;
    delete process.env.INGRESSO_TICKET_API_PASSWORD;
    process.env = {
      ...process.env,
      NODE_ENV: "development",
    };
    const fetchMock = vi.fn().mockRejectedValue(
      Object.assign(new TypeError("fetch failed"), {
        cause: { code: "ECONNREFUSED" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    dbQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM compra")) {
        return {
          rows: [
            {
              idcompra: 456,
              cpf: "52998224725",
              tpcompra: "ponli",
              dtcompra: "2026-04-23",
              email: "cliente@example.com",
              nmusuario: "Cliente Teste",
              celular: "51999999999",
            },
          ],
        };
      }

      if (sql.includes("FROM voucher")) {
        return {
          rows: [
            {
              idvoucher: 9001,
              numvoucher: "123456",
              tpvoucher: "norma",
              vlunicompra: "129.90",
              stusado: "n",
              voucherenviado: "n",
              identificacao: null,
              idagenda: 10,
              dtagenda: "2026-05-01",
            },
          ],
        };
      }

      return { rows: [] };
    });

    await expect(processConfirmedPurchaseTickets(456)).resolves.toEqual({
      status: "skipped",
      purchaseId: 456,
      sentVoucherIds: [],
      skippedReason: "ticket_service_unreachable",
    });
  });

  it("sends selected vouchers by whatsapp through the ticket microservice", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    dbQuery.mockImplementation(async (sql: string, values?: unknown[]) => {
      if (sql.includes("FROM compra")) {
        return {
          rows: [
            {
              idcompra: 456,
              cpf: "52998224725",
              tpcompra: "ponli",
              dtcompra: "2026-04-23",
              email: "cliente@example.com",
              nmusuario: "Cliente Teste",
              celular: "51999999999",
            },
          ],
        };
      }

      if (sql.includes("voucher.idvoucher = ANY")) {
        expect(values).toEqual([456, [9001]]);

        return {
          rows: [
            {
              idvoucher: 9001,
              numvoucher: "123456",
              tpvoucher: "norma",
              vlunicompra: "129.90",
              stusado: "n",
              voucherenviado: "n",
              identificacao: null,
              idagenda: 10,
              dtagenda: "2026-05-01",
            },
          ],
        };
      }

      return { rows: [] };
    });

    const result = await sendPurchaseTicketsWhatsApp(
      456,
      [9001],
      "(51) 99999-9999",
    );

    expect(result).toEqual({
      status: "sent",
      purchaseId: 456,
      sentVoucherIds: [9001],
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://estanciaticketapi.azurewebsites.net/website/tickets/send",
      expect.objectContaining({
        method: "POST",
      }),
    );
    const [, requestInit] = fetchMock.mock.calls[0] as [
      string,
      { body: string },
    ];
    expect(JSON.parse(requestInit.body)).toMatchObject({
      phoneNumber: "51999999999",
      vouchers: [
        {
          purchaseId: "456",
          voucherId: "9001",
          voucherCode: "A123456",
        },
      ],
    });
  });

  it("rejects async accepted whatsapp responses because delivery is not confirmed yet", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 202,
          headers: { "content-type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    dbQuery.mockImplementation(async (sql: string, values?: unknown[]) => {
      if (sql.includes("FROM compra")) {
        return {
          rows: [
            {
              idcompra: 456,
              cpf: "52998224725",
              tpcompra: "ponli",
              dtcompra: "2026-04-23",
              email: "cliente@example.com",
              nmusuario: "Cliente Teste",
              celular: "51999999999",
            },
          ],
        };
      }

      if (sql.includes("voucher.idvoucher = ANY")) {
        expect(values).toEqual([456, [9001]]);

        return {
          rows: [
            {
              idvoucher: 9001,
              numvoucher: "123456",
              tpvoucher: "norma",
              vlunicompra: "129.90",
              stusado: "n",
              voucherenviado: "n",
              identificacao: null,
              idagenda: 10,
              dtagenda: "2026-05-01",
            },
          ],
        };
      }

      return { rows: [] };
    });

    await expect(
      sendPurchaseTicketsWhatsApp(456, [9001], "(51) 99999-9999"),
    ).rejects.toThrow("ticket_api_error_202");
  });

  it("uses testing header for whatsapp send when ticket api testing is enabled", async () => {
    process.env.TICKETS_API_TESTING_ENABLED = "true";
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    dbQuery.mockImplementation(async (sql: string, values?: unknown[]) => {
      if (sql.includes("FROM compra")) {
        return {
          rows: [
            {
              idcompra: 456,
              cpf: "52998224725",
              tpcompra: "bilhe",
              dtcompra: "2026-04-23",
              email: "cliente@example.com",
              nmusuario: "Cliente Teste",
              celular: "51999999999",
            },
          ],
        };
      }

      if (sql.includes("voucher.idvoucher = ANY")) {
        expect(values).toEqual([456, [9001]]);

        return {
          rows: [
            {
              idvoucher: 9001,
              numvoucher: "123456",
              tpvoucher: "norma",
              vlunicompra: "129.90",
              stusado: "n",
              voucherenviado: "s",
              identificacao: null,
              idagenda: 10,
              dtagenda: "2026-05-01",
            },
          ],
        };
      }

      return { rows: [] };
    });

    await expect(
      sendPurchaseTicketsWhatsApp(456, [9001], "(51) 99999-9999"),
    ).resolves.toEqual({
      status: "sent",
      purchaseId: 456,
      sentVoucherIds: [9001],
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://estanciaticketapi.azurewebsites.net/website/tickets/send",
      expect.objectContaining({
        method: "POST",
      }),
    );
    const [, requestInit] = fetchMock.mock.calls[0] as [
      string,
      { headers: Headers },
    ];
    expect(requestInit.headers.get("x-testing")).toBe("true");
  });

  it("synchronizes voucher validation with the ticket microservice", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ token: "ticket-token" }))
      .mockResolvedValueOnce(Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    dbQuery.mockImplementation(async (sql: string, values?: unknown[]) => {
      if (sql.includes("FROM voucher") && sql.includes("voucher.idvoucher = $2")) {
        expect(values).toEqual([456, 9001]);

        return {
          rows: [
            {
              idcompra: 456,
              idvoucher: 9001,
              numvoucher: "123456",
              tpvoucher: "norma",
              vlunicompra: "129.90",
              identificacao: null,
              dtagenda: "2026-05-01",
              cpf: "52998224725",
              tpcompra: "ponli",
              dtcompra: "2026-04-23",
              celular: "51999999999",
            },
          ],
        };
      }

      return { rows: [] };
    });

    const result = await syncTicketValidation(
      [{ purchaseId: 456, voucherId: 9001 }],
      "validate",
    );

    expect(result).toEqual({
      status: "sent",
      action: "validate",
      pairs: ["456-9001"],
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://tickets.example.test/tickets/validate",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer ticket-token",
        }),
      }),
    );
    const [, requestInit] = fetchMock.mock.calls[1] as [string, { body: string }];
    expect(JSON.parse(requestInit.body)).toMatchObject({
      id: "456-9001",
      action: "validate",
      ticket: {
        purchaseId: "456",
        voucherId: "9001",
        voucherCode: "A123456",
      },
    });
  });

  it("skips voucher validation sync when the local testing service is unreachable", async () => {
    delete process.env.INGRESSO_TICKET_API_BASE_URL;
    delete process.env.INGRESSO_TICKET_API_USERNAME;
    delete process.env.INGRESSO_TICKET_API_PASSWORD;
    process.env = {
      ...process.env,
      NODE_ENV: "development",
    };
    const fetchMock = vi.fn().mockRejectedValue(
      Object.assign(new TypeError("fetch failed"), {
        cause: { code: "ECONNREFUSED" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      syncTicketValidation([{ purchaseId: 456, voucherId: 9001 }], "validate"),
    ).resolves.toEqual({
      status: "skipped",
      action: "validate",
      pairs: ["456-9001"],
      skippedReason: "ticket_service_unreachable",
    });
  });
});
