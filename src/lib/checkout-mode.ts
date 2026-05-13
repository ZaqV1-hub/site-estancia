import { isCielo3dsConfigured } from "@/lib/cielo-3ds";
import { isCieloEcommerceConfigured } from "@/lib/cielo-ecommerce";

export type CheckoutMode = "widget" | "unavailable";

export function resolveCheckoutMode(): CheckoutMode {
  if (isNativeCheckoutConfigured()) {
    return "widget";
  }

  return "unavailable";
}

export function isNativeCheckoutConfigured() {
  return isCieloEcommerceConfigured() && isCielo3dsConfigured();
}
