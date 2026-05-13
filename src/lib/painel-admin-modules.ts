import type { LegacyPanelResource } from "@/lib/painel-access";

export type PainelAdminModule = {
  href: string;
  label: string;
  description: string;
  resources: LegacyPanelResource[];
};

export const painelAdminModules: PainelAdminModule[] = [
  {
    href: "/painel/usuario",
    label: "Usuarios",
    description: "Usuarios internos do painel, perfis e senha da conta operacional.",
    resources: ["vis_usu"],
  },
  {
    href: "/painel/usuario-site",
    label: "Usuario Site",
    description: "Usuarios do site, vinculos com socio e convenios, e exportacao.",
    resources: ["vis_situsu"],
  },
  {
    href: "/painel/tabela-preco",
    label: "Tabela de Preco",
    description: "Cadastros de preco normal, infantil e bilheteria.",
    resources: ["vis_tabpre"],
  },
  {
    href: "/painel/informacao",
    label: "Informacoes",
    description: "Mensagens e textos institucionais vinculados ao painel.",
    resources: ["vis_info"],
  },
  {
    href: "/painel/parametro",
    label: "Parametros",
    description: "Configuracoes sistêmicas agrupadas, validacoes e mensagens padrao.",
    resources: ["vis_param"],
  },
  {
    href: "/painel/categoria-socio",
    label: "Categoria Socio",
    description: "Categorias de socio e vinculo com tabela de preco.",
    resources: ["vis_catsoc"],
  },
  {
    href: "/painel/socio",
    label: "Socios",
    description: "Cadastro, vigencia, limite diario e status dos socios.",
    resources: ["vis_socio"],
  },
];
