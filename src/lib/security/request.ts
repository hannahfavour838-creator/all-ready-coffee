import "server-only";
import { headers } from "next/headers";

/** Best-effort client IP (behind a trusted proxy that sets x-forwarded-for). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim().slice(0, 64);
  return (h.get("x-real-ip") ?? "local").slice(0, 64);
}

export async function userAgent(): Promise<string> {
  const h = await headers();
  return (h.get("user-agent") ?? "").slice(0, 300);
}

/**
 * CSRF defence for Route Handlers that mutate state (Server Actions already enforce this in Next.js).
 * Rejects cross-site requests by comparing Origin (or Referer) with the request host.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin") ?? req.headers.get("referer");
  if (!origin) return false;
  try {
    const o = new URL(origin);
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return !!host && o.host === host;
  } catch {
    return false;
  }
}

/** Only allow internal, relative redirect targets (prevents open redirects). */
export function safeRedirect(target: string | null | undefined, fallback = "/account"): string {
  if (!target || typeof target !== "string") return fallback;
  if (!target.startsWith("/") || target.startsWith("//") || target.startsWith("/\\")) return fallback;
  return target.slice(0, 300);
}
