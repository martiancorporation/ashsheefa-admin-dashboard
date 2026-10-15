/**
 * Loading placeholders shaped like the cards they stand in for.
 *
 * Only ever shown on a first load that has delivered nothing — see the body for
 * why a range change dims the real figures instead of reverting to these.
 */
const Shimmer = ({ className = "" }) => (
  <div className={`animate-pulse rounded bg-[#F0F2F5] ${className}`} />
);

const Card = ({ children }) => (
  <div className="w-full rounded-[10px] border-2 border-[#EEEEEE] bg-white p-4">
    {children}
  </div>
);

export const StatCardSkeleton = () => (
  <Card>
    <div className="flex items-start justify-between">
      <Shimmer className="h-3 w-24" />
      <Shimmer className="h-8 w-8 rounded-[8px]" />
    </div>
    <Shimmer className="mt-4 h-7 w-20" />
    <Shimmer className="mt-2 h-3 w-28" />
    <Shimmer className="mt-4 h-9 w-full" />
  </Card>
);

export const ListCardSkeleton = ({ rows = 5, action = false }) => (
  <Card>
    <div className="flex items-center justify-between">
      <Shimmer className="h-4 w-32" />
      {action ? <Shimmer className="h-6 w-16 rounded-[8px]" /> : null}
    </div>
    <div className="mt-5 flex flex-col gap-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i}>
          <div className="flex items-center justify-between">
            <Shimmer className="h-3 w-40" />
            <Shimmer className="h-3 w-10" />
          </div>
          <Shimmer className="mt-2 h-1 w-full" />
        </div>
      ))}
    </div>
  </Card>
);

export const ChartCardSkeleton = ({ height = 220, lines = 1 }) => (
  <Card>
    <Shimmer className="h-4 w-36" />
    {lines > 1 ? (
      <div className="mt-3 flex gap-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Shimmer key={i} className="h-3 w-24" />
        ))}
      </div>
    ) : null}
    <Shimmer className="mt-4 w-full" style={{ height }} />
  </Card>
);

export const MetricPanelSkeleton = () => (
  <Card>
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i}>
          <Shimmer className="h-3 w-24" />
          <Shimmer className="mt-3 h-7 w-16" />
        </div>
      ))}
    </div>
    <Shimmer className="mt-6 h-[240px] w-full" />
  </Card>
);

export const MapCardSkeleton = () => (
  <Card>
    <div className="flex items-center justify-between">
      <Shimmer className="h-4 w-32" />
      <Shimmer className="h-4 w-10 rounded-[6px]" />
    </div>
    <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <Shimmer className="h-[260px] w-full" />
      </div>
      <div className="flex flex-col gap-3 lg:col-span-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i}>
            <Shimmer className="h-3 w-28" />
            <Shimmer className="mt-2 h-[2px] w-full" />
          </div>
        ))}
      </div>
    </div>
  </Card>
);
