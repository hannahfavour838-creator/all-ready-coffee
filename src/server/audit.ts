import "server-only";
import { getDb, schema as s } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { clientIp } from "@/lib/security/request";

/** Append-only audit trail for sensitive admin actions. */
export async function audit(actor: SessionUser, action: string, entity: string, entityId?: string | number | null, metadata: Record<string, unknown> = {}) {
  try {
    const db = await getDb();
    await db.insert(s.auditLogs).values({
      actorId: actor.id,
      actorEmail: actor.email,
      action,
      entity,
      entityId: entityId == null ? null : String(entityId),
      metadata,
      ip: await clientIp(),
    });
  } catch (err) {
    console.error("[audit] failed to write audit log", err instanceof Error ? err.message : err);
  }
}
