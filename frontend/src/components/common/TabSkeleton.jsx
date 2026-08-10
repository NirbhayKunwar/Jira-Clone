import React from 'react';

export default function TabSkeleton() {
  return (
    <div className="w-full h-full p-6 space-y-6 animate-pulse select-none">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between border-b border-border-secondary/30 pb-4">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-border-secondary/40 rounded-lg"></div>
          <div className="h-4 w-72 bg-border-secondary/20 rounded-md"></div>
        </div>
        <div className="h-9 w-28 bg-accent/20 rounded-xl"></div>
      </div>

      {/* Grid Content Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="h-32 bg-card-secondary/60 rounded-xl border border-border-secondary/30"></div>
          <div className="h-48 bg-card-secondary/60 rounded-xl border border-border-secondary/30"></div>
        </div>
        <div className="space-y-4">
          <div className="h-40 bg-card-secondary/60 rounded-xl border border-border-secondary/30"></div>
          <div className="h-40 bg-card-secondary/60 rounded-xl border border-border-secondary/30"></div>
        </div>
      </div>
    </div>
  );
}
