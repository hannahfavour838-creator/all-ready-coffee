import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt } from "drizzle-orm";
import { getDb, schema as s } from "@/lib/db";

import { SESSION_COOKIE } from "./constants";
export { SESSION_COOKIE };
const SESSION_DAYS = 30;
const RENEW_WHEN_DAYS_LEFT = 15;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: "customer" | "staff" | "admin";
};

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string, meta: { ip?: string; userAgent?: string } = {}) {
  const db = await getDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(s.sessions).values({ id: hashToken(token), userId, expiresAt, ip: meta.ip, userAgent: meta.userAgent });
  // opportunistic cleanup of expired sessions
  await db.delete(s.sessions).where(lt(s.sessions.expiresAt, new Date()));
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    priority: "high",
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(s.sessions).where(eq(s.sessions.id, hashToken(token)));
  }
  jar.delete(SESSION_COOKIE);
}

/** Revoke all sessions for a user except (optionally) the current one. */
export async function revokeOtherSessions(userId: string) {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const db = await getDb();
  const sessions = await db.select({ id: s.sessions.id }).from(s.sessions).where(eq(s.sessions.userId, userId));
  const current = token ? hashToken(token) : null;
  for (const row of sessions) if (row.id !== current) await db.delete(s.sessions).where(eq(s.sessions.id, row.id));
}

/** Resolves the signed-in user for this request (memoised per request). */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || token.length > 128) return null;
  const db = await getDb();
  const id = hashToken(token);
  const rows = await db
    .select({
      sessionExpires: s.sessions.expiresAt,
      id: s.users.id,
      email: s.users.email,
      name: s.users.name,
      phone: s.users.phone,
      role: s.users.role,
    })
    .from(s.sessions)
    .innerJoin(s.users, eq(s.users.id, s.sessions.userId))
    .where(and(eq(s.sessions.id, id), gt(s.sessions.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  // Sliding renewal (DB only — cookies can't be written during render).
  if (row.sessionExpires.getTime() - Date.now() < RENEW_WHEN_DAYS_LEFT * 86_400_000) {
    await db.update(s.sessions).set({ expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000) }).where(eq(s.sessions.id, id));
  }
  return { id: row.id, email: row.email, name: row.name, phone: row.phone, role: row.role as SessionUser["role"] };
});

export function isStaff(user: SessionUser | null): boolean {
  return !!user && (user.role === "admin" || user.role === "staff");
}

/** Page guard: redirect anonymous visitors to sign-in. */
export async function requireUser(next = "/account"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return user;
}

/**
 * Admin page guard. Non-staff users get a 404 so the admin surface is not advertised.
 * `admin` is required for owner-only areas (products, discounts, delivery, customers, audit).
 */
export async function requireStaff(level: "staff" | "admin" = "staff"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=/admin`);
  if (!isStaff(user)) notFound();
  if (level === "admin" && user.role !== "admin") notFound();
  return user;
}

/* ───────────── Action-level guards (return errors instead of redirecting) ───────────── */

export class AuthError extends Error {
  constructor(public code: "unauthenticated" | "forbidden") {
    super(code);
  }
}

export async function assertUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("unauthenticated");
  return user;
}

export async function assertStaff(level: "staff" | "admin" = "staff"): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("unauthenticated");
  if (!isStaff(user) || (level === "admin" && user.role !== "admin")) throw new AuthError("forbidden");
  return user;
}
