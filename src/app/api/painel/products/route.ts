import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { authorizePainelApiAccess } from "@/lib/painel-api-auth";
import type { B2cProduct } from "@/lib/b2c-catalog-defaults";
import {
  makeContentId,
  normalizePrice,
  readEstanciaContent,
  saveUploadedSiteImage,
  writeEstanciaContent,
} from "@/lib/estancia-content-store";
import { authenticateOperationsRequest } from "@/lib/ops-auth";

export const runtime = "nodejs";

function asText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function asBool(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: { message } }, { status });
}

async function authorize(request: Request) {
  const auth = authenticateOperationsRequest(request, {
    requiredPermission: "ops.read",
  });

  if (!auth.ok) {
    return auth.response;
  }

  const painelAuth = await authorizePainelApiAccess(request, "vis_tabpre");
  return painelAuth.ok ? null : painelAuth.response;
}

function revalidateProducts() {
  revalidatePath("/painel/passaportes-itens");
  revalidatePath("/agenda");
  revalidatePath("/comprar/[id]", "page");
}

export async function POST(request: Request) {
  const authResponse = await authorize(request);

  if (authResponse) {
    return authResponse;
  }

  const formData = await request.formData();
  const data = readEstanciaContent();
  const title = asText(formData.get("title"));
  const type = asText(formData.get("type")) === "addon" ? "addon" : "passport";
  const id = asText(formData.get("id")) || makeContentId(title);
  const current = data.products.find((item) => item.id === id);
  const imageSrc = await saveUploadedSiteImage(formData.get("image"));
  const voucherType = type === "addon" ? "espec" : "norma";
  const product: B2cProduct = {
    id,
    type,
    title: title || current?.title || "Novo produto",
    subtitle: asText(formData.get("subtitle")) || current?.subtitle || "",
    description: asText(formData.get("description")) || current?.description || "",
    imageSrc: imageSrc ?? current?.imageSrc ?? "/photos/day-use.jpg",
    fixedPrice: normalizePrice(formData.get("fixedPrice")),
    voucherType,
    voucherPrefix: type === "addon" ? "E" : "A",
    active: asBool(formData.get("active")),
    sortOrder: Number(formData.get("sortOrder")) || current?.sortOrder || data.products.length + 1,
  };

  writeEstanciaContent({
    ...data,
    products: [...data.products.filter((item) => item.id !== id), product],
  });
  revalidateProducts();

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const authResponse = await authorize(request);

  if (authResponse) {
    return authResponse;
  }

  const payload = (await request.json().catch(() => null)) as { id?: string } | null;

  if (!payload?.id) {
    return errorResponse("Produto não informado.");
  }

  const data = readEstanciaContent();
  writeEstanciaContent({
    ...data,
    products: data.products.filter((item) => item.id !== payload.id),
  });
  revalidateProducts();

  return NextResponse.json({ ok: true });
}
