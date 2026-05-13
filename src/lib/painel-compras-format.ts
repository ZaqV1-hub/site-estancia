function normalizeScalar(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized && normalized !== "-1" ? normalized : null;
}

function normalizeDateValue(value: unknown) {
  const normalized = String(value ?? "").trim();
  return /^\d{2}\/\d{2}\/\d{4}$/.test(normalized) ? normalized : null;
}

export function normalizePainelCompraScalarFilterValue(value: unknown) {
  return normalizeScalar(value);
}

export function normalizePainelCompraDateFilterValue(value: unknown) {
  return normalizeDateValue(value);
}
