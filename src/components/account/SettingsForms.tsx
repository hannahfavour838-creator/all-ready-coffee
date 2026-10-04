"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox, FormError, FormSuccess, Input } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { changePasswordAction, deleteAccountAction, signOutEverywhereAction, updatePreferencesAction, updateProfileAction } from "@/server/actions/auth";
import type { ActionResult } from "@/server/result";

function Card({ title, body, children }: { title: string; body?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.5rem] border border-cream/[0.08] bg-espresso/40 p-6 md:p-8">
      <h2 className="font-display text-3xl text-cream">{title}</h2>
      {body && <p className="mt-2 text-[0.88rem] text-cream/50">{body}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function ProfileForm({ name, phone, email }: { name: string; phone: string; email: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(updateProfileAction, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <Card title="Personal details">
      <form action={action} className="space-y-5">
        <FormError message={state && !state.ok ? state.error : undefined} />
        <FormSuccess message={state?.ok ? "Profile saved." : undefined} />
        <Input label="Full name" name="name" defaultValue={name} autoComplete="name" error={fe?.name} />
        <Input label="Email" value={email} readOnly disabled hint="Contact us to change the email on your account." />
        <Input label="Phone" name="phone" type="tel" defaultValue={phone} autoComplete="tel" optional error={fe?.phone} hint="Shared with your courier only for active deliveries." />
        <Button type="submit" loading={pending}>Save changes</Button>
      </form>
    </Card>
  );
}

export function PreferencesForm({ marketing, sms }: { marketing: boolean; sms: boolean }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(updatePreferencesAction, null);
  useEffect(() => {
    if (state?.ok) toast("Preferences saved");
  }, [state]);
  return (
    <Card title="Notifications" body="Order updates always appear in your account. Choose what else you'd like to hear about.">
      <form action={action} className="space-y-5">
        <Checkbox name="sms" defaultChecked={sms} label="Text me delivery updates" description="Out for delivery and delivered messages." />
        <Checkbox name="marketing" defaultChecked={marketing} label="Seasonal drinks and offers" description="About two emails a month." />
        <Button type="submit" variant="subtle" loading={pending}>Save preferences</Button>
      </form>
    </Card>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(changePasswordAction, null);
  const ref = useRef<HTMLFormElement>(null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <Card title="Password" body="Changing your password signs you out on every other device.">
      <form ref={ref} action={action} className="space-y-5">
        <FormError message={state && !state.ok ? state.error : undefined} />
        <FormSuccess message={state?.ok ? "Password updated. Other sessions were signed out." : undefined} />
        <Input label="Current password" name="current" type="password" autoComplete="current-password" error={fe?.current} />
        <Input label="New password" name="next" type="password" autoComplete="new-password" error={fe?.next} hint="At least 10 characters, with a letter and a number." />
        <Input label="Confirm new password" name="confirm" type="password" autoComplete="new-password" error={fe?.confirm} />
        <Button type="submit" variant="subtle" loading={pending}>Update password</Button>
      </form>
    </Card>
  );
}

export function SessionsCard() {
  const [pending, start] = useTransition();
  return (
    <Card title="Sessions" body="Signed in somewhere you don't recognise? Sign out everywhere except this device.">
      <Button
        variant="outline"
        loading={pending}
        onClick={() =>
          start(async () => {
            const res = await signOutEverywhereAction();
            if (res.ok) { toast("Signed out of all other devices"); } else toast.error(res.error);
          })
        }
      >
        Sign out other devices
      </Button>
    </Card>
  );
}

export function DangerZone() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(deleteAccountAction, null);
  return (
    <section className="rounded-[1.5rem] border border-danger/20 p-6 md:p-8">
      <h2 className="font-display text-3xl text-cream">Delete account</h2>
      <p className="mt-2 text-[0.88rem] text-cream/50">Permanently removes your profile, addresses and favorites. Past receipts are kept anonymously for bookkeeping.</p>
      <Button variant="danger" className="mt-6" onClick={() => setOpen(true)}>Delete my account</Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Delete account?" side="center">
        <form action={action} className="space-y-5 p-6">
          <p className="text-[0.9rem] text-cream/65">This can&apos;t be undone. Enter your password to confirm.</p>
          <FormError message={state && !state.ok ? state.error : undefined} />
          <Input label="Password" name="password" type="password" autoComplete="current-password" data-autofocus error={state && !state.ok ? state.fieldErrors?.password : undefined} />
          <div className="flex gap-3">
            <Button type="submit" variant="danger" loading={pending}>Delete permanently</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Keep my account</Button>
          </div>
        </form>
      </Sheet>
    </section>
  );
}
