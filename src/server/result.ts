import type { FieldErrors } from "@/lib/validation";

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string; fieldErrors?: FieldErrors; code?: string };

export function fail(error: string, extra: { fieldErrors?: FieldErrors; code?: string } = {}) {
  return { ok: false as const, error, ...extra };
}
