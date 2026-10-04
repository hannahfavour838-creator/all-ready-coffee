import "server-only";
import { AuthError } from "@/lib/auth/session";
import { fail } from "./result";

/** Wraps a server action body so unexpected errors never leak stack traces to the client. */
export async function guarded<T>(fn: () => Promise<T>): Promise<T | ReturnType<typeof fail>> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof AuthError) {
      return err.code === "unauthenticated"
        ? fail("Please sign in to continue.", { code: "unauthenticated" })
        : fail("You don't have permission to do that.", { code: "forbidden" });
    }
    // Next.js control-flow errors (redirect / notFound) must propagate.
    if (err && typeof err === "object" && "digest" in err && typeof (err as { digest?: unknown }).digest === "string" && (err as { digest: string }).digest.startsWith("NEXT_")) throw err;
    const ref = Math.random().toString(36).slice(2, 8).toUpperCase();
    console.error(`[action:${ref}]`, err);
    return fail(`Something went wrong on our side. Please try again. (ref ${ref})`);
  }
}
