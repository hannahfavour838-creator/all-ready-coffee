import { requireStaff } from "@/lib/auth/session";
import { getSettingsMap, getZones } from "@/server/queries/admin";
import { PageHeader } from "@/components/admin/ui";
import { DeliveryManager } from "@/components/admin/DeliveryManager";

export const metadata = { title: "Delivery" };

export default async function AdminDelivery() {
  await requireStaff("admin");
  const [zones, settings] = await Promise.all([getZones(), getSettingsMap()]);
  return (
    <div>
      <PageHeader title="Delivery" description="Zones, fees and the estimates customers see. Estimates are shown as ranges and never promised as guarantees." />
      <DeliveryManager
        zones={zones}
        settings={{ prep: Number(settings.prep_minutes ?? 8), taxBps: Number(settings.tax_rate_bps ?? 0), paused: Boolean(settings.delivery_paused), notice: String(settings.delivery_notice ?? "") }}
      />
    </div>
  );
}
