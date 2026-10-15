/**
 * Stage-by-stage drop-off. Each bar is a share of the FIRST stage, and each
 * row also states its conversion from the stage directly above it — the
 * step-to-step rate is the one people actually act on, and it is the one that
 * is easy to eyeball wrongly from bar widths alone.
 */
export default function Funnel({ title, stages = [], note }) {
  const top = Number(stages?.[0]?.value || 0);

  return (
    <div className="flex h-full w-full flex-col rounded-[10px] border-2 border-[#EEEEEE] bg-white p-4">
      <h6 className="text-[14px] font-bold text-[#121212]">{title}</h6>

      <ul className="mt-4 flex flex-1 flex-col gap-3">
        {stages.map((stage, i) => {
          const value = Number(stage.value || 0);
          const prev = i === 0 ? null : Number(stages[i - 1].value || 0);
          const share = top > 0 ? (value / top) * 100 : 0;
          const stepRate = prev === null ? null : prev > 0 ? (value / prev) * 100 : 0;

          return (
            <li key={stage.label}>
              <div className="flex items-center justify-between gap-2 text-[13px]">
                <span className="truncate text-[#121212]">{stage.label}</span>
                <span className="shrink-0 font-semibold text-[#121212]">
                  {value.toLocaleString("en-IN")}
                  {stepRate !== null ? (
                    <span className="ml-1.5 font-normal text-[#0056B2]">
                      {stepRate.toFixed(stepRate < 10 ? 1 : 0)}%
                    </span>
                  ) : null}
                </span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#F2F4F7]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${share}%`, background: stage.color }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      {note ? <p className="mt-3 text-[11px] leading-4 text-[#9A9A9A]">{note}</p> : null}
    </div>
  );
}
