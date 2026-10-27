import { describe, expect, it } from "vitest";
import { calendarEventDate } from "./calendar-event-link";

describe("calendar event link ownership", () => {
  it.each([
    "/agenda?date=2028-02-29",
    "/agenda?mes=2&date=2028-02-29&ano=2028",
    "https://estanciadayuse.com.br/agenda?date=2028-02-29",
    "http://www.estanciadayuse.com.br/agenda?date=2028-02-29",
    "/agenda?date=2028-02-29#ingressos",
  ])("accepts an internal agenda link with a real date: %s", href => {
    expect(calendarEventDate({ href })).toBe("2028-02-29");
  });
  it.each([
    "https://example.com/agenda?date=2028-02-29",
    "https://estanciadayuse.com.br.example.com/agenda?date=2028-02-29",
    "https://example.com/?next=/agenda&date=2028-02-29",
    "https://estanciadayuse.com.br/evento?date=2028-02-29",
    "https://estanciadayuse.com.br:444/agenda?date=2028-02-29",
    "https://user:password@estanciadayuse.com.br/agenda?date=2028-02-29",
    "//estanciadayuse.com.br/agenda?date=2028-02-29",
    "/evento?date=2028-02-29",
    "/agenda?date=2027-02-29",
    "/agenda?date=2028-02-30",
    "/agenda?date=2028-02-29&date=2028-03-01",
    "/agenda?date=invalid",
    "javascript:alert(1)",
  ])("ignores external, ambiguous or invalid links: %s", href => {
    expect(calendarEventDate({ href })).toBeNull();
  });
});
