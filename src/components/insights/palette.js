/**
 * The Insights palette: one blue ramp, and nothing else.
 *
 * Every data series on these pages is a step on this ramp. Categorical hues
 * (a green series, a purple series) were tried and dropped — with four or five
 * panels per screen they read as unrelated widgets rather than one report, and
 * a reader starts assuming the colours *mean* something. A single-hue ramp
 * makes position and weight carry the meaning instead.
 *
 * The only non-blue ink allowed is:
 *   - UP / DOWN, which are semantic (a fall must not look like a rise)
 *   - neutral greys for chrome, axes and empty states
 *
 * Exported as a module rather than inlined per component so "one hue" is
 * enforceable: adding a series means picking an existing step, not a new hex.
 */

// Dark -> light. Keys are weights, so BLUE[800] always reads darker than BLUE[300].
export const BLUE = {
  900: "#00448C",
  800: "#0056B2",
  700: "#006ACA", // selected range pill / links
  600: "#248EFF",
  500: "#3393F9",
  400: "#49A1FF",
  300: "#6DB4FF",
  200: "#92C6FF",
  100: "#B6D9FF",
  50: "#DBECFF",
};

// Pale fills for the stat-card icon tiles.
export const TINT = {
  900: "#EEF4FF",
  800: "#DBECFF",
  600: "#E0F2FE",
  500: "#EAF3FF",
};

/** Semantic only — direction of travel, never a category. */
export const DELTA = {
  upBg: "#E7F6EE",
  upFg: "#12B76A",
  downBg: "#FDECEC",
  downFg: "#E42D3E",
};

export const NEUTRAL = {
  ink: "#121212",
  body: "#636363",
  muted: "#9A9A9A",
  line: "#EEEEEE",
  track: "#F2F4F7",
  wash: "#F1F5F9",
  slate: "#64748B",
};

/**
 * Ordered ramps for multi-series panels. Index order is the visual order the
 * panel should read in, so a caller never has to choose weights by hand.
 */
// Four KPI tiles / four-series panels.
export const SERIES_4 = [BLUE[900], BLUE[500], BLUE[800], BLUE[300]];
// Three-part splits (donut slices, conversion rows): dark -> light.
export const SERIES_3 = [BLUE[800], BLUE[500], BLUE[100]];
// Funnel and other "narrowing" sequences: light -> dark, so the surviving
// stage is the heaviest ink on the card. Starts at 100 rather than 50 because
// the first stage is always the full-width bar, and the palest tint reads as an
// empty track rather than a value.
export const FUNNEL_5 = [BLUE[100], BLUE[300], BLUE[500], BLUE[800], BLUE[900]];
