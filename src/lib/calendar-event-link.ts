export function calendarEventDate(event: { href: string } | null | undefined) {
  const href = event?.href;
  if (!href || (!href.startsWith("/agenda?") && !/^https?:\/\//i.test(href))) return null;
  try {
    const url = new URL(href, "https://estanciadayuse.com.br");
    if (!["http:", "https:"].includes(url.protocol) || url.pathname !== "/agenda"
      || !["estanciadayuse.com.br", "www.estanciadayuse.com.br"].includes(url.host)
      || url.username || url.password) return null;
    const dates = url.searchParams.getAll("date");
    const date = dates[0];
    if (dates.length !== 1 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    const parsed = new Date(`${date}T12:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date ? date : null;
  } catch {
    return null;
  }
}
