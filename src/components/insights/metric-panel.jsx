import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * A row of selectable KPIs above one chart that plots whichever is selected.
 *
 * Four KPIs on the same monthly axis would be four charts or one unreadable
 * one: enquiries and admissions differ by an order of magnitude, so a shared
 * y-axis flattens the smaller series into the baseline. Making the tiles the
 * selector keeps all four figures visible while only ever drawing one scale.
 */
export default function MetricPanel({ data = [], metrics = [], xKey = "month" }) {
  const [activeKey, setActiveKey] = useState(metrics?.[0]?.key);
  const active = metrics.find((m) => m.key === activeKey) || metrics[0];
  if (!active) return null;

  return (
    <div className="w-full rounded-[10px] border-2 border-[#EEEEEE] bg-white">
      <div className="grid grid-cols-2 border-b border-[#EEEEEE] md:grid-cols-4">
        {metrics.map((m) => {
          const isActive = m.key === active.key;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => setActiveKey(m.key)}
              className={`relative px-4 py-3 text-left transition-colors ${
                isActive ? "bg-[#FAFCFF]" : "hover:bg-[#FBFBFB]"
              }`}
            >
              <span
                className={`block text-[12px] font-medium ${
                  isActive ? "text-[#0056B2]" : "text-[#636363]"
                }`}
              >
                {m.label}
              </span>
              <span className="mt-1 flex items-baseline gap-1.5">
                <span className="text-[20px] font-bold leading-none text-[#121212]">
                  {m.value}
                </span>
                {m.rate ? (
                  <span
                    className={`text-[11px] font-semibold ${
                      m.levelUp ? "text-[#12B76A]" : "text-[#E42D3E]"
                    }`}
                  >
                    {m.levelUp ? "↗" : "↘"} {m.rate}
                  </span>
                ) : null}
              </span>
              {/* Underline marks the plotted series and is coloured to match the
                  chart's stroke, so the tile and the line are visibly the same
                  thing rather than two independent blue elements. */}
              {isActive ? (
                <span
                  className="absolute inset-x-4 -bottom-px h-[2px] rounded-full"
                  style={{ background: m.color }}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="p-4">
        {active.subtitle ? (
          <p className="mb-2 text-[12px] text-[#9A9A9A]">{active.subtitle}</p>
        ) : null}
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 6, right: 6, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="metric-panel-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={active.color} stopOpacity={0.26} />
                  <stop offset="100%" stopColor={active.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F2F4F7" vertical={false} />
              <XAxis
                dataKey={xKey}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#9A9A9A", fontSize: 11 }}
                tickFormatter={(m) => String(m).slice(0, 3)}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#9A9A9A", fontSize: 11 }}
                allowDecimals={false}
                width={44}
              />
              <Tooltip
                cursor={{ stroke: "#D8DEE7" }}
                content={({ active: on, payload, label }) =>
                  on && payload?.length ? (
                    <div className="rounded-[8px] border border-[#EEEEEE] bg-white px-3 py-2 shadow-lg">
                      <p className="text-[12px] font-semibold text-[#121212]">{label}</p>
                      <p className="mt-0.5 text-[12px]" style={{ color: active.color }}>
                        {active.label} :{" "}
                        <span className="font-semibold">
                          {Number(payload[0].value || 0).toLocaleString("en-IN")}
                        </span>
                      </p>
                    </div>
                  ) : null
                }
              />
              <Area
                type="monotone"
                dataKey={active.seriesKey}
                stroke={active.color}
                strokeWidth={2}
                fill="url(#metric-panel-fill)"
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
