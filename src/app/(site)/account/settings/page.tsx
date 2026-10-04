import { requireUser } from "@/lib/auth/session";
import { getUserProfile } from "@/server/queries/account";
import { DangerZone, PasswordForm, PreferencesForm, SessionsCard } from "@/components/account/SettingsForms";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser("/account/settings");
  const profile = await getUserProfile(user.id);
  if (!profile) return null;
  return (
    <div className="max-w-2xl space-y-8">
      <header>
        <p className="eyebrow mb-3">Settings</p>
        <h1 className="font-display text-display-md text-cream">Your preferences.</h1>
      </header>
      <PreferencesForm marketing={profile.marketingOptIn} sms={profile.smsUpdates} />
      <PasswordForm />
      <SessionsCard />
      {user.role === "customer" && <DangerZone />}
    </div>
  );
}
