import { requireStaff } from "@/lib/auth/session";
import { getOptionGroups } from "@/server/queries/admin";
import { PageHeader } from "@/components/admin/ui";
import { CustomizationManager } from "@/components/admin/Managers";

export const metadata = { title: "Customizations" };

export default async function AdminCustomizations() {
  await requireStaff("admin");
  const groups = await getOptionGroups();
  return (
    <div>
      <PageHeader title="Customizations" description="Sizes, milks and extras. Mark an option out to hide it everywhere instantly — e.g. when oat milk runs out." />
      <CustomizationManager groups={groups} />
    </div>
  );
}
