import { getManagedB2cProducts } from "@/lib/estancia-content-store";
import type {
  B2cProduct,
  B2cProductId,
  B2cProductType,
  B2cVoucherType,
} from "@/lib/b2c-catalog-defaults";

export type {
  B2cProduct,
  B2cProductId,
  B2cProductType,
  B2cVoucherType,
} from "@/lib/b2c-catalog-defaults";

export type B2cCartLineItem = {
  productId: string;
  quantity: number;
};

export type B2cCartSummaryLine = {
  productId: B2cProductId;
  type: B2cProductType;
  title: string;
  description: string;
  quantity: number;
  unitPrice: string;
  totalValue: string;
  voucherType: B2cVoucherType;
  voucherPrefix: string;
};

function normalizeMoney(value: number) {
  return value.toFixed(2);
}

function parseMoney(value: string | null | undefined) {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : 0;
}

function resolveUnitPrice(product: B2cProduct) {
  return parseMoney(product.fixedPrice);
}

export function getB2cProductUnitPrice(productId: string) {
  const product = getB2cProduct(productId);

  return product ? normalizeMoney(resolveUnitPrice(product)) : null;
}

export function listB2cProducts() {
  return getManagedB2cProducts();
}

export function listB2cPassports() {
  return getManagedB2cProducts("passport");
}

export function listB2cAddons() {
  return getManagedB2cProducts("addon");
}

export function getB2cProduct(productId: string) {
  return listB2cProducts().find((product) => product.id === productId) ?? null;
}

export function buildB2cCartSummary(lineItems: B2cCartLineItem[]) {
  const lines: B2cCartSummaryLine[] = [];

  for (const item of lineItems) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error("Informe quantidades validas para continuar.");
    }

    const product = getB2cProduct(item.productId);

    if (!product) {
      throw new Error("Produto indisponivel para compra.");
    }

    const unitPrice = resolveUnitPrice(product);

    lines.push({
      productId: product.id,
      type: product.type,
      title: product.title,
      description: product.title,
      quantity: item.quantity,
      unitPrice: normalizeMoney(unitPrice),
      totalValue: normalizeMoney(unitPrice * item.quantity),
      voucherType: product.voucherType,
      voucherPrefix: product.voucherPrefix,
    });
  }

  const passportQuantity = lines
    .filter((line) => line.type === "passport")
    .reduce((total, line) => total + line.quantity, 0);
  const addonQuantity = lines
    .filter((line) => line.type === "addon")
    .reduce((total, line) => total + line.quantity, 0);

  if (passportQuantity <= 0) {
    throw new Error("Selecione pelo menos um passaporte para continuar.");
  }

  if (addonQuantity > 0 && passportQuantity <= 0) {
    throw new Error("Adicionais precisam estar vinculados a um passaporte.");
  }

  const total = lines.reduce(
    (sum, line) => sum + parseMoney(line.totalValue),
    0,
  );

  return {
    lines,
    passportQuantity,
    addonQuantity,
    voucherCount: passportQuantity + addonQuantity,
    totalValue: normalizeMoney(total),
  };
}
