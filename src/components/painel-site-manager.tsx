"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { OperationalEventEditor } from "@/components/operational-event-editor";
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

type HomeHeroMode = "with-link" | "without-link";

const ATTRACTION_TITLE_LIMIT = 36;
const ATTRACTION_DESCRIPTION_LIMIT = 160;
const EVENT_TITLE_LIMIT = 52;
const EVENT_DESCRIPTION_LIMIT = 220;

function itemTitle(item: EditableItem) {
  if (item.section === "home") {
    return item.item ? "Editar imagem da hero" : "Adicionar imagem da hero";
  }

  if (item.section === "attraction") {
    return item.item ? "Editar atração" : "Adicionar atração";
  }

  return item.item ? "Editar evento" : "Adicionar evento";
}

function resolveHomeHeroMode(item: ManagedHomeImage | null | undefined): HomeHeroMode {
  return item?.href?.trim() ? "with-link" : "without-link";
}

function resolveTextLimits(section: "attraction" | "event") {
  if (section === "event") {
    return {
      title: EVENT_TITLE_LIMIT,
      description: EVENT_DESCRIPTION_LIMIT,
    };
  }

  return {
    title: ATTRACTION_TITLE_LIMIT,
    description: ATTRACTION_DESCRIPTION_LIMIT,
  };
}

function ImagePicker({ name, label }: { name: string; label: string }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[var(--panel-ink)]">
      {label}
      <input
        name={name}
        type="file"
        accept="image/*"
        className="rounded-[8px] border border-dashed border-[var(--panel-line)] bg-[var(--panel-card)] px-4 py-3 text-sm file:mr-4 file:rounded-full file:border-0 file:bg-[var(--panel-primary)] file:px-4 file:py-2 file:text-sm file:font-black file:text-[var(--panel-on-primary)]"
      />
      <span className="text-xs font-medium text-[var(--panel-muted)]">
        Clique em escolher arquivo para enviar a imagem.
        {name === "mobileImage"
          ? " Se nao enviar a versao mobile, a imagem desktop sera usada no celular."
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
      <p className="text-sm font-semibold text-[var(--panel-ink)]">{label}</p>
      <div className="overflow-hidden rounded-[8px] border border-[var(--panel-line)] bg-[var(--panel-head)]">
        <img
          src={src}
          alt={alt}
          className="block h-40 w-full object-cover"
          loading="lazy"
        />
      </div>
      <p className="text-xs font-medium text-[var(--panel-muted)]">
        O navegador nao reabre esse campo com um arquivo ja selecionado. Para trocar
        a imagem, escolha um novo arquivo abaixo.
      </p>
    </div>
  );
}

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <button
      disabled={pending}
      className="rounded-full bg-[var(--panel-primary)] px-5 py-3 text-sm font-black text-[var(--panel-on-primary)] disabled:opacity-60"
    >
      {pending ? "Salvando..." : "Salvar"}
    </button>
  );
}

function MoveButtons({
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  busy,
}: {
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  busy: boolean;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onMoveUp}
        disabled={!canMoveUp || busy}
        aria-label="Mover para cima"
        className="rounded-full border border-[var(--panel-line)] px-3 py-2 text-xs font-black text-[var(--panel-ink)] disabled:cursor-not-allowed disabled:opacity-45"
      >
        ↑
      </button>
      <button
        type="button"
        onClick={onMoveDown}
        disabled={!canMoveDown || busy}
        aria-label="Mover para baixo"
        className="rounded-full border border-[var(--panel-line)] px-3 py-2 text-xs font-black text-[var(--panel-ink)] disabled:cursor-not-allowed disabled:opacity-45"
      >
        ↓
      </button>
    </div>
  );
}

export function PainelSiteManager({
  content,
  initialEditEventId = null,
  initialOpenCreateEvent = false,
}: {
  content: EstanciaContentData;
  initialEditEventId?: string | null;
  initialOpenCreateEvent?: boolean;
  defaultPriceTableId?: number | null;
  defaultInformationId?: number | null;
}) {
  const router = useRouter();
  const initialEditing = (() => {
    if (initialEditEventId) {
      const item = content.events.find((event) => event.id === initialEditEventId) ?? null;

      if (item) {
        return { section: "event", item } satisfies EditableItem;
      }
    }

    return null;
  })();
  const [editing, setEditing] = useState<EditableItem | null>(initialEditing);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [pending, setPending] = useState(false);
  const [movingKey, setMovingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [homeHeroMode, setHomeHeroMode] = useState<HomeHeroMode>("without-link");
  const [homeHeroHrefValue, setHomeHeroHrefValue] = useState("");
  useEffect(() => {
    if (initialOpenCreateEvent) router.replace("/painel/site/eventos/novo");
  }, [initialOpenCreateEvent, router]);

  function openCreateEvent() {
    router.push("/painel/site/eventos/novo");
  }

  function openCreateHome() {
    setEditing({ section: "home", item: null });
    setHomeHeroMode("without-link");
    setHomeHeroHrefValue("");
    setError(null);
  }

  function openEditHome(item: ManagedHomeImage) {
    setEditing({ section: "home", item });
    setHomeHeroMode(resolveHomeHeroMode(item));
    setHomeHeroHrefValue(item.href ?? "");
    setError(null);
  }

  function openEditEvent(item: ManagedEvent) {
    setEditing({ section: "event", item });
    setError(null);
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const formData = new FormData(event.currentTarget);

      if (editing?.section === "home") {
        if (homeHeroMode === "with-link" && !homeHeroHrefValue.trim()) {
          throw new Error("Informe o link da hero.");
        }

        formData.set("href", homeHeroMode === "with-link" ? homeHeroHrefValue : "");
      }

      const response = await fetch("/api/painel/site-content", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: { message?: string };
      } | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message || "Nao foi possivel salvar.");
      }

      setEditing(null);
      router.replace("/painel/site");
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Nao foi possivel salvar.",
      );
    } finally {
      setPending(false);
    }
  }

  async function moveItem(
    section: "home" | "attraction" | "event",
    id: string,
    direction: "up" | "down",
  ) {
    const key = `${section}:${id}:${direction}`;
    setMovingKey(key);
    setError(null);

    try {
      const response = await fetch("/api/painel/site-content", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ section, id, direction }),
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: { message?: string };
      } | null;

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message || "Nao foi possivel mover o item.");
      }

      router.refresh();
    } catch (moveError) {
      setError(
        moveError instanceof Error
          ? moveError.message
          : "Nao foi possivel mover o item.",
      );
    } finally {
      setMovingKey(null);
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
        throw new Error(payload?.error?.message || "Nao foi possivel excluir.");
      }

      setDeleteTarget(null);
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Nao foi possivel excluir.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <section className="panel-section p-5">
        <p className="panel-eyebrow">Imagens da hero</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <h3 className="text-[24px] font-black text-[var(--panel-ink)]">Banners publicados</h3>
          <button
            type="button"
            onClick={openCreateHome}
            className="rounded-full bg-[var(--panel-primary)] px-5 py-3 text-sm font-black text-[var(--panel-on-primary)]"
          >
            Adicionar imagem
          </button>
        </div>
        <div className="mt-5 flex gap-4 overflow-x-auto pb-3">
          {content.homeImages.map((item, index) => (
            <article
              key={item.id}
              className="min-w-[320px] rounded-[8px] border border-[var(--panel-line)] bg-[var(--panel-card)] p-4"
            >
              <div className="h-36 overflow-hidden rounded-[8px] bg-[var(--panel-head)]">
                <img
                  src={item.desktopSrc}
                  alt={item.alt}
                  className="block h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="mt-3 flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-lg font-black text-[var(--panel-ink)]">{item.alt}</h4>
                  <p className="text-sm text-[var(--panel-muted)]">
                    {item.active ? "Publicado" : "Oculto"}
                  </p>
                  <p className="text-xs text-[var(--panel-muted)]">
                    {item.href?.trim() ? "Com link" : "Sem link"}
                  </p>
                </div>
                <span className="rounded-full bg-[var(--panel-head)] px-3 py-1 text-xs font-black text-[var(--panel-ok)]">
                  #{item.sortOrder}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <MoveButtons
                  onMoveUp={() => moveItem("home", item.id, "up")}
                  onMoveDown={() => moveItem("home", item.id, "down")}
                  canMoveUp={index > 0}
                  canMoveDown={index < content.homeImages.length - 1}
                  busy={movingKey?.startsWith(`home:${item.id}:`) ?? false}
                />
                <button
                  type="button"
                  onClick={() => openEditHome(item)}
                  className="rounded-full border border-[var(--panel-line)] px-4 py-2 text-xs font-black text-[var(--panel-ink)]"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDeleteTarget({
                      section: "home",
                      id: item.id,
                      title: item.alt,
                    })
                  }
                  className="rounded-full border border-[var(--panel-resch-bg)] px-4 py-2 text-xs font-black text-[var(--panel-resch)]"
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
          section="attraction"
          title="Atracoes"
          buttonLabel="Adicionar atracao"
          items={content.attractions}
          movingKey={movingKey}
          onEdit={(item) => setEditing({ section: "attraction", item })}
          onCreate={() => setEditing({ section: "attraction", item: null })}
          onDelete={(item) =>
            setDeleteTarget({
              section: "attraction",
              id: item.id,
              title: item.title,
            })
          }
          onMove={(id, direction) => moveItem("attraction", id, direction)}
        />
        <ContentList
          section="event"
          title="Eventos"
          buttonLabel="Novo evento"
          items={content.events}
          movingKey={movingKey}
          onEdit={openEditEvent}
          onCreate={openCreateEvent}
          onDelete={(item) =>
            setDeleteTarget({ section: "event", id: item.id, title: item.title })
          }
          onMove={(id, direction) => moveItem("event", id, direction)}
        />
      </section>

      <PainelModal
        title={editing ? itemTitle(editing) : ""}
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
      >
        {editing?.section === "event" && editing.item ? (
          <OperationalEventEditor key={editing.item.id} event={editing.item} products={content.products} presentation="modal" onSaved={() => {setEditing(null); router.replace("/painel/site"); router.refresh();}} />
        ) : editing ? (
          <form onSubmit={submitForm} className="grid gap-4">
            <input type="hidden" name="section" value={editing.section} />
            {editing.item ? <input type="hidden" name="id" value={editing.item.id} /> : null}
            {editing.section === "home" ? (
              <>
                <Field label="Texto da imagem">
                  <input
                    name="alt"
                    defaultValue={editing.item?.alt ?? ""}
                    className="rounded-[8px] border border-[var(--panel-line)] px-4 py-3"
                  />
                </Field>

                <div className="grid gap-3 rounded-[10px] border border-[var(--panel-line)] bg-[var(--panel-bg)] p-4">
                  <div>
                    <p className="text-sm font-black text-[var(--panel-ink)]">Link da hero</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--panel-muted)]">
                      Defina se essa imagem da hero pode ser clicada na home.
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setHomeHeroMode("with-link")}
                      className={`rounded-[8px] border px-4 py-3 text-sm font-black ${
                        homeHeroMode === "with-link"
                          ? "border-[var(--panel-primary)] bg-[var(--panel-primary)] text-[var(--panel-on-primary)]"
                          : "border-[var(--panel-line)] bg-[var(--panel-card)] text-[var(--panel-ink)]"
                      }`}
                    >
                      Com link
                    </button>
                    <button
                      type="button"
                      onClick={() => setHomeHeroMode("without-link")}
                      className={`rounded-[8px] border px-4 py-3 text-sm font-black ${
                        homeHeroMode === "without-link"
                          ? "border-[var(--panel-primary)] bg-[var(--panel-primary)] text-[var(--panel-on-primary)]"
                          : "border-[var(--panel-line)] bg-[var(--panel-card)] text-[var(--panel-ink)]"
                      }`}
                    >
                      Sem link
                    </button>
                  </div>
                </div>

                {homeHeroMode === "with-link" ? (
                  <Field label="Link da hero">
                    <input
                      name="hrefVisible"
                      value={homeHeroHrefValue}
                      onChange={(event) => setHomeHeroHrefValue(event.target.value)}
                      placeholder="https://site.com.br ou /pagina"
                      className="rounded-[8px] border border-[var(--panel-line)] px-4 py-3"
                    />
                  </Field>
                ) : null}

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
                {(() => {
                  const limits = resolveTextLimits(editing.section);

                  return (
                    <>
                      <Field label="Titulo">
                        <div className="grid gap-2">
                          <input
                            name="title"
                            maxLength={limits.title}
                            defaultValue={editing.item?.title ?? ""}
                            className="rounded-[8px] border border-[var(--panel-line)] px-4 py-3"
                          />
                          <p className="text-xs font-medium text-[var(--panel-muted)]">
                            Maximo de {limits.title} caracteres para manter o layout correto.
                          </p>
                        </div>
                      </Field>

                      <Field label="Descricao">
                        <div className="grid gap-2">
                          <textarea
                            name="description"
                            maxLength={limits.description}
                            defaultValue={editing.item?.description ?? ""}
                            rows={4}
                            className="rounded-[8px] border border-[var(--panel-line)] px-4 py-3"
                          />
                          <p className="text-xs font-medium text-[var(--panel-muted)]">
                            Maximo de {limits.description} caracteres para manter a imagem e o texto equilibrados no site.
                          </p>
                        </div>
                      </Field>
                    </>
                  );
                })()}

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

            <label className="flex items-center gap-2 text-sm font-black text-[var(--panel-ink)]">
              <input
                name="active"
                type="checkbox"
                defaultChecked={editing.item?.active ?? true}
              />{" "}
              Publicar
            </label>

            {error ? (
              <p className="rounded-[8px] border border-[var(--panel-resch)] bg-[var(--panel-resch-bg)] px-4 py-3 text-sm text-[var(--panel-resch)]">
                {error}
              </p>
            ) : null}
            <SubmitButton pending={pending} />
          </form>
        ) : null}
      </PainelModal>

      <PainelModal
        title="Confirmar exclusao"
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
      >
        <p className="text-sm leading-7 text-[var(--panel-muted)]">
          Tem certeza que deseja excluir <strong>{deleteTarget?.title}</strong>?
        </p>
        {deleteTarget?.section === "event" && content.events.find(item => item.id === deleteTarget.id)?.href.includes("date=") ? <p className="mt-3 text-sm text-[var(--panel-muted)]">A data será fechada. As compras e os vouchers serão preservados.</p> : null}
        {error ? (
          <p className="mt-3 rounded-[8px] border border-[var(--panel-resch)] bg-[var(--panel-resch-bg)] px-4 py-3 text-sm text-[var(--panel-resch)]">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={confirmDelete}
            disabled={pending}
            className="rounded-full bg-[#b24239] px-5 py-3 text-sm font-black text-[var(--panel-on-primary)] disabled:opacity-60"
          >
            {pending ? "Excluindo..." : "Excluir"}
          </button>
          <button
            type="button"
            onClick={() => setDeleteTarget(null)}
            className="rounded-full border border-[var(--panel-line)] px-5 py-3 text-sm font-black text-[var(--panel-ink)]"
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
    <label className="grid gap-2 text-sm font-semibold text-[var(--panel-ink)]">
      {label}
      {children}
    </label>
  );
}

function ContentList<T extends ManagedAttraction | ManagedEvent>({
  section,
  title,
  buttonLabel,
  items,
  movingKey,
  onEdit,
  onCreate,
  onDelete,
  onMove,
}: {
  section: "attraction" | "event";
  title: string;
  buttonLabel: string | null;
  items: T[];
  movingKey: string | null;
  onEdit: (item: T) => void;
  onCreate: () => void;
  onDelete: (item: T) => void;
  onMove: (id: string, direction: "up" | "down") => void;
}) {
  return (
    <article className="panel-section p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="panel-eyebrow">{title}</p>
        {buttonLabel ? (
          <button
            type="button"
            onClick={onCreate}
            className="rounded-full bg-[var(--panel-primary)] px-5 py-3 text-sm font-black text-[var(--panel-on-primary)]"
          >
            {buttonLabel}
          </button>
        ) : null}
      </div>
      <div className="mt-5 grid max-h-[520px] gap-3 overflow-y-auto pr-2">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="rounded-[10px] border border-[var(--panel-line)] bg-[var(--panel-card)] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-black text-[var(--panel-ink)]">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--panel-muted)]">{item.description}</p>
              </div>
              <span className="rounded-full bg-[var(--panel-head)] px-3 py-1 text-xs font-black text-[var(--panel-ok)]">
                #{item.sortOrder}
              </span>
            </div>
            {"buttonLabel" in item ? (
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-[var(--panel-ink)]">
                <span className="calendar-chip">{item.href.match(/(?:\?|&)date=(\d{4}-\d{2}-\d{2})(?:&|$)/) ? `Data do site · ${item.href.match(/(?:\?|&)date=(\d{4}-\d{2}-\d{2})(?:&|$)/)?.[1]?.split("-").reverse().join("/")}` : "Link externo"}</span>
                <span className="calendar-chip">{item.pageEnabled ? "Com página":"Sem página"}</span>
                <span className="calendar-chip">Botão: {item.buttonLabel}</span>
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <MoveButtons
                onMoveUp={() => onMove(item.id, "up")}
                onMoveDown={() => onMove(item.id, "down")}
                canMoveUp={index > 0}
                canMoveDown={index < items.length - 1}
                busy={movingKey?.startsWith(`${section}:${item.id}:`) ?? false}
              />
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="rounded-full border border-[var(--panel-line)] px-4 py-2 text-xs font-black text-[var(--panel-ink)]"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => onDelete(item)}
                className="rounded-full border border-[var(--panel-resch-bg)] px-4 py-2 text-xs font-black text-[var(--panel-resch)]"
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
