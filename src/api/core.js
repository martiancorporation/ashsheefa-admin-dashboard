import axios from "axios";
import moment from "moment";
import { toast } from "sonner";
import { authEndpoints } from "./apis";
import { loginUrlReturningHere } from "@/lib/utils";
const { REFRESH_TOKEN } = authEndpoints;

export const axiosInstance = axios.create({});
export const apiConnector = (method, url, bodyData, headers, params) => {
  // For FormData, ensure we don't set Content-Type header
  let finalHeaders = headers;
  if (bodyData instanceof FormData) {
    finalHeaders = { ...headers };
    // Remove Content-Type if it exists to let browser set it automatically
    if (finalHeaders && finalHeaders["Content-Type"]) {
      delete finalHeaders["Content-Type"];
    }

    // Add additional headers for better compatibility
    finalHeaders["Accept"] = "application/json";

    // Ensure we don't set any Content-Type header for FormData
    delete finalHeaders["Content-Type"];

    // For FormData, only keep essential headers
    finalHeaders = {
      Authorization: finalHeaders.Authorization,
      Accept: "application/json",
    };
  }

  // Add authentication headers for all routes (dashboard only)
  const session = localStorage.getItem("authentications")
    ? JSON.parse(localStorage.getItem("authentications"))
    : null;

  if (session?.access_token) {
    finalHeaders = {
      ...finalHeaders,
      Authorization: `Bearer ${session.access_token}||${session.active_session_refresh_token || ""
        }`,
    };

    // Only set Content-Type for non-FormData requests
    if (!(bodyData instanceof FormData)) {
      finalHeaders["Content-Type"] = "application/json";
    } else {
      // For FormData, ensure no Content-Type is set
      delete finalHeaders["Content-Type"];
    }
  }

  const config = {
    method: `${method}`,
    url: `${url}`,
    data: bodyData ? bodyData : null,
    headers: finalHeaders ? finalHeaders : null,
    params: params ? params : null,
  };

  return axiosInstance(config);
};

/**
 * Turn an axios/fetch result into data, toasting anything that went wrong.
 *
 * @param {object} response
 * @param {object} [options]
 * @param {number[]} [options.silentStatuses] - statuses the caller expects and
 *   handles itself, so they must not raise a toast. A 401 still signs the user
 *   out whatever is listed here — that is a session-wide safety behaviour, not
 *   a per-call concern.
 */
export const handleResponse = (response, options = {}) => {
  const silent = (status) =>
    Array.isArray(options.silentStatuses) &&
    options.silentStatuses.includes(status);


  // Handle fetch responses (for news add)
  if (response?.ok !== undefined) {
    if (response?.status === 200 && response?.ok) {
      return response?.data;
    } else if (response?.status === 202) {
      toast.warning("Something went wrong", {
        description: response.data?.error || "Request accepted but processing",
      });
    } else if (response?.status === 401) {
      toast.error("Signed out", {
        description:
          response?.data?.error || "Session expired. Redirecting to login...",
      });
      localStorage.removeItem("authentications");
      setTimeout(() => { window.location.href = loginUrlReturningHere(); }, 2000);
    } else if (response?.status === 500) {
      toast.error("Server error", {
        description: response?.data?.message || "Internal server error",
      });
    } else {
      console.error("Fetch response error:", response);
      toast.error("Request failed", {
        description: response?.data?.message || "Please try again",
      });
    }
    return false;
  }

  // Handle axios responses (for other APIs)
  // Check if it's a successful response (status 200-299)
  if (response?.status >= 200 && response?.status < 300) {
    return response?.data;
  }

  // Handle axios error responses (when axios throws an error)
  if (response?.response) {
    const status = response.response.status;
    const data = response.response.data;

    if (status === 401) {
      // The backend says why the session ended — e.g. a superadmin changed this
      // admin's email/password, or deactivated the account.
      toast.error("Signed out", {
        description: data?.error || "Session expired. Redirecting to login...",
      });
      localStorage.removeItem("authentications");
      setTimeout(() => { window.location.href = loginUrlReturningHere(); }, 2000);
    } else if (status === 400) {
      toast.error("Bad request", {
        description: data?.message || "Invalid request data",
      });
    } else if (status === 403) {
      // RBAC: this drawer/action is not granted to this admin. The sidebar and
      // route guard normally prevent reaching here, so this mostly fires when
      // access was revoked mid-session.
      if (!silent(403)) {
        toast.error("Access denied", {
          description:
            data?.error || "You do not have permission to perform this action",
        });
      }
    } else if (status === 404) {
      toast.error("Not found", {
        description: data?.message || "Resource not found",
      });
    } else if (status === 500) {
      toast.error("Server error", {
        description: data?.message || "Internal server error",
      });
    } else if (status === 202) {
      toast.warning("Something went wrong", {
        description: data?.message || "Request accepted but processing",
      });
    } else {
      toast.error("Request failed", {
        description: data?.message || "An error occurred",
      });
    }
  } else {
    // Handle other types of errors
    console.error("Unexpected response:", response);
    toast.error("Unexpected error", {
      description: response?.message || "Please contact server admin.",
    });
  }

  return false;
};
