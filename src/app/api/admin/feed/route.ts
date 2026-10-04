import { NextResponse } from "next/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb, schema as s } from "@/lib/db";
import { getCurrentUser, isStaff } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** Admin live feed: unread admin notifications + count of orders awaiting acceptance. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isStaff(user)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const db = await getDb();
  const unread = await db
    .select({ id: s.notifications.id, title: s.notifications.title, body: s.notifications.body, href: s.notifications.href, createdAt: s.notifications.createdAt })
    .from(s.notifications)
    .where(and(eq(s.notifications.audience, "admin"), isNull(s.notifications.readAt)))
    .orderBy(desc(s.notifications.createdAt))
    .limit(10);
  const [{ pending }] = (await db.select({ pending: sql<number>`count(*)::int` }).from(s.orders).where(eq(s.orders.status, "placed"))) as [{ pending: number }];
  return NextResponse.json({ unread, pending }, { headers: { "Cache-Control": "private, no-store" } });
}
