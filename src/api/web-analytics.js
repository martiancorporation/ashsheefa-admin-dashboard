import { apiConnector, handleResponse } from "./core";
import { webAnalyticsEndpoints } from "./apis";

const { WEB_ANALYTICS_STATUS, GA4_EXPLORE, GA4_REALTIME } =
  webAnalyticsEndpoints;

const auth = (token) => ({ Authorization: `Bearer ${token}` });

/*
 * The dashboard's range picker speaks 7d|30d|90d|year|all; GA4 wants a rolling
 * window in days. year/all clamp to 365 — GA4 holds nothing from before the tag
 * went live, so a longer window would only look longer.
 */
const RANGE_DAYS = { today: 1, "7d": 7, "30d": 30, "90d": 90, year: 365, all: 365 };
export const rangeToDays = (range) => RANGE_DAYS[range] || 30;

/**
 * GA4 responses bypass the shared handleResponse on purpose.
 *
 * The integration is optional: until GA4_PROPERTY_ID and the service-account
 * key are set, the API answers 202 with "GA4 is not configured", which
 * handleResponse turns into a "Something went wrong" toast. That would fire on
 * every single page load of an otherwise healthy dashboard. The GA4 tiles
 * already have their own "not connected yet" empty states, so the quiet answer
 * is null and the reason goes to the console for whoever is setting it up.
 */
const handleGa4 = (response) => {
  if (response?.status === 200) return response.data;
  const reason =
    response?.data?.error ||
    response?.response?.data?.error ||
    response?.message ||
    "unknown error";
  console.info("[web-analytics] GA4 unavailable:", reason);
  return null;
};

const web_analytics = {
  /** Whether GA4 is configured on the API, and which env keys are missing. */
  Status: async (token) => {
    let response = null;
    try {
      response = await apiConnector("GET", WEB_ANALYTICS_STATUS, null, auth(token));
    } catch (error) {
      response = error;
    }
    return handleResponse(response);
  },

  /*
   * Batched GA4 reports. `only` narrows the set to the keys a screen actually
   * renders (comma-separated) so the page does not re-run all 14 reports to
   * fill five tiles.
   */
  Ga4Explore: async (token, { range = "30d", only = "" } = {}) => {
    let response = null;
    const [name, from, to] = String(range).split(":");
    const window =
      name === "custom" && from && to
        ? `start_date=${from}&end_date=${to}`
        : `days=${rangeToDays(name)}`;
    const query = `?${window}${only ? `&only=${only}` : ""}`;
    try {
      response = await apiConnector("GET", `${GA4_EXPLORE}${query}`, null, auth(token));
    } catch (error) {
      response = error;
    }
    return handleGa4(response);
  },

  /** Active users in the last 30 minutes. */
  Ga4Realtime: async (token) => {
    let response = null;
    try {
      response = await apiConnector("GET", GA4_REALTIME, null, auth(token));
    } catch (error) {
      response = error;
    }
    return handleGa4(response);
  },
};

export default web_analytics;
