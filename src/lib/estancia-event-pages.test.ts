import { describe, expect, it } from "vitest";
import type { ManagedEvent } from "@/lib/estancia-content-store";
import {
  buildManagedEventPagePath,
  buildManagedEventPageSlug,
  findManagedEventBySlug,
  hasManagedEventPage,
  resolveManagedEventPublicHref,
  resolveManagedEventPurchaseHref,
} from "@/lib/estancia-event-pages";

function createEvent(overrides: Partial<ManagedEvent> = {}): ManagedEvent {
  return {
    id: "evento-junino",
    title: "Evento Junino",
    description: "Resumo curto",
    pageTitle: "Festa Junina Especial",
    pageContent: "Descricao completa",
    pageEnabled: true,
    pageSlug: "",
    imageSrc: "/uploads/site/evento.jpg",
    href: "/agenda?mes=7&ano=2026&date=2026-07-15",
    buttonLabel: "Comprar agora",
    active: true,
    sortOrder: 1,
    ...overrides,
  };
}

describe("estancia event pages", () => {
  it("detects when an event has its own page", () => {
    expect(hasManagedEventPage(createEvent())).toBe(true);
    expect(
      hasManagedEventPage(createEvent({ pageEnabled: false })),
    ).toBe(false);
    expect(hasManagedEventPage(createEvent({ pageContent: "" }))).toBe(false);
  });

  it("builds a stable slug and public path", () => {
    const event = createEvent({ pageTitle: "Férias na Estância 2026" });

    expect(buildManagedEventPageSlug(event)).toBe("ferias-na-estancia-2026");
    expect(buildManagedEventPagePath(event)).toBe("/evento/ferias-na-estancia-2026");
  });

  it("prefers the explicit stored slug when available", () => {
    const event = createEvent({ pageSlug: "evento-personalizado" });

    expect(buildManagedEventPageSlug(event)).toBe("evento-personalizado");
  });

  it("uses the event page path on the public site and keeps the original CTA link", () => {
    const eventWithPage = createEvent();
    const externalEvent = createEvent({
      pageEnabled: false,
      href: "https://externo.example.com",
    });

    expect(resolveManagedEventPublicHref(eventWithPage)).toBe(
      "/evento/festa-junina-especial",
    );
    expect(resolveManagedEventPublicHref(externalEvent)).toBe(
      "https://externo.example.com",
    );
    expect(resolveManagedEventPurchaseHref(eventWithPage)).toBe(
      "/agenda?mes=7&ano=2026&date=2026-07-15",
    );
    expect(resolveManagedEventPurchaseHref(externalEvent)).toBe(
      "https://externo.example.com",
    );
  });

  it("finds a managed event by slug", () => {
    const target = createEvent({ pageTitle: "Costela no Bafo" });
    const events = [createEvent({ id: "a", pageTitle: "Outro" }), target];

    expect(findManagedEventBySlug(events, "costela-no-bafo")?.id).toBe(target.id);
    expect(findManagedEventBySlug(events, "inexistente")).toBeNull();
  });
});
