import Image from "next/image";
import Link from "next/link";
import { formatBilheteriaCashDateLong } from "@/lib/bilheteria-cash-view-model";

type Action = {
  href: string;
  label: string;
};

type Props = {
  actorName?: string | null;
  primaryActions: Action[];
  secondaryActions?: Action[];
};

export function BilheteriaCashHeader({
  actorName = null,
  primaryActions,
  secondaryActions = [],
}: Props) {
  return (
    <header className="overflow-hidden rounded-[6px] border border-[#4f88b0] bg-[linear-gradient(180deg,#3e9ce1_0%,#2a6f9f_58%,#245f88_100%)] px-6 py-6 text-white shadow-[0_12px_24px_rgba(32,90,127,0.2)]">
      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)_480px] xl:items-start">
        <div className="flex items-center">
          <Image
            alt="Clube Rincao"
            className="h-auto max-w-[280px] drop-shadow-[0_10px_18px_rgba(0,0,0,0.26)]"
            height={155}
            src="/brand/rincao-logo.png"
            width={360}
          />
        </div>

        <div className="pt-1">
          <p className="text-[14px] font-semibold uppercase tracking-[0.08em] text-white/92">
            Bilheteria hoje:
          </p>
          <h1 className="mt-2 text-[36px] font-light capitalize leading-none text-white xl:text-[58px]">
            {formatBilheteriaCashDateLong()}
          </h1>
        </div>

        <div className="grid gap-3 xl:justify-items-end">
          <div className="flex flex-wrap gap-3 xl:justify-end">
            {primaryActions.map((action) => (
              <Link
                key={`${action.href}-${action.label}`}
                href={action.href}
                className="inline-flex min-h-[42px] items-center justify-center rounded-full border border-[#d5dde5] bg-white px-6 py-2.5 text-center text-[15px] font-bold uppercase tracking-[0.01em] text-[#1f5378] shadow-[0_3px_0_rgba(0,0,0,0.18)]"
              >
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-white/20 pt-5">
        <div className="flex flex-wrap gap-3">
          {secondaryActions.map((action) => (
            <Link
              key={`${action.href}-${action.label}`}
              href={action.href}
              className="inline-flex min-h-[42px] items-center justify-center rounded-full border border-[#d5dde5] bg-white px-6 py-2.5 text-center text-[15px] font-bold uppercase tracking-[0.01em] text-[#1f5378] shadow-[0_3px_0_rgba(0,0,0,0.18)]"
            >
              {action.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4 text-right text-[15px] text-white/85">
          <div>
            <span>Logado como: </span>
            <span className="font-semibold text-white">
              {actorName || "Sessao operacional"}
            </span>
          </div>
          <Link
            href="/painel/login"
            className="inline-flex min-h-[42px] items-center justify-center rounded-[4px] border border-[#f3d6d6] bg-white px-5 py-2 text-sm font-bold text-[#d03939] shadow-[0_3px_0_rgba(0,0,0,0.18)]"
          >
            Sair
          </Link>
        </div>
      </div>
    </header>
  );
}
