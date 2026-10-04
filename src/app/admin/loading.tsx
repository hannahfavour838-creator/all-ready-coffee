export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading">
      <div className="skeleton h-10 w-72" />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}</div>
      <div className="skeleton h-80 rounded-2xl" />
    </div>
  );
}
