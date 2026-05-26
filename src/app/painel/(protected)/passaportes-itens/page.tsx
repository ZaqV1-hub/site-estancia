import type { Metadata } from "next";
import Image from "next/image";
import { revalidatePath } from "next/cache";
import {
  makeContentId,
  normalizePrice,
  normalizeVoucherType,
  readEstanciaContent,
  saveUploadedSiteImage,
  writeEstanciaContent,
} from "@/lib/estancia-content-store";
import { requirePainelAccess } from "@/lib/painel-session";
import type { B2cProduct, B2cProductType } from "@/lib/b2c-catalog-defaults";

export const metadata: Metadata = {
  title: "Painel - Passaportes e Itens | Estancia",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

function asText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function asBool(value: FormDataEntryValue | null) {
  return value === "on";
}

function revalidateProducts() {
  revalidatePath("/painel/passaportes-itens");
  revalidatePath("/agenda");
  revalidatePath("/comprar/[id]", "page");
}

async function upsertProduct(formData: FormData) {
  "use server";

  const data = readEstanciaContent();
  const title = asText(formData.get("title"));
  const type = asText(formData.get("type")) === "addon" ? "addon" : "passport";
  const id = asText(formData.get("id")) || makeContentId(title);
  const current = data.products.find((item) => item.id === id);
  const imageSrc = await saveUploadedSiteImage(formData.get("image"));
  const nextProduct: B2cProduct = {
    id,
    type,
    title: title || current?.title || "Novo produto",
    subtitle: asText(formData.get("subtitle")) || current?.subtitle || "",
    description: asText(formData.get("description")) || current?.description || "",
    imageSrc: imageSrc ?? current?.imageSrc ?? "/photos/day-use.jpg",
    fixedPrice: normalizePrice(formData.get("fixedPrice")),
    voucherType: normalizeVoucherType(formData.get("voucherType")),
    voucherPrefix: asText(formData.get("voucherPrefix")) || current?.voucherPrefix || (type === "addon" ? "E" : "A"),
    active: asBool(formData.get("active")),
    sortOrder: Number(formData.get("sortOrder")) || current?.sortOrder || data.products.length + 1,
  };

  writeEstanciaContent({
    ...data,
    products: [...data.products.filter((item) => item.id !== id), nextProduct],
  });
  revalidateProducts();
}

async function deleteProduct(formData: FormData) {
  "use server";

  const data = readEstanciaContent();
  const id = asText(formData.get("id"));

  writeEstanciaContent({
    ...data,
    products: data.products.filter((item) => item.id !== id),
  });
  revalidateProducts();
}

function formatCurrency(value: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value));
}

function ProductCard({ product }: { product: B2cProduct }) {
  return (
    <article className="min-w-[280px] overflow-hidden rounded-[8px] border border-[#dbe7d7] bg-white">
      <div className="relative h-36 bg-[#eef3e8]">
        <Image src={product.imageSrc} alt={product.title} fill className="object-cover" sizes="320px" />
      </div>
      <div className="p-4">
        <h4 className="text-lg font-black text-[#17351f]">{product.title}</h4>
        <p className="mt-1 min-h-10 text-sm leading-5 text-[#5f7564]">{product.subtitle}</p>
        <strong className="mt-3 block text-xl text-[#17351f]">{formatCurrency(product.fixedPrice)}</strong>
        <div className="mt-4 flex flex-wrap gap-2">
          <details className="w-full">
            <summary className="cursor-pointer rounded-full border border-[#dbe7d7] px-4 py-2 text-center text-xs font-black text-[#17351f]">
              Editar
            </summary>
            <ProductForm product={product} type={product.type} />
          </details>
          <form action={deleteProduct}>
            <input type="hidden" name="id" value={product.id} />
            <button className="rounded-full border border-[#f0c3bc] px-4 py-2 text-xs font-black text-[#a33b31]">
              Excluir
            </button>
          </form>
        </div>
      </div>
    </article>
  );
}

function ImageInput() {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[#17351f]">
      Imagem do produto
      <input
        name="image"
        type="file"
        accept="image/*"
        className="rounded-[8px] border border-dashed border-[#9bbd91] bg-white px-4 py-3 text-sm file:mr-4 file:rounded-full file:border-0 file:bg-[#17342d] file:px-4 file:py-2 file:text-sm file:font-black file:text-white"
      />
      <span className="text-xs font-medium text-[#6a806e]">
        Clique em escolher arquivo para enviar a foto do produto.
      </span>
    </label>
  );
}

function ProductForm({
  type,
  product,
}: {
  type: B2cProductType;
  product?: B2cProduct;
}) {
  return (
    <form action={upsertProduct} className="mt-4 grid gap-3 rounded-[8px] border border-[#dbe7d7] bg-[#fbfdf9] p-4">
      <input type="hidden" name="type" value={type} />
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <label className="grid gap-2 text-sm font-semibold text-[#17351f]">
        Titulo
        <input name="title" defaultValue={product?.title} className="rounded-[8px] border border-[#dbe7d7] px-4 py-3" />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-[#17351f]">
        Subtitulo
        <input name="subtitle" defaultValue={product?.subtitle} className="rounded-[8px] border border-[#dbe7d7] px-4 py-3" />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-[#17351f]">
        Descricao
        <textarea name="description" defaultValue={product?.description} rows={3} className="rounded-[8px] border border-[#dbe7d7] px-4 py-3" />
      </label>
      <ImageInput />
      <label className="grid gap-2 text-sm font-semibold text-[#17351f]">
        Valor
        <input name="fixedPrice" defaultValue={product?.fixedPrice} placeholder="100,00" className="rounded-[8px] border border-[#dbe7d7] px-4 py-3" />
      </label>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-semibold text-[#17351f]">
          Voucher
          <select name="voucherType" defaultValue={product?.voucherType ?? (type === "addon" ? "espec" : "norma")} className="rounded-[8px] border border-[#dbe7d7] px-4 py-3">
            <option value="norma">Normal</option>
            <option value="infan">Infantil</option>
            <option value="espec">Especial</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-[#17351f]">
          Prefixo
          <input name="voucherPrefix" defaultValue={product?.voucherPrefix ?? (type === "addon" ? "E" : "A")} className="rounded-[8px] border border-[#dbe7d7] px-4 py-3" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-[#17351f]">
          Ordem
          <input name="sortOrder" type="number" min="1" defaultValue={product?.sortOrder} className="rounded-[8px] border border-[#dbe7d7] px-4 py-3" />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm font-black text-[#17351f]">
        <input name="active" type="checkbox" defaultChecked={product?.active ?? true} /> Ativo
      </label>
      <button className="rounded-full bg-[#17342d] px-5 py-3 text-sm font-black text-white">
        Salvar
      </button>
    </form>
  );
}

function ProductSection({
  title,
  eyebrow,
  products,
  type,
}: {
  title: string;
  eyebrow: string;
  products: B2cProduct[];
  type: B2cProductType;
}) {
  return (
    <section className="panel-section p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="panel-eyebrow">{eyebrow}</p>
          <h3 className="mt-2 text-[24px] font-black text-[#17351f]">{title}</h3>
        </div>
        <details className="w-full max-w-[460px]">
          <summary className="cursor-pointer rounded-full bg-[#17342d] px-5 py-3 text-center text-sm font-black text-white">
            {type === "passport" ? "Adicionar passaporte" : "Adicionar item"}
          </summary>
          <ProductForm type={type} />
        </details>
      </div>
      <div className="mt-5 flex gap-4 overflow-x-auto pb-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

export default async function PainelPassaportesItensRoute() {
  await requirePainelAccess(["vis_agenda", "vis_tabpre"], "/painel/passaportes-itens");
  const products = readEstanciaContent().products;
  const passports = products.filter((product) => product.type === "passport");
  const addons = products.filter((product) => product.type === "addon");

  return (
    <div className="space-y-5">
      <section className="panel-section p-5">
        <p className="panel-eyebrow">Produtos</p>
        <h2 className="mt-2 text-[28px] font-black leading-tight text-[#17351f]">
          Passaportes e itens
        </h2>
        <p className="mt-3 max-w-[720px] text-[15px] leading-7 text-[#5f7564]">
          Cadastre os passaportes e itens adicionais padrao usados no site.
        </p>
      </section>

      <ProductSection
        eyebrow="Passaportes"
        title="Produtos principais"
        products={passports}
        type="passport"
      />
      <ProductSection
        eyebrow="Itens adicionais"
        title="Produtos complementares"
        products={addons}
        type="addon"
      />
    </div>
  );
}
