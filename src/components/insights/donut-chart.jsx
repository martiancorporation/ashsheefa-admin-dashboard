import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

/**
 * Composition of a single total. Deliberately capped at a handful of slices —
 * past that a ranked list beats a donut, which is why the lead-source and page
 * breakdowns use RankedBars instead.
 */
export default function DonutChart({ title, data = [], centerLabel }) {
  const total = data.reduce((sum, d) => sum + Number(d.value || 0), 0);

  return (
    <div className="flex h-full w-full flex-col rounded-[10px] border-2 border-[#EEEEEE] bg-white p-4">
      <h6 className="text-[14px] font-bold text-[#121212]">{title}</h6>

      {total === 0 ? (
        <p className="flex flex-1 items-center justify-center py-8 text-[12px] text-[#9A9A9A]">
          No data yet
        </p>
      ) : (
        /* Stacked, not side-by-side: this card sits in a quarter-width grid
           column, and beside the donut the legend had so little room that the
           series names truncated away to nothing, leaving bare numbers. */
        <div className="mt-2 flex flex-1 flex-col items-center gap-3">
          <div className="relative h-[140px] w-[140px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  innerRadius={45}
                  outerRadius={66}
                  paddingAngle={2}
                  stroke="none"
                >
                  {data.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Centred over the hole rather than rendered as a Recharts label,
                which cannot do two lines with different type sizes. */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] text-[#9A9A9A]">{centerLabel}</span>
              <span className="text-[18px] font-bold text-[#121212]">
                {total.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          <ul className="flex w-full min-w-0 flex-col gap-2">
            {data.map((d) => (
              <li key={d.name} className="flex items-center gap-2 text-[12px]">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: d.color }}
                />
                <span className="min-w-0 flex-1 truncate text-[#636363]">{d.name}</span>
                <span className="shrink-0 font-semibold text-[#121212]">
                  {Number(d.value || 0).toLocaleString("en-IN")}
                </span>
                <span className="shrink-0 text-[11px] text-[#9A9A9A]">
                  {total > 0 ? Math.round((d.value / total) * 100) : 0}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
