"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

async function readResponseBody<T>(response: Response) {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

type ApiError = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
};

export function PainelForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccessEmail(null);

    try {
      const response = await fetch("/api/painel/password-reset/request", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });
      const payload = await readResponseBody<
        | {
            ok: true;
            data: {
              sent: true;
              email: string;
            };
          }
        | ApiError
      >(response);

      if (!response.ok || !payload?.ok) {
        setError(
          payload && !payload.ok
            ? payload.error.message
            : "Nao foi possivel processar a recuperacao agora.",
        );
        return;
      }

      setSuccessEmail(payload.data.email);
    } catch (requestError) {
      console.error("painel-password-reset-request-submit-failed", requestError);
      setError("Nao foi possivel processar a recuperacao agora.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="min-h-screen bg-[#eef4f8] px-4 py-8 md:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-[980px] items-center gap-6 lg:grid-cols-[1fr_420px]">
        <div className="rounded-[26px] border border-[#d4e1ea] bg-white px-8 py-10 shadow-[0_18px_40px_rgba(16,41,58,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#6f8798]">
            Painel
          </p>
          <h1 className="legacy-condensed mt-3 text-5xl text-[#1f567a]">
            Esqueci minha senha
          </h1>
          <p className="mt-5 max-w-[56ch] text-sm leading-7 text-[#5f7586]">
            Informe o e-mail cadastrado no usuario interno do painel para gerar
            um ticket de troca de senha.
          </p>
        </div>

        <div className="rounded-[26px] border border-[#cddbe5] bg-white p-8 shadow-[0_22px_52px_rgba(16,41,58,0.12)]">
          <h2 className="legacy-condensed text-4xl text-[#205a7f]">Recuperar senha</h2>

          {successEmail ? (
            <div className="mt-4 rounded-xl border border-[#c9e3c5] bg-[#f3fff1] px-4 py-3 text-sm text-[#3d6940]">
              Uma nova instrucao foi enviada para o e-mail <strong>{successEmail}</strong>.
            </div>
          ) : (
            <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
              <label className="flex flex-col gap-2 text-sm font-semibold text-[#35576f]">
                E-mail
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="voce@dominio.com"
                  className="min-h-[48px] rounded-xl border border-[#c7d6e2] bg-[#f7fbfe] px-4 py-3 text-sm font-normal text-[#214d6b]"
                />
              </label>

              {error ? (
                <div className="rounded-xl border border-[#efc3c3] bg-[#fff3f1] px-4 py-3 text-sm text-[#9f3f36]">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={pending}
                className="min-h-[48px] rounded-full bg-[#246b99] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {pending ? "Enviando..." : "Enviar"}
              </button>
            </form>
          )}

          <div className="mt-4 text-sm">
            <Link
              href="/painel/login"
              className="font-semibold text-[#246b99] hover:text-[#1c577e]"
            >
              retornar para o login
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

type PainelResetPasswordPageProps = {
  ticket: string;
  initialValid: boolean;
};

export function PainelResetPasswordPage({
  ticket,
  initialValid,
}: PainelResetPasswordPageProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(
    initialValid ? null : "Ticket para troca de senha invalido.",
  );
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!initialValid) {
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/painel/password-reset/tickets/${encodeURIComponent(ticket)}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            senha: password,
            csenha: confirmPassword,
          }),
        },
      );
      const payload = await readResponseBody<
        | {
            ok: true;
            data: {
              changed: true;
            };
          }
        | ApiError
      >(response);

      if (!response.ok || !payload?.ok) {
        setError(
          payload && !payload.ok
            ? payload.error.message
            : "Nao foi possivel alterar a senha agora.",
        );
        return;
      }

      setSuccess(true);
      router.refresh();
    } catch (requestError) {
      console.error("painel-password-reset-ticket-submit-failed", requestError);
      setError("Nao foi possivel alterar a senha agora.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="min-h-screen bg-[#eef4f8] px-4 py-8 md:px-6">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-[980px] items-center gap-6 lg:grid-cols-[1fr_420px]">
        <div className="rounded-[26px] border border-[#d4e1ea] bg-white px-8 py-10 shadow-[0_18px_40px_rgba(16,41,58,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#6f8798]">
            Painel
          </p>
          <h1 className="legacy-condensed mt-3 text-5xl text-[#1f567a]">
            Trocar senha
          </h1>
          <p className="mt-5 max-w-[56ch] text-sm leading-7 text-[#5f7586]">
            Utilize o ticket recebido por e-mail para definir uma nova senha de acesso.
          </p>
        </div>

        <div className="rounded-[26px] border border-[#cddbe5] bg-white p-8 shadow-[0_22px_52px_rgba(16,41,58,0.12)]">
          <h2 className="legacy-condensed text-4xl text-[#205a7f]">Nova senha</h2>

          {success ? (
            <div className="mt-4 rounded-xl border border-[#c9e3c5] bg-[#f3fff1] px-4 py-3 text-sm text-[#3d6940]">
              Sua senha foi alterada com sucesso. Utilize-a para acessar o painel.
            </div>
          ) : (
            <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
              <label className="flex flex-col gap-2 text-sm font-semibold text-[#35576f]">
                Nova senha
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  maxLength={120}
                  className="min-h-[48px] rounded-xl border border-[#c7d6e2] bg-[#f7fbfe] px-4 py-3 text-sm font-normal text-[#214d6b]"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-semibold text-[#35576f]">
                Confirmar senha
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  maxLength={120}
                  className="min-h-[48px] rounded-xl border border-[#c7d6e2] bg-[#f7fbfe] px-4 py-3 text-sm font-normal text-[#214d6b]"
                />
              </label>

              {error ? (
                <div className="rounded-xl border border-[#efc3c3] bg-[#fff3f1] px-4 py-3 text-sm text-[#9f3f36]">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={pending || !initialValid}
                className="min-h-[48px] rounded-full bg-[#246b99] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {pending ? "Enviando..." : "Enviar"}
              </button>
            </form>
          )}

          <div className="mt-4 text-sm">
            <Link
              href="/painel/login"
              className="font-semibold text-[#246b99] hover:text-[#1c577e]"
            >
              voltar para o login
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
