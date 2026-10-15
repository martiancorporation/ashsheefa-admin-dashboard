import { useEffect, useRef } from "react";

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * One headline figure, its period-over-period movement, and a sparkline.
 *
 * The sparkline is hand-rolled SVG rather than a Recharts instance: there are
 * four of these on the page, they have no axes, no tooltip and no interaction,
 * and a full chart runtime per card costs far more than the path maths below.
 *
 * It draws itself in on mount and on every range change — the line strokes
 * along its own length while the fill and the endpoint dot fade up behind it.
 */
function Spark({ points = [], color = "#006ACA" }) {
  const lineRef = useRef(null);
  const fadeRef = useRef(null);
  const key = points.join(",");

  useEffect(() => {
    const line = lineRef.current;
    const fade = fadeRef.current;
    if (!line) return;
    // No Web Animations API, or the reader asked for stillness: land on the
    // finished frame rather than leaving the line at zero length.
    if (prefersReduced() || !line.animate) {
      line.style.strokeDashoffset = "0";
      if (fade) fade.style.opacity = "1";
      return;
    }
    line.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
      duration: 1000,
      easing: "ease-out",
      fill: "forwards",
    });
    if (fade)
      fade.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 900,
        easing: "ease-out",
        fill: "forwards",
      });
  }, [key]);

  // Two points make a line with no shape to read, and the x-step below divides
  // by (length - 1), which is a divide-by-zero at one point.
  if (!points || points.length < 3) return <div className="h-[22px] sm:h-[34px]" />;

  const w = 132;
  const h = 34;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1; // flat series: draw a centred straight line
  const step = w / (points.length - 1);

  const coords = points.map((p, i) => [
    i * step,
    h - 4 - ((p - min) / span) * (h - 8),
  ]);
  const line = coords
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${w} ${h} L0 ${h} Z`;
  const [lastX, lastY] = coords[coords.length - 1];
  const gradientId = `spark-${color.replace("#", "")}`;

  /* preserveAspectRatio="none" lets the svg stretch to its wrapper, so the
     sparkline can be shorter on phones without touching the path maths. */
  return (
    <div className="h-[22px] sm:h-[34px]">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="block"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.24" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <g ref={fadeRef} style={{ opacity: 0 }}>
          <path d={area} fill={`url(#${gradientId})`} />
          <circle cx={lastX.toFixed(1)} cy={lastY.toFixed(1)} r="2.6" fill={color} />
        </g>
        <path
          ref={lineRef}
          d={line}
          pathLength={1}
          style={{ strokeDasharray: 1, strokeDashoffset: 1 }}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export default function StatCard({
  title,
  total,
  subtitle,
  rate,
  levelUp,
  spark,
  color = "#0056B2",
  icon: Icon,
  iconBg = "#EAF5FF",
  iconColor = "#006ACA",
}) {
  return (
    <div className="w-full rounded-[10px] border-2 border-[#EEEEEE] bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium text-[#636363]">{title}</p>
        {Icon ? (
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px]"
            style={{ background: iconBg }}
          >
            <Icon className="h-4 w-4" strokeWidth={1.6} color={iconColor} />
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <p className="text-[26px] font-bold leading-none text-[#121212]">{total}</p>
        {/* rate is null for the "all time" range, which has no previous window
            to compare against — better to show nothing than a made-up +100%. */}
        {rate ? (
          <span
            className={`rounded-[6px] px-1.5 py-[2px] text-[11px] font-semibold ${
              levelUp ? "bg-[#E7F6EE] text-[#12B76A]" : "bg-[#FDECEC] text-[#E42D3E]"
            }`}
          >
            {levelUp ? "↗" : "↘"} {rate}
          </span>
        ) : null}
      </div>

      {subtitle ? <p className="mt-1 text-[12px] text-[#9A9A9A]">{subtitle}</p> : null}

      <div className="mt-3">
        <Spark points={spark} color={color} />
      </div>
    </div>
  );
}
