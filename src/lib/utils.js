import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Where to go after login: the `?next=` page the admin was sent to (e.g. from
 * an approval email), else the dashboard home. Only dashboard paths are
 * honoured, so the parameter can't be used to send anyone off-site.
 */
export function nextDashboardPath() {
  if (typeof window === "undefined") return "/dashboard";
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/dashboard") && !next.startsWith("//") ? next : "/dashboard";
}
