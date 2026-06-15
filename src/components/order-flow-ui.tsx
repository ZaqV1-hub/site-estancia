"use client";

import Link from "next/link";

export type OrderFlowStep = "date" | "passports" | "addons" | "payment";

const steps: Array<{ key: OrderFlowStep; label: string }> = [
  { key: "date", label: "Data" },
  { key: "passports", label: "Passaportes" },
  { key: "addons", label: "Adicionais" },
  { key: "payment", label: "Pagamento" },
];

const stepIndex: Record<OrderFlowStep, number> = {
  date: 0,
  passports: 1,
  addons: 2,
  payment: 3,
};

export function FlowStepper({ current }: { current: OrderFlowStep }) {
  const activeIndex = stepIndex[current];

  return (
    <nav aria-label="Etapas da compra" className="mx-auto w-full max-w-[760px]">
      <ol className="relative grid grid-cols-4 gap-0">
        <span className="absolute left-[12.5%] right-[12.5%] top-[22px] h-px bg-[#d5d8d3]" />
        <span
          className="absolute left-[12.5%] top-[22px] h-px bg-[#25a524] transition-all"
          style={{ width: `${Math.max(activeIndex, 0) * 25}%` }}
        />
        {steps.map((step, index) => {
          const isActive = step.key === current;
          const isDone = index < activeIndex;

          return (
            <li key={step.key} className="relative flex flex-col items-center gap-2 text-center">
              <span
                className={`grid h-11 w-11 place-items-center rounded-full border text-[18px] font-black shadow-[0_10px_22px_rgba(18,52,45,0.06)] ${
                  isActive
                    ? "border-[#063f35] bg-[#063f35] text-white"
                    : isDone
                      ? "border-[#25a524] bg-white text-[#063f35]"
                      : "border-[#cfd4cf] bg-white text-[#6b6f72]"
                }`}
              >
                {index + 1}
              </span>
              <span
                className={`text-[13px] font-bold sm:text-[15px] ${
                  isActive ? "text-[#073f35]" : "text-[#6e7175]"
                }`}
              >
                {index + 1}. {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function FlowIcon({
  name,
  className = "",
}: {
  name: "calendar" | "bag" | "cart" | "user" | "shield" | "leaf" | "lock";
  className?: string;
}) {
  const common = {
    className,
    width: 28,
    height: 28,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "calendar") {
    return (
      <svg {...common}>
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18" />
      </svg>
    );
  }

  if (name === "bag") {
    return (
      <svg {...common}>
        <path d="M6 8h12l-1 13H7L6 8Z" />
        <path d="M9 8a3 3 0 0 1 6 0" />
      </svg>
    );
  }

  if (name === "cart") {
    return (
      <svg {...common}>
        <path d="M4 5h2l2 11h10l2-7H8" />
        <circle cx="10" cy="20" r="1" />
        <circle cx="18" cy="20" r="1" />
      </svg>
    );
  }

  if (name === "user") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    );
  }

  if (name === "shield") {
    return (
      <svg {...common}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-5" />
      </svg>
    );
  }

  if (name === "leaf") {
    return (
      <svg {...common}>
        <path d="M5 19c10 0 14-8 14-14-6 0-14 4-14 14Z" />
        <path d="M5 19c3-5 7-8 12-10" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function IconBubble({
  name,
  className = "",
}: {
  name: Parameters<typeof FlowIcon>[0]["name"];
  className?: string;
}) {
  return (
    <span
      className={`grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#eaf3e5] text-[#073f35] ${className}`}
    >
      <FlowIcon name={name} />
    </span>
  );
}

export function PrimaryFlowButton({
  children,
  href,
  onClick,
  disabled = false,
  type = "button",
  className = "",
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const content = (
    <>
      <span>{children}</span>
      <span className="text-[34px] leading-none">›</span>
    </>
  );
  const classes = `inline-flex min-h-[58px] w-full items-center justify-center gap-4 rounded-[18px] bg-[#20aa1f] px-6 text-center text-[18px] font-black text-white shadow-[0_18px_34px_rgba(32,170,31,0.18)] transition hover:bg-[#178b17] disabled:cursor-not-allowed disabled:bg-[#8bcf89] sm:text-[22px] ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes}>
      {content}
    </button>
  );
}

