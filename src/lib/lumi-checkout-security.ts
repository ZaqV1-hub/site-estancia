import { createHmac, timingSafeEqual } from "node:crypto";

export function checkoutSignature(value: string) {
  const secret = process.env.LUMI_COMMERCE_SECRET ?? "";
  if (secret.length < 32) throw new Error("checkout_unconfigured");
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function signatureMatches(actual: unknown, expected: string) {
  const given = Buffer.from(typeof actual === "string" ? actual : "");
  const wanted = Buffer.from(expected);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

export function checkoutBase(token: string) {
  const base = new URL(process.env.LUMI_CHECKOUT_PUBLIC_BASE_URL ?? "");
  if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash) throw new Error("checkout_unconfigured");
  return base.toString().replace(/\/$/, "") + "/" + token;
}

export function validatePaymentOrigin(request: Request, token: string, input: Record<string, unknown>) {
  if (request.headers.get("origin") !== new URL(checkoutBase(token)).origin ||
      !signatureMatches(input.security_token, checkoutSignature("csrf:" + token))) throw new Error("checkout_forbidden");
}

function cardBinding(input: Record<string, unknown>) {
  return checkoutSignature([input.card_number, input.expiration, input.brand].join("|"));
}

export function authenticationProof(token: string, input: Record<string, unknown>, amount: number) {
  const payload = Buffer.from(JSON.stringify({ token, card: cardBinding(input), amount, expires: Date.now() + 300000 })).toString("base64url");
  return payload + "." + checkoutSignature("3ds:" + payload);
}

export function validateAuthentication(token: string, input: Record<string, unknown>, amount: number) {
  const [payload, signature] = String(input.authentication_proof ?? "").split(".");
  if (!payload || !signatureMatches(signature, checkoutSignature("3ds:" + payload))) throw new Error("authentication_required");
  const proof = JSON.parse(Buffer.from(payload, "base64url").toString());
  const auth = input.authentication as Record<string, unknown> | undefined;
  if (proof.token !== token || proof.card !== cardBinding(input) || proof.amount !== amount || proof.expires < Date.now() ||
      proof.expires > Date.now() + 301000 || input.installments !== 1 || !["Visa", "Master", "Elo"].includes(String(input.brand)) ||
      !auth || !/^(02|05)$/.test(String(auth.eci)) || !/^2\.[12]\.0$/.test(String(auth.version)) ||
      !/^[a-zA-Z0-9+/=]{8,256}$/.test(String(auth.cavv)) || !/^[a-fA-F0-9-]{36}$/.test(String(auth.reference_id))) throw new Error("authentication_required");
  return { Cavv: auth.cavv, Eci: auth.eci, Version: auth.version, ReferenceId: auth.reference_id, Xid: auth.xid || undefined };
}
