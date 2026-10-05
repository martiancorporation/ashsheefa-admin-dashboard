import { useMemo } from "react";
import { Clock } from "lucide-react";
import { Label } from "@/components/ui/label";

// Time-slot picker for checkup & test bookings. The client wants date-only
// booking — patients walk in during the morning window. Flip to true to bring
// the slot picker back (add/edit/reschedule modals and exports follow this).
// Keep in sync with SHOW_TIME_SLOTS in the website's src/lib/labCollection.js.
export const SHOW_TIME_SLOTS = false;

// 30-minute slots from 9:00 AM; the last one starts at 5:30 PM (lab closes 6).
export const COLLECTION_SLOTS = Array.from({ length: 18 }, (_, i) => {
  const mins = 9 * 60 + i * 30;
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
});

// Walk-in window shown when time slots are hidden — matches the website.
export const COLLECTION_WINDOW_LABEL = "9:00 AM – 6:00 PM";

// The site shows today plus the next six days.
export const COLLECTION_DAYS = 7;

export const isOfferedSlot = (time) => COLLECTION_SLOTS.includes(time);

// Same rule as the website: on today, only slots at least 30 minutes away
// (rounded up to the next slot) are still open. Today stays bookable while
// any are left — i.e. until about 5:30 PM.
const slotsLeftToday = () => {
  const now = new Date();
  const earliest = now.getHours() * 60 + now.getMinutes() + 30;
  return COLLECTION_SLOTS.filter((slot) => {
    const [h, m] = slot.split(":").map(Number);
    return h * 60 + m >= earliest;
  });
};

// Home collection isn't offered yet — kept in the model so bookings that
// already carry it still read correctly, but not selectable.
export const COLLECTION_TYPES = [
  { value: "hospital", label: "Hospital visit", disabled: false },
  { value: "home", label: "Home collection", disabled: true },
];

// Local YYYY-MM-DD — toISOString() would shift the date backwards in IST.
const toLocalDateStr = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

// Slots are stored 24h ("08:30") — show them the way reception reads them.
const formatSlot = (time) => {
  if (!time) return "";
  const [h, m] = String(time).split(":").map(Number);
  if (isNaN(h)) return time;
  const suffix = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return `${hr}:${String(m || 0).padStart(2, "0")} ${suffix}`;
};

export function CollectionPicker({
  date,
  time,
  onDateChange,
  onTimeChange,
  currentDate,
  currentTime,
  dateLabel = "Collection Date",
  timeLabel = "Collection Time",
  dateRequired = false,
  timeRequired = false,
}) {
  const dateStrip = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = toLocalDateStr(today);

    const days = [...Array(COLLECTION_DAYS)].map((_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    });

    const current = currentDate ? new Date(currentDate) : null;
    if (current && !isNaN(current.getTime())) {
      current.setHours(0, 0, 0, 0);
      if (current < today) days.unshift(current);
    }

    const currentStr =
      current && !isNaN(current.getTime()) ? toLocalDateStr(current) : "";
    const todayClosed = slotsLeftToday().length === 0;

    return days.map((d) => {
      const value = toLocalDateStr(d);
      return {
        value,
        label:
          value === todayStr
            ? "Today"
            : d.toLocaleString("default", { weekday: "short" }),
        day: d.getDate(),
        month: d.toLocaleString("default", { month: "short" }),
        isPast: d < today,
        disabled: value === todayStr && todayClosed && value !== currentStr,
      };
    });
  }, [currentDate]);

  // On today, slots that have already gone by can't be picked.
  const isToday = date === toLocalDateStr(new Date());
  const openToday = isToday ? slotsLeftToday() : COLLECTION_SLOTS;

  const staleTime = currentTime && !isOfferedSlot(currentTime) ? currentTime : "";

  return (
    <>
      <div>
        <Label className="text-sm font-medium">
          {dateLabel}
          {dateRequired && <span className="text-red-500"> *</span>}
        </Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {dateStrip.map((d) => (
            <button
              key={d.value}
              type="button"
              disabled={d.disabled}
              onClick={() => onDateChange(d.value)}
              className={`w-16 py-2 rounded-xl border text-center leading-tight
                ${
                  date === d.value
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white border-slate-200 hover:border-blue-300"
                }
                ${d.disabled ? "opacity-40 cursor-not-allowed hover:border-slate-200" : ""}
                ${d.isPast && !d.disabled ? "opacity-60" : ""}`}
            >
              <span className="block text-[11px]">{d.label}</span>
              <span className="block text-base font-semibold">{d.day}</span>
              <span className="block text-[11px]">{d.month}</span>
            </button>
          ))}
        </div>
      </div>

      {!SHOW_TIME_SLOTS ? (
        <p className="flex items-start gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-2">
          <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0 text-slate-400" />
          <span>
            No time slot — the patient visits the hospital between{" "}
            <span className="font-semibold">{COLLECTION_WINDOW_LABEL}</span> on
            the selected date.
          </span>
        </p>
      ) : (
      <div>
        <Label className="text-sm font-medium">
          {timeLabel}
          {timeRequired && <span className="text-red-500"> *</span>}
        </Label>
        {staleTime && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 mt-2">
            This booking is stored at {formatSlot(staleTime)}, outside the
            collection window — pick a slot below to correct it.
          </p>
        )}
        <div className="grid grid-cols-4 gap-2 mt-2">
          {COLLECTION_SLOTS.map((slot) => (
            <button
              key={slot}
              type="button"
              disabled={!openToday.includes(slot) && slot !== currentTime}
              onClick={() => onTimeChange(slot)}
              className={`py-2 rounded-xl text-xs font-semibold border
                ${
                  time === slot
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white border-slate-200 hover:border-blue-400"
                }
                disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-200`}
            >
              {formatSlot(slot)}
            </button>
          ))}
        </div>
      </div>
      )}
    </>
  );
}
