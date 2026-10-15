import { lazy, Suspense, useMemo } from "react";
import SourceBadge from "./source-badge";

/*
 * Google's GeoChart — the same component GA4's own country map renders, chosen
 * deliberately so this reads identically to the GA4 dashboard.
 *
 * Lazy-loaded because the chart pulls gstatic.com/charts/loader.js at runtime
 * and is the only thing on the page that needs it; the admin bundle is already
 * large, so it should not carry a map nobody has scrolled to yet.
 * Country-level choropleth needs no Maps API key (only sub-country regions and
 * markers do).
 */
const Chart = lazy(() =>
  import("react-google-charts").then((mod) => ({ default: mod.Chart })),
);

const fmt = (n) => Number(n || 0).toLocaleString("en-IN");

/*
 * Every ISO-3166-1 alpha-2 code. Seeding the dataset with all of them at 0 is
 * what makes a country with no traffic hoverable at all — GeoChart gives no
 * tooltip to a region absent from the data, which is why GA4's map appears to
 * respond everywhere and a values-only map goes dead outside its few countries.
 *
 * Names come from Intl.DisplayNames and flags from the code itself, so this
 * list is the only data the map needs.
 */
const ISO_CODES =
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW".split(
    " ",
  );

// Regional-indicator pair, e.g. "IN" -> flag. Cheaper than shipping assets.
const flagOf = (code) => {
  if (!/^[A-Z]{2}$/.test(code)) return "";
  return String.fromCodePoint(
    ...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
};

const regionNames =
  typeof Intl !== "undefined" && Intl.DisplayNames
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

const nameOf = (code) => {
  try {
    return regionNames?.of(code) || code;
  } catch {
    return code;
  }
};

// Name -> code, so GA4's country strings can be matched back to ISO codes.
const CODE_BY_NAME = ISO_CODES.reduce((acc, code) => {
  acc[nameOf(code).toLowerCase()] = code;
  return acc;
}, {});

const RAMP = ["#F1F5F9", "#B9D9F5", "#3391E0", "#006ACA"];

/*
 * A plain two-colour linear axis washes out a long tail: with one country at 50
 * and the rest at 1-2, everything but the leader renders near-white. Explicit
 * stops keep 0 grey (reads as "no traffic") while 1 already shows clear colour.
 */
const buildColorAxis = (maxValue) => {
  if (maxValue <= 0) return { colors: [RAMP[0]], minValue: 0, maxValue: 1 };

  const values = [...new Set([0, 1, Math.round(maxValue / 2), maxValue])]
    .filter((v) => v >= 0 && v <= maxValue)
    .sort((a, b) => a - b);

  const colors =
    values.length === 1
      ? [RAMP[RAMP.length - 1]]
      : values.map(
          (_, i) => RAMP[Math.round((i / (values.length - 1)) * (RAMP.length - 1))],
        );

  return { values, colors, minValue: 0, maxValue };
};

const tooltipHtml = ({ flag, name, value, metricLabel, rangeLabel }) => `
  <div style="font-family:system-ui,sans-serif;padding:8px 10px;min-width:120px">
    ${
      rangeLabel
        ? `<div style="font-size:9.5px;color:#71717A;margin-bottom:4px">${rangeLabel}</div>`
        : ""
    }
    <div style="font-size:8.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#A1A1AA;margin-bottom:3px">${metricLabel}</div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:11px">
      <span style="font-size:10.5px;color:#3F3F46">${flag ? `${flag} ` : ""}${name}</span>
      <span style="font-size:10.5px;font-weight:700;color:#18181B">${value}</span>
    </div>
  </div>`;

export default function GeoMap({
  title = "Users by Country",
  rows = [],
  metric = "activeUsers",
  metricLabel = "Active users",
  note,
  rangeLabel,
  listLimit = 6,
  emptyText = "No country data for this range yet.",
}) {
  const valueByCode = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const raw = r?.country;
      if (!raw || raw === "(not set)") return;
      const code = CODE_BY_NAME[String(raw).toLowerCase()];
      // Unmatched names still plot: GeoChart resolves country names too, so an
      // Intl/GA4 spelling difference degrades to a named region, not a gap.
      map.set(code || raw, Number(r[metric] || 0));
    });
    return map;
  }, [rows, metric]);

  const chartData = useMemo(() => {
    const maxValue = Math.max(0, ...valueByCode.values());
    const seen = new Set();

    const row = (region, value) => {
      const isCode = /^[A-Z]{2}$/.test(region);
      return [
        region,
        value,
        tooltipHtml({
          flag: isCode ? flagOf(region) : "",
          name: isCode ? nameOf(region) : region,
          value: fmt(value),
          metricLabel,
          rangeLabel,
        }),
      ];
    };

    const body = ISO_CODES.map((code) => {
      seen.add(code);
      return row(code, valueByCode.get(code) || 0);
    });

    // Any GA4 name that did not resolve to a code, appended by name.
    valueByCode.forEach((value, key) => {
      if (!seen.has(key)) body.push(row(key, value));
    });

    return {
      maxValue,
      data: [
        [
          { type: "string", label: "Country" },
          { type: "number", label: metricLabel },
          { type: "string", role: "tooltip", p: { html: true } },
        ],
        ...body,
      ],
    };
  }, [valueByCode, metricLabel, rangeLabel]);

  const options = useMemo(
    () => ({
      colorAxis: buildColorAxis(chartData.maxValue),
      datalessRegionColor: "#F1F5F9",
      defaultColor: "#F1F5F9",
      backgroundColor: "transparent",
      legend: "none",
      keepAspectRatio: true,
      tooltip: { isHtml: true },
    }),
    [chartData.maxValue],
  );

  const hasData = valueByCode.size > 0;
  const top = rows.slice(0, listLimit);
  const max = Math.max(...top.map((r) => Number(r[metric] || 0)), 1);

  return (
    <div className="h-full w-full rounded-[10px] border-2 border-[#EEEEEE] bg-white p-4">
      <div className="mb-1 flex items-start justify-between gap-3">
        <h6 className="text-[14px] font-bold text-[#121212]">{title}</h6>
        <SourceBadge source="ga4" note={note} />
      </div>

      {hasData ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
          <div className="geo-map-tooltip-scope lg:col-span-3">
            {/*
              GeoChart wraps a role:"tooltip" column in its own <ul> and prepends
              a bold item holding the raw region value ("RU"), then sets the
              container's width/height inline. Hiding that item and releasing the
              fixed box is the only way to get a single clean card — the option
              set has no switch for it. Scoped to this wrapper so no other
              Google chart on the page is affected.
            */}
            <style>{`
              .geo-map-tooltip-scope .google-visualization-tooltip {
                width: auto !important;
                height: auto !important;
                padding: 0;
                border: 1px solid #e4e4e7;
                border-radius: 8px;
                box-shadow: 0 4px 14px rgba(16, 24, 40, 0.08);
                background: #fff;
              }
              .geo-map-tooltip-scope .google-visualization-tooltip-item-list {
                margin: 0; padding: 0; list-style: none;
              }
              .geo-map-tooltip-scope .google-visualization-tooltip-item {
                margin: 0; padding: 0;
              }
              .geo-map-tooltip-scope .google-visualization-tooltip-item:first-child {
                display: none;
              }
            `}</style>
            <Suspense
              fallback={
                <div className="h-[260px] animate-pulse rounded-[10px] bg-[#F4F7FB]" />
              }
            >
              <Chart
                chartType="GeoChart"
                width="100%"
                height="260px"
                data={chartData.data}
                options={options}
              />
            </Suspense>
          </div>

          {/* Country league table, mirroring GA4's map-plus-list card. */}
          <div className="flex flex-col lg:col-span-2">
            <div className="flex items-center justify-between gap-2 border-b border-[#EEEEEE] pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#9A9A9A]">
              <span>Country</span>
              <span>{metricLabel}</span>
            </div>
            {top.map((r) => (
              <div key={r.country || "unknown"} className="pt-2.5">
                <div className="flex items-center justify-between gap-2 text-[12.5px]">
                  <span className="truncate text-[#121212]">
                    {r.country || "Unknown"}
                  </span>
                  <span className="font-semibold tabular-nums text-[#121212]">
                    {fmt(r[metric])}
                  </span>
                </div>
                <div className="mt-2 h-[2px] w-full bg-[#F1F5F9]">
                  <div
                    className="h-full bg-[#3391E0]"
                    style={{ width: `${(Number(r[metric] || 0) / max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex h-[260px] items-center justify-center px-6 text-center text-[12.5px] leading-5 text-[#9A9A9A]">
          {emptyText}
        </div>
      )}
    </div>
  );
}
