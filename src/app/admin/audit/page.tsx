import { requireStaff } from "@/lib/auth/session";
import { getAuditLogs } from "@/server/queries/admin";
import { PageHeader, Table, td, th } from "@/components/admin/ui";
import { formatDate, formatTime, cn } from "@/lib/utils";

export const metadata = { title: "Audit log" };

export default async function AdminAudit() {
  await requireStaff("admin");
  const logs = await getAuditLogs(250);
  return (
    <div>
      <PageHeader title="Audit log" description="Append-only record of sensitive admin actions: who did what, when and from where." />
      <Table>
        <thead className="border-b border-cream/[0.06]"><tr><th className={th}>When</th><th className={th}>Who</th><th className={th}>Action</th><th className={th}>Target</th><th className={th}>Details</th></tr></thead>
        <tbody className="divide-y divide-cream/[0.05]">
          {logs.map((l) => (
            <tr key={l.id}>
              <td className={cn(td, "whitespace-nowrap font-mono text-[0.78rem] text-cream/55")}>{formatDate(l.createdAt, { month: "short", day: "numeric" })} {formatTime(l.createdAt)}</td>
              <td className={cn(td, "text-cream/75")}>{l.actorEmail ?? "system"}</td>
              <td className={cn(td, "font-mono text-[0.8rem] text-caramel-light")}>{l.action}</td>
              <td className={cn(td, "text-cream/60")}>{l.entity}{l.entityId ? ` · ${l.entityId}` : ""}</td>
              <td className={cn(td, "max-w-md truncate font-mono text-[0.74rem] text-cream/40")} title={JSON.stringify(l.metadata)}>{JSON.stringify(l.metadata)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
