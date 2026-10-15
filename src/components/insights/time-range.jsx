import { useState } from "react";
import { format } from "date-fns";
import { DatePickerWithRange } from "@/components/ui/date-range-filter";

const RANGES = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "year", label: "Year" },
  { key: "all", label: "All" },
];

/* A custom window rides in the same string as the named ranges, so the pages
   keep one piece of state: "custom:YYYY-MM-DD:YYYY-MM-DD". */
const parseCustom = (value) => {
  const [name, from, to] = String(value || "").split(":");
  if (name !== "custom" || !from || !to) return null;
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return { from: new Date(fy, fm - 1, fd), to: new Date(ty, tm - 1, td) };
};

const EMPTY = { from: undefined, to: undefined };

export default function TimeRange({ value, onChange }) {
  const custom = parseCustom(value);

  /* Picking a range takes two clicks, and the first one lands as
     { from, to: undefined }. That is not a range worth fetching yet, so it is
     held here — without it the half-made selection has nowhere to live and the
     calendar clears itself on every first click. */
  const [draft, setDraft] = useState(null);
  const selected = draft || custom || EMPTY;

  const handleDateChange = (range) => {
    if (range?.from && range?.to) {
      setDraft(null);
      onChange(
        `custom:${format(range.from, "yyyy-MM-dd")}:${format(range.to, "yyyy-MM-dd")}`
      );
      return;
    }
    setDraft(range?.from ? range : null);
    // Cleared outright: fall back to the default named range.
    if (!range?.from && custom) onChange("30d");
  };

  const selectNamed = (key) => {
    setDraft(null);
    onChange(key);
  };

  return (
    <div className="inline-flex flex-wrap items-center gap-2">
      <div className="inline-flex items-center gap-1 rounded-[10px] border-2 border-[#EEEEEE] bg-white p-1">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => selectNamed(r.key)}
            className={`rounded-[7px] px-3 py-1 text-[12px] font-semibold transition-colors ${
              value === r.key
                ? "bg-[#006ACA] text-white"
                : "text-[#636363] hover:bg-[#F4F7FB]"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <DatePickerWithRange
        value={selected}
        onDateChange={handleDateChange}
        toDate={new Date()}
        triggerClassName={`h-[34px] rounded-[10px] border-2 border-[#EEEEEE] text-[12px] font-semibold ${
          custom ? "bg-[#006ACA] text-white hover:bg-[#0059ab] hover:text-white" : "bg-white text-[#636363]"
        }`}
        clearClassName="h-[34px] w-[34px]"
      />
    </div>
  );
}
