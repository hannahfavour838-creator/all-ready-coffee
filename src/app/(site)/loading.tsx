import { LogoMark } from "@/components/brand/Logo";

export default function Loading() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center" role="status" aria-label="Loading">
      <div className="relative h-14 w-14">
        <span className="absolute inset-0 animate-pulse-ring rounded-full border border-caramel/40" />
        <LogoMark className="relative h-14 w-14 animate-pulse" />
      </div>
    </div>
  );
}
