import type { Metadata } from "next";
import { getInfoPage } from "@/lib/site-content";

const productionSiteUrl = "https://www.estancia.local";
export const brandName = "Estância - Parque Ecológico das Águas";
export const defaultShareDescription =
  "Viva momentos inesquecíveis em meio à natureza, com atrações para famílias, grupos e passeios no Estância - Parque Ecológico das Águas.";
export const defaultShareImage = "/brand/estancia-logo-dark.png";

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? productionSiteUrl;
}

export function buildPageMetadata(slug: string, pathOverride?: string): Metadata {
  const page = getInfoPage(slug);
  const title = `${page.title} - ${brandName}`;

  return {
    title,
    description: page.seoDescription,
    alternates: {
      canonical: pathOverride ?? page.path,
    },
    openGraph: {
      title,
      description: page.seoDescription,
      url: pathOverride ?? page.path,
      siteName: brandName,
      type: "website",
      images: [
        {
          url: defaultShareImage,
          alt: brandName,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: page.seoDescription,
      images: [defaultShareImage],
    },
  };
}

export function robotsForEnvironment() {
  const siteUrl = getSiteUrl();
  const isPreview =
    process.env.VERCEL_ENV === "preview" ||
    siteUrl.includes("questione.ai") ||
    siteUrl.includes("localhost");

  return {
    index: !isPreview,
    follow: !isPreview,
  };
}
