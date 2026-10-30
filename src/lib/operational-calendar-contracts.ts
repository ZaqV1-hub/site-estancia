import type { B2cProduct } from "@/lib/b2c-catalog-defaults";
import type { SchoolTripSummary } from "@/lib/b2b-school-calendar";

export type CalendarValidity = "day" | "1d" | "7d" | "30d" | "6m";
export const calendarValidityLabels: Record<CalendarValidity, string> = {
  day: "Só no dia", "1d": "1 dia", "7d": "7 dias", "30d": "30 dias", "6m": "6 meses",
};
export type CalendarActor = { name: string | null; cpf: string | null };
export type CalendarRule = {
  configured?: boolean;
  agendaId: number; date: string; type: "dayuse" | "event";
  status: "abe" | "fec" | "lot"; validity: CalendarValidity;
  passportIds: string[]; addonIds: string[]; eventId: string | null;
  eventTitle: string | null;
};
export type CalendarVoucher = {
  id: number; number: string | null; type: string; productId: string | null;
  title: string; kind: "passport" | "addon"; valueCents: number;
  used: boolean; invalid: boolean; validUntil: string | null;
  originalDate: string | null; rescheduleReason: string | null;
};
export type CalendarPurchase = {
  id: number; customerId: string; customerName: string; email: string | null;
  origin: "site" | "bilheteria"; status: string; people: number; addons: number;
  valueCents: number; originalDate: string | null; vouchers: CalendarVoucher[];
};
export type CalendarBar = { title: string; quantity: number };
export type CalendarSummary = {
  people: number; purchases: number; addons: number; revenueCents: number;
  siteCents: number; boxOfficeCents: number; rescheduled: number;
  passports: CalendarBar[]; addonItems: CalendarBar[];
};
export type CalendarDay = {
  schoolTrips?: SchoolTripSummary[];
  schoolTripsUnavailable?: boolean;
  date: string; rule: CalendarRule | null; summary: CalendarSummary;
  purchases: CalendarPurchase[]; products: B2cProduct[];
  event?: {id:string;title:string;pageTitle:string;pageContent:string;pageEnabled:boolean} | null;
};
export type CalendarMonth = {
  schoolTripsUnavailable?: boolean;
  month: number; year: number; today: string;
  days: Array<{ date: string; rule: CalendarRule; summary: CalendarSummary; schoolTrips?: SchoolTripSummary[]; b2bOnly?: boolean }>;
};
export type SaveCalendarDateInput = {
  agendaId?: number | null; date: string; status: "abe" | "fec";
  validity: CalendarValidity; passportIds: string[]; addonIds: string[];
  type?: "dayuse" | "event"; eventId?: string | null;
  eventTitle?: string | null; eventDescription?: string | null;
};
export type MoveCalendarInput = {
  keepVisitDate?: boolean;
  purchaseIds: number[]; voucherIds?: number[]; targetDate: string;
  validityMode: "keep" | "destination" | "custom";
  validity?: CalendarValidity; reason: string; notifyEmail: boolean;
  confirmUnavailable?: boolean;
};
export type MoveCalendarResult = {
  moved: number; purchaseIds: number[]; warnings: string[];
  email: { sent: number; failed: number; skipped: number };
};
