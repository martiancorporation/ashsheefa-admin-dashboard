/**
 * Marks which system a panel's numbers came from.
 *
 * Worth the pixels because the page mixes three very different sources: GA4
 * counts every visitor but knows nothing of courses or leads, the first-party
 * tracker knows the domain but only sees what it is told, and the hospital's
 * collections count submitted requests. Without the label, GA4's "64 active
 * users" and the tracker's "486 visitors" read as a contradiction rather than
 * two different questions, and someone will eventually divide one by the other.
 */
/* Blue steps for the two measured sources, neutral grey for the record
   collections, one mid step for the join — same single-hue rule as the charts
   (see palette.js), so a badge never looks like a data series. */
const SOURCES = {
  ga4: { label: "GA4", tone: "bg-[#EAF3FF] text-[#0056B2]" },
  tracker: { label: "SITE TRACKER", tone: "bg-[#DBECFF] text-[#00448C]" },
  crm: { label: "HOSPITAL RECORDS", tone: "bg-[#F1F5F9] text-[#64748B]" },
  // Panels that only exist by joining the tracker to the records on visitor_id.
  joined: { label: "TRACKER × RECORDS", tone: "bg-[#E0F2FE] text-[#248EFF]" },
};

export default function SourceBadge({ source = "tracker", note }) {
  const { label, tone } = SOURCES[source] || SOURCES.tracker;
  return (
    <div className="flex items-center gap-2 shrink-0">
      <span className={`rounded-[6px] px-2 py-[3px] text-[10px] font-bold tracking-wide ${tone}`}>
        {label}
      </span>
      {note ? <span className="text-[11px] text-[#9A9A9A]">{note}</span> : null}
    </div>
  );
}
