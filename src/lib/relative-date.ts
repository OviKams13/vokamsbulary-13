/**
 * Time zone used for calendar dates ("Oct 16", "Yesterday"). Pages are
 * rendered on the server (UTC on Vercel), so the app's own zone is fixed here.
 */
export const APP_TIME_ZONE = "Europe/Paris";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/**
 * Publication date under a post card (5.2), in a long form for desktop and a
 * short one for mobile (mockups 01-D / 01-M):
 *
 * - under 1 minute: "Just now" / "now"
 * - under 1 hour: "12m ago" / "12m"
 * - under 24 hours: "2h ago" / "2h"
 * - the calendar day before: "Yesterday" / "1d"
 * - 2 to 6 calendar days: "3 days ago" / "3d"
 * - older: "Oct 16" (plus the year when it isn't this year)
 */
export function formatPostDate(
  date: Date,
  now: Date = new Date(),
): { long: string; short: string } {
  const age = now.getTime() - date.getTime();

  if (age < MINUTE) return { long: "Just now", short: "now" };
  if (age < HOUR) {
    const minutes = Math.floor(age / MINUTE);
    return { long: `${minutes}m ago`, short: `${minutes}m` };
  }
  if (age < 24 * HOUR) {
    const hours = Math.floor(age / HOUR);
    return { long: `${hours}h ago`, short: `${hours}h` };
  }

  const days = calendarDaysBetween(date, now);
  if (days <= 1) return { long: "Yesterday", short: "1d" };
  if (days < 7) return { long: `${days} days ago`, short: `${days}d` };

  const sameYear = yearIn(date) === yearIn(now);
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(date);
  return { long: label, short: label };
}

/** Full date and time, for the `title` tooltip of the date. */
export function formatFullDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIME_ZONE,
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

/** Number of midnights (in APP_TIME_ZONE) between two dates. */
function calendarDaysBetween(from: Date, to: Date): number {
  return Math.round((dayNumber(to) - dayNumber(from)) / (24 * HOUR));
}

function dayNumber(date: Date): number {
  // "YYYY-MM-DD" in the app's zone, read back as a UTC midnight.
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE }).format(date);
  return Date.parse(`${ymd}T00:00:00Z`);
}

function yearIn(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: APP_TIME_ZONE, year: "numeric" }).format(
    date,
  );
}
