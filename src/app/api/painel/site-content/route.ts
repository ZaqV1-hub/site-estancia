import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { authorizePainelApiAccess } from "@/lib/painel-api-auth";
import {
  makeContentId,
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

  const painelAuth = await authorizePainelApiAccess(request, ["vis_info", "vis_param"]);
  return painelAuth.ok ? null : painelAuth.response;
}

function revalidateSite() {
  revalidatePath("/");
  revalidatePath("/painel/site");
}

export async function POST(request: Request) {
  const authResponse = await authorize(request);

  if (authResponse) {
    return authResponse;
  }

  const formData = await request.formData();
  const section = asText(formData.get("section"));
  const data = await readEstanciaContent();

  if (section === "home") {
    const id = asText(formData.get("id")) || makeContentId(asText(formData.get("alt")));
    const current = data.homeImages.find((item) => item.id === id);
    const desktopUpload = await saveUploadedSiteImage(formData.get("desktopImage"));
    const mobileUpload = await saveUploadedSiteImage(formData.get("mobileImage"));
    const fallbackImage = "/hero/current/banner-site-oficial-1.jpg";
    const desktopSrc =
      desktopUpload ?? current?.desktopSrc ?? mobileUpload ?? current?.mobileSrc ?? fallbackImage;
    const mobileSrc =
      mobileUpload ?? current?.mobileSrc ?? desktopUpload ?? current?.desktopSrc ?? fallbackImage;

    await writeEstanciaContent({
      ...data,
      homeImages: [
        ...data.homeImages.filter((item) => item.id !== id),
        {
          id,
          desktopSrc,
          mobileSrc,
          alt: asText(formData.get("alt")) || current?.alt || "Imagem da home",
          active: asBool(formData.get("active")),
          sortOrder: Number(formData.get("sortOrder")) || current?.sortOrder || data.homeImages.length + 1,
        },
      ],
    });
    revalidateSite();
    return NextResponse.json({ ok: true });
  }

  if (section === "attraction") {
    const title = asText(formData.get("title"));
    const id = asText(formData.get("id")) || makeContentId(title);
    const current = data.attractions.find((item) => item.id === id);
    const imageUpload = await saveUploadedSiteImage(formData.get("image"));

    await writeEstanciaContent({
      ...data,
      attractions: [
        ...data.attractions.filter((item) => item.id !== id),
        {
          id,
          title: title || current?.title || "Nova atração",
          description: asText(formData.get("description")) || current?.description || "",
          imageSrc: imageUpload ?? current?.imageSrc ?? "/photos/day-use.jpg",
          active: asBool(formData.get("active")),
          sortOrder: Number(formData.get("sortOrder")) || current?.sortOrder || data.attractions.length + 1,
        },
      ],
    });
    revalidateSite();
    return NextResponse.json({ ok: true });
  }

  if (section === "event") {
    const title = asText(formData.get("title"));
    const id = asText(formData.get("id")) || makeContentId(title);
    const current = data.events.find((item) => item.id === id);
    const imageUpload = await saveUploadedSiteImage(formData.get("image"));
    const hasDate = asText(formData.get("eventMode")) === "date";
    const eventDate = asText(formData.get("eventDate"));
    const derivedHref =
      hasDate && eventDate
        ? `/agenda?mes=${Number(eventDate.slice(5, 7))}&ano=${eventDate.slice(0, 4)}&date=${eventDate}`
        : "";

    await writeEstanciaContent({
      ...data,
      events: [
        ...data.events.filter((item) => item.id !== id),
        {
          id,
          title: title || current?.title || "Novo evento",
          description: asText(formData.get("description")) || current?.description || "",
          imageSrc: imageUpload ?? current?.imageSrc ?? "/hero/current/banner-14-06-2026.jpg",
          href: derivedHref || asText(formData.get("href")) || current?.href || "/agenda",
          buttonLabel: asText(formData.get("buttonLabel")) || current?.buttonLabel || "Compre seu ingresso!",
          active: asBool(formData.get("active")),
          sortOrder: Number(formData.get("sortOrder")) || current?.sortOrder || data.events.length + 1,
        },
      ],
    });
    revalidateSite();
    return NextResponse.json({ ok: true });
  }

  return errorResponse("Tipo de conteúdo inválido.");
}

export async function DELETE(request: Request) {
  const authResponse = await authorize(request);

  if (authResponse) {
    return authResponse;
  }

  const payload = (await request.json().catch(() => null)) as {
    section?: string;
    id?: string;
  } | null;
  const data = await readEstanciaContent();

  if (!payload?.id) {
    return errorResponse("Item não informado.");
  }

  if (payload.section === "home") {
    await writeEstanciaContent({
      ...data,
      homeImages: data.homeImages.filter((item) => item.id !== payload.id),
    });
  } else if (payload.section === "attraction") {
    await writeEstanciaContent({
      ...data,
      attractions: data.attractions.filter((item) => item.id !== payload.id),
    });
  } else if (payload.section === "event") {
    await writeEstanciaContent({
      ...data,
      events: data.events.filter((item) => item.id !== payload.id),
    });
  } else {
    return errorResponse("Tipo de conteúdo inválido.");
  }

  revalidateSite();
  return NextResponse.json({ ok: true });
}
