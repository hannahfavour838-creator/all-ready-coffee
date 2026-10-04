export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading">
      <div className="skeleton h-4 w-32" />
      <div className="skeleton h-12 w-80" />
      <div className="skeleton h-48 rounded-[1.75rem]" />
      <div className="skeleton h-64 rounded-[1.5rem]" />
    </div>
  );
}
