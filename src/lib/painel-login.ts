const defaultPainelRedirect = "/painel";

const painelLoginErrorMessages: Record<string, string> = {
  invalid_credentials: "CPF ou senha inválidos.",
  inactive_user: "Este usuário não está ativo.",
  auth_unavailable: "Não foi possível abrir a sessão do painel agora.",
  operations_session_invalid: "Não foi possível abrir a sessão do painel.",
  recaptcha_missing: "Ocorreu um erro ao validar o Recaptcha, tente novamente.",
  recaptcha_rejected: "Ocorreu um erro ao validar o Recaptcha, tente novamente.",
  recaptcha_unavailable: "Ocorreu um erro ao validar o Recaptcha, tente novamente.",
};

export function sanitizePainelRedirect(value: string | undefined) {
  if (!value || !value.startsWith("/painel")) {
    return defaultPainelRedirect;
  }

  return value;
}

export function mapPainelLoginErrorCode(value: string | undefined) {
  if (!value) {
    return null;
  }

  return painelLoginErrorMessages[value] ?? null;
}

export function resolvePainelRecaptchaSiteKey(
  siteKey: string,
  requestUrl?: string | null,
) {
  const normalizedSiteKey = siteKey.trim();

  if (!normalizedSiteKey) {
    return null;
  }

  if (requestUrl && shouldBypassPainelRecaptcha(requestUrl)) {
    return null;
  }

  return normalizedSiteKey;
}

export function shouldBypassPainelRecaptcha(requestUrl: string) {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  try {
    const url = new URL(requestUrl);

    return (
      url.hostname === "127.0.0.1" ||
      url.hostname === "localhost" ||
      url.hostname === "::1"
    );
  } catch {
    return false;
  }
}
