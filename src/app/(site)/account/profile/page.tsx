import { requireUser } from "@/lib/auth/session";
import { getUserProfile } from "@/server/queries/account";
import { ProfileForm } from "@/components/account/SettingsForms";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser("/account/profile");
  const profile = await getUserProfile(user.id);
  if (!profile) return null;
  return (
    <div className="max-w-2xl space-y-10">
      <header>
        <p className="eyebrow mb-3">Profile</p>
        <h1 className="font-display text-display-md text-cream">About you.</h1>
        <p className="mt-3 text-[0.9rem] text-cream/50">Member since {formatDate(profile.createdAt, { month: "long", year: "numeric" })}</p>
      </header>
      <ProfileForm name={profile.name} phone={profile.phone ?? ""} email={profile.email} />
    </div>
  );
}
