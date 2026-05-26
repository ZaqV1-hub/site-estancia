export type B2cProductType = "passport" | "addon";
export type B2cVoucherType = "norma" | "infan" | "espec";

export type B2cProductId =
  | "passaporte-explorador"
  | "passaporte-aventura"
  | "passaporte-infantil"
  | "almoco-caipira-buffet"
  | "cafe-da-manha"
  | "ecobag-algodao"
  | "kit-bebidas"
  | (string & {});

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
  sortOrder?: number;
};

export const DEFAULT_B2C_PRODUCTS: B2cProduct[] = [
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
    sortOrder: 1,
  },
  {
    id: "passaporte-aventura",
    type: "passport",
    title: "Passaporte Aventura",
    subtitle: "Experiencia completa",
    description: "Passaporte adulto para curtir as atracoes do parque.",
    imageSrc: "/photos/estrutura-galeria.jpg",
    fixedPrice: "100.00",
    voucherType: "norma",
    voucherPrefix: "A",
    active: true,
    sortOrder: 2,
  },
  {
    id: "passaporte-infantil",
    type: "passport",
    title: "Passaporte Infantil",
    subtitle: "Criancas de 3 a 12 anos",
    description: "Passaporte infantil para a data selecionada.",
    imageSrc: "/photos/escola.jpg",
    fixedPrice: "70.00",
    voucherType: "infan",
    voucherPrefix: "C",
    active: true,
    sortOrder: 3,
  },
  {
    id: "almoco-caipira-buffet",
    type: "addon",
    title: "Almoco Caipira Buffet",
    subtitle: "Refeicao no parque",
    description: "Adicional de almoco para completar o dia.",
    imageSrc: "/photos/confraternizacao.jpg",
    fixedPrice: "65.00",
    voucherType: "espec",
    voucherPrefix: "E",
    active: true,
    sortOrder: 1,
  },
  {
    id: "cafe-da-manha",
    type: "addon",
    title: "Cafe da Manha",
    subtitle: "Para comecar cedo",
    description: "Adicional de cafe da manha para o visitante.",
    imageSrc: "/photos/day-use.jpg",
    fixedPrice: "25.00",
    voucherType: "espec",
    voucherPrefix: "E",
    active: true,
    sortOrder: 2,
  },
  {
    id: "ecobag-algodao",
    type: "addon",
    title: "Ecobag de Algodao",
    subtitle: "Lembranca util do passeio",
    description: "Ecobag personalizada para retirar no parque.",
    imageSrc: "/photos/estrutura-piscina.jpg",
    fixedPrice: "35.00",
    voucherType: "espec",
    voucherPrefix: "E",
    active: true,
    sortOrder: 3,
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
    sortOrder: 4,
  },
];
