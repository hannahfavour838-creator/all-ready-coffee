import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { getDb, schema as s } from "@/lib/db";
import { getCurrentUser, isStaff } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** Lightweight polling endpoint for live order tracking. Owners (and staff) only. */
export async function GET(_req: Request, { params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!/^AR-\d{3,8}$/.test(number)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const db = await getDb();
  const where = isStaff(user) ? eq(s.orders.number, number) : and(eq(s.orders.number, number), eq(s.orders.userId, user.id));
  const [order] = await db
    .select({ id: s.orders.id, status: s.orders.status, updatedAt: s.orders.updatedAt, estimatedDeliveryAt: s.orders.estimatedDeliveryAt, deliveredAt: s.orders.deliveredAt })
    .from(s.orders)
    .where(where)
    .limit(1);
  // Same response for "doesn't exist" and "not yours" — no order enumeration.
  if (!order) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const events = await db.select({ status: s.orderEvents.status, createdAt: s.orderEvents.createdAt }).from(s.orderEvents).where(eq(s.orderEvents.orderId, order.id)).orderBy(asc(s.orderEvents.createdAt));
  return NextResponse.json({ status: order.status, updatedAt: order.updatedAt, estimatedDeliveryAt: order.estimatedDeliveryAt, deliveredAt: order.deliveredAt, events }, { headers: { "Cache-Control": "private, no-store" } });
}
