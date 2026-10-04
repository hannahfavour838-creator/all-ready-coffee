const SERIES = "#c98a4e";

/** Horizontal bar list (server-renderable; values formatted by the caller). */
export function HBarList({ data }: { data: { name: string; value: number; label: string }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-3.5">
      {data.map((d) => (
        <li key={d.name} className="group" title={`${d.name}: ${d.label}`}>
          <div className="mb-1.5 flex justify-between gap-3 text-[0.84rem]">
            <span className="truncate text-cream/80">{d.name}</span>
            <span className="font-mono tabular text-cream/60">{d.label}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-cream/[0.05]">
            <div className="h-full rounded-full transition-[filter] group-hover:brightness-125" style={{ width: `${(d.value / max) * 100}%`, background: SERIES }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

