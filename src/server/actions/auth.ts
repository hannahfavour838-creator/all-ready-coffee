"use server";

import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema as s } from "@/lib/db";
import { createSession, destroySession, assertUser, revokeOtherSessions } from "@/lib/auth/session";
import { hashPassword, passwordProblems, verifyPassword } from "@/lib/auth/password";
import { rateLimit, resetRateLimit } from "@/lib/security/rate-limit";
import { clientIp, safeRedirect, userAgent } from "@/lib/security/request";
import { signInSchema, signUpSchema, profileSchema, zodFieldErrors } from "@/lib/validation";
import { fail, type ActionResult } from "../result";
import { guarded } from "../safe-action";

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

export async function signUpAction(_prev: unknown, form: FormData): Promise<ActionResult> {
  const ip = await clientIp();
  const rl = rateLimit(`signup:${ip}`, 6, 60 * 60_000);
  if (!rl.ok) return fail(`Too many sign-up attempts. Try again in ${Math.ceil(rl.retryAfterSeconds / 60)} min.`);

  const parsed = signUpSchema.safeParse({
    name: form.get("name") ?? "",
    email: form.get("email") ?? "",
    password: form.get("password") ?? "",
    marketing: form.get("marketing") === "on",
  });
  if (!parsed.success) return fail("Please fix the highlighted fields.", { fieldErrors: zodFieldErrors(parsed.error) });
  const { name, email, password, marketing } = parsed.data;
  const problem = passwordProblems(password, email);
  if (problem) return fail("Please choose a stronger password.", { fieldErrors: { password: problem } });

  const result = await guarded(async () => {
    const db = await getDb();
    const existing = await db.select({ id: s.users.id }).from(s.users).where(sql`lower(${s.users.email}) = ${email}`).limit(1);
    if (existing.length) {
      return fail("An account with that email already exists.", { fieldErrors: { email: "This email is already registered — try signing in." } });
    }
    const [user] = await db
      .insert(s.users)
      .values({ name, email, passwordHash: await hashPassword(password), marketingOptIn: marketing, role: "customer", lastLoginAt: new Date() })
      .returning({ id: s.users.id });
    await db.insert(s.notifications).values({
      audience: "customer",
      userId: user!.id,
      type: "welcome",
      title: `Welcome to All Ready, ${name.split(" ")[0]}`,
      body: "Your account is ready. Use code WELCOME15 for 15% off your first order over $15.",
      href: "/menu",
    });
    await createSession(user!.id, { ip, userAgent: await userAgent() });
    return { ok: true as const };
  });
  if (!result.ok) return result;
  redirect(safeRedirect(String(form.get("next") ?? ""), "/account?welcome=1"));
}

export async function signInAction(_prev: unknown, form: FormData): Promise<ActionResult> {
  const ip = await clientIp();
  const parsed = signInSchema.safeParse({ email: form.get("email") ?? "", password: form.get("password") ?? "" });
  if (!parsed.success) return fail("Please fix the highlighted fields.", { fieldErrors: zodFieldErrors(parsed.error) });
  const { email, password } = parsed.data;

  const ipLimit = rateLimit(`signin-ip:${ip}`, 20, 15 * 60_000);
  const emailLimit = rateLimit(`signin-email:${email}`, 8, 15 * 60_000);
  if (!ipLimit.ok || !emailLimit.ok) return fail("Too many sign-in attempts. Please wait a few minutes and try again.");

  const generic = "That email and password combination didn't match our records.";
  let destination = safeRedirect(String(form.get("next") ?? ""), "/account");

  const result = await guarded(async () => {
    const db = await getDb();
    const [user] = await db.select().from(s.users).where(sql`lower(${s.users.email}) = ${email}`).limit(1);
    if (!user) {
      await verifyPassword(password, "x"); // equalise timing
      return fail(generic);
    }
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      return fail(`This account is temporarily locked after several failed attempts. Try again in ${Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000)} min.`);
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      const failed = user.failedLoginCount + 1;
      await db
        .update(s.users)
        .set({ failedLoginCount: failed >= MAX_FAILED ? 0 : failed, lockedUntil: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null })
        .where(eq(s.users.id, user.id));
      return fail(generic);
    }
    await db.update(s.users).set({ failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(s.users.id, user.id));
    await createSession(user.id, { ip, userAgent: await userAgent() });
    resetRateLimit(`signin-email:${email}`);
    if ((user.role === "admin" || user.role === "staff") && destination === "/account") destination = "/admin";
    return { ok: true as const };
  });
  if (!result.ok) return result;
  redirect(destination);
}

export async function signOutAction() {
  await destroySession();
  redirect("/");
}

export async function updateProfileAction(_prev: unknown, form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const user = await assertUser();
    const parsed = profileSchema.safeParse({ name: form.get("name") ?? "", phone: form.get("phone") ?? "" });
    if (!parsed.success) return fail("Please fix the highlighted fields.", { fieldErrors: zodFieldErrors(parsed.error) });
    const db = await getDb();
    await db.update(s.users).set({ name: parsed.data.name, phone: parsed.data.phone, updatedAt: new Date() }).where(eq(s.users.id, user.id));
    return { ok: true as const };
  });
}

export async function updatePreferencesAction(_prev: unknown, form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const user = await assertUser();
    const db = await getDb();
    await db
      .update(s.users)
      .set({ marketingOptIn: form.get("marketing") === "on", smsUpdates: form.get("sms") === "on", updatedAt: new Date() })
      .where(eq(s.users.id, user.id));
    return { ok: true as const };
  });
}

export async function changePasswordAction(_prev: unknown, form: FormData): Promise<ActionResult> {
  return guarded(async () => {
    const user = await assertUser();
    const rl = rateLimit(`pwchange:${user.id}`, 5, 15 * 60_000);
    if (!rl.ok) return fail("Too many attempts. Please wait a few minutes.");
    const current = String(form.get("current") ?? "");
    const next = String(form.get("next") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (next !== confirm) return fail("Passwords don't match.", { fieldErrors: { confirm: "Passwords don't match." } });
    const problem = passwordProblems(next, user.email);
    if (problem) return fail("Please choose a stronger password.", { fieldErrors: { next: problem } });
    const db = await getDb();
    const [row] = await db.select({ hash: s.users.passwordHash }).from(s.users).where(eq(s.users.id, user.id));
    if (!row || !(await verifyPassword(current, row.hash))) return fail("Your current password is incorrect.", { fieldErrors: { current: "Incorrect password." } });
    await db.update(s.users).set({ passwordHash: await hashPassword(next), updatedAt: new Date() }).where(eq(s.users.id, user.id));
    await revokeOtherSessions(user.id);
    return { ok: true as const };
  });
}

export async function signOutEverywhereAction(): Promise<ActionResult> {
  return guarded(async () => {
    const user = await assertUser();
    await revokeOtherSessions(user.id);
    return { ok: true as const };
  });
}

export async function deleteAccountAction(_prev: unknown, form: FormData): Promise<ActionResult> {
  const result = await guarded(async () => {
    const user = await assertUser();
    if (user.role !== "customer") return fail("Staff accounts must be removed by the owner.");
    const db = await getDb();
    const [row] = await db.select({ hash: s.users.passwordHash }).from(s.users).where(eq(s.users.id, user.id));
    if (!row || !(await verifyPassword(String(form.get("password") ?? ""), row.hash))) return fail("Password is incorrect.", { fieldErrors: { password: "Incorrect password." } });
    // Orders are retained for bookkeeping but detached from the person (user_id → NULL via FK).
    await db.delete(s.users).where(and(eq(s.users.id, user.id), eq(s.users.role, "customer")));
    await destroySession();
    return { ok: true as const };
  });
  if (!result.ok) return result;
  redirect("/?account=deleted");
}
