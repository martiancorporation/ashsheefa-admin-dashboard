import { useEffect, useState } from "react";
import API from "@/api";
import useAuthDataStore from "@/store/authStore";
import Body from "./body";

/**
 * Container for Insights (buj's Lead Insights).
 *
 * Reads the same /insight/dashboard payload as the Insights page but makes NO
 * GA4 call: nothing on this page is GA4-derived, and firing that request would
 * add a few hundred milliseconds to a page that cannot show the result.
 */
export default function LeadInsightsPage() {
  const authData = useAuthDataStore((state) => state.authData);
  const token = authData?.access_token;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [range, setRange] = useState("30d");
  const [drawer, setDrawer] = useState(null);
  // The lead drawer is separate: it fetches its own paginated data, so it does
  // not share the string-keyed drawer state the static list drawers use.
  const [leadsOpen, setLeadsOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);

    API.insight
      .getInsights(token, range)
      .then((response) => {
        // Guards a slow response for an abandoned range from landing after a
        // newer one and overwriting it.
        if (cancelled) return;
        // HandleSuccess sends the payload unwrapped, so `response` IS the
        // dashboard object — there is no { data } envelope to unpack.
        if (response) setData(response);
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
      range={range}
      onRangeChange={setRange}
      drawer={drawer}
      openDrawer={setDrawer}
      closeDrawer={() => setDrawer(null)}
      token={token}
      leadsOpen={leadsOpen}
      openLeads={() => setLeadsOpen(true)}
      closeLeads={() => setLeadsOpen(false)}
    />
  );
}
