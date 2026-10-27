import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
import { OperationalEventEditor } from "./operational-event-editor";
const event = { id: "evento", title: "Evento", description: "Resumo", href: "/agenda?date=2027-01-01", imageSrc: "/image.jpg", pageTitle: "Evento", pageContent: "", pageEnabled: false, pageSlug: "", buttonLabel: "Compre seu ingresso!", active: true, sortOrder: 1 };
describe("event editor presentation", () => {
    it("edits future ticket validity in the modal and preserves a legacy summary without truncation", () => {
        const description = "a".repeat(222);
        const html = renderToStaticMarkup(createElement(OperationalEventEditor, { products: [], event: { ...event, description }, presentation: "modal", rule: { agendaId: 1, date: "2027-01-01", type: "event", status: "lot", validity: "6m", passportIds: ["adulto"], addonIds: [], eventId: "evento", eventTitle: "Evento" } }));
        expect(html).toContain("Validade dos ingressos");
        expect(html).toContain('value="6m" selected=""');
        expect(html).toContain("próximas emissões");
        expect(html).toContain(description);
        expect(html).toContain("Resumo legado preservado");
    });
    it("calendar creation fixes internal mode and prefilled date with visible counters", () => { const html = renderToStaticMarkup(createElement(OperationalEventEditor, { products: [], initialDate: "2027-01-01", fromCalendar: true })); expect(html).toContain('value="2027-01-01"'); expect(html).toContain("readOnly"); expect(html).toContain("Título"); expect(html).toContain("Resumo"); expect(html).toContain("(0/52)"); expect(html).toContain("(0/220)"); expect(html).toContain("Data do evento</li>"); expect(html).not.toContain("Tipo do evento"); });
    it("requires tomorrow or later when creating an internal event", () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-12-31T23:30:00-03:00"));
        try {
            const html = renderToStaticMarkup(createElement(OperationalEventEditor, { products: [] }));
            expect(html).toMatch(/type="date"[^>]*min="2027-01-01"/);
            const existing = renderToStaticMarkup(createElement(OperationalEventEditor, { products: [], event }));
            expect(existing).not.toMatch(/type="date"[^>]*min=/);
        } finally { vi.useRealTimers(); }
    });
    it("does not reopen a sold-out event when its wizard is saved", () => {
        const html=renderToStaticMarkup(createElement(OperationalEventEditor,{products:[],event,rule:{agendaId:1,date:"2027-01-01",type:"event",status:"lot",validity:"day",passportIds:[],addonIds:[],eventId:"evento",eventTitle:"Evento"}}));
        expect(html).toContain("Esta data estava lotada");
    });
    it("site edit presents event content and links to the date report", () => { const html = renderToStaticMarkup(createElement(OperationalEventEditor, { products: [], event, presentation: "modal", rule: { agendaId: 1, date: "2027-01-01", type: "event", status: "abe", validity: "7d", passportIds: ["adulto"], addonIds: [], eventId: "evento", eventTitle: "Evento" } })); expect(html).toContain("Mais detalhes"); expect(html).toContain('/painel/agenda/2027-01-01'); expect(html).not.toContain('aria-label="Etapas do evento"'); expect(html).toContain("(6/52)"); });
});
