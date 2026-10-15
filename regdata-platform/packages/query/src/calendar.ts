/** Business days are Monday to Friday, with no holiday calendar (decision of 2026-10-15). */

const DAY_MS = 86_400_000;

function toUtc(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

export function isWeekday(date: string): boolean {
  const day = new Date(toUtc(date)).getUTCDay();
  return day >= 1 && day <= 5;
}

/** Weekdays between two ISO dates, inclusive, in order. */
export function weekdaysBetween(from: string, to: string): string[] {
  const result: string[] = [];
  for (let time = toUtc(from); time <= toUtc(to); time += DAY_MS) {
    const date = new Date(time).toISOString().slice(0, 10);
    if (isWeekday(date)) result.push(date);
  }
  return result;
}
