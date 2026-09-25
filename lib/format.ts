import { formatInTimeZone } from "date-fns-tz";

export function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatWhen(date: Date, timeZone: string) {
  return formatInTimeZone(date, timeZone, "EEE, MMM d, yyyy 'at' h:mm a");
}

export function formatDay(date: Date, timeZone: string) {
  return formatInTimeZone(date, timeZone, "EEE, MMM d");
}

export function formatTime(date: Date, timeZone: string) {
  return formatInTimeZone(date, timeZone, "h:mm a");
}

export function timeZoneLabel(timeZone: string, date = new Date()) {
  const city = timeZone.split("/").at(-1)?.replaceAll("_", " ") ?? timeZone;
  const abbr = formatInTimeZone(date, timeZone, "zzz");
  return `All times in ${city} time (${abbr})`;
}

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};
