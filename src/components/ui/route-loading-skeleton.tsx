type RouteLoadingSkeletonProps = {
  blocks?: number;
};

export function RouteLoadingSkeleton({ blocks = 3 }: RouteLoadingSkeletonProps) {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-64 rounded bg-slate-200 dark:bg-slate-800" />
      {Array.from({ length: blocks }).map((_, index) => (
        <div
          key={`skeleton-${index}`}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950"
        >
          <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-800 mb-4" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-3 w-11/12 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-3 w-10/12 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

