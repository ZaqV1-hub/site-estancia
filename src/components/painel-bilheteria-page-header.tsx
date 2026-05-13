import Image from "next/image";
import Link from "next/link";
import {
  getLegacyPanelContract,
  type LegacyPanelScreenContract,
} from "@/lib/legacy-panel-contracts";

type Props = {
  title: string;
  description: string;
  current?:
    | "overview"
    | "indicators"
    | "reservations"
    | "history"
    | "sales"
    | "finalize"
    | "reservation-payment"
    | "cash-fund"
    | "cash-closure"
    | "cash-closure-history"
    | "cash-closure-edits";
  screen?: LegacyPanelScreenContract["screenId"];
  isManager: boolean;
  actorName?: string | null;
};

function getCurrentDateLabel() {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function resolveScreenId(props: Props) {
  if (props.screen) {
    return props.screen;
  }

  switch (props.current) {
    case "history":
      return "bilheteria-history";
    case "sales":
      return "bilheteria-sales";
    case "finalize":
      return "bilheteria-finalize";
    case "reservation-payment":
      return "bilheteria-reservation-payment";
    case "cash-fund":
      return "bilheteria-cash-fund";
    case "cash-closure":
      return "bilheteria-cash-closure";
    case "cash-closure-history":
      return "bilheteria-cash-closure-history";
    case "cash-closure-edits":
      return "bilheteria-cash-closure-edits";
    default:
      return "bilheteria-index";
  }
}

function resolveActiveKeys(screen: LegacyPanelScreenContract["screenId"]) {
  switch (screen) {
    case "bilheteria-index":
      return ["ticket-lookup"];
    case "bilheteria-sales":
      return ["sales"];
    case "bilheteria-history":
      return ["history", "back-to-workstation"];
    case "bilheteria-cash-fund":
      return ["cash-fund"];
    case "bilheteria-cash-closure":
      return ["cash-closure"];
    case "bilheteria-cash-closure-history":
      return ["cash-closure-history", "cash-closure"];
    case "bilheteria-cash-closure-edits":
      return ["cash-closure-edits", "cash-closure"];
    default:
      return [];
  }
}

function legacyActionClasses(active: boolean) {
  return active
    ? "border-[#d3e2ef] bg-[#eef6fc] text-[#1f5378]"
    : "border-[#d5dde5] bg-white text-[#1f5378] hover:bg-[#f6fbff]";
}

export function PainelBilheteriaPageHeader({
  title,
  description,
  current,
  screen,
  isManager,
  actorName = null,
}: Props) {
  const screenId = resolveScreenId({
    title,
    description,
    current,
    screen,
    isManager,
    actorName,
  });
  const actions = (getLegacyPanelContract(screenId)?.header.actions ?? []).filter(
    (action) => !action.managerOnly || isManager,
  );
  const activeKeys = new Set(resolveActiveKeys(screenId));
  const primaryActions = actions.filter((action) =>
    [
      "sales",
      "cash-closure",
      "cash-fund",
      "history",
      "cash-closure-history",
      "cash-closure-edits",
    ].includes(action.key ?? ""),
  );
  const secondaryActions = actions.filter(
    (action) => !primaryActions.some((item) => item.key === action.key),
  );

  return (
    <header className="overflow-hidden rounded-[6px] border border-[#4f88b0] bg-[linear-gradient(180deg,#3e9ce1_0%,#2a6f9f_58%,#245f88_100%)] px-6 py-6 text-white shadow-[0_12px_24px_rgba(32,90,127,0.2)]">
      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)_560px] xl:items-start">
        <div className="flex items-center">
          <Image
            alt="Estancia"
            className="h-auto max-w-[280px] drop-shadow-[0_10px_18px_rgba(0,0,0,0.26)]"
            height={155}
            src="/brand/rincao-logo.png"
            width={360}
          />
        </div>

        <div className="pt-2">
          <p className="text-[14px] font-semibold uppercase tracking-[0.08em] text-white/92">
            {title === "Bilheteria" ? "Bilheteria hoje:" : title}
          </p>
          <h1 className="mt-2 text-[36px] font-light capitalize leading-none text-white xl:text-[58px]">
            {title === "Bilheteria" ? getCurrentDateLabel() : title}
          </h1>
          <p className="mt-3 max-w-[58ch] text-sm leading-6 text-white/84">
            {description}
          </p>
        </div>

        <div className="grid gap-3 xl:justify-items-end">
          <div className="flex flex-wrap gap-3 xl:justify-end">
            {primaryActions.map((action) => (
              <Link
                key={action.key ?? action.href}
                href={action.href}
                className={`inline-flex min-h-[42px] items-center justify-center rounded-full border px-6 py-2.5 text-center text-[15px] font-bold uppercase tracking-[0.01em] shadow-[0_3px_0_rgba(0,0,0,0.18)] transition ${legacyActionClasses(
                  activeKeys.has(action.key ?? ""),
                )}`}
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
              key={action.key ?? action.href}
              href={action.href}
              className={`inline-flex min-h-[42px] items-center justify-center rounded-full border px-6 py-2.5 text-center text-[15px] font-bold uppercase tracking-[0.01em] shadow-[0_3px_0_rgba(0,0,0,0.18)] transition ${legacyActionClasses(
                activeKeys.has(action.key ?? ""),
              )}`}
            >
              {action.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4 text-right text-[15px] text-white/88">
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
