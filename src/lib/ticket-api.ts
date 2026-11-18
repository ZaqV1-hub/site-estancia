import { Buffer } from "node:buffer";

export const defaultTicketsApiBaseUrl =
  "https://estanciaticketapi.azurewebsites.net";

export type TicketApiVoucherPayload = {
  purchaseId: number;
  voucherId: number;
  cpf: string;
  type: string | null;
  purchaseLocation: string;
  purchaseDate: string | null;
  price: number;
  tpcompra: string;
};

type GenerateQrCodesResponse = {
  qrcodes?: Record<string, string>;
};

export class TicketApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 502) {
    super(message);
    this.name = "TicketApiError";
    this.code = code;
    this.status = status;
  }
}

export function getTicketsApiBaseUrl() {
  return (
    process.env.TICKETS_API_BASE_URL?.trim().replace(/\/+$/, "") ||
    defaultTicketsApiBaseUrl
  );
}

export function buildTicketsApiHeaders() {
  const headers = new Headers({
    "content-type": "application/json",
  });

  if (process.env.TICKETS_API_TESTING_ENABLED === "true") {
    headers.set("x-testing", "true");
  }

  return headers;
}

export async function generateVoucherQrcodes(
  vouchers: TicketApiVoucherPayload[],
) {
  const response = await fetch(`${getTicketsApiBaseUrl()}/generate-qrcodes`, {
    method: "POST",
    headers: buildTicketsApiHeaders(),
    body: JSON.stringify({ vouchers }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new TicketApiError(
      "ticket_api_unavailable",
      "Nao foi possivel gerar os QR Codes agora.",
      502,
    );
  }

  const payload = (await response.json()) as GenerateQrCodesResponse;

  return payload.qrcodes ?? {};
}

export async function downloadImageAsDataUrl(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new TicketApiError(
      "ticket_api_asset_unavailable",
      "Nao foi possivel baixar o QR Code agora.",
      502,
    );
  }

  const contentType = response.headers.get("content-type") ?? "image/png";
  const buffer = Buffer.from(await response.arrayBuffer());

  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

// Local QR assets belong to the same service that generated them. Embed the
// image so the print page never depends on a second public TLS connection.
export async function downloadVoucherQrCode(url: string, purchaseId: number, voucherId: number) {
  const asset = new URL(url);
  const expectedPath = `/assets/qrcodes/${purchaseId}-${voucherId}.png`;
  const downloadUrl = asset.pathname === expectedPath
    ? new URL(expectedPath, `${getTicketsApiBaseUrl()}/`).toString()
    : url;
  return downloadImageAsDataUrl(downloadUrl);
}
