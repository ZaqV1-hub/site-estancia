import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { authorizePainelApiAccess } from "@/lib/painel-api-auth";
import {
  moveOrderedItem,
  removeOrderedItem,
  upsertOrderedItem,
} from "@/lib/managed-content-order";
import { authenticateOperationsRequest } from "@/lib/ops-auth";
import {
  makeContentId,
  readEstanciaContent,
  saveUploadedSiteImage,
  writeEstanciaContent,
} from "@/lib/estancia-content-store";
import { CalendarEventError, deleteCalendarEvent } from "@/lib/calendar-events";
import { POST as saveEventRequest } from "@/app/api/painel/calendar-events/route";
import { requirePainelApiAccess } from "@/lib/painel-api-auth";

export const runtime = "nodejs";

function asText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().normalize("NFC");
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

  const painelAuth = await authorizePainelApiAccess(request, [
    "vis_info",
    "vis_param",
  ]);
  return painelAuth.ok ? null : painelAuth.response;
}

function revalidateSite() {
  revalidatePath("/");
  revalidatePath("/evento");
  revalidatePath("/painel/site");
  revalidatePath("/painel/eventos");
  revalidatePath("/painel/agenda");
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

    if (!desktopUpload && !mobileUpload && !current?.desktopSrc && !current?.mobileSrc) {
      return errorResponse("Envie pelo menos uma imagem para o banner da hero.");
    }

    const desktopSrc =
      desktopUpload ??
      current?.desktopSrc ??
      mobileUpload ??
      current?.mobileSrc ??
      "";
    const mobileSrc =
      mobileUpload ??
      current?.mobileSrc ??
      desktopUpload ??
      current?.desktopSrc ??
      "";

    await writeEstanciaContent({
      ...data,
      homeImages: upsertOrderedItem(data.homeImages, {
        id,
        desktopSrc,
        mobileSrc,
        alt: asText(formData.get("alt")) || current?.alt || "Imagem da hero",
        href: asText(formData.get("href")) || "",
        active: asBool(formData.get("active")),
        sortOrder: current?.sortOrder ?? data.homeImages.length + 1,
      }),
    });
    revalidateSite();
    return NextResponse.json({ ok: true });
  }

  if (section === "attraction") {
    const title = asText(formData.get("title"));
    const id = asText(formData.get("id")) || makeContentId(title);
    const current = data.attractions.find((item) => item.id === id);
    const imageUpload = await saveUploadedSiteImage(formData.get("image"));

    if (!imageUpload && !current?.imageSrc) {
      return errorResponse("Envie uma imagem para a atração.");
    }

    await writeEstanciaContent({
      ...data,
      attractions: upsertOrderedItem(data.attractions, {
        id,
        title: title || current?.title || "Nova atração",
        description:
          asText(formData.get("description")) || current?.description || "",
        imageSrc: imageUpload ?? current?.imageSrc ?? "",
        active: asBool(formData.get("active")),
        sortOrder: current?.sortOrder ?? data.attractions.length + 1,
      }),
    });
    revalidateSite();
    return NextResponse.json({ ok: true });
  }

  if (section === "event") {
    const headers = new Headers(request.headers);
    headers.delete("content-type");
    return saveEventRequest(new Request(request.url, { method: "POST", headers, body: formData }));
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
      homeImages: removeOrderedItem(data.homeImages, payload.id),
    });
  } else if (payload.section === "attraction") {
    await writeEstanciaContent({
      ...data,
      attractions: removeOrderedItem(data.attractions, payload.id),
    });
  } else if (payload.section === "event") {
    const auth = authenticateOperationsRequest(request, { requiredPermission: "ops.purchases" });
    if (!auth.ok) return auth.response;
    const access = await requirePainelApiAccess(request, "vis_agenda");
    if (!access.ok) return access.response;
    try {
      await deleteCalendarEvent(payload.id, { name: access.session.actorName, cpf: access.session.actorCpf });
    } catch (error) {
      if (error instanceof CalendarEventError) return errorResponse(error.message);
      console.error("site-event-delete-failed", error);
      return errorResponse("Não foi possível remover o evento.", 500);
    }
  } else {
    return errorResponse("Tipo de conteúdo inválido.");
  }

  revalidateSite();
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const authResponse = await authorize(request);

  if (authResponse) {
    return authResponse;
  }

  const payload = (await request.json().catch(() => null)) as {
    section?: string;
    id?: string;
    direction?: "up" | "down";
  } | null;
  const data = await readEstanciaContent();

  if (!payload?.id || (payload.direction !== "up" && payload.direction !== "down")) {
    return errorResponse("Movimentação inválida.");
  }

  if (payload.section === "home") {
    await writeEstanciaContent({
      ...data,
      homeImages: moveOrderedItem(data.homeImages, payload.id, payload.direction),
    });
  } else if (payload.section === "attraction") {
    await writeEstanciaContent({
      ...data,
      attractions: moveOrderedItem(data.attractions, payload.id, payload.direction),
    });
  } else if (payload.section === "event") {
    await writeEstanciaContent({
      ...data,
      events: moveOrderedItem(data.events, payload.id, payload.direction),
    });
  } else {
    return errorResponse("Tipo de conteúdo inválido.");
  }

  revalidateSite();
  return NextResponse.json({ ok: true });
}
