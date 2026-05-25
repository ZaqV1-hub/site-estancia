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

function actionClasses(active: boolean) {
  return active
    ? "panel-button"
    : "panel-button-secondary";
}

export function PainelBilheteriaPageHeader({
  title,
  description,
  current,
  screen,
  isManager,
}: Props) {
  const screenId = resolveScreenId({
    title,
    description,
    current,
    screen,
    isManager,
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
    <header className="panel-section flex flex-wrap items-center justify-between gap-4 px-5 py-4">
      <div>
          <p className="panel-eyebrow">Bilheteria</p>
          <h1 className="text-[24px] font-black capitalize leading-tight text-[#17351f]">
            {title === "Bilheteria" ? getCurrentDateLabel() : title}
          </h1>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
          {[...secondaryActions, ...primaryActions].map((action) => (
          <Link
            key={action.key ?? action.href}
            href={action.href}
            className={actionClasses(
                activeKeys.has(action.key ?? ""),
              )}
          >
            {action.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
