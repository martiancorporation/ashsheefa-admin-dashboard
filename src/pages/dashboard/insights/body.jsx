import { Users, MousePointerClick, Layers, Timer, Route } from "lucide-react";
import StatCard from "@/components/insights/stat-card";
import RankedBars from "@/components/insights/ranked-bars";
import TrendAreaChart from "@/components/insights/trend-area-chart";
import TimeRange from "@/components/insights/time-range";
import SourceBadge from "@/components/insights/source-badge";
import InsightDrawer from "@/components/insights/insight-drawer";
import LeadDrawer from "@/components/insights/lead-drawer";
import RecordList from "@/components/insights/record-list";
import { BLUE, TINT } from "@/components/insights/palette";
import {
  StatCardSkeleton,
  ListCardSkeleton,
  ChartCardSkeleton,
} from "@/components/insights/skeletons";

const fmt = (n) => Number(n || 0).toLocaleString("en-IN");

const ViewAll = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="shrink-0 whitespace-nowrap rounded-[8px] border border-[#EEEEEE] bg-[#F4F7FB] px-2.5 py-1.5 text-[12px] font-semibold text-[#636363] transition-colors hover:border-[#006ACA] hover:text-[#006ACA]"
  >
    View all ›
  </button>
);

const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/** "YYYY-MM-DD" -> "14 Sep" for the daily axis. */
const dayTick = (value) => {
  const [, m, d] = String(value).split("-");
  if (!m || !d) return value;
  return `${Number(d)} ${MONTH_ABBR[Number(m) - 1] || ""}`.trim();
};

const SectionHeading = ({ title, source, note }) => (
  <div className="flex items-center justify-between gap-3 pt-1">
    <h5 className="text-[14px] font-bold text-[#121212]">{title}</h5>
    <SourceBadge source={source} note={note} />
  </div>
);

/*
 * Sparklines need >= 3 points; StatCard divides by (length - 1).
 */
const series = (rows = [], key) => {
  const points = rows.map((r) => Number(r?.[key] || 0));
  return points.length >= 3 ? points : undefined;
};

export default function Body({
  loading,
  data,
  range,
  onRangeChange,
  drawer,
  openDrawer,
  closeDrawer,
  token,
  leadsOpen,
  openLeads,
  closeLeads,
}) {
  const traffic = data?.traffic || {};
  const tStats = traffic.stats || {};
  const byDay = traffic.byDay || [];
  const topPages = traffic.topPages || [];

  const audience = data?.audience || {};
  const leads = data?.leads || {};
  const lStats = leads.stats || {};
  const quality = data?.leadQuality || {};
  const bySpeciality = quality.bySpeciality || [];
  const byDoctor = quality.byDoctor || [];
  const appointmentStatus = quality.appointmentStatus || [];
  const byPackage = quality.byPackage || [];
  const byCountry = quality.byCountry || [];
  // Patient enquiries carry no country, so they rank as one row beside the
  // international ones (which are split by country).
  const enquiries = [
    { label: "Patient enquiry", leads: leads.leadType?.enquiry || 0 },
    ...byCountry.map((c) => ({ label: `International · ${c.label}`, leads: c.leads })),
  ]
    .filter((r) => r.leads > 0)
    .sort((a, b) => b.leads - a.leads);
  const collection = quality.collection || [];

  const pending = loading && !data;
  const refreshing = loading && !pending;
  const dim = refreshing ? "opacity-40" : "opacity-100";

  return (
    <>
      <div className="w-full flex items-center justify-between">
        <div className="flex items-center  space-x-2 ">
          <img
            src={"/assets/images/dashboard/leftArrow.svg"}
            alt="leftArrow"
            className="w-4 h-4"
          />
          <div className="w-[1.2px] h-[15px] bg-[#7F7F7F]"></div>
          <p className="text-[#4B4B4B] font-medium ">Insights</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13.5px] text-[#71717A]">
              Tracked visits and what patients asked for.
            </p>
            <TimeRange value={range} onChange={onRangeChange} />
          </div>

          <div className={`flex flex-col gap-4 transition-opacity duration-300 ${dim}`}>
            {/* First-party tracker. Deliberately kept alongside GA4 rather
                than replaced by it: it is the only source that knows a page is
                a *department*, *doctor* or *package* page. The two will never agree — GA4 sees visitors
                this beacon never recorded. */}
            <SectionHeading
              title="Tracked visits"
              source="tracker"
              note="first-party, counts department, doctor and package views"
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {pending ? (
                Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
              ) : (
                <>
                  <StatCard
                    title="Visitors"
                    total={fmt(tStats.visitors?.total)}
                    rate={tStats.visitors?.rate}
                    levelUp={tStats.visitors?.levelUp}
                    subtitle={`${fmt(audience.returning)} returning · ${audience.returning_rate || "0%"}`}
                    spark={series(byDay, "visitors")}
                    icon={Users}
                    color={BLUE[800]}
                    iconBg={TINT[800]}
                    iconColor={BLUE[800]}
                  />
                  <StatCard
                    title="Sessions"
                    total={fmt(tStats.sessions?.total)}
                    rate={tStats.sessions?.rate}
                    levelUp={tStats.sessions?.levelUp}
                    subtitle="visits, one per browser tab"
                    spark={series(byDay, "sessions")}
                    icon={MousePointerClick}
                    color={BLUE[600]}
                    iconBg={TINT[600]}
                    iconColor={BLUE[600]}
                  />
                  <StatCard
                    title="Page Views"
                    total={fmt(tStats.page_views?.total)}
                    rate={tStats.page_views?.rate}
                    levelUp={tStats.page_views?.levelUp}
                    subtitle="pages opened in range"
                    spark={series(byDay, "page_views")}
                    icon={Layers}
                    color={BLUE[500]}
                    iconBg={TINT[500]}
                    iconColor={BLUE[500]}
                  />
                  <StatCard
                    title="Pages / Session"
                    total={Number(tStats.pages_per_session?.total || 0).toFixed(1)}
                    rate={tStats.pages_per_session?.rate}
                    levelUp={tStats.pages_per_session?.levelUp}
                    subtitle="how deep a visit goes"
                    icon={Timer}
                    color={BLUE[900]}
                    iconBg={TINT[900]}
                    iconColor={BLUE[900]}
                  />
                </>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pending ? (
                <>
                  <div className="md:col-span-2">
                    <ListCardSkeleton rows={5} />
                  </div>
                  <ListCardSkeleton rows={5} action />
                </>
              ) : (
                <>
                  <div className="md:col-span-2">
                    <TrendAreaChart
                      title="Daily Traffic"
                      data={byDay}
                      xKey="day"
                      xTickFormatter={dayTick}
                      series={[
                        { key: "visitors", label: "Visitors", color: BLUE[800] },
                        { key: "sessions", label: "Sessions", color: BLUE[500] },
                        { key: "page_views", label: "Page Views", color: BLUE[300] },
                      ]}
                    />
                  </div>
                  <RankedBars
                    title="Top Pages"
                    labelHeader="Path"
                    valueHeader="Views"
                    accent={BLUE[300]}
                    valueKey="views"
                    metaKey="visitors"
                    metaLabel="visitors"
                    action={topPages.length > 6 ? <ViewAll onClick={() => openDrawer("pages")} /> : null}
                    items={topPages.slice(0, 6).map((p) => ({
                      label: p.path,
                      views: p.views,
                      visitors: p.visitors,
                    }))}
                    emptyText="No page views yet"
                  />
                </>
              )}
            </div>

            {/* ---------------- lead intelligence ---------------- */}
            <SectionHeading
              title="Bookings & enquiries"
              source="crm"
              note="already collected by the booking forms"
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {pending ? (
                Array.from({ length: 4 }).map((_, i) => <ListCardSkeleton key={i} rows={5} />)
              ) : (
                <>
                  <RankedBars
                    title="Appointments by Speciality"
                    labelHeader="Speciality"
                    valueHeader="Appointments"
                    accent={BLUE[800]}
                    valueKey="leads"
                    action={bySpeciality.length > 6 ? <ViewAll onClick={() => openDrawer("specialities")} /> : null}
                    items={bySpeciality.slice(0, 6)}
                    emptyText="No appointments yet"
                  />
                  <RankedBars
                    title="Top Doctors"
                    labelHeader="Doctor"
                    valueHeader="Appointments"
                    accent={BLUE[500]}
                    valueKey="leads"
                    action={byDoctor.length > 6 ? <ViewAll onClick={() => openDrawer("doctors")} /> : null}
                    items={byDoctor.slice(0, 6)}
                    emptyText="No appointments yet"
                  />
                  <RankedBars
                    title="Appointment Status"
                    subtitle="Every stage, including empty ones"
                    labelHeader="Stage"
                    valueHeader="Appointments"
                    accent={BLUE[900]}
                    valueKey="leads"
                    items={appointmentStatus}
                    emptyText="No appointments yet"
                  />
                  <RankedBars
                    title="Health Packages Booked"
                    labelHeader="Package"
                    valueHeader="Bookings"
                    accent={BLUE[300]}
                    valueKey="leads"
                    items={byPackage.slice(0, 6)}
                    emptyText="No checkup bookings yet"
                  />
                </>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pending ? (
                <>
                  <ListCardSkeleton rows={5} action />
                  <ListCardSkeleton rows={5} />
                  <ChartCardSkeleton height={120} />
                </>
              ) : (
                <>
                  <RankedBars
                    title="Enquiries"
                    subtitle="Patient & international"
                    labelHeader="Type"
                    valueHeader="Enquiries"
                    accent={BLUE[500]}
                    valueKey="leads"
                    items={enquiries.slice(0, 6)}
                    emptyText="No enquiries yet"
                  />
                  <RankedBars
                    title="Sample Collection"
                    subtitle="Checkups and tests"
                    labelHeader="Where"
                    valueHeader="Bookings"
                    accent={BLUE[300]}
                    valueKey="leads"
                    items={collection}
                    emptyText="No checkup or test bookings yet"
                  />
                  {/* Entry point to the journey drill-down. A card rather than a
                      sidebar route so the dashboard stays one page. */}
                  <button
                    type="button"
                    onClick={openLeads}
                    className="flex h-full w-full flex-col justify-center rounded-[10px] border-2 border-[#EEEEEE] bg-white p-5 text-left transition-colors hover:border-[#006ACA]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#DBECFF]">
                        <Route className="h-4 w-4" strokeWidth={1.6} color="#0056B2" />
                      </span>
                      <h6 className="text-[14px] font-bold text-[#121212]">
                        Patient Journeys
                      </h6>
                    </div>
                    <p className="mt-3 text-[26px] font-bold leading-none text-[#121212]">
                      {fmt(audience.attributed_leads)}
                      <span className="ml-2 text-[13px] font-normal text-[#9A9A9A]">
                        traceable bookings & enquiries
                      </span>
                    </p>
                    <p className="mt-3 text-[12px] leading-5 text-[#9A9A9A]">
                      See what each patient read before they booked — pages,
                      order and dates. Useful before the front desk calls.
                    </p>
                    <span className="mt-3 text-[12px] font-semibold text-[#006ACA]">
                      Open journeys ›
                    </span>
                  </button>
                </>
              )}
            </div>

          </div>
        </div>

        {/* ---------------- drawers ---------------- */}
        <InsightDrawer
          open={drawer === "pages"}
          onClose={closeDrawer}
          title="All Pages"
          subtitle={`${topPages.length} paths · sortable`}
          rows={topPages}
          searchKey="path"
          searchPlaceholder="Search paths…"
          rowKey="path"
          width={700}
          renderExpanded={(r) => (
            <RecordList records={r.records} total={r.requests} emptyText="No bookings or enquiries from this page's visitors" />
          )}
          note="Response rate = bookings & enquiries made by this page's visitors ÷ its views in the range. Click a row to see who responded."
          columns={[
            { key: "path", label: "Path" },
            { key: "views", label: "Views", numeric: true, sortable: true, render: (r) => fmt(r.views) },
            { key: "visitors", label: "Visitors", numeric: true, sortable: true, render: (r) => fmt(r.visitors) },
            { key: "requests", label: "Responses", numeric: true, sortable: true, render: (r) => fmt(r.requests) },
            {
              key: "conversion",
              label: "Response rate",
              numeric: true,
              sortable: true,
              render: (r) =>
                r.conversion === null || r.conversion === undefined ? (
                  "—"
                ) : (
                  <span className="font-semibold text-[#006ACA]">{r.conversion}%</span>
                ),
            },
          ]}
        />
        <InsightDrawer
          open={drawer === "specialities"}
          onClose={closeDrawer}
          title="All Specialities"
          subtitle={`${bySpeciality.length} specialities · sortable`}
          rows={bySpeciality}
          searchKey="label"
          searchPlaceholder="Search specialities…"
          columns={[
            { key: "label", label: "Speciality" },
            { key: "leads", label: "Appointments", numeric: true, sortable: true, render: (r) => fmt(r.leads) },
          ]}
        />
        <InsightDrawer
          open={drawer === "doctors"}
          onClose={closeDrawer}
          title="All Booked Doctors"
          subtitle={`${byDoctor.length} doctors · sortable`}
          rows={byDoctor}
          searchKey="label"
          searchPlaceholder="Search doctors…"
          columns={[
            { key: "label", label: "Doctor" },
            { key: "leads", label: "Appointments", numeric: true, sortable: true, render: (r) => fmt(r.leads) },
          ]}
        />
        {/* Mounted only while open — see LeadDrawer's header for why. */}
        {leadsOpen ? (
          <LeadDrawer open onClose={closeLeads} token={token} />
        ) : null}
      </div>
    </>
  );
}
