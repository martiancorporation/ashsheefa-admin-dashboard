import React from "react";
import { Globe } from "lucide-react";

// Self-contained Lucide-compatible SVG icons for brand platforms (removed in lucide-react v1.0+)
export const Facebook = (props) =>
  React.createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: 24,
      height: 24,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      ...props,
    },
    React.createElement("path", {
      d: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z",
    })
  );

export const Instagram = (props) =>
  React.createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: 24,
      height: 24,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      ...props,
    },
    React.createElement("rect", { width: 20, height: 20, x: 2, y: 2, rx: 5, ry: 5 }),
    React.createElement("path", { d: "M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" }),
    React.createElement("line", { x1: 17.5, x2: 17.51, y1: 6.5, y2: 6.5 })
  );

export const Twitter = (props) =>
  React.createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: 24,
      height: 24,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      ...props,
    },
    React.createElement("path", {
      d: "M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z",
    })
  );

export const Linkedin = (props) =>
  React.createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: 24,
      height: 24,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      ...props,
    },
    React.createElement("path", {
      d: "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z",
    }),
    React.createElement("rect", { width: 4, height: 12, x: 2, y: 9 }),
    React.createElement("circle", { cx: 4, cy: 4, r: 2 })
  );

export const Youtube = (props) =>
  React.createElement(
    "svg",
    {
      xmlns: "http://www.w3.org/2000/svg",
      width: 24,
      height: 24,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      ...props,
    },
    React.createElement("path", {
      d: "M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17",
    }),
    React.createElement("path", { d: "m10 15 5-3-5-3z" })
  );

// Known platforms with the domains we detect them from and the icon to show.
const PLATFORMS = [
  {
    key: "facebook",
    label: "Facebook",
    icon: Facebook,
    patterns: ["facebook.com", "fb.com", "fb.me", "fb.watch"],
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: Instagram,
    patterns: ["instagram.com", "instagr.am"],
  },
  {
    key: "twitter",
    label: "Twitter / X",
    icon: Twitter,
    patterns: ["twitter.com", "x.com", "t.co"],
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    icon: Linkedin,
    patterns: ["linkedin.com", "lnkd.in"],
  },
  {
    key: "youtube",
    label: "YouTube",
    icon: Youtube,
    patterns: ["youtube.com", "youtu.be"],
  },
];

const WEBSITE = { key: "website", label: "Website", icon: Globe };

// Detect the platform key ("facebook", "instagram", ...) from a URL.
// Falls back to "website" for anything we don't recognize.
export function detectPlatform(url) {
  if (!url || typeof url !== "string") return WEBSITE.key;
  const lower = url.toLowerCase();
  for (const p of PLATFORMS) {
    if (p.patterns.some((pat) => lower.includes(pat))) return p.key;
  }
  return WEBSITE.key;
}

// Get platform metadata from either a platform key or a raw URL.
export function getPlatformMeta(platformOrUrl) {
  const key = PLATFORMS.some((p) => p.key === platformOrUrl)
    ? platformOrUrl
    : detectPlatform(platformOrUrl);
  return PLATFORMS.find((p) => p.key === key) || WEBSITE;
}

// Convenience: get just the icon component for a platform key or URL.
export function getSocialIcon(platformOrUrl) {
  return getPlatformMeta(platformOrUrl).icon;
}
