import { useEffect, useState } from "react";
import API from "@/api";
import useAuthDataStore from "@/store/authStore";
import Body from "./body";

/* Only the reports this page renders — keeps a range switch from re-running all
   14 GA4 reports when six of them are on screen. */
const GA4_REPORTS =
  "overview,by_date,by_country,by_source_medium,by_device,new_vs_returning";

/**
 * Container for the Insights page: owns the time range, the drawer selection
 * and the fetch. All rendering lives in ./body.
 *
 * The split exists because the body is long and entirely derived from props —
 * keeping it free of state makes the whole page reviewable as one pass of
 * layout, and lets the loading and empty states be reasoned about in one place.
 */
export default function InsightsPage() {
  const authData = useAuthDataStore((state) => state.authData);
  const token = authData?.access_token;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [ga4, setGa4] = useState(null);
  const [range, setRange] = useState("30d");
  const [drawer, setDrawer] = useState(null);

  /*
   * Both sources are awaited together and committed in one setState pass, so
   * the page reveals as a whole.
   *
   * Mongo answers in milliseconds while GA4 costs a few hundred more; releasing
   * them separately makes the lower half populate first and the top half catch
   * up, which reads as the page lagging even though it is faster overall. The
   * cost is that the wait is always the slower of the two, and the skeletons
   * cover it.
   */
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      API.insight.getInsights(token, range),
      API.web_analytics.Ga4Explore(token, { range, only: GA4_REPORTS }),
    ])
      .then(([insights, analytics]) => {
        // Guards a slow response for an abandoned range from landing after a
        // newer one and overwriting it.
        if (cancelled) return;
        // HandleSuccess sends the payload unwrapped, so `insights` IS the
        // dashboard object — there is no { data } envelope to unpack.
        if (insights) setData(insights);
        /* An unconfigured or failing GA4 answers with an error rather than
           `reports`. Keep the rest of the page usable and let the GA4 tiles
           fall back to their empty states. */
        setGa4(analytics?.reports ? analytics : null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, range]);

  return (
    <Body
      loading={loading}
      data={data}
      ga4={ga4}
      range={range}
      onRangeChange={setRange}
      drawer={drawer}
      openDrawer={setDrawer}
      closeDrawer={() => setDrawer(null)}
    />
  );
}
