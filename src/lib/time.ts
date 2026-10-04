/** The café operates on Pacific time — all business-facing times are shown and bucketed in this zone. */
export const BUSINESS_TZ = "America/Los_Angeles";

const partsFmt = new Intl.DateTimeFormat("en-US", { timeZone: BUSINESS_TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });

export function zonedParts(d: Date) {
  const p = Object.fromEntries(partsFmt.formatToParts(d).map((x) => [x.type, x.value]));
  return { year: Number(p.year), month: Number(p.month), day: Number(p.day), hour: Number(p.hour), minute: Number(p.minute), second: Number(p.second) };
}

/** Offset (ms) between UTC and the business zone at instant d. */
function offsetAt(d: Date) {
  const z = zonedParts(d);
  return Date.UTC(z.year, z.month - 1, z.day, z.hour, z.minute, z.second) - (d.getTime() - d.getMilliseconds());
}

/** Build an instant from a wall-clock time in the business zone. */
export function fromZoned(year: number, month: number, day: number, hour = 0, minute = 0, second = 0) {
  const guess = Date.UTC(year, month - 1, day, hour, minute, second);
  const off = offsetAt(new Date(guess));
  const t = guess - off;
  const off2 = offsetAt(new Date(t));
  return new Date(off2 === off ? t : guess - off2);
}

export function dayKey(d: Date) {
  const z = zonedParts(d);
  return `${z.year}-${String(z.month).padStart(2, "0")}-${String(z.day).padStart(2, "0")}`;
}

export function startOfBusinessDay(d = new Date()) {
  const z = zonedParts(d);
  return fromZoned(z.year, z.month, z.day);
}
