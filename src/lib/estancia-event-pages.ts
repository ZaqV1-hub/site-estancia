import type { Metadata } from "next";
import type { ManagedEvent } from "@/lib/estancia-content-store";
import { getSiteUrl } from "@/lib/site-metadata";

function normalizeSlugPart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function resolveManagedEventPageTitle(event: Pick<ManagedEvent, "pageTitle" | "title">) {
  return String(event.pageTitle ?? "").trim() || String(event.title ?? "").trim();
}

export function hasManagedEventPage(
  event: Pick<ManagedEvent, "pageEnabled" | "pageContent" | "pageTitle" | "title">,
) {
  return (
    event.pageEnabled === true &&
    Boolean(resolveManagedEventPageTitle(event)) &&
    Boolean(String(event.pageContent ?? "").trim())
  );
}

export function buildManagedEventPageSlug(
  event: Pick<ManagedEvent, "id" | "pageSlug" | "pageTitle" | "title">,
) {
  const explicitSlug = normalizeSlugPart(String(event.pageSlug ?? "").trim());

  if (explicitSlug) {
    return explicitSlug;
  }

  const fallbackSlug = normalizeSlugPart(resolveManagedEventPageTitle(event));
  return fallbackSlug || normalizeSlugPart(String(event.id ?? "").trim()) || "evento";
}

export function buildManagedEventPagePath(
  event: Pick<ManagedEvent, "id" | "pageSlug" | "pageTitle" | "title">,
) {
  return `/evento/${buildManagedEventPageSlug(event)}`;
}

export function resolveManagedEventPublicHref(event: ManagedEvent) {
  return hasManagedEventPage(event) ? buildManagedEventPagePath(event) : event.href;
}

export function findManagedEventBySlug(events: ManagedEvent[], slug: string) {
  const normalizedSlug = normalizeSlugPart(slug);

  return (
    events.find(
      (event) =>
        hasManagedEventPage(event) &&
        buildManagedEventPageSlug(event) === normalizedSlug,
    ) ?? null
  );
}

export function buildManagedEventMetadata(event: ManagedEvent): Metadata {
  const title = `${resolveManagedEventPageTitle(event)} - Estância`;
  const description =
    String(event.description ?? "").trim() ||
    "Evento especial da Estância e Parque Ecológico das Águas.";
  const path = buildManagedEventPagePath(event);
  const image = String(event.imageSrc ?? "").trim();
  const siteUrl = getSiteUrl();

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url: `${siteUrl}${path}`,
      siteName: "Estância",
      type: "article",
      images: image
        ? [
            {
              url: image.startsWith("http") ? image : `${siteUrl}${image}`,
              alt: resolveManagedEventPageTitle(event),
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image.startsWith("http") ? image : `${siteUrl}${image}`] : undefined,
    },
  };
}
