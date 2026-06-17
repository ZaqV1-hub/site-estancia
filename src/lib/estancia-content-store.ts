import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, extname, join, resolve } from "path";
import {
  DEFAULT_B2C_PRODUCTS,
  type B2cProduct,
  type B2cProductType,
  type B2cVoucherType,
} from "@/lib/b2c-catalog-defaults";

export type ManagedHomeImage = {
  id: string;
  desktopSrc: string;
  mobileSrc: string;
  alt: string;
  active: boolean;
  sortOrder: number;
};

export type ManagedAttraction = {
  id: string;
  title: string;
  description: string;
  imageSrc: string;
  active: boolean;
  sortOrder: number;
};

export type ManagedEvent = {
  id: string;
  title: string;
  description: string;
  imageSrc: string;
  href: string;
  buttonLabel: string;
  active: boolean;
  sortOrder: number;
};

export type EstanciaContentData = {
  homeImages: ManagedHomeImage[];
  attractions: ManagedAttraction[];
  events: ManagedEvent[];
  products: B2cProduct[];
};

function resolveSiteStorageRoot() {
  const configuredRoot = process.env.ESTANCIA_SITE_STORAGE_ROOT?.trim();
  const runtimeEntry = process.argv[1] ? dirname(resolve(process.argv[1])) : null;
  const candidates = [
    configuredRoot,
    process.cwd(),
    runtimeEntry,
    runtimeEntry ? dirname(runtimeEntry) : null,
    runtimeEntry ? dirname(dirname(runtimeEntry)) : null,
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (existsSync(join(candidate, ".env.local")) || existsSync(join(candidate, "src"))) {
      return candidate;
    }
  }

  for (const candidate of candidates) {
    if (existsSync(join(candidate, "public"))) {
      return candidate;
    }
  }

  return process.cwd();
}

const storageRoot = resolveSiteStorageRoot();
const dataDir = join(storageRoot, ".data");
const dataFile = join(dataDir, "estancia-content.json");
export const siteUploadDir = join(storageRoot, "public", "uploads", "site");

const defaultContent: EstanciaContentData = {
  homeImages: [
    {
      id: "home-1",
      desktopSrc: "/hero/current/banner-site-oficial-1.jpg",
      mobileSrc: "/hero/current/banner-site-oficial-1.jpg",
      alt: "Piscina e area verde do Estancia",
      active: true,
      sortOrder: 1,
    },
    {
      id: "home-2",
      desktopSrc: "/hero/current/banner-onda.jpg",
      mobileSrc: "/hero/current/banner-onda.jpg",
      alt: "Piscina de ondas do Estancia",
      active: true,
      sortOrder: 2,
    },
    {
      id: "home-3",
      desktopSrc: "/hero/current/banner-14-06-2026.jpg",
      mobileSrc: "/hero/current/banner-14-06-2026.jpg",
      alt: "Evento no Estancia",
      active: true,
      sortOrder: 3,
    },
  ],
  attractions: [
    {
      id: "piscina-natural",
      title: "Piscina Natural",
      description:
        "Agua, sombra e area verde para aproveitar o dia em familia com conforto.",
      imageSrc: "/photos/estrutura-piscina.jpg",
      active: true,
      sortOrder: 1,
    },
    {
      id: "trilhas-natureza",
      title: "Trilhas e Natureza",
      description:
        "Caminhos ao ar livre, paisagens do parque e contato direto com a natureza.",
      imageSrc: "/photos/day-use.jpg",
      active: true,
      sortOrder: 2,
    },
    {
      id: "piscina-ondas",
      title: "Piscina de Ondas",
      description:
        "Uma das experiencias mais procuradas para quem quer brincar na agua.",
      imageSrc: "/hero/current/banner-onda.jpg",
      active: true,
      sortOrder: 3,
    },
  ],
  events: [
    {
      id: "festa-junina",
      title: "Festa Junina",
      description:
        "Comidas tipicas, musica, brincadeiras e lazer ao ar livre em um dia preparado para curtir com a familia no Estancia.",
      imageSrc: "/hero/current/banner-14-06-2026.jpg",
      href: "/agenda?mes=6&ano=2026&date=2026-06-14",
      buttonLabel: "Compre seu ingresso!",
      active: true,
      sortOrder: 1,
    },
  ],
  products: DEFAULT_B2C_PRODUCTS,
};

function ensureStore() {
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(siteUploadDir, { recursive: true });

  if (!existsSync(dataFile)) {
    writeFileSync(dataFile, JSON.stringify(defaultContent, null, 2), "utf8");
  }
}

function sortByOrder<T extends { sortOrder?: number; title?: string }>(items: T[]) {
  return [...items].sort((a, b) => {
    const orderDiff = (a.sortOrder ?? 999) - (b.sortOrder ?? 999);
    return orderDiff || String(a.title ?? "").localeCompare(String(b.title ?? ""));
  });
}

function ensureWebPath(value: string) {
  return value.startsWith("/") ? value : `/${value}`;
}

function normalizeManagedImageSrc(src: string | undefined, fallback: string) {
  const raw = (src?.trim() || fallback).replace(/\\/g, "/");
  const lower = raw.toLowerCase();

  if (!raw) {
    return fallback;
  }

  if (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("data:")
  ) {
    return raw;
  }

  const publicSegmentIndex = lower.lastIndexOf("/public/");
  if (publicSegmentIndex >= 0) {
    return ensureWebPath(raw.slice(publicSegmentIndex + "/public".length));
  }

  if (lower.startsWith("public/")) {
    return ensureWebPath(raw.slice("public".length));
  }

  if (
    lower.startsWith("uploads/") ||
    lower.startsWith("hero/") ||
    lower.startsWith("photos/") ||
    lower.startsWith("theme/")
  ) {
    return ensureWebPath(raw);
  }

  if (raw.startsWith("/")) {
    return raw;
  }

  return fallback;
}

function normalizeManagedHomeImage(item: ManagedHomeImage, fallback: ManagedHomeImage) {
  const desktopSrc = normalizeManagedImageSrc(item.desktopSrc, fallback.desktopSrc);
  const mobileSrc = normalizeManagedImageSrc(item.mobileSrc, desktopSrc);

  return {
    ...item,
    desktopSrc,
    mobileSrc,
  };
}

function normalizeManagedAttraction(
  item: ManagedAttraction,
  fallback: ManagedAttraction,
) {
  return {
    ...item,
    title: item.title?.trim() || fallback.title,
    description: item.description?.trim() || fallback.description,
    imageSrc: normalizeManagedImageSrc(item.imageSrc, fallback.imageSrc),
  };
}

function normalizeManagedEvent(item: ManagedEvent, fallback: ManagedEvent) {
  return {
    ...item,
    title: item.title?.trim() || fallback.title,
    description: item.description?.trim() || fallback.description,
    imageSrc: normalizeManagedImageSrc(item.imageSrc, fallback.imageSrc),
    href: item.href?.trim() || fallback.href,
    buttonLabel: item.buttonLabel?.trim() || fallback.buttonLabel,
  };
}

function readManagedList<T extends { sortOrder?: number; title?: string }>(
  value: T[] | undefined,
  fallback: T[],
) {
  return Array.isArray(value) ? sortByOrder(value) : sortByOrder(fallback);
}

export function readEstanciaContent() {
  ensureStore();

  try {
    const parsed = JSON.parse(readFileSync(dataFile, "utf8")) as Partial<EstanciaContentData>;
    const parsedHomeImages = Array.isArray(parsed.homeImages)
      ? parsed.homeImages.map((item, index) =>
          normalizeManagedHomeImage(
            item,
            defaultContent.homeImages[index] ?? defaultContent.homeImages[0],
          ),
        )
      : undefined;
    const parsedAttractions = Array.isArray(parsed.attractions)
      ? parsed.attractions.map((item, index) =>
          normalizeManagedAttraction(
            item,
            defaultContent.attractions[index] ?? defaultContent.attractions[0],
          ),
        )
      : undefined;
    const parsedEvents = Array.isArray(parsed.events)
      ? parsed.events.map((item, index) =>
          normalizeManagedEvent(
            item,
            defaultContent.events[index] ?? defaultContent.events[0],
          ),
        )
      : undefined;

    return {
      homeImages: readManagedList(parsedHomeImages, defaultContent.homeImages),
      attractions: readManagedList(parsedAttractions, defaultContent.attractions),
      events: readManagedList(parsedEvents, defaultContent.events),
      products: readManagedList(parsed.products, defaultContent.products),
    } satisfies EstanciaContentData;
  } catch {
    return defaultContent;
  }
}

export function writeEstanciaContent(data: EstanciaContentData) {
  ensureStore();
  writeFileSync(dataFile, JSON.stringify(data, null, 2), "utf8");
}

export function getActiveHomeImages() {
  const items = readEstanciaContent().homeImages.filter((item) => item.active);
  return items.length > 0 ? items : defaultContent.homeImages.filter((item) => item.active);
}

export function getActiveAttractions() {
  const items = readEstanciaContent().attractions.filter((item) => item.active);
  return items.length > 0 ? items : defaultContent.attractions.filter((item) => item.active);
}

export function getActiveEvents() {
  const items = readEstanciaContent().events.filter((item) => item.active);
  return items.length > 0 ? items : defaultContent.events.filter((item) => item.active);
}

export function getManagedB2cProducts(type?: B2cProductType) {
  const products = readEstanciaContent().products.filter((product) => product.active);
  return type ? products.filter((product) => product.type === type) : products;
}

export function makeContentId(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || `item-${Date.now()}`;
}

export function normalizePrice(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "0")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed.toFixed(2) : "0.00";
}

export function normalizeVoucherType(value: FormDataEntryValue | null): B2cVoucherType {
  const raw = String(value ?? "").trim();
  return raw === "infan" || raw === "espec" ? raw : "norma";
}

export async function saveUploadedSiteImage(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size <= 0) {
    return null;
  }

  mkdirSync(siteUploadDir, { recursive: true });

  const sourceName = file.name || "imagem.png";
  const extension = extname(sourceName).toLowerCase() || ".png";
  const fileName = `${Date.now()}-${makeContentId(sourceName.replace(extension, ""))}${extension}`;
  const diskPath = join(siteUploadDir, fileName);
  const bytes = Buffer.from(await file.arrayBuffer());

  writeFileSync(diskPath, bytes);

  return `/uploads/site/${fileName}`;
}
