import React from 'react';

export default function KanbanBoardSkeleton() {
  const columns = ['To Do', 'In Progress', 'In Review', 'Done'];

  return (
    <div className="flex space-x-6 overflow-x-auto pb-6 pt-2 select-none animate-pulse">
      {columns.map((title, idx) => (
        <div
          key={idx}
          className="flex-1 bg-background-tertiary/40 border border-border-secondary/30 rounded-2xl p-4 flex flex-col min-w-[280px] max-w-[360px] h-[650px]"
        >
          {/* Column Header Skeleton */}
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center space-x-2">
              <div className="h-4 w-20 bg-border-secondary/50 rounded-md"></div>
              <div className="h-4 w-6 bg-border-secondary/30 rounded-full"></div>
            </div>
          </div>

          {/* Cards Skeleton */}
          <div className="flex-1 space-y-3 overflow-hidden">
            <div className="h-28 bg-card-secondary/70 border border-border-secondary/30 rounded-xl p-4 space-y-3">
              <div className="h-3 w-16 bg-purple-500/20 rounded"></div>
              <div className="h-4 w-3/4 bg-border-secondary/40 rounded"></div>
              <div className="h-3 w-1/2 bg-border-secondary/20 rounded"></div>
            </div>

            <div className="h-28 bg-card-secondary/70 border border-border-secondary/30 rounded-xl p-4 space-y-3">
              <div className="h-3 w-16 bg-blue-500/20 rounded"></div>
              <div className="h-4 w-4/5 bg-border-secondary/40 rounded"></div>
              <div className="h-3 w-2/3 bg-border-secondary/20 rounded"></div>
            </div>

            <div className="h-28 bg-card-secondary/70 border border-border-secondary/30 rounded-xl p-4 space-y-3">
              <div className="h-3 w-16 bg-pink-500/20 rounded"></div>
              <div className="h-4 w-2/3 bg-border-secondary/40 rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
