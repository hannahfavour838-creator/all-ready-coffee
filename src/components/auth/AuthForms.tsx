"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, FormError, Input } from "@/components/ui/field";
import { signInAction, signUpAction } from "@/server/actions/auth";
import type { ActionResult } from "@/server/result";

function PasswordInput({ error, label = "Password", name = "password", autoComplete, hint }: { error?: string; label?: string; name?: string; autoComplete: string; hint?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input label={label} name={name} type={show ? "text" : "password"} autoComplete={autoComplete} required minLength={autoComplete === "new-password" ? 10 : 1} maxLength={128} error={error} hint={hint} />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-[2.05rem] flex h-9 w-9 items-center justify-center rounded-full text-cream/45 hover:text-cream" aria-label={show ? "Hide password" : "Show password"}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function SignInForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(signInAction, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <FormError message={state && !state.ok && !fe ? state.error : state && !state.ok && fe && !fe.email && !fe.password ? state.error : undefined} />
      <Input label="Email" name="email" type="email" autoComplete="email" inputMode="email" required error={fe?.email} />
      <PasswordInput autoComplete="current-password" error={fe?.password} />
      <Button type="submit" size="lg" className="w-full" loading={pending}>Sign in</Button>
      <p className="text-center text-[0.86rem] text-cream/50">
        New to All Ready? <Link href={`/sign-up${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-caramel-light underline-offset-4 hover:underline">Create an account</Link>
      </p>
    </form>
  );
}

export function SignUpForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(signUpAction, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next ?? ""} />
      <FormError message={state && !state.ok ? state.error : undefined} />
      <Input label="Full name" name="name" autoComplete="name" required maxLength={80} error={fe?.name} />
      <Input label="Email" name="email" type="email" autoComplete="email" inputMode="email" required error={fe?.email} />
      <PasswordInput autoComplete="new-password" error={fe?.password} hint="At least 10 characters, with a letter and a number." />
      <Checkbox name="marketing" label="Send me new seasonal drinks and the occasional offer" description="No spam. Unsubscribe any time in Settings." />
      <Button type="submit" size="lg" className="w-full" loading={pending}>Create account</Button>
      <p className="text-center text-[0.86rem] text-cream/50">
        Already have an account? <Link href={`/sign-in${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-caramel-light underline-offset-4 hover:underline">Sign in</Link>
      </p>
    </form>
  );
}
