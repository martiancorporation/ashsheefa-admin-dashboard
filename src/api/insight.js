import { insightEndpoints } from "./apis";
import { apiConnector, handleResponse } from "./core";

const { GET_INSIGHTS_API, GET_LEADS_API, GET_LEAD_JOURNEY_API } =
  insightEndpoints;

const auth = (token) => ({ Authorization: `Bearer ${token}` });

const insight = {
  /**
   * Everything the Insights page renders on first paint, in one request.
   * `range` = today | 7d | 30d | 90d | year | all, or a custom window encoded
   * as "custom:YYYY-MM-DD:YYYY-MM-DD".
   */
  getInsights: async (token, range = "30d") => {
    let response = null;
    const [name, from, to] = String(range).split(":");
    const query =
      name === "custom" && from && to
        ? `range=custom&start_date=${from}&end_date=${to}`
        : `range=${name}`;
    try {
      response = await apiConnector(
        "GET",
        `${GET_INSIGHTS_API}?${query}`,
        null,
        auth(token),
      );
    } catch (error) {
      response = error;
    }
    return handleResponse(response);
  },

  /**
   * Attributed leads — the ones whose submission carried a tracker id.
   * Fetched on demand when the lead drawer opens, not with the dashboard:
   * it is paginated and searchable, and most visits to the page never open it.
   */
  getLeads: async (token, { page = 1, limit = 20, type = "all", search = "" } = {}) => {
    let response = null;
    try {
      response = await apiConnector(
        "GET",
        `${GET_LEADS_API}?page=${page}&limit=${limit}&type=${type}&search=${encodeURIComponent(search)}`,
        null,
        auth(token),
      );
    } catch (error) {
      response = error;
    }
    return handleResponse(response);
  },

  /** One visitor's browsing timeline, loaded when a lead row is expanded. */
  getLeadJourney: async (token, visitor_id) => {
    let response = null;
    try {
      response = await apiConnector(
        "GET",
        `${GET_LEAD_JOURNEY_API}/${encodeURIComponent(visitor_id)}/journey`,
        null,
        auth(token),
      );
    } catch (error) {
      response = error;
    }
    return handleResponse(response);
  },
};

export default insight;
