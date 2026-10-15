import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/** Shared tooltip: dark card, one row per series, values right-aligned. */
function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[8px] border border-[#EEEEEE] bg-white px-3 py-2 shadow-lg">
      <p className="text-[12px] font-semibold text-[#121212]">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="mt-0.5 text-[12px]" style={{ color: entry.color }}>
          {entry.name} : <span className="font-semibold">{Number(entry.value || 0).toLocaleString("en-IN")}</span>
        </p>
      ))}
    </div>
  );
}

/** Month names slice to three letters; anything else is left to the caller. */
const shortMonth = (m) => String(m).slice(0, 3)

export default function TrendAreaChart({
  title,
  data = [],
  series = [],
  height = 260,
  xKey = "month",
  xTickFormatter = shortMonth,
}) {
  return (
    <div className="flex h-full w-full flex-col rounded-[10px] border-2 border-[#EEEEEE] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h6 className="text-[14px] font-bold text-[#121212]">{title}</h6>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-4">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-[12px] text-[#636363]">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>

      <div className="mt-3 w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
            <defs>
              {series.map((s) => (
                <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F7" vertical={false} />
            <XAxis
              dataKey={xKey}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#9A9A9A", fontSize: 11 }}
              minTickGap={24}
              tickFormatter={xTickFormatter}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#9A9A9A", fontSize: 11 }}
              allowDecimals={false}
              width={44}
            />
            <Tooltip content={<TrendTooltip />} cursor={{ stroke: "#D8DEE7" }} />
            {series.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                fill={`url(#fill-${s.key})`}
                connectNulls
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
