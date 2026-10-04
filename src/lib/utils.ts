import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { BUSINESS_TZ } from "./time";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/** Format integer cents as USD. */
export function formatPrice(cents: number) {
  return usd.format(cents / 100);
}

export function formatDate(d: Date | string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }) {
  return new Intl.DateTimeFormat("en-US", { timeZone: BUSINESS_TZ, ...opts }).format(typeof d === "string" ? new Date(d) : d);
}

export function formatTime(d: Date | string) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: BUSINESS_TZ }).format(typeof d === "string" ? new Date(d) : d);
}

export function formatRelative(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 45) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)} h ago`;
  if (diff < 86400 * 7) return `${Math.round(diff / 86400)} d ago`;
  return formatDate(date);
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function clamp(v: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, v));
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
