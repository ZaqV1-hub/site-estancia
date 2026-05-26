import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import { revalidatePath } from "next/cache";
import {
  makeContentId,
  readEstanciaContent,
  saveUploadedSiteImage,
  writeEstanciaContent,
  type EstanciaContentData,
} from "@/lib/estancia-content-store";
import { requirePainelAccess } from "@/lib/painel-session";

export const metadata: Metadata = {
  title: "Painel - Site | Estancia",
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

function saveAndRevalidate(data: EstanciaContentData) {
  writeEstanciaContent(data);
  revalidatePath("/");
  revalidatePath("/painel/site");
}

async function upsertHomeImage(formData: FormData) {
  "use server";

  const data = readEstanciaContent();
  const id = asText(formData.get("id")) || makeContentId(asText(formData.get("alt")));
  const current = data.homeImages.find((item) => item.id === id);
  const desktopUpload = await saveUploadedSiteImage(formData.get("desktopImage"));
  const mobileUpload = await saveUploadedSiteImage(formData.get("mobileImage"));
  const nextItem = {
    id,
    desktopSrc: desktopUpload ?? current?.desktopSrc ?? "/hero/current/banner-site-oficial-1.jpg",
    mobileSrc: mobileUpload ?? current?.mobileSrc ?? desktopUpload ?? "/hero/current/banner-site-oficial-1.jpg",
    alt: asText(formData.get("alt")) || current?.alt || "Imagem da home",
    active: asBool(formData.get("active")),
    sortOrder: Number(formData.get("sortOrder")) || current?.sortOrder || data.homeImages.length + 1,
  };

  saveAndRevalidate({
    ...data,
    homeImages: [...data.homeImages.filter((item) => item.id !== id), nextItem],
  });
}

async function upsertAttraction(formData: FormData) {
  "use server";

  const data = readEstanciaContent();
  const title = asText(formData.get("title"));
  const id = asText(formData.get("id")) || makeContentId(title);
  const current = data.attractions.find((item) => item.id === id);
  const imageSrc = await saveUploadedSiteImage(formData.get("image"));
  const nextItem = {
    id,
    title: title || current?.title || "Nova atracao",
    description: asText(formData.get("description")) || current?.description || "",
    imageSrc: imageSrc ?? current?.imageSrc ?? "/photos/day-use.jpg",
    active: asBool(formData.get("active")),
    sortOrder: Number(formData.get("sortOrder")) || current?.sortOrder || data.attractions.length + 1,
  };

  saveAndRevalidate({
    ...data,
    attractions: [...data.attractions.filter((item) => item.id !== id), nextItem],
  });
}

async function upsertEvent(formData: FormData) {
  "use server";

  const data = readEstanciaContent();
  const title = asText(formData.get("title"));
  const id = asText(formData.get("id")) || makeContentId(title);
  const current = data.events.find((item) => item.id === id);
  const imageSrc = await saveUploadedSiteImage(formData.get("image"));
  const nextItem = {
    id,
    title: title || current?.title || "Novo evento",
    description: asText(formData.get("description")) || current?.description || "",
    imageSrc: imageSrc ?? current?.imageSrc ?? "/hero/current/banner-14-06-2026.jpg",
    href: asText(formData.get("href")) || current?.href || "/agenda",
    buttonLabel: asText(formData.get("buttonLabel")) || current?.buttonLabel || "Compre seu ingresso!",
    active: asBool(formData.get("active")),
    sortOrder: Number(formData.get("sortOrder")) || current?.sortOrder || data.events.length + 1,
  };

  saveAndRevalidate({
    ...data,
    events: [...data.events.filter((item) => item.id !== id), nextItem],
  });
}

async function deleteContentItem(formData: FormData) {
  "use server";

  const data = readEstanciaContent();
  const section = asText(formData.get("section"));
  const id = asText(formData.get("id"));

  if (section === "home") {
    saveAndRevalidate({ ...data, homeImages: data.homeImages.filter((item) => item.id !== id) });
  }

  if (section === "attraction") {
    saveAndRevalidate({ ...data, attractions: data.attractions.filter((item) => item.id !== id) });
  }

  if (section === "event") {
    saveAndRevalidate({ ...data, events: data.events.filter((item) => item.id !== id) });
  }
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[#17351f]">
      {label}
      {children}
    </label>
  );
}

function ImageInput({ name, label }: { name: string; label: string }) {
  return (
    <Field label={label}>
      <input
        name={name}
        type="file"
        accept="image/*"
        className="rounded-[8px] border border-dashed border-[#9bbd91] bg-white px-4 py-3 text-sm text-[#17351f] file:mr-4 file:rounded-full file:border-0 file:bg-[#17342d] file:px-4 file:py-2 file:text-sm file:font-black file:text-white"
      />
      <span className="text-xs font-medium text-[#6a806e]">
        Clique em escolher arquivo e envie uma imagem em PNG, JPG ou WEBP.
      </span>
    </Field>
  );
}

function DeleteButton({ section, id }: { section: string; id: string }) {
  return (
    <form action={deleteContentItem}>
      <input type="hidden" name="section" value={section} />
      <input type="hidden" name="id" value={id} />
      <button className="rounded-full border border-[#f0c3bc] px-4 py-2 text-xs font-black text-[#a33b31]">
        Excluir
      </button>
    </form>
  );
}

export default async function PainelSiteRoute() {
  await requirePainelAccess(["vis_info", "vis_param"], "/painel/site");
  const content = readEstanciaContent();

  return (
    <div className="space-y-5">
      <section className="panel-section p-5">
        <p className="panel-eyebrow">Site</p>
        <h2 className="mt-2 text-[28px] font-black leading-tight text-[#17351f]">
          Conteudo publicado
        </h2>
        <p className="mt-3 max-w-[760px] text-[15px] leading-7 text-[#5f7564]">
          Gerencie imagens da home, atracoes e eventos exibidos no site.
        </p>
      </section>

      <section className="panel-section p-5">
        <p className="panel-eyebrow">Imagens da home</p>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.75fr]">
          <div className="grid gap-3">
            {content.homeImages.map((item) => (
              <article key={item.id} className="rounded-[8px] border border-[#dbe7d7] bg-white p-4">
                <div className="relative h-36 overflow-hidden rounded-[8px] bg-[#eef3e8]">
                  <Image src={item.desktopSrc} alt={item.alt} fill className="object-cover" sizes="420px" />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-[#17351f]">{item.alt}</h3>
                    <p className="text-sm text-[#5f7564]">{item.active ? "Publicado" : "Oculto"}</p>
                  </div>
                  <DeleteButton section="home" id={item.id} />
                </div>
              </article>
            ))}
          </div>
          <form action={upsertHomeImage} className="grid gap-4 rounded-[8px] border border-[#dbe7d7] bg-[#fbfdf9] p-4">
            <h3 className="text-xl font-black text-[#17351f]">Adicionar imagem</h3>
            <Field label="Texto alternativo">
              <input name="alt" className="rounded-[8px] border border-[#dbe7d7] px-4 py-3" />
            </Field>
            <ImageInput name="desktopImage" label="Imagem desktop" />
            <ImageInput name="mobileImage" label="Imagem mobile" />
            <Field label="Ordem">
              <input name="sortOrder" type="number" min="1" className="rounded-[8px] border border-[#dbe7d7] px-4 py-3" />
            </Field>
            <label className="flex items-center gap-2 text-sm font-black text-[#17351f]">
              <input name="active" type="checkbox" defaultChecked /> Publicar
            </label>
            <button className="rounded-full bg-[#17342d] px-5 py-3 text-sm font-black text-white">
              Salvar imagem
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="panel-section p-5">
          <p className="panel-eyebrow">Atracoes</p>
          <div className="mt-5 grid gap-3">
            {content.attractions.map((item) => (
              <div key={item.id} className="rounded-[8px] border border-[#dbe7d7] bg-white p-4">
                <div className="relative h-32 overflow-hidden rounded-[8px] bg-[#eef3e8]">
                  <Image src={item.imageSrc} alt={item.title} fill className="object-cover" sizes="420px" />
                </div>
                <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-[#17351f]">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[#5f7564]">{item.description}</p>
                  </div>
                  <DeleteButton section="attraction" id={item.id} />
                </div>
              </div>
            ))}
          </div>
          <form action={upsertAttraction} className="mt-5 grid gap-4 rounded-[8px] border border-[#dbe7d7] bg-[#fbfdf9] p-4">
            <h3 className="text-xl font-black text-[#17351f]">Adicionar atracao</h3>
            <Field label="Titulo"><input name="title" className="rounded-[8px] border border-[#dbe7d7] px-4 py-3" /></Field>
            <Field label="Descricao"><textarea name="description" rows={3} className="rounded-[8px] border border-[#dbe7d7] px-4 py-3" /></Field>
            <ImageInput name="image" label="Imagem da atracao" />
            <Field label="Ordem"><input name="sortOrder" type="number" min="1" className="rounded-[8px] border border-[#dbe7d7] px-4 py-3" /></Field>
            <label className="flex items-center gap-2 text-sm font-black text-[#17351f]"><input name="active" type="checkbox" defaultChecked /> Publicar</label>
            <button className="rounded-full bg-[#17342d] px-5 py-3 text-sm font-black text-white">Salvar atracao</button>
          </form>
        </article>

        <article className="panel-section p-5">
          <p className="panel-eyebrow">Eventos</p>
          <div className="mt-5 grid gap-3">
            {content.events.map((item) => (
              <div key={item.id} className="rounded-[8px] border border-[#dbe7d7] bg-white p-4">
                <div className="relative h-32 overflow-hidden rounded-[8px] bg-[#eef3e8]">
                  <Image src={item.imageSrc} alt={item.title} fill className="object-cover" sizes="420px" />
                </div>
                <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-[#17351f]">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[#5f7564]">{item.description}</p>
                    <p className="mt-1 text-xs font-bold text-[#6e9464]">{item.href}</p>
                  </div>
                  <DeleteButton section="event" id={item.id} />
                </div>
              </div>
            ))}
          </div>
          <form action={upsertEvent} className="mt-5 grid gap-4 rounded-[8px] border border-[#dbe7d7] bg-[#fbfdf9] p-4">
            <h3 className="text-xl font-black text-[#17351f]">Adicionar evento</h3>
            <Field label="Nome"><input name="title" className="rounded-[8px] border border-[#dbe7d7] px-4 py-3" /></Field>
            <Field label="Descricao"><textarea name="description" rows={3} className="rounded-[8px] border border-[#dbe7d7] px-4 py-3" /></Field>
            <Field label="Link do botao"><input name="href" defaultValue="/agenda" className="rounded-[8px] border border-[#dbe7d7] px-4 py-3" /></Field>
            <Field label="Texto do botao"><input name="buttonLabel" defaultValue="Compre seu ingresso!" className="rounded-[8px] border border-[#dbe7d7] px-4 py-3" /></Field>
            <ImageInput name="image" label="Imagem do evento" />
            <Field label="Ordem"><input name="sortOrder" type="number" min="1" className="rounded-[8px] border border-[#dbe7d7] px-4 py-3" /></Field>
            <label className="flex items-center gap-2 text-sm font-black text-[#17351f]"><input name="active" type="checkbox" defaultChecked /> Publicar</label>
            <button className="rounded-full bg-[#17342d] px-5 py-3 text-sm font-black text-white">Salvar evento</button>
          </form>
        </article>
      </section>
    </div>
  );
}
