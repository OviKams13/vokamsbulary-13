import "server-only";

/**
 * Basic brute-force delay for wrong access codes (3.2).
 *
 * Each wrong code waits before the answer comes back: 1 s for the first one,
 * then 1 s more per recent failure from the same IP, up to 5 s. Failures are
 * forgotten after 15 minutes or after a correct code.
 *
 * The counter lives in memory, so it is per server instance: good enough as a
 * speed bump. The real protection is the code itself (20 random characters).
 */
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 5_000;
const WINDOW_MS = 15 * 60 * 1_000;
const MAX_TRACKED_IPS = 1_000;

type Failures = { count: number; since: number };

const failuresByIp = new Map<string, Failures>();

export async function delayWrongCode(ip: string, now = Date.now()): Promise<void> {
  const previous = failuresByIp.get(ip);
  const failures: Failures =
    previous && now - previous.since < WINDOW_MS
      ? { count: previous.count + 1, since: previous.since }
      : { count: 1, since: now };

  // Keep the map small: drop the oldest entry when it gets too big.
  if (!failuresByIp.has(ip) && failuresByIp.size >= MAX_TRACKED_IPS) {
    const oldest = failuresByIp.keys().next().value;
    if (oldest !== undefined) failuresByIp.delete(oldest);
  }
  failuresByIp.set(ip, failures);

  const delay = Math.min(BASE_DELAY_MS * failures.count, MAX_DELAY_MS);
  await new Promise((resolve) => setTimeout(resolve, delay));
}

export function clearFailures(ip: string): void {
  failuresByIp.delete(ip);
}
