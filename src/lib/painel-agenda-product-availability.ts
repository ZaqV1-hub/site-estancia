import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { getManagedB2cProducts } from "@/lib/estancia-content-store";
import { ensureCalendarTables } from "@/lib/calendar-schema";
import { getIngressoDbPool } from "@/lib/ingresso-db";
import { isEventOnlyProduct } from "@/lib/calendar-validity";

export type PainelAgendaProductAvailability = {
  passportIds: string[];
  addonIds: string[];
};

type AvailabilityStore = Record<string, PainelAgendaProductAvailability>;

const dataDir = join(process.env.ESTANCIA_SITE_STORAGE_ROOT?.trim() || process.cwd(), ".data");
const dataFile = join(dataDir, "painel-agenda-products.json");

function ensureStore() {
  mkdirSync(dataDir, { recursive: true });

  if (!existsSync(dataFile)) {
    writeFileSync(dataFile, JSON.stringify({}, null, 2), "utf8");
  }
}

function uniqueIds(ids: string[]) {
  return [...new Set(ids.map((item) => item.trim()).filter(Boolean))];
}

function readStore(): AvailabilityStore {
  ensureStore();

  try {
    const parsed = JSON.parse(readFileSync(dataFile, "utf8")) as AvailabilityStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function readLegacyAgendaAvailability(date: string) {
  return readStore()[date] ?? null;
}

function writeStore(store: AvailabilityStore) {
  ensureStore();
  writeFileSync(dataFile, JSON.stringify(store, null, 2), "utf8");
}

export async function getDefaultAgendaProductAvailability(): Promise<PainelAgendaProductAvailability> {
  return {
    passportIds: (await getManagedB2cProducts("passport")).filter((product) => !isEventOnlyProduct(product)).map((product) => product.id),
    addonIds: (await getManagedB2cProducts("addon")).map((product) => product.id),
  };
}

export async function normalizeAgendaProductAvailability(
  availability: Partial<PainelAgendaProductAvailability> | null | undefined,
) {
  const allProducts = await getManagedB2cProducts();
  const defaults = await getDefaultAgendaProductAvailability();
  const availablePassportIds = new Set(allProducts.filter((product) => product.type === "passport").map((product) => product.id));
  const availableAddonIds = new Set(allProducts.filter((product) => product.type === "addon").map((product) => product.id));

  const passportIds = uniqueIds(
    Array.isArray(availability?.passportIds) ? availability.passportIds : defaults.passportIds,
  ).filter((id) => availablePassportIds.has(id));
  const addonIds = uniqueIds(
    Array.isArray(availability?.addonIds) ? availability.addonIds : defaults.addonIds,
  ).filter((id) => availableAddonIds.has(id));

  return {
    passportIds,
    addonIds,
  } satisfies PainelAgendaProductAvailability;
}

export async function getAgendaProductAvailability(date: string) {
  await ensureCalendarTables();
  const result = await getIngressoDbPool().query<{passport_ids:string[]|null;addon_ids:string[]|null;stagenda:string}>(`
    SELECT r.passport_ids,r.addon_ids,a.stagenda FROM agenda a
    LEFT JOIN estancia_calendar_rules r ON r.agenda_id=a.idagenda
    WHERE a.dtagenda=$1::date AND a.tpagenda IN ('padra','promo') ORDER BY a.idagenda LIMIT 1`,[date]);
  const row=result.rows[0];
  if (row?.stagenda === "fec") return {passportIds:[],addonIds:[]};
  if (row?.passport_ids) return normalizeAgendaProductAvailability({passportIds:row.passport_ids,addonIds:row.addon_ids??[]});
  const store = readStore();
  return normalizeAgendaProductAvailability(store[date]);
}

export async function setAgendaProductAvailability(
  date: string,
  availability: Partial<PainelAgendaProductAvailability> | null | undefined,
) {
  const store = readStore();
  store[date] = await normalizeAgendaProductAvailability(availability);
  writeStore(store);
}

export async function setAgendaProductAvailabilityRange(
  dates: string[],
  availability: Partial<PainelAgendaProductAvailability> | null | undefined,
) {
  const normalized = await normalizeAgendaProductAvailability(availability);
  const store = readStore();

  for (const date of dates) {
    store[date] = normalized;
  }

  writeStore(store);
}

export function removeAgendaProductAvailability(date: string) {
  const store = readStore();
  delete store[date];
  writeStore(store);
}
