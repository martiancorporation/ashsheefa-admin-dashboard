/**
 * A leaderboard: label, value, and a bar showing each row's share of the
 * leader. Used for sources, devices, pages, courses, programmes and blogs.
 *
 * Bars are scaled against the top row rather than the column total, so the
 * shape stays readable when one row dominates — with a total-based scale a
 * long tail collapses into invisible slivers.
 */
export default function RankedBars({
  title,
  subtitle,
  labelHeader,
  valueHeader,
  items = [],
  valueKey = "views",
  metaKey,
  metaLabel,
  accent = "#0056B2",
  action = null,
  emptyText = "No data yet",
  // Puts the meta figure ahead of the value, for rows where the meta is the
  // wider number and the value is the one being ranked.
  metaFirst = false,
}) {
  const max = Math.max(...items.map((i) => Number(i?.[valueKey] || 0)), 1);

  return (
    <div className="flex h-full w-full flex-col rounded-[10px] border-2 border-[#EEEEEE] bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h6 className="text-[14px] font-bold text-[#121212]">{title}</h6>
          {subtitle ? (
            <p className="mt-0.5 text-[12px] text-[#9A9A9A]">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>

      {items.length === 0 ? (
        <p className="flex flex-1 items-center justify-center py-8 text-[12px] text-[#9A9A9A]">
          {emptyText}
        </p>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-[#9A9A9A]">
            <span>{labelHeader}</span>
            <span>{valueHeader}</span>
          </div>

          <ul className="mt-2 flex flex-col gap-3">
            {items.map((item, i) => {
              const value = Number(item?.[valueKey] || 0);
              return (
                <li key={`${item.label}-${i}`}>
                  <div className="flex items-center justify-between gap-3 text-[13px] text-[#121212]">
                    <span className="min-w-0 flex-1 truncate" title={item.label}>
                      {item.label}
                    </span>
                    <span className="shrink-0 font-semibold">
                      {metaKey && metaFirst ? (
                        <span className="mr-1.5 font-normal text-[#9A9A9A]">
                          {Number(item[metaKey] || 0).toLocaleString("en-IN")} {metaLabel}
                        </span>
                      ) : null}
                      {Number(value).toLocaleString("en-IN")}
                      {metaKey && !metaFirst ? (
                        <span className="ml-1 font-normal text-[#9A9A9A]">
                          · {Number(item[metaKey] || 0).toLocaleString("en-IN")} {metaLabel}
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[#F2F4F7]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${(value / max) * 100}%`, background: accent }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
