export type B2cProductType = "passport" | "addon";
export type B2cVoucherType = "norma" | "infan" | "espec";

export type B2cProductId =
  | "passaporte-explorador"
  | "passaporte-aventura"
  | "passaporte-infantil"
  | "almoco-caipira-buffet"
  | "cafe-da-manha"
  | "ecobag-algodao"
  | "kit-bebidas";

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

export type B2cProduct = {
  id: B2cProductId;
  type: B2cProductType;
  title: string;
  subtitle: string;
  description: string;
  imageSrc: string;
  fixedPrice: string;
  voucherType: B2cVoucherType;
  voucherPrefix: string;
  active: boolean;
};

const b2cProducts: B2cProduct[] = [
  {
    id: "passaporte-explorador",
    type: "passport",
    title: "Passaporte Explorador",
    subtitle: "Dia de natureza e lazer",
    description: "Acesso principal para aproveitar o parque no dia escolhido.",
    imageSrc: "/photos/day-use.jpg",
    fixedPrice: "100.00",
    voucherType: "norma",
    voucherPrefix: "A",
    active: true,
  },
  {
    id: "passaporte-aventura",
    type: "passport",
    title: "Passaporte Aventura",
    subtitle: "Experiência completa",
    description: "Passaporte adulto para quem quer curtir as atrações do parque.",
    imageSrc: "/photos/estrutura-galeria.jpg",
    fixedPrice: "100.00",
    voucherType: "norma",
    voucherPrefix: "A",
    active: true,
  },
  {
    id: "passaporte-infantil",
    type: "passport",
    title: "Passaporte Infantil",
    subtitle: "Crianças de 3 a 12 anos",
    description: "Passaporte infantil para a data selecionada.",
    imageSrc: "/photos/escola.jpg",
    fixedPrice: "70.00",
    voucherType: "infan",
    voucherPrefix: "C",
    active: true,
  },
  {
    id: "almoco-caipira-buffet",
    type: "addon",
    title: "Almoço Caipira Buffet",
    subtitle: "Refeição no parque",
    description: "Adicional de almoço para completar o dia.",
    imageSrc: "/photos/confraternizacao.jpg",
    fixedPrice: "65.00",
    voucherType: "espec",
    voucherPrefix: "E",
    active: true,
  },
  {
    id: "cafe-da-manha",
    type: "addon",
    title: "Café da Manhã",
    subtitle: "Para começar cedo",
    description: "Adicional de café da manhã para o visitante.",
    imageSrc: "/photos/day-use.jpg",
    fixedPrice: "25.00",
    voucherType: "espec",
    voucherPrefix: "E",
    active: true,
  },
  {
    id: "ecobag-algodao",
    type: "addon",
    title: "Ecobag de Algodao",
    subtitle: "Lembrança útil do passeio",
    description: "Ecobag personalizada para retirar no parque.",
    imageSrc: "/photos/estrutura-piscina.jpg",
    fixedPrice: "35.00",
    voucherType: "espec",
    voucherPrefix: "E",
    active: true,
  },
  {
    id: "kit-bebidas",
    type: "addon",
    title: "Kit Bebidas",
    subtitle: "4 unidades",
    description: "Kit com bebidas para consumo durante a visita.",
    imageSrc: "/photos/quem-somos.jpg",
    fixedPrice: "32.00",
    voucherType: "espec",
    voucherPrefix: "E",
    active: true,
  },
];

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
  return b2cProducts.filter((product) => product.active);
}

export function listB2cPassports() {
  return listB2cProducts().filter((product) => product.type === "passport");
}

export function listB2cAddons() {
  return listB2cProducts().filter((product) => product.type === "addon");
}

export function getB2cProduct(productId: string) {
  return listB2cProducts().find((product) => product.id === productId) ?? null;
}

export function buildB2cCartSummary(
  lineItems: B2cCartLineItem[],
) {
  const lines: B2cCartSummaryLine[] = [];

  for (const item of lineItems) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error("Informe quantidades válidas para continuar.");
    }

    const product = getB2cProduct(item.productId);

    if (!product) {
      throw new Error("Produto indisponível para compra.");
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
