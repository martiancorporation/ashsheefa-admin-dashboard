import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Search,
  X,
  FileText,
  Stethoscope,
  Building2,
  ClipboardCheck,
  Send,
  Globe,
  Loader2,
} from "lucide-react";
import API from "@/api";
import { BLUE, NEUTRAL } from "./palette";

/* One hue for the whole page (see palette.js), so the request kinds are
   separated by weight rather than by colour. */
const KIND_STYLE = {
  appointment: { label: "Appointment", tone: "bg-[#DBECFF] text-[#0056B2]" },
  checkup: { label: "Health Checkup", tone: "bg-[#EAF3FF] text-[#248EFF]" },
  test: { label: "Test Booking", tone: "bg-[#E0F2FE] text-[#006ACA]" },
  enquiry: { label: "Enquiry", tone: "bg-[#F1F5F9] text-[#64748B]" },
  international: { label: "International", tone: "bg-[#EEF4FF] text-[#00448C]" },
};

const EVENT_STYLE = {
  doctor_view: { icon: Stethoscope, label: "Viewed doctor", color: BLUE[800] },
  department_view: { icon: Building2, label: "Viewed department", color: BLUE[700] },
  package_view: { icon: ClipboardCheck, label: "Opened health package", color: BLUE[500] },
  request_submitted: { icon: Send, label: "Submitted request", color: BLUE[900] },
  blog_view: { icon: FileText, label: "Read blog", color: BLUE[300] },
  // Ambient page views are the noise in a journey, so they sit back in grey.
  page_view: { icon: Globe, label: "Opened page", color: NEUTRAL.muted },
};

const TYPES = [
  { key: "all", label: "All" },
  { key: "appointment", label: "Appointments" },
  { key: "checkup", label: "Checkups" },
  { key: "test", label: "Tests" },
  { key: "enquiry", label: "Enquiries" },
  { key: "international", label: "International" },
];

const fmtDate = (v) =>
  v
    ? new Date(v).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const fmtDateTime = (v) =>
  v
    ? new Date(v).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

/**
 * Two-level drawer: a list of attributed leads, and one lead's browsing
 * timeline: what a patient read before they booked, which is what the front
 * desk wants before picking up the phone.
 *
 * Both levels live in one slide-over rather than a route, so the dashboard
 * underneath is never lost. Data is fetched on open, not with the dashboard:
 * it is paginated and searchable, and most visits never open it.
 *
 * Mounted only while open (the parent renders it conditionally), so filters and
 * the selected lead reset naturally on close. An earlier version reset them in
 * an effect instead, which fired a second query every time the drawer was
 * reopened after filtering.
 */
export default function LeadDrawer({ open, onClose, token }) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);

  const [type, setType] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // null = list view; a lead object = its journey view.
  const [selected, setSelected] = useState(null);
  const [journey, setJourney] = useState(null);
  const [journeyLoading, setJourneyLoading] = useState(false);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    API.insight
      .getLeads(token, { page, limit: 20, type, search })
      .then((res) => {
        if (!res) return;
        setRows(res.data || []);
        setMeta(res.meta || null);
      })
      .finally(() => setLoading(false));
  }, [token, page, type, search]);

  // Debounced, because this fires on every keystroke in the search box and each
  // run is a database query.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [open, load, search]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      // Escape steps back to the list first, and only then closes — otherwise
      // reading one journey and hitting Escape loses the whole list and filters.
      if (selected) setSelected(null);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose, selected]);

  const openJourney = (lead) => {
    setSelected(lead);
    setJourney(null);
    setJourneyLoading(true);
    API.insight
      .getLeadJourney(token, lead.visitor_id)
      .then((res) => setJourney(res || null))
      .finally(() => setJourneyLoading(false));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} role="presentation" />

      <aside className="relative flex h-full w-full max-w-[620px] flex-col bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-[#EEEEEE] px-5 py-4">
          <div className="flex min-w-0 items-start gap-2">
            {selected ? (
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Back to requests"
                className="mt-0.5 shrink-0 rounded-[8px] p-1 text-[#636363] hover:bg-[#F2F2F2]"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : null}
            <div className="min-w-0">
              <h5 className="truncate text-[15px] font-bold text-[#121212]">
                {selected ? selected.name || "Patient" : "Patient Journeys"}
              </h5>
              <p className="mt-0.5 text-[12px] text-[#9A9A9A]">
                {selected
                  ? `${KIND_STYLE[selected.kind]?.label} · ${fmtDate(selected.createdAt)}`
                  : meta
                    ? `${meta.totalRequests} requests traceable to a tracked visit`
                    : "Loading…"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-[8px] p-1.5 text-[#636363] hover:bg-[#F2F2F2]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {selected ? (
          <JourneyView lead={selected} journey={journey} loading={journeyLoading} />
        ) : (
          <>
            <div className="flex flex-col gap-2 border-b border-[#EEEEEE] px-5 py-3">
              <div className="flex items-center gap-2 rounded-[8px] border border-[#EEEEEE] bg-[#FBFBFB] px-3 py-2">
                <Search className="h-3.5 w-3.5 shrink-0 text-[#9A9A9A]" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search name, phone or doctor…"
                  className="w-full bg-transparent text-[13px] text-[#121212] outline-none placeholder:text-[#9A9A9A]"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {TYPES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => {
                      setType(t.key);
                      setPage(1);
                    }}
                    className={`rounded-[7px] px-2.5 py-1 text-[12px] font-semibold transition-colors ${
                      type === t.key
                        ? "bg-[#006ACA] text-white"
                        : "bg-[#F4F7FB] text-[#636363] hover:text-[#006ACA]"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading && rows.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-12 text-[12px] text-[#9A9A9A]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading requests…
                </div>
              ) : rows.length === 0 ? (
                <p className="px-5 py-12 text-center text-[12px] leading-5 text-[#9A9A9A]">
                  No traceable requests yet.
                  <br />
                  Only submissions made after the tracker went live can be linked
                  to a browsing session.
                </p>
              ) : (
                <ul className={loading ? "opacity-50 transition-opacity" : ""}>
                  {rows.map((lead) => {
                    const kind = KIND_STYLE[lead.kind] || KIND_STYLE.enquiry;
                    return (
                      <li key={`${lead.kind}-${lead._id}`}>
                        <button
                          type="button"
                          onClick={() => openJourney(lead)}
                          className="w-full border-b border-[#F5F5F5] px-5 py-3 text-left hover:bg-[#FBFBFB]"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="truncate text-[13px] font-semibold text-[#121212]">
                              {lead.name || "—"}
                            </span>
                            <span
                              className={`shrink-0 rounded-[6px] px-1.5 py-[2px] text-[10px] font-bold ${kind.tone}`}
                            >
                              {kind.label}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center justify-between gap-3 text-[12px] text-[#9A9A9A]">
                            <span className="truncate">
                              {[lead.phone, lead.detail].filter(Boolean).join(" · ") || "—"}
                            </span>
                            <span className="shrink-0">{fmtDate(lead.createdAt)}</span>
                          </div>
                          <div className="mt-1 text-[11px] text-[#006ACA]">
                            {lead.journey
                              ? `${lead.journey.pages} pages · ${lead.journey.events} events · ${lead.journey.days} day${lead.journey.days === 1 ? "" : "s"} before booking`
                              : "No tracked browsing found"}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {meta && meta.totalPages > 1 ? (
              <footer className="flex items-center justify-between border-t border-[#EEEEEE] px-5 py-3">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-[8px] border border-[#EEEEEE] px-3 py-1.5 text-[12px] font-semibold text-[#636363] disabled:opacity-40 hover:enabled:text-[#006ACA]"
                >
                  Previous
                </button>
                <span className="text-[12px] text-[#9A9A9A]">
                  Page {meta.currentPage} of {meta.totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-[8px] border border-[#EEEEEE] px-3 py-1.5 text-[12px] font-semibold text-[#636363] disabled:opacity-40 hover:enabled:text-[#006ACA]"
                >
                  Next
                </button>
              </footer>
            ) : null}
          </>
        )}
      </aside>
    </div>
  );
}

/** One lead's browsing timeline, oldest first — the order they read it in. */
function JourneyView({ lead, journey, loading }) {
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-[12px] text-[#9A9A9A]">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading journey…
      </div>
    );
  }

  const events = journey?.events || [];

  return (
    <div className="flex-1 overflow-y-auto">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-b border-[#EEEEEE] px-5 py-4 text-[12px]">
        {[
          ["Phone", lead.phone],
          ["Request", lead.detail],
          ["Status", lead.status],
        ]
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-[#9A9A9A]">{k}</dt>
              <dd className="truncate font-medium text-[#121212]">{v}</dd>
            </div>
          ))}
      </dl>

      {events.length === 0 ? (
        <p className="px-5 py-12 text-center text-[12px] text-[#9A9A9A]">
          No tracked browsing for this visitor.
        </p>
      ) : (
        <ol className="px-5 py-4">
          {events.map((e, i) => {
            const style = EVENT_STYLE[e.event_type] || EVENT_STYLE.page_view;
            const Icon = style.icon;
            const last = i === events.length - 1;
            return (
              <li key={i} className="relative flex gap-3 pb-4">
                {/* Connector, omitted on the last item so the line does not
                    dangle past the final event. */}
                {!last ? (
                  <span className="absolute left-[11px] top-6 h-full w-px bg-[#DFE3E8]" />
                ) : null}
                <span
                  className="relative z-10 mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-[#EEEEEE]"
                  style={{ color: style.color }}
                >
                  <Icon className="h-3 w-3" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[13px] text-[#121212]">
                      {e.entity_label || e.path || e.entity_slug}
                    </span>
                    <span className="shrink-0 text-[11px] text-[#9A9A9A]">
                      {fmtDateTime(e.occurred_at)}
                    </span>
                  </div>
                  <span className="text-[11px]" style={{ color: style.color }}>
                    {style.label}
                    {e.utm_campaign ? ` · ${e.utm_campaign}` : ""}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {journey?.meta?.truncated ? (
        <p className="border-t border-[#EEEEEE] px-5 py-3 text-[11px] text-[#9A9A9A]">
          Showing the first {journey.meta.returned} of {journey.meta.total} events.
        </p>
      ) : null}
    </div>
  );
}
