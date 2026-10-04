import { NextResponse } from "next/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb, schema as s } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** Customer notification feed (own notifications only). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const db = await getDb();
  const where = and(eq(s.notifications.userId, user.id), eq(s.notifications.audience, "customer"));
  const items = await db
    .select({ id: s.notifications.id, type: s.notifications.type, title: s.notifications.title, body: s.notifications.body, href: s.notifications.href, readAt: s.notifications.readAt, createdAt: s.notifications.createdAt })
    .from(s.notifications)
    .where(where)
    .orderBy(desc(s.notifications.createdAt))
    .limit(15);
  const [{ unread }] = (await db
    .select({ unread: sql<number>`count(*)::int` })
    .from(s.notifications)
    .where(and(where, isNull(s.notifications.readAt)))) as [{ unread: number }];
  return NextResponse.json({ items, unread }, { headers: { "Cache-Control": "private, no-store" } });
}
