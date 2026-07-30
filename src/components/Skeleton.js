"use client";

function SkeletonBlock({ className }) {
  return (
    <div
      className={`bg-gradient-to-r from-muted via-muted/80 to-muted bg-[length:200%_100%] animate-[skeletonShimmer_1.5s_ease-in-out_infinite] rounded-lg ${className}`}
    />
  );
}

export function CardSkeleton({ lines = 3 }) {
  return (
    <div className="rounded-2xl border bg-card p-5 sm:p-6">
      <SkeletonBlock className="h-3 w-1/3 mb-4" />
      <SkeletonBlock className="h-7 w-1/2 mb-3" />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <SkeletonBlock key={i} className="h-2 w-full mt-2" />
      ))}
      <SkeletonBlock className="h-2 w-full mt-4" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBlock key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-3 border-b last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonBlock key={c} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4 rounded-2xl border bg-card">
          <SkeletonBlock className="w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonBlock className="h-3 w-2/3" />
            <SkeletonBlock className="h-2 w-1/3" />
          </div>
          <SkeletonBlock className="w-16 h-6 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function KPIGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {Array.from({ length: 7 }).map((_, i) => (
        <CardSkeleton key={i} lines={2} />
      ))}
    </div>
  );
}
