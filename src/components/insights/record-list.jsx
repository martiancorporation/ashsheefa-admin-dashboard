import { Phone } from "lucide-react";

// Enough to act on from the drawer; the full list is Patient Journeys.
const SHOWN = 25;

const KIND_LABEL = {
  appointment: "Appointment",
  checkup: "Health checkup",
  test: "Test booking",
  enquiry: "Enquiry",
  international: "International",
};

const formatDate = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

/**
 * The people behind one drawer row — Sabar's RecordList, for patients: what the
 * front desk needs to go from "this doctor is in demand" to "here is who to
 * call". Newest first.
 */
export default function RecordList({ records = [], total = records.length, emptyText = "No bookings yet" }) {
  if (!records.length) {
    return <p className="py-3 text-[12px] text-[#9A9A9A]">{emptyText}</p>;
  }

  const rows = records.slice(0, SHOWN);

  return (
    <div className="rounded-[8px] border border-[#EEEEEE] bg-white">
      <ul className="divide-y divide-[#F2F2F2]">
        {rows.map((row) => (
          <li key={`${row.kind}-${row._id}`} className="flex items-center gap-3 px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-medium text-[#121212]">{row.name || "Unnamed"}</p>
              <p className="truncate text-[11px] text-[#9A9A9A]">
                {[KIND_LABEL[row.kind] || row.kind, row.detail, formatDate(row.createdAt)]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            {row.status ? (
              <span className="shrink-0 text-[11.5px] font-medium text-[#636363]">{row.status}</span>
            ) : null}
            <div className="flex shrink-0 items-center gap-0.5">
              {row.phone ? (
                <a
                  href={`tel:${row.phone}`}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Call ${row.name || "patient"}`}
                  className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-[#F2F2F2]"
                >
                  <Phone className="h-3.5 w-3.5 text-[#636363]" />
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {total > SHOWN ? (
        <p className="border-t border-[#F2F2F2] px-3 py-2 text-[11px] text-[#9A9A9A]">
          Showing the latest {SHOWN} of {total.toLocaleString("en-IN")}
        </p>
      ) : null}
    </div>
  );
}
