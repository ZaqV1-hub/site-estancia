import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, extname, join, resolve } from "path";
import {
  DEFAULT_B2C_PRODUCTS,
  type B2cProduct,
  type B2cProductType,
  type B2cVoucherType,
} from "@/lib/b2c-catalog-defaults";
import { getIngressoDbPool } from "@/lib/ingresso-db";

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
const siteBinaryUploadDir = join(dataDir, "uploads", "site");
const siteContentKey = "main";
const runtimeEntry = process.argv[1] ? dirname(resolve(process.argv[1])) : null;

const canonicalAttractions = new Map([
  [
    "stand-up-paddle",
    {
      title: "Stand Up Paddle",
      description:
        "Explore as águas com equilíbrio, diversão e contato direto com a natureza em uma experiência leve e refrescante.",
    },
  ],
  [
    "pesca-esportiva",
    {
      title: "Pesca Esportiva",
      description:
        "Viva a emoção da pesca em um ambiente cercado por natureza, ideal para quem busca tranquilidade e momentos de lazer.",
    },
  ],
  [
    "passeio-de-bote",
    {
      title: "Passeio de Bote",
      description:
        "Aproveite um passeio divertido sobre a água, perfeito para curtir em grupo e viver momentos de aventura com segurança.",
    },
  ],
  [
    "tirolesa-dupla",
    {
      title: "Tirolesa Dupla",
      description:
        "Sinta a adrenalina de deslizar pelo cenário natural em uma experiência emocionante para compartilhar em dupla.",
    },
  ],
  [
    "animais-brasileiros",
    {
      title: "Animais Brasileiros",
      description:
        "Encante-se com a beleza da fauna brasileira e viva uma experiência de conexão, aprendizado e respeito à natureza.",
    },
  ],
  [
    "rampa-de-escalada",
    {
      title: "Rampa de Escalada",
      description:
        "Desafie seus limites em uma atividade cheia de movimento, superação e diversão em meio ao verde.",
    },
  ],
  [
    "ponte-pensil",
    {
      title: "Ponte Pênsil",
      description:
        "Atravesse a ponte suspensa e aproveite uma experiência de aventura com uma vista incrível da natureza ao redor.",
    },
  ],
  [
    "falsa-baiana",
    {
      title: "Falsa Baiana",
      description:
        "Teste seu equilíbrio em uma travessia divertida sobre a água, ideal para quem gosta de desafios ao ar livre.",
    },
  ],
  [
    "piscina-natural",
    {
      title: "Piscina Natural",
      description:
        "Relaxe e aproveite um banho refrescante em um espaço cercado pela natureza, perfeito para toda a família.",
    },
  ],
  [
    "caiaque",
    {
      title: "Caiaque",
      description:
        "Navegue com tranquilidade e diversão, explorando o lago em uma atividade que une lazer, esporte e contato com a paisagem.",
    },
  ],
  [
    "quintal-indigena",
    {
      title: "Quintal Indígena",
      description:
        "Conheça um espaço inspirado na cultura indígena, pensado para proporcionar aprendizado, reflexão e conexão com nossas raízes.",
    },
  ],
  [
    "aventura-kids",
    {
      title: "Aventura Kids",
      description:
        "Um circuito pensado para as crianças se divertirem com segurança, desenvolvendo coordenação, coragem e espírito de aventura.",
    },
  ],
  [
    "trampolim-aquatico",
    {
      title: "Trampolim Aquático",
      description:
        "Uma atração cheia de energia e diversão, perfeita para brincar, se equilibrar e se refrescar ao mesmo tempo.",
    },
  ],
  [
    "mini-fazendinha",
    {
      title: "Mini Fazendinha",
      description:
        "Um espaço encantador para interação com os animais, ideal para crianças e para quem ama experiências no campo.",
    },
  ],
  [
    "restaurante",
    {
      title: "Restaurante",
      description:
        "Saboreie refeições preparadas com carinho em um ambiente acolhedor, ideal para repor as energias durante o passeio.",
    },
  ],
  [
    "cafe-da-manha",
    {
      title: "Café da Manhã",
      description:
        "Comece o dia com um café da manhã saboroso e acolhedor, com delícias que combinam com momentos especiais em família.",
    },
  ],
  [
    "parquinho",
    {
      title: "Parquinho",
      description:
        "Um espaço alegre e seguro para as crianças brincarem, explorarem e aproveitarem o passeio com muita diversão.",
    },
  ],
  [
    "trilhas",
    {
      title: "Trilhas",
      description:
        "Caminhe por trilhas em meio à mata e descubra paisagens naturais que tornam o passeio ainda mais especial.",
    },
  ],
  [
    "esquibunda",
    {
      title: "Esquibunda",
      description:
        "Divirta-se deslizando em uma atração cheia de adrenalina, risadas e muita animação para todas as idades.",
    },
  ],
]);

const defaultContent: EstanciaContentData = {
  homeImages: [
    {
      id: "home-1",
      desktopSrc: "/hero/current/banner-site-oficial-1.jpg",
      mobileSrc: "/hero/current/banner-site-oficial-1.jpg",
      alt: "Piscina e área verde do Estância",
      active: true,
      sortOrder: 1,
    },
    {
      id: "home-2",
      desktopSrc: "/hero/current/banner-onda.jpg",
      mobileSrc: "/hero/current/banner-onda.jpg",
      alt: "Piscina de ondas da Estância",
      active: true,
      sortOrder: 2,
    },
    {
      id: "home-3",
      desktopSrc: "/hero/current/banner-14-06-2026.jpg",
      mobileSrc: "/hero/current/banner-14-06-2026.jpg",
      alt: "Evento na Estância",
      active: true,
      sortOrder: 3,
    },
  ],
  attractions: [
    {
      id: "piscina-natural",
      title: "Piscina Natural",
      description:
        "Água, sombra e área verde para aproveitar o dia em família com conforto.",
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
        "Uma das experiências mais procuradas para quem quer brincar na água.",
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
        "Comidas típicas, música, brincadeiras e lazer ao ar livre em um dia preparado para curtir com a família na Estância.",
      imageSrc: "/hero/current/banner-14-06-2026.jpg",
      href: "/agenda?mes=6&ano=2026&date=2026-06-14",
      buttonLabel: "Compre seu ingresso!",
      active: true,
      sortOrder: 1,
    },
  ],
  products: DEFAULT_B2C_PRODUCTS,
};

function ensureLocalStore() {
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(siteUploadDir, { recursive: true });
  mkdirSync(siteBinaryUploadDir, { recursive: true });
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

function repairMojibakeText(value: string | undefined, fallback: string) {
  const raw = value?.trim();

  if (!raw) {
    return fallback;
  }

  if (/[ÃÂ�]/.test(raw)) {
    try {
      const repaired = Buffer.from(raw, "latin1").toString("utf8").trim();

      if (repaired) {
        return repaired.normalize("NFC");
      }
    } catch {
      return raw.normalize("NFC");
    }
  }

  return raw.normalize("NFC");
}

function shouldUseCanonicalCopy(value: string | undefined) {
  if (!value) {
    return true;
  }

  return /[?ÃÂ�]/.test(value);
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
    alt: repairMojibakeText(item.alt, fallback.alt),
    desktopSrc,
    mobileSrc,
  };
}

function normalizeManagedAttraction(
  item: ManagedAttraction,
  fallback: ManagedAttraction,
) {
  const canonical = canonicalAttractions.get(item.id);
  const title = repairMojibakeText(
    item.title,
    canonical?.title ?? fallback.title,
  );
  const description = repairMojibakeText(
    item.description,
    canonical?.description ?? fallback.description,
  );

  return {
    ...item,
    title:
      canonical && shouldUseCanonicalCopy(item.title)
        ? canonical.title
        : title,
    description:
      canonical && shouldUseCanonicalCopy(item.description)
        ? canonical.description
        : description,
    imageSrc: normalizeManagedImageSrc(item.imageSrc, fallback.imageSrc),
  };
}

function normalizeManagedEvent(item: ManagedEvent, fallback: ManagedEvent) {
  return {
    ...item,
    title: repairMojibakeText(item.title, fallback.title),
    description: repairMojibakeText(item.description, fallback.description),
    imageSrc: normalizeManagedImageSrc(item.imageSrc, fallback.imageSrc),
    href: item.href?.trim() || fallback.href,
    buttonLabel: repairMojibakeText(item.buttonLabel, fallback.buttonLabel),
  };
}

function readManagedList<T extends { sortOrder?: number; title?: string }>(
  value: T[] | undefined,
  fallback: T[],
) {
  return Array.isArray(value) ? sortByOrder(value) : sortByOrder(fallback);
}

function normalizeEstanciaContent(parsed?: Partial<EstanciaContentData> | null) {
  const parsedHomeImages = Array.isArray(parsed?.homeImages)
    ? parsed.homeImages.map((item, index) =>
        normalizeManagedHomeImage(
          item,
          defaultContent.homeImages[index] ?? defaultContent.homeImages[0],
        ),
      )
    : undefined;
  const parsedAttractions = Array.isArray(parsed?.attractions)
    ? parsed.attractions.map((item, index) =>
        normalizeManagedAttraction(
          item,
          defaultContent.attractions[index] ?? defaultContent.attractions[0],
        ),
      )
    : undefined;
  const parsedEvents = Array.isArray(parsed?.events)
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
    products: readManagedList(parsed?.products, defaultContent.products),
  } satisfies EstanciaContentData;
}

function readLegacyEstanciaContent() {
  ensureLocalStore();

  if (!existsSync(dataFile)) {
    return defaultContent;
  }

  try {
    const parsed = JSON.parse(readFileSync(dataFile, "utf8")) as Partial<EstanciaContentData>;
    return normalizeEstanciaContent(parsed);
  } catch {
    return defaultContent;
  }
}

function writeLegacyEstanciaContentBackup(data: EstanciaContentData) {
  ensureLocalStore();
  writeFileSync(dataFile, JSON.stringify(data, null, 2), "utf8");
}

function getSiteUploadTargets() {
  const candidates = [
    siteBinaryUploadDir,
    siteUploadDir,
    join(storageRoot, ".next", "standalone", "public", "uploads", "site"),
    join(process.cwd(), "public", "uploads", "site"),
    runtimeEntry ? join(runtimeEntry, "public", "uploads", "site") : null,
  ].filter((value): value is string => Boolean(value));

  return [...new Set(candidates)];
}

function hasNormalizedDifference(
  raw: Partial<EstanciaContentData> | null | undefined,
  normalized: EstanciaContentData,
) {
  if (!raw) {
    return false;
  }

  try {
    return JSON.stringify(raw) !== JSON.stringify(normalized);
  } catch {
    return false;
  }
}

async function persistEstanciaContent(data: EstanciaContentData) {
  const pool = getIngressoDbPool();
  await pool.query(
    `
      INSERT INTO public.estancia_site_content (content_key, content_json, updated_at)
      VALUES ($1, $2::jsonb, now())
      ON CONFLICT (content_key)
      DO UPDATE SET
        content_json = EXCLUDED.content_json,
        updated_at = now()
    `,
    [siteContentKey, JSON.stringify(data)],
  );
}

async function ensureDatabaseStore() {
  const pool = getIngressoDbPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.estancia_site_content (
      content_key text PRIMARY KEY,
      content_json jsonb NOT NULL,
      created_at timestamp without time zone NOT NULL DEFAULT now(),
      updated_at timestamp without time zone NOT NULL DEFAULT now()
    )
  `);
}

async function ensureDatabaseSeeded() {
  await ensureDatabaseStore();

  const pool = getIngressoDbPool();
  const existing = await pool.query<{ content_json: EstanciaContentData }>(
    `
      SELECT content_json
      FROM public.estancia_site_content
      WHERE content_key = $1
      LIMIT 1
    `,
    [siteContentKey],
  );

  if (existing.rows[0]) {
    return;
  }

  const seededContent = readLegacyEstanciaContent();
  await pool.query(
    `
      INSERT INTO public.estancia_site_content (content_key, content_json)
      VALUES ($1, $2::jsonb)
      ON CONFLICT (content_key) DO NOTHING
    `,
    [siteContentKey, JSON.stringify(seededContent)],
  );
}

export async function readEstanciaContent() {
  await ensureDatabaseSeeded();

  const pool = getIngressoDbPool();
  const result = await pool.query<{ content_json: Partial<EstanciaContentData> }>(
    `
      SELECT content_json
      FROM public.estancia_site_content
      WHERE content_key = $1
      LIMIT 1
    `,
    [siteContentKey],
  );

  const storedContent = result.rows[0]?.content_json ?? null;
  const data = normalizeEstanciaContent(storedContent);

  if (hasNormalizedDifference(storedContent, data)) {
    await persistEstanciaContent(data);
  }

  writeLegacyEstanciaContentBackup(data);
  return data;
}

export async function writeEstanciaContent(data: EstanciaContentData) {
  await ensureDatabaseSeeded();

  const normalized = normalizeEstanciaContent(data);
  await persistEstanciaContent(normalized);

  writeLegacyEstanciaContentBackup(normalized);
}

export async function getActiveHomeImages() {
  const items = (await readEstanciaContent()).homeImages.filter((item) => item.active);
  return items.length > 0 ? items : defaultContent.homeImages.filter((item) => item.active);
}

export async function getActiveAttractions() {
  const items = (await readEstanciaContent()).attractions.filter((item) => item.active);
  return items;
}

export async function getActiveEvents() {
  const items = (await readEstanciaContent()).events.filter((item) => item.active);
  return items;
}

export async function getManagedB2cProducts(type?: B2cProductType) {
  const products = (await readEstanciaContent()).products.filter((product) => product.active);
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

  ensureLocalStore();

  const sourceName = file.name || "imagem.png";
  const extension = extname(sourceName).toLowerCase() || ".png";
  const fileName = `${Date.now()}-${makeContentId(sourceName.replace(extension, ""))}${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  for (const targetDir of getSiteUploadTargets()) {
    mkdirSync(targetDir, { recursive: true });
    writeFileSync(join(targetDir, fileName), bytes);
  }

  return `/uploads/site/${fileName}`;
}

export function readUploadedSiteImage(segments: string[]) {
  const safeSegments = segments
    .map((segment) => segment.trim())
    .filter((segment) => segment && segment !== "." && segment !== "..");

  if (safeSegments.length === 0 || safeSegments.length !== segments.length) {
    return null;
  }

  for (const targetDir of getSiteUploadTargets()) {
    const filePath = join(targetDir, ...safeSegments);

    if (existsSync(filePath)) {
      return {
        filePath,
        bytes: readFileSync(filePath),
      };
    }
  }

  return null;
}
