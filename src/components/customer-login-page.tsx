"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useTransition } from "react";
import { IngressoShell } from "@/components/ingresso-shell";
import { formatCpf } from "@/lib/cpf";
import type {
  AuthErrorResponse,
  AuthLoginResponse,
} from "@/lib/auth-contracts";

type CustomerLoginPageProps = {
  redirectTo: string;
  initialError?: string | null;
};

export type CustomerLoginPhase = "idle" | "submitting" | "redirecting";

type CustomerLoginFeedback = {
  buttonLabel: string;
  statusTitle: string;
  statusDescription: string;
};

type CustomerLoginRouter = {
  replace: (href: string) => void;
  refresh?: () => void;
};

async function readResponseBody<T>(response: Response) {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function getCustomerLoginFeedback(
  phase: CustomerLoginPhase,
): CustomerLoginFeedback {
  if (phase === "submitting") {
    return {
      buttonLabel: "Validando acesso...",
      statusTitle: "Entrando na sua conta",
      statusDescription:
        "Estamos validando suas credenciais e preparando a area do cliente.",
    };
  }

  if (phase === "redirecting") {
    return {
      buttonLabel: "Abrindo area do cliente...",
      statusTitle: "Login concluido",
      statusDescription:
        "Redirecionando voce para a pagina solicitada.",
    };
  }

  return {
    buttonLabel: "Entrar",
    statusTitle: "",
    statusDescription: "",
  };
}

export function navigateAfterCustomerLogin(
  router: CustomerLoginRouter,
  redirectTo: string,
) {
  router.replace(redirectTo);
}

export function CustomerLoginPage({
  redirectTo,
  initialError = null,
}: CustomerLoginPageProps) {
  const router = useRouter();
  const [isNavigating, startTransition] = useTransition();
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [phase, setPhase] = useState<CustomerLoginPhase>("idle");
  const activePhase = isNavigating && phase === "idle" ? "redirecting" : phase;
  const feedback = getCustomerLoginFeedback(activePhase);
  const isBusy = activePhase !== "idle";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let keepBusy = false;

    setPhase("submitting");
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          login: cpf,
          senha: password,
        }),
      });

      const payload = await readResponseBody<
        AuthLoginResponse | AuthErrorResponse
      >(response);

      if (!response.ok || !payload?.ok) {
        setError(
          payload && !payload.ok
            ? payload.error.message
            : "Nao foi possivel entrar agora.",
        );
        return;
      }

      keepBusy = true;
      setPhase("redirecting");
      startTransition(() => {
        navigateAfterCustomerLogin(router, redirectTo);
      });
    } catch (requestError) {
      console.error("customer-login-submit-failed", requestError);
      setError("Nao foi possivel entrar agora.");
    } finally {
      if (!keepBusy) {
        setPhase("idle");
      }
    }
  }

  return (
    <IngressoShell active="auth">
      <div className="mx-auto w-full max-w-[760px] px-4 pt-8 md:px-6">
        <div className="rounded-[30px] border border-[#d8e6f0] bg-white p-7 text-left shadow-[0_18px_48px_rgba(17,66,97,0.11)]">
          <h2 className="legacy-rounded text-[27px] leading-tight text-[#1c5a80]">
            Login do cliente
          </h2>
          <p className="mt-3 text-sm leading-7 text-[#4d6477]">
            Informe o CPF e a senha que voce ja usa no ambiente de ingressos.
          </p>

          <form
            className="mt-6 space-y-4"
            method="post"
            action="/api/auth/login"
            onSubmit={handleSubmit}
            aria-busy={isBusy}
          >
            <label className="block">
              <span className="legacy-rounded text-[13px] uppercase tracking-[0.16em] text-[#658098]">
                CPF
              </span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="username"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(event) => setCpf(formatCpf(event.target.value))}
                disabled={isBusy}
                className="mt-2 w-full rounded-[22px] border border-[#c9d7e3] bg-[#f7fbfe] px-4 py-3 text-[15px] text-[#214d6b] outline-none transition focus:border-[#3498db] focus:bg-white focus:ring-2 focus:ring-[#d2ecfb]"
              />
            </label>

            <label className="block">
              <span className="legacy-rounded text-[13px] uppercase tracking-[0.16em] text-[#658098]">
                Senha
              </span>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="Sua senha"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isBusy}
                className="mt-2 w-full rounded-[22px] border border-[#c9d7e3] bg-[#f7fbfe] px-4 py-3 text-[15px] text-[#214d6b] outline-none transition focus:border-[#3498db] focus:bg-white focus:ring-2 focus:ring-[#d2ecfb]"
              />
            </label>

            <input type="hidden" name="redirect" value={redirectTo} />

            {isBusy ? (
              <div
                role="status"
                aria-live="polite"
                className="flex items-start gap-3 rounded-[22px] border border-[#cde1ef] bg-[#f4fbff] px-4 py-3 text-sm text-[#1c5a80]"
              >
                <span
                  aria-hidden="true"
                  className="mt-0.5 inline-block h-4 w-4 shrink-0 rounded-full border-2 border-[#3498db] border-t-transparent animate-spin"
                />
                <div>
                  <p className="font-semibold">{feedback.statusTitle}</p>
                  <p className="mt-1 text-[#4d6477]">{feedback.statusDescription}</p>
                </div>
              </div>
            ) : null}

            <div className="text-right text-sm">
              <Link href="/login/esqueci" className="font-semibold text-[#246b99] underline">
                esqueci minha senha
              </Link>
            </div>

            {error ? (
              <div className="rounded-[20px] border border-[#efc3c3] bg-[#fff3f1] px-4 py-3 text-sm text-[#9f3f36]">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isBusy}
              className="legacy-rounded inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[999px] bg-[#3498db] px-5 py-3 text-[15px] text-white shadow-[0_12px_25px_rgba(52,152,219,0.24)] hover:bg-[#246b99] disabled:cursor-wait disabled:bg-[#8abfe7]"
            >
              {isBusy ? (
                <span
                  aria-hidden="true"
                  className="inline-block h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"
                />
              ) : null}
              {feedback.buttonLabel}
            </button>
          </form>

          <div className="mt-5 rounded-[22px] border border-[#d8e6f0] bg-[#f7fbfe] px-4 py-4 text-sm text-[#4d6477]">
            <p>
              Ainda nao tem cadastro?
              {" "}
              <Link
                href={`/cadastro?redirect=${encodeURIComponent(redirectTo)}`}
                className="font-semibold text-[#246b99] underline"
              >
                Criar conta
              </Link>
            </p>
          </div>
        </div>
      </div>
    </IngressoShell>
  );
}
