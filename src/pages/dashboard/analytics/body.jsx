import { Users, MousePointerClick, Gauge, Timer } from "lucide-react";
import StatCard from "@/components/insights/stat-card";
import RankedBars from "@/components/insights/ranked-bars";
import DonutChart from "@/components/insights/donut-chart";
import TrendAreaChart from "@/components/insights/trend-area-chart";
import Funnel from "@/components/insights/funnel";
import MetricPanel from "@/components/insights/metric-panel";
import TimeRange from "@/components/insights/time-range";
import SourceBadge from "@/components/insights/source-badge";
import InsightDrawer from "@/components/insights/insight-drawer";
import RecordList from "@/components/insights/record-list";
import GeoMap from "@/components/insights/geo-map";
import { BLUE, TINT, SERIES_4, FUNNEL_5 } from "@/components/insights/palette";
import {
  StatCardSkeleton,
  ListCardSkeleton,
  ChartCardSkeleton,
  MetricPanelSkeleton,
  MapCardSkeleton,
} from "@/components/insights/skeletons";

const fmt = (n) => Number(n || 0).toLocaleString("en-IN");

const RANGE_LABELS = {
  today: "today",
  "7d": "last 7 days",
  "30d": "last 30 days",
  "90d": "last 90 days",
  year: "this year",
  all: "all time",
};

// GA4 hands engagementRate back as a 0..1 fraction, not a percentage.
const pct = (n) => `${(Number(n || 0) * 100).toFixed(1)}%`;

// Seconds -> "7m 14s" / "42s".
const duration = (seconds) => {
  const total = Math.round(Number(seconds) || 0);
  const m = Math.floor(total / 60);
  return m ? `${m}m ${total % 60}s` : `${total}s`;
};

/*
 * Sparklines are drawn from the real per-day series. Below three points there
 * is no trend to show, and StatCard divides by (length - 1), which is a
 * divide-by-zero at a single point.
 */
const series = (rows = [], key) => {
  const points = rows.map((r) => Number(r?.[key] || 0));
  return points.length >= 3 ? points : undefined;
};

// GA4 dimension format: 20260908.
const ymd = (d) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate(),
  ).padStart(2, "0")}`;

// The API echoes its window as GA4 wrote it: "7daysAgo".."today", or explicit
// YYYY-MM-DD when a custom range was picked.
const boundary = (token) => {
  const text = String(token || "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return new Date(`${text}T00:00:00`);
  const day = new Date();
  day.setHours(0, 0, 0, 0);
  const ago = text.match(/^(\d+)daysAgo$/);
  if (ago) day.setDate(day.getDate() - Number(ago[1]));
  else if (text === "yesterday") day.setDate(day.getDate() - 1);
  return day;
};

/*
 * GA4 emits a by_date row only for days that saw traffic. On a quiet site that
 * is two or three rows for a 30-day window, which `series` rejects as too short
 * and the sparklines vanish — the metric is real, the shape of it just isn't
 * being sent. Expand to one row per day across the window and let the silent
 * days read as the zeros they are.
 */
const fillDays = (rows = [], dateRange) => {
  const start = boundary(dateRange?.startDate);
  const end = boundary(dateRange?.endDate);
  const span = Math.round((end - start) / 86400000);
  if (!dateRange?.startDate || !Number.isFinite(span) || span < 2 || span > 400)
    return rows;

  const byDate = new Map(rows.map((r) => [String(r?.date), r]));
  return Array.from({ length: span + 1 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const key = ymd(day);
    return byDate.get(key) || { date: key };
  });
};

/*
 * GA4's newVsReturning is a three-bucket dimension: "new", "returning", and an
 * empty value for sessions it could not classify (no prior cookie to compare
 * against — a first hit under denied consent, or storage cleared mid-session).
 * Held in a fixed order so the card reads the same regardless of how GA4 sorted
 * the rows, and so a missing bucket leaves a zero rather than shifting the list.
 */
const VISITOR_TYPES = [
  ["new", "New visitors"],
  ["returning", "Returning visitors"],
  ["", "Unclassified"],
];

const visitorMix = (rows = []) => {
  const found = new Map(
    rows.map((r) => [String(r?.newVsReturning || "").toLowerCase(), r]),
  );
  return VISITOR_TYPES.map(([key, label]) => ({
    label,
    users: Number(found.get(key)?.activeUsers || 0),
    sessions: Number(found.get(key)?.sessions || 0),
  }));
};

const ViewAll = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="shrink-0 whitespace-nowrap rounded-[8px] border border-[#EEEEEE] bg-[#F4F7FB] px-2.5 py-1.5 text-[12px] font-semibold text-[#636363] transition-colors hover:border-[#006ACA] hover:text-[#006ACA]"
  >
    View all ›
  </button>
);

/* Drawer columns: the first is the name, then numeric counts. */
const countCol = (key, label) => ({
  key,
  label,
  numeric: true,
  sortable: true,
  render: (r) => fmt(r[key]),
});
const nameCol = (label) => ({ key: "label", label, sortable: true });

const DRAWERS = {
  departments: {
    title: "All Departments",
    noun: "departments",
    search: "Search departments…",
    columns: [nameCol("Department"), countCol("views", "Views"), countCol("bookings", "Bookings")],
    total: (r) => r.bookings,
    empty: "No bookings for this department yet",
    note: "Bookings = all appointments and international patients for the department in this range, wherever they were booked. Click a row to see who booked.",
  },
  doctors: {
    title: "All Doctors",
    noun: "doctors",
    search: "Search doctors…",
    columns: [
      nameCol("Doctor"),
      countCol("views", "Views"),
      countCol("appointments", "Appointments"),
      countCol("international", "International"),
    ],
    total: (r) => (r.appointments || 0) + (r.international || 0),
    empty: "No appointments or international patients for this doctor yet",
    note: "Appointments and international patients booked with each doctor in this range. Click a row to see the patients.",
  },
  packages: {
    title: "All Health Packages",
    noun: "packages",
    search: "Search packages…",
    columns: [nameCol("Package"), countCol("views", "Views"), countCol("bookings", "Bookings")],
    total: (r) => r.bookings,
    empty: "No bookings for this package yet",
    note: "Bookings of each health package in this range. Views count opens of its booking form on the website. Click a row to see who booked.",
  },
  blogs: {
    title: "All Blogs",
    noun: "posts",
    search: "Search blogs…",
    columns: [nameCol("Blog"), countCol("views", "Views"), countCol("visitors", "Visitors")],
    // Reading is not a booking: no people to list, so rows don't expand.
    expandable: false,
  },
};

const SectionHeading = ({ title, source, note }) => (
  <div className="flex items-center justify-between gap-3 pt-1">
    <h5 className="text-[14px] font-bold text-[#121212]">{title}</h5>
    <SourceBadge source={source} note={note} />
  </div>
);

/**
 * Analytics: where traffic comes from (GA4), how many patient requests it
 * produced, and which departments, doctors and packages drew interest.
 *
 * The behavioural half — tracked visits, what the requests were for, and
 * patient journeys — lives on its own page (dashboard/insights). Splitting them
 * keeps this page answerable at a glance; the other page is where someone goes
 * to ask why.
 */
export default function Body({
  loading,
  data,
  ga4,
  range,
  onRangeChange,
  drawer,
  openDrawer,
  closeDrawer,
}) {
  /* GA4 slice. `overview` is a single totals row; `by_date` backs the
     sparklines. Absent when GA4 is unconfigured or errored. */
  const reports = ga4?.reports || {};
  const gaTotals = reports.overview?.rows?.[0] || {};
  const gaByDate = fillDays(reports.by_date?.rows || [], ga4?.date_range);
  const gaByCountry = reports.by_country?.rows || [];
  const gaBySource = reports.by_source_medium?.rows || [];
  const gaByDevice = reports.by_device?.rows || [];
  const gaNewReturning = reports.new_vs_returning?.rows || [];
  const gaConfigured = Boolean(ga4?.reports);

  const audience = data?.audience || {};
  const leads = data?.leads || {};
  const lStats = leads.stats || {};
  const growthTrend = leads.growthTrend || [];
  const leadType = leads.leadType || {};
  const funnel = data?.funnel || {};
  const interest = data?.interest || {};
  const departments = interest.topDepartments || [];
  const doctors = interest.topDoctors || [];
  const packages = interest.topPackages || [];
  const blogs = interest.topBlogs || [];

  /*
   * Skeletons only on a first load that has delivered nothing. Once figures are
   * on screen a range change dims them instead — swapping populated cards back
   * to skeletons on every range click reads as the page breaking rather than
   * refreshing.
   */
  const pending = loading && !data && !ga4;
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
          <p className="text-[#4B4B4B] font-medium ">Analytics</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4">
          {/* header row: intro + range picker */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13.5px] text-[#71717A]">
              Where traffic comes from, what it turned into, and which content
              drew interest.
            </p>
            <TimeRange value={range} onChange={onRangeChange} />
          </div>

          <div className={`flex flex-col gap-4 transition-opacity duration-300 ${dim}`}>
            {/* ---------------- site traffic (GA4) ---------------- */}
            <SectionHeading
              title="Site traffic"
              source="ga4"
              note={RANGE_LABELS[range]}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {pending ? (
                Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
              ) : (
                <>
                  <StatCard
                    title="Active Users"
                    total={fmt(gaTotals.activeUsers)}
                    subtitle="visitors in range"
                    spark={series(gaByDate, "activeUsers")}
                    icon={Users}
                    color={BLUE[800]}
                    iconBg={TINT[800]}
                    iconColor={BLUE[800]}
                  />
                  <StatCard
                    title="Sessions"
                    total={fmt(gaTotals.sessions)}
                    subtitle={`${fmt(gaTotals.screenPageViews)} page views`}
                    spark={series(gaByDate, "sessions")}
                    icon={MousePointerClick}
                    color={BLUE[600]}
                    iconBg={TINT[600]}
                    iconColor={BLUE[600]}
                  />
                  <StatCard
                    title="Engagement Rate"
                    total={pct(gaTotals.engagementRate)}
                    subtitle={`${fmt(gaTotals.engagedSessions)} engaged sessions`}
                    spark={series(gaByDate, "engagementRate")}
                    icon={Gauge}
                    color={BLUE[500]}
                    iconBg={TINT[500]}
                    iconColor={BLUE[500]}
                  />
                  <StatCard
                    title="Avg Session Time"
                    total={duration(gaTotals.averageSessionDuration)}
                    subtitle="per session"
                    spark={series(gaByDate, "averageSessionDuration")}
                    icon={Timer}
                    color={BLUE[900]}
                    iconBg={TINT[900]}
                    iconColor={BLUE[900]}
                  />
                </>
              )}
            </div>

            {/* sources -> devices -> geography (GA4). The map carries the row's
                extra width; the two lists are short and read fine narrow. */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {pending ? (
                <>
                  <ListCardSkeleton rows={3} />
                  <ListCardSkeleton rows={3} />
                  <div className="md:col-span-2 xl:col-span-2">
                    <MapCardSkeleton />
                  </div>
                </>
              ) : (
                <>
                  <RankedBars
                    title="Traffic Sources"
                    labelHeader="Source / Medium"
                    valueHeader="Sessions"
                    accent={BLUE[800]}
                    valueKey="sessions"
                    metaKey="users"
                    metaLabel="users"
                    items={gaBySource.slice(0, 6).map((r) => ({
                      label: r.sessionSourceMedium || "—",
                      sessions: r.sessions,
                      users: r.activeUsers,
                    }))}
                    emptyText={
                      gaConfigured
                        ? "No traffic sources yet"
                        : "GA4 not connected yet"
                    }
                  />
                  <RankedBars
                    title="Active Users by Device"
                    labelHeader="Device category"
                    valueHeader="Active users"
                    accent={BLUE[500]}
                    valueKey="users"
                    items={gaByDevice.slice(0, 6).map((r) => ({
                      label: r.deviceCategory || "—",
                      users: r.activeUsers,
                    }))}
                    emptyText={
                      gaConfigured ? "No device data yet" : "GA4 not connected yet"
                    }
                  />
                  <div className="md:col-span-2 xl:col-span-2">
                    <GeoMap
                      title="Users by Country"
                      rows={gaByCountry}
                      metric="activeUsers"
                      metricLabel="Active users"
                      rangeLabel={RANGE_LABELS[range]}
                      emptyText={
                        gaConfigured
                          ? "No country data for this range yet."
                          : "GA4 not connected yet"
                      }
                    />
                  </div>
                </>
              )}
            </div>

            {/* ---------------- leads ---------------- */}
            <SectionHeading
              title="Bookings & enquiries"
              source="crm"
              note={`${fmt(audience.attributed_leads)} traced to a visit`}
            />

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
              {pending ? (
                <>
                  <ListCardSkeleton rows={3} />
                  <div className="xl:col-span-3">
                    <MetricPanelSkeleton />
                  </div>
                </>
              ) : (
                <>
                  <RankedBars
                    title="New vs Returning"
                    subtitle="First-time against repeat visitors"
                    labelHeader="Visitor type"
                    valueHeader="Active users"
                    accent={BLUE[700]}
                    valueKey="users"
                    metaKey="sessions"
                    metaLabel="sessions"
                    metaFirst
                    items={visitorMix(gaNewReturning)}
                    emptyText={
                      gaConfigured ? "No visitor data yet" : "GA4 not connected yet"
                    }
                  />
                  <div className="xl:col-span-3">
                    <MetricPanel
                      data={growthTrend}
                      xKey="month"
                      metrics={[
                        {
                          key: "total",
                          label: "Total bookings & enquiries",
                          value: fmt(lStats.total_requests?.total),
                          rate: lStats.total_requests?.rate,
                          levelUp: lStats.total_requests?.levelUp,
                          subtitle: "Appointments, checkups, tests and enquiries combined, by month",
                          seriesKey: "total_requests",
                          color: SERIES_4[0],
                        },
                        {
                          key: "appointments",
                          label: "Appointments",
                          value: fmt(lStats.appointments?.total),
                          rate: lStats.appointments?.rate,
                          levelUp: lStats.appointments?.levelUp,
                          subtitle: "Doctor appointments booked from the website, by month",
                          seriesKey: "appointment",
                          color: SERIES_4[1],
                        },
                        {
                          key: "checkups",
                          label: "Health checkups",
                          value: fmt(lStats.checkups?.total),
                          rate: lStats.checkups?.rate,
                          levelUp: lStats.checkups?.levelUp,
                          subtitle: "Health-checkup package bookings, by month",
                          seriesKey: "checkup",
                          color: SERIES_4[2],
                        },
                        {
                          key: "tests",
                          label: "Test bookings",
                          value: fmt(lStats.tests?.total),
                          rate: lStats.tests?.rate,
                          levelUp: lStats.tests?.levelUp,
                          subtitle: "Lab and radiology test bookings, by month",
                          seriesKey: "test",
                          color: SERIES_4[3],
                        },
                      ]}
                    />
                  </div>
                </>
              )}
            </div>

            {/* trend + mix + funnel */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {pending ? (
                <>
                  <div className="md:col-span-2">
                    <ChartCardSkeleton height={260} lines={2} />
                  </div>
                  <ChartCardSkeleton height={180} lines={2} />
                  <ChartCardSkeleton height={160} lines={3} />
                </>
              ) : (
                <>
                  <div className="md:col-span-2">
                    <TrendAreaChart
                      title="Appointments vs Health Checkups"
                      data={growthTrend}
                      series={[
                        { key: "appointment", label: "Appointments", color: BLUE[500] },
                        { key: "checkup", label: "Health checkups", color: BLUE[200] },
                      ]}
                    />
                  </div>
                  <DonutChart
                    title="Bookings & Enquiries Mix"
                    centerLabel="Total"
                    data={[
                      { name: "Appointments", value: leadType.appointment || 0, color: BLUE[900] },
                      { name: "Health checkups", value: leadType.checkup || 0, color: BLUE[700] },
                      { name: "Test bookings", value: leadType.test || 0, color: BLUE[500] },
                      { name: "Enquiries", value: leadType.enquiry || 0, color: BLUE[300] },
                      { name: "International", value: leadType.international || 0, color: BLUE[100] },
                    ]}
                  />
                  <Funnel
                    title="Visit → Interest → Booking"
                    stages={[
                      { label: "Visitors", value: funnel.visitors, color: FUNNEL_5[0] },
                      { label: "Viewed a department / doctor / package", value: funnel.engaged, color: FUNNEL_5[1] },
                      { label: "Booked or enquired", value: funnel.requests, color: FUNNEL_5[3] },
                      { label: "Paid bookings", value: funnel.paid, color: FUNNEL_5[4] },
                    ]}
                    note="First two stages count distinct visitors; the last two count submitted records, so one person can appear more than once. Read the shape, not a per-person survival rate."
                  />
                </>
              )}
            </div>

            {/* ---------------- content interest ---------------- */}
            <SectionHeading
              title="Visitor interest"
              source="tracker"
              note="what visitors looked at, and what it led to"
            />

            {/* min-h = a full six-row card, so short lists don't shrink the row. */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 [&>*]:min-h-[342px]">
              {pending ? (
                <>
                  <ListCardSkeleton rows={6} action />
                  <ListCardSkeleton rows={6} action />
                  <ListCardSkeleton rows={6} action />
                  <ListCardSkeleton rows={6} action />
                </>
              ) : (
                <>
                  <RankedBars
                    title="Top Departments"
                    labelHeader="Department"
                    valueHeader="Bookings"
                    accent={BLUE[800]}
                    valueKey="bookings"
                    action={departments.length ? <ViewAll onClick={() => openDrawer("departments")} /> : null}
                    items={departments.slice(0, 6).map((c) => ({ label: c.label, bookings: c.bookings }))}
                    emptyText="No department bookings yet"
                  />
                  <RankedBars
                    title="Top Doctors"
                    labelHeader="Doctor"
                    valueHeader="Appointments"
                    accent={BLUE[600]}
                    valueKey="appointments"
                    action={doctors.length ? <ViewAll onClick={() => openDrawer("doctors")} /> : null}
                    items={doctors.slice(0, 6).map((c) => ({ label: c.label, appointments: c.appointments }))}
                    emptyText="No appointments yet"
                  />
                  <RankedBars
                    title="Top Health Packages"
                    labelHeader="Package"
                    valueHeader="Bookings"
                    accent={BLUE[400]}
                    valueKey="bookings"
                    action={packages.length ? <ViewAll onClick={() => openDrawer("packages")} /> : null}
                    items={packages.slice(0, 6).map((c) => ({ label: c.label, bookings: c.bookings }))}
                    emptyText="No package bookings yet"
                  />
                  <RankedBars
                    title="Top Blogs"
                    labelHeader="Blog"
                    valueHeader="Views"
                    accent={BLUE[300]}
                    valueKey="views"
                    action={blogs.length ? <ViewAll onClick={() => openDrawer("blogs")} /> : null}
                    items={blogs.slice(0, 6).map((c) => ({ label: c.label, views: c.views }))}
                    emptyText="No blog views yet"
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* ---------------- drawers ---------------- */}
        {[
          ["departments", departments],
          ["doctors", doctors],
          ["packages", packages],
          ["blogs", blogs],
        ].map(([key, rows]) => {
          const d = DRAWERS[key];
          return (
            <InsightDrawer
              key={key}
              open={drawer === key}
              onClose={closeDrawer}
              title={d.title}
              subtitle={`${rows.length} ${d.noun} · sortable`}
              rows={rows}
              searchKey="label"
              searchPlaceholder={d.search}
              rowKey="slug"
              note={d.note}
              renderExpanded={
                d.expandable === false
                  ? undefined
                  : (r) => <RecordList records={r.records} total={d.total(r)} emptyText={d.empty} />
              }
              columns={d.columns}
            />
          );
        })}
      </div>
    </>
  );
}
