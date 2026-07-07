import Link from "next/link";
import type { ManagedEvent } from "@/lib/estancia-content-store";
import {
  resolveManagedEventPageTitle,
  resolveManagedEventPurchaseHref,
} from "@/lib/estancia-event-pages";

function ActionLink({
  href,
  children,
  primary = false,
}: {
  href: string;
  children: React.ReactNode;
  primary?: boolean;
}) {
  const className = primary
    ? "inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#1a6b3a] px-8 text-center text-[0.95rem] font-black text-white shadow-[0_16px_28px_rgba(26,107,58,0.24)] transition hover:-translate-y-0.5 hover:bg-[#145630]"
    : "inline-flex min-h-[52px] items-center justify-center rounded-full border border-[#cfe1d3] bg-white px-8 text-center text-[0.95rem] font-black text-[#17342d] transition hover:-translate-y-0.5 hover:border-[#1a6b3a]";

  if (/^https?:\/\//i.test(href)) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function renderTextBlocks(content: string) {
  return content
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, index) => {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length > 0 && lines.every((line) => /^[-*]\s+/.test(line))) {
        return (
          <ul key={`list-${index}`} className="space-y-2 pl-5 text-[15px] leading-8 text-[#355148]">
            {lines.map((line) => (
              <li key={line} className="list-disc">
                {line.replace(/^[-*]\s+/, "")}
              </li>
            ))}
          </ul>
        );
      }

      return (
        <p
          key={`paragraph-${index}`}
          className="whitespace-pre-line text-[15px] leading-8 text-[#355148]"
        >
          {lines.join("\n")}
        </p>
      );
    });
}

export function ManagedEventPage({ event }: { event: ManagedEvent }) {
  const pageTitle = resolveManagedEventPageTitle(event);
  const pageContent = String(event.pageContent ?? "").trim();
  const summary = String(event.description ?? "").trim();
  const purchaseHref = resolveManagedEventPurchaseHref(event);

  return (
    <section className="w-full bg-[#f5f8f2]">
      <div className="bg-[linear-gradient(135deg,#17342d_0%,#1f4a3f_100%)]">
        <div className="mx-auto w-full max-w-[1240px] px-5 pb-24 pt-36 text-left text-white md:px-8 lg:pb-28 lg:pt-44">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.24em] text-[#c8dfcf]">
              Agenda
            </p>
            <h1 className="mt-4 text-[clamp(2.8rem,6vw,5rem)] font-black leading-[0.92] text-white">
              {pageTitle}
            </h1>
            {summary ? (
              <p className="mt-6 max-w-[720px] text-[1.05rem] leading-8 text-[#e4efe7]">
                {summary}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1240px] px-5 py-12 md:px-8 md:py-16">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <article className="rounded-[28px] border border-[#d8e5d8] bg-white p-6 shadow-[0_22px_48px_rgba(23,52,45,0.08)] md:p-8">
            <p className="text-[12px] font-bold uppercase tracking-[0.24em] text-[#6d9778]">
              Descrição
            </p>
            <h2 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-black leading-[0.95] text-[#17342d]">
              Descrição
            </h2>
            <div className="mt-6 space-y-5">
              {pageContent ? (
                renderTextBlocks(pageContent)
              ) : (
                <p className="text-[15px] leading-8 text-[#355148]">
                  Este evento ainda não possui uma descrição completa publicada.
                </p>
              )}
            </div>
          </article>

          <aside className="space-y-6">
            <div className="rounded-[28px] border border-[#d8e5d8] bg-white p-6 shadow-[0_18px_42px_rgba(23,52,45,0.08)]">
              <p className="text-[12px] font-bold uppercase tracking-[0.24em] text-[#6d9778]">
                Informações rápidas
              </p>
              <div className="mt-5 space-y-4">
                <div className="rounded-[18px] bg-[#f4f8f2] px-4 py-4">
                  <strong className="block text-[0.92rem] font-black uppercase tracking-[0.12em] text-[#1f6b3b]">
                    Resumo
                  </strong>
                  <p className="mt-2 text-[15px] leading-7 text-[#355148]">
                    {summary || "Resumo não informado."}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <ActionLink href={purchaseHref} primary>
                  Comprar ingressos!
                </ActionLink>
                <ActionLink href="/agenda">Voltar para agenda</ActionLink>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
