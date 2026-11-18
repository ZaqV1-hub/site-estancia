import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadVoucherQrCode } from "@/lib/ticket-api";

const fetchMock = vi.fn();

describe("voucher QR downloads", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("TICKETS_API_BASE_URL", "http://127.0.0.1:8080/");
    fetchMock.mockResolvedValue(new Response("qr", {
      headers: { "content-type": "image/png" },
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("downloads a known voucher asset from the configured service and embeds it", async () => {
    const image = await downloadVoucherQrCode("https://public.example/assets/qrcodes/321-12.png", 321, 12);

    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8080/assets/qrcodes/321-12.png", { cache: "no-store" });
    expect(image).toBe("data:image/png;base64,cXI=");
  });

  it("preserves the supplied URL for a different asset path", async () => {
    await downloadVoucherQrCode("https://cdn.example/custom/12.png", 321, 12);

    expect(fetchMock).toHaveBeenCalledWith("https://cdn.example/custom/12.png", { cache: "no-store" });
  });

  it("rejects a failed download instead of embedding an error page", async () => {
    fetchMock.mockResolvedValue(new Response("unavailable", { status: 503 }));

    await expect(downloadVoucherQrCode("https://public.example/assets/qrcodes/321-12.png", 321, 12))
      .rejects.toMatchObject({ code: "ticket_api_asset_unavailable", status: 502 });
  });
});
