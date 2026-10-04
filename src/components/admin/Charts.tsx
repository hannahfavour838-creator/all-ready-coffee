"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from "recharts";

/* Chart tokens — one series hue (caramel) validated ≥3:1 against the espresso surface; recessive grid & axes. */
const SERIES = "#c98a4e";
const GRID = "rgba(241,232,217,0.06)";
const AXIS = "rgba(241,232,217,0.42)";
const tick = { fill: AXIS, fontSize: 11, fontFamily: "var(--font-geist-mono)" };

const shortDay = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const usd = (v: number) => `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

function Tip({ active, payload, label, fmt, labelFmt }: TooltipProps<number, string> & { fmt: (v: number) => string; labelFmt?: (l: string) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-cream/10 bg-ink/95 px-3 py-2 shadow-xl backdrop-blur">
      <p className="font-mono text-[0.66rem] uppercase tracking-wider text-cream/45">{labelFmt ? labelFmt(String(label)) : label}</p>
      {payload.map((p) => (
        <p key={p.dataKey as string} className="mt-0.5 flex items-center gap-2 text-[0.84rem] text-cream">
          <span className="h-2 w-2 rounded-full" style={{ background: SERIES }} aria-hidden />
          {p.name}: <span className="tabular">{fmt(Number(p.value))}</span>
        </p>
      ))}
    </div>
  );
}

export function RevenueChart({ data }: { data: { day: string; revenue: number }[] }) {
  return (
    <div className="h-72" role="img" aria-label="Simulated revenue per day for the last 30 days">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES} stopOpacity={0.35} />
              <stop offset="100%" stopColor={SERIES} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="day" tickFormatter={shortDay} tick={tick} axisLine={false} tickLine={false} minTickGap={28} />
          <YAxis tickFormatter={usd} tick={tick} axisLine={false} tickLine={false} width={52} />
          <Tooltip content={<Tip fmt={(v) => `$${v.toFixed(2)}`} labelFmt={shortDay} />} cursor={{ stroke: "rgba(241,232,217,0.25)", strokeWidth: 1 }} />
          <Area type="monotone" dataKey="revenue" name="Revenue" stroke={SERIES} strokeWidth={2} fill="url(#rev)" activeDot={{ r: 5, stroke: "#160f0b", strokeWidth: 2, fill: SERIES }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const hourFmt = (h: string) => {
  const n = Number(h);
  return `${n % 12 || 12}${n < 12 ? "a" : "p"}`;
};

export function OrdersBarChart({ data, xKey, xFormat, label }: { data: Record<string, number | string>[]; xKey: string; xFormat: "hour" | "day"; label: string }) {
  const xFmt = xFormat === "hour" ? hourFmt : shortDay;
  return (
    <div className="h-64" role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={2}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey={xKey} tickFormatter={xFmt} tick={tick} axisLine={false} tickLine={false} minTickGap={16} />
          <YAxis allowDecimals={false} tick={tick} axisLine={false} tickLine={false} width={32} />
          <Tooltip content={<Tip fmt={(v) => `${v} orders`} labelFmt={xFmt} />} cursor={{ fill: "rgba(241,232,217,0.04)" }} />
          <Bar dataKey="orders" name="Orders" fill={SERIES} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GrowthChart({ data }: { data: { week: string; total: number }[] }) {
  return (
    <div className="h-64" role="img" aria-label="Total registered customers by week">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="week" tickFormatter={shortDay} tick={tick} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis allowDecimals={false} tick={tick} axisLine={false} tickLine={false} width={32} />
          <Tooltip content={<Tip fmt={(v) => `${v} customers`} labelFmt={(l) => `Week of ${shortDay(l)}`} />} cursor={{ stroke: "rgba(241,232,217,0.25)" }} />
          <Line type="monotone" dataKey="total" name="Customers" stroke={SERIES} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: "#160f0b", strokeWidth: 2, fill: SERIES }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Sparkline({ data }: { data: number[] }) {
  return (
    <div className="h-12" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data.map((v, i) => ({ i, v }))} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <Area type="monotone" dataKey="v" stroke={SERIES} strokeWidth={1.5} fill={SERIES} fillOpacity={0.12} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
