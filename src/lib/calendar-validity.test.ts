import { describe, expect, it } from "vitest";
import { getSaoPauloToday, isEventOnlyProduct, resolveCalendarValidityDate, editableCalendarStatus } from "@/lib/calendar-validity";

describe("validade do calendário", () => {
  it("conta o prazo a partir da visita, incluindo o dia inicial", () => {
    expect(resolveCalendarValidityDate("2026-10-31", "day")).toBe("2026-10-31");
    expect(resolveCalendarValidityDate("2026-10-31", "1d")).toBe("2026-10-31");
    expect(resolveCalendarValidityDate("2026-10-31", "7d")).toBe("2026-11-06");
    expect(resolveCalendarValidityDate("2026-10-31", "30d")).toBe("2026-11-29");
  });
  it("limita seis meses ao último dia do mês de destino", () => {
    expect(resolveCalendarValidityDate("2026-08-31", "6m")).toBe("2027-02-28");
    expect(resolveCalendarValidityDate("2027-08-31", "6m")).toBe("2028-02-29");
  });
  it("rejeita datas impossíveis e prazos desconhecidos", () => {
    expect(() => resolveCalendarValidityDate("2026-02-30", "day")).toThrow();
    expect(() => resolveCalendarValidityDate("2026-01-01", "365d" as never)).toThrow();
  });
  it("usa a data de São Paulo na virada UTC", () => {
    expect(getSaoPauloToday(new Date("2026-10-28T01:30:00Z"))).toBe("2026-10-27");
  });
  it("distingue passaporte de evento sem confundir PCD ou adicionais", () => {
    expect(isEventOnlyProduct({ title: "Passaporte Especial Dia das Crianças", type: "passport" })).toBe(true);
    expect(isEventOnlyProduct({ title: "Passaporte PCD", type: "passport" })).toBe(false);
    expect(isEventOnlyProduct({ title: "Tirolesa especial", type: "addon" })).toBe(false);
  });
  it("editar uma data lotada mantém as vendas fechadas até escolha explícita",()=>{
    expect(editableCalendarStatus("lot")).toBe("fec");
    expect(editableCalendarStatus("abe")).toBe("abe");
    expect(editableCalendarStatus(undefined)).toBe("abe");
  });
});
