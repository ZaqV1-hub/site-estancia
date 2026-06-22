"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { PainelModal } from "@/components/painel-modal";
import type {
  EstanciaContentData,
  ManagedAttraction,
  ManagedEvent,
  ManagedHomeImage,
} from "@/lib/estancia-content-store";

type EditableItem =
  | { section: "home"; item: ManagedHomeImage | null }
  | { section: "attraction"; item: ManagedAttraction | null }
  | { section: "event"; item: ManagedEvent | null };

type DeleteTarget = {
  section: "home" | "attraction" | "event";
  id: string;
  title: string;
};

type EventMode = "date" | "link";

function itemTitle(item: EditableItem) {
  if (item.section === "home") {
    return item.item ? "Editar imagem da home" : "Adicionar imagem da home";
  }

  if (item.section === "attraction") {
    return item.item ? "Editar atração" : "Adicionar atração";
  }

  return item.item ? "Editar evento" : "Adicionar evento";
}

function resolveEventMode(event: ManagedEvent | null | undefined): EventMode {
  const href = event?.href?.trim() ?? "";

  return /(?:\?|&)date=\d{4}-\d{2}-\d{2}(?:&|$)/.test(href) ? "date" : "link";
}

function resolveEventDate(event: ManagedEvent | null | undefined) {
  const href = event?.href?.trim() ?? "";
  const match = href.match(/(?:\?|&)date=(\d{4}-\d{2}-\d{2})(?:&|$)/);

  return match?.[1] ?? "";
}

function ImagePicker({ name, label }: { name: string; label: string }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[#17351f]">
      {label}
      <input
        name={name}
        type="file"
        accept="image/*"
        className="rounded-[8px] border border-dashed border-[#9bbd91] bg-white px-4 py-3 text-sm file:mr-4 file:rounded-full file:border-0 file:bg-[#17342d] file:px-4 file:py-2 file:text-sm file:font-black file:text-white"
      />
      <span className="text-xs font-medium text-[#6a806e]">
        Clique em escolher arquivo para enviar a imagem.
        {name === "mobileImage"
          ? " Se não enviar a versão mobile, a imagem desktop será usada no celular."
          : ""}
      </span>
    </label>
  );
}

function CurrentImagePreview({
  label,
  src,
  alt,
}: {
  label: string;
  src: string;
  alt: string;
}) {
  return (
    <div className="grid gap-2">
      <p className="text-sm font-semibold text-[#17351f]">{label}</p>
      <div className="overflow-hidden rounded-[8px] border border-[#dbe7d7] bg-[#eef3e8]">
        <img
          src={src}
          alt={alt}
          className="block h-40 w-full object-cover"
          loading="lazy"
        />
      </div>
      <p className="text-xs font-medium text-[#6a806e]">
        O navegador não reabre esse campo com um arquivo já selecionado. Para
        trocar a imagem, escolha um novo arquivo abaixo.
      </p>
    </div>
  );
}

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <button
      disabled={pending}
      className="rounded-full bg-[#17342d] px-5 py-3 text-sm font-black text-white disabled:opacity-60"
    >
      {pending ? "Salvando..." : "Salvar"}
    </button>
  );
}

export function PainelSiteManager({
  content,
  initialEditEventId = null,
  initialCreateEventMode = null,
}: {
  content: EstanciaContentData;
  initialEditEventId?: string | null;
  initialCreateEventMode?: EventMode | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<EditableItem | null>(() => {
    if (initialEditEventId) {
      const item = content.events.find((event) => event.id === initialEditEventId) ?? null;

      if (item) {
        return { section: "event", item };
      }
    }

    if (initialCreateEventMode) {
      return { section: "event", item: null };
    }

    return null;
  });
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventMode, setEventMode] = useState<EventMode>(() => {
    if (initialEditEventId) {
      const item = content.events.find((event) => event.id === initialEditEventId) ?? null;
      return resolveEventMode(item);
    }

    return initialCreateEventMode ?? "date";
  });
  const currentEvent =
    editing?.section === "event" ? (editing.item as ManagedEvent | null) : null;

  function openCreateEvent(nextMode: EventMode) {
    setEventMode(nextMode);
    setEditing({ section: "event", item: null });
    setError(null);
  }

  function openEditEvent(item: ManagedEvent) {
    setEventMode(resolveEventMode(item));
    setEditing({ section: "event", item });
    setError(null);
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/painel/site-content", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: { message?: string };
      } | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message || "Não foi possível salvar.");
      }

      setEditing(null);
      router.replace("/painel/site");
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Não foi possível salvar.",
      );
    } finally {
      setPending(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/painel/site-content", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(deleteTarget),
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: { message?: string };
      } | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message || "Não foi possível excluir.");
      }

      setDeleteTarget(null);
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Não foi possível excluir.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <section className="panel-section p-5">
        <p className="panel-eyebrow">Imagens da home</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <h3 className="text-[24px] font-black text-[#17351f]">
            Banners publicados
          </h3>
          <button
            type="button"
            onClick={() => setEditing({ section: "home", item: null })}
            className="rounded-full bg-[#17342d] px-5 py-3 text-sm font-black text-white"
          >
            Adicionar imagem
          </button>
        </div>
        <div className="mt-5 flex gap-4 overflow-x-auto pb-3">
          {content.homeImages.map((item) => (
            <article
              key={item.id}
              className="min-w-[320px] rounded-[8px] border border-[#dbe7d7] bg-white p-4"
            >
              <div className="h-36 overflow-hidden rounded-[8px] bg-[#eef3e8]">
                <img
                  src={item.desktopSrc}
                  alt={item.alt}
                  className="block h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <h4 className="mt-3 text-lg font-black text-[#17351f]">
                {item.alt}
              </h4>
              <p className="text-sm text-[#5f7564]">
                {item.active ? "Publicado" : "Oculto"}
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setEditing({ section: "home", item })}
                  className="rounded-full border border-[#dbe7d7] px-4 py-2 text-xs font-black text-[#17351f]"
                >
                  Editar
                </button>
                <button
                  onClick={() =>
                    setDeleteTarget({
                      section: "home",
                      id: item.id,
                      title: item.alt,
                    })
                  }
                  className="rounded-full border border-[#f0c3bc] px-4 py-2 text-xs font-black text-[#a33b31]"
                >
                  Excluir
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <ContentList
          title="Atrações"
          buttonLabel="Adicionar atração"
          items={content.attractions}
          onEdit={(item) => setEditing({ section: "attraction", item })}
          onCreate={() => setEditing({ section: "attraction", item: null })}
          onDelete={(item) =>
            setDeleteTarget({
              section: "attraction",
              id: item.id,
              title: item.title,
            })
          }
        />
        <ContentList
          title="Eventos"
          buttonLabel={null}
          extraActions={
            <>
              <button
                onClick={() => openCreateEvent("date")}
                className="rounded-full bg-[#17342d] px-5 py-3 text-sm font-black text-white"
              >
                Evento com data
              </button>
              <button
                onClick={() => openCreateEvent("link")}
                className="rounded-full border border-[#dbe7d7] bg-white px-5 py-3 text-sm font-black text-[#17351f]"
              >
                Evento com link
              </button>
            </>
          }
          items={content.events}
          onEdit={openEditEvent}
          onCreate={() => openCreateEvent("date")}
          onDelete={(item) =>
            setDeleteTarget({ section: "event", id: item.id, title: item.title })
          }
        />
      </section>

      <PainelModal
        title={editing ? itemTitle(editing) : ""}
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
      >
        {editing ? (
          <form onSubmit={submitForm} className="grid gap-4">
            <input type="hidden" name="section" value={editing.section} />
            {editing.item ? (
              <input type="hidden" name="id" value={editing.item.id} />
            ) : null}
            {editing.section === "home" ? (
              <>
                <Field label="Texto da imagem">
                  <input
                    name="alt"
                    defaultValue={editing.item?.alt ?? ""}
                    className="rounded-[8px] border border-[#dbe7d7] px-4 py-3"
                  />
                </Field>
                {editing.item ? (
                  <>
                    <CurrentImagePreview
                      label="Imagem desktop atual"
                      src={editing.item.desktopSrc}
                      alt={editing.item.alt}
                    />
                    <CurrentImagePreview
                      label="Imagem mobile atual"
                      src={editing.item.mobileSrc}
                      alt={editing.item.alt}
                    />
                  </>
                ) : null}
                <ImagePicker name="desktopImage" label="Imagem desktop" />
                <ImagePicker name="mobileImage" label="Imagem mobile" />
              </>
            ) : (
              <>
                <Field label="Título">
                  <input
                    name="title"
                    defaultValue={editing.item?.title ?? ""}
                    className="rounded-[8px] border border-[#dbe7d7] px-4 py-3"
                  />
                </Field>
                <Field label="Descrição">
                  <textarea
                    name="description"
                    defaultValue={editing.item?.description ?? ""}
                    rows={4}
                    className="rounded-[8px] border border-[#dbe7d7] px-4 py-3"
                  />
                </Field>
                {editing.section === "event" ? (
                  <>
                    <fieldset className="grid gap-3 rounded-[8px] border border-[#dbe7d7] bg-[#fbfdf9] p-4">
                      <legend className="px-1 text-sm font-black text-[#17351f]">
                        Esse evento tem data?
                      </legend>
                      <label className="flex items-center gap-2 text-sm font-bold text-[#17351f]">
                        <input
                          name="eventMode"
                          type="radio"
                          value="date"
                          checked={eventMode === "date"}
                          onChange={() => setEventMode("date")}
                        />
                        Sim, criar como data promocional
                      </label>
                      <label className="flex items-center gap-2 text-sm font-bold text-[#17351f]">
                        <input
                          name="eventMode"
                          type="radio"
                          value="link"
                          checked={eventMode === "link"}
                          onChange={() => setEventMode("link")}
                        />
                        Não, usar link manual no botão
                      </label>
                    </fieldset>
                    {eventMode === "date" ? (
                      <Field label="Data do evento">
                        <input
                          name="eventDate"
                          type="date"
                          defaultValue={resolveEventDate(currentEvent)}
                          className="rounded-[8px] border border-[#dbe7d7] px-4 py-3"
                        />
                      </Field>
                    ) : (
                      <Field label="Link do botão">
                        <input
                          name="href"
                          defaultValue={currentEvent?.href ?? ""}
                          placeholder="https://site.com.br ou /agenda"
                          className="rounded-[8px] border border-[#dbe7d7] px-4 py-3"
                        />
                      </Field>
                    )}
                    <Field label="Texto do botão">
                      <input
                        name="buttonLabel"
                        defaultValue={
                          currentEvent?.buttonLabel ?? "Compre seu ingresso!"
                        }
                        className="rounded-[8px] border border-[#dbe7d7] px-4 py-3"
                      />
                    </Field>
                  </>
                ) : null}
                {editing.item?.imageSrc ? (
                  <CurrentImagePreview
                    label="Imagem atual"
                    src={editing.item.imageSrc}
                    alt={editing.item.title}
                  />
                ) : null}
                <ImagePicker name="image" label="Imagem" />
              </>
            )}
            <Field label="Ordem">
              <input
                name="sortOrder"
                type="number"
                min="1"
                defaultValue={editing.item?.sortOrder ?? ""}
                className="rounded-[8px] border border-[#dbe7d7] px-4 py-3"
              />
            </Field>
            <label className="flex items-center gap-2 text-sm font-black text-[#17351f]">
              <input
                name="active"
                type="checkbox"
                defaultChecked={editing.item?.active ?? true}
              />{" "}
              Publicar
            </label>
            {error ? (
              <p className="rounded-[8px] border border-[#f1b1aa] bg-[#fff4f2] px-4 py-3 text-sm text-[#9d3d31]">
                {error}
              </p>
            ) : null}
            <SubmitButton pending={pending} />
          </form>
        ) : null}
      </PainelModal>

      <PainelModal
        title="Confirmar exclusão"
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
      >
        <p className="text-sm leading-7 text-[#5f7564]">
          Tem certeza que deseja excluir <strong>{deleteTarget?.title}</strong>?
        </p>
        {error ? (
          <p className="mt-3 rounded-[8px] border border-[#f1b1aa] bg-[#fff4f2] px-4 py-3 text-sm text-[#9d3d31]">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex gap-3">
          <button
            onClick={confirmDelete}
            disabled={pending}
            className="rounded-full bg-[#b24239] px-5 py-3 text-sm font-black text-white disabled:opacity-60"
          >
            {pending ? "Excluindo..." : "Excluir"}
          </button>
          <button
            onClick={() => setDeleteTarget(null)}
            className="rounded-full border border-[#dbe7d7] px-5 py-3 text-sm font-black text-[#17351f]"
          >
            Cancelar
          </button>
        </div>
      </PainelModal>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[#17351f]">
      {label}
      {children}
    </label>
  );
}

function ContentList<T extends ManagedAttraction | ManagedEvent>({
  title,
  buttonLabel,
  items,
  extraActions,
  onEdit,
  onCreate,
  onDelete,
}: {
  title: string;
  buttonLabel: string | null;
  items: T[];
  extraActions?: React.ReactNode;
  onEdit: (item: T) => void;
  onCreate: () => void;
  onDelete: (item: T) => void;
}) {
  return (
    <article className="panel-section p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="panel-eyebrow">{title}</p>
        <div className="flex flex-wrap justify-end gap-2">
          {extraActions}
          {buttonLabel ? (
            <button
              onClick={onCreate}
              className="rounded-full bg-[#17342d] px-5 py-3 text-sm font-black text-white"
            >
              {buttonLabel}
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-5 grid max-h-[520px] gap-3 overflow-y-auto pr-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-[8px] border border-[#dbe7d7] bg-white p-4"
          >
            <div className="h-32 overflow-hidden rounded-[8px] bg-[#eef3e8]">
              <img
                src={item.imageSrc}
                alt={item.title}
                className="block h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <h3 className="mt-3 text-lg font-black text-[#17351f]">
              {item.title}
            </h3>
            <p className="mt-1 line-clamp-3 text-sm leading-6 text-[#5f7564]">
              {item.description}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => onEdit(item)}
                className="rounded-full border border-[#dbe7d7] px-4 py-2 text-xs font-black text-[#17351f]"
              >
                Editar
              </button>
              <button
                onClick={() => onDelete(item)}
                className="rounded-full border border-[#f0c3bc] px-4 py-2 text-xs font-black text-[#a33b31]"
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
