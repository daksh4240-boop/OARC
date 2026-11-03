// Date-only API fields represent local calendar days, not UTC instants.
export function parseCalendarDate(value: string): Date {
  return new Date(value + "T00:00:00");
}
