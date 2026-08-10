import React, { memo } from 'react';
import TaskCard from './TaskCard';
import { useBoardStore } from '../../store/boardStore';

const KanbanColumn = memo(function KanbanColumn({
  columnId,
  title,
  onDragStart,
  onDragOver,
  onDrop,
  onDeleteTask,
  onClaimTask,
  claimingTaskId,
  draggedTaskId,
}) {
  // Only subscribes to taskIds array for this column
  const taskIds = useBoardStore((state) => state.columns[columnId]?.taskIds || []);

  return (
    <div
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, columnId)}
      className="flex-1 bg-background-tertiary/40 border border-border-secondary/30 rounded-2xl p-4 flex flex-col min-w-[280px] max-w-[360px] min-h-[500px]"
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center space-x-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
            {title}
          </h3>
          <span className="bg-border-secondary/40 text-text-secondary text-[10px] font-bold px-2 py-0.5 rounded-full">
            {taskIds.length}
          </span>
        </div>
      </div>

      {/* Task Cards List */}
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {taskIds.map((taskId) => (
          <TaskCard
            key={taskId}
            taskId={taskId}
            onDragStart={onDragStart}
            onDelete={onDeleteTask}
            onClaim={onClaimTask}
            isClaiming={claimingTaskId === taskId}
            isDragging={draggedTaskId === taskId}
          />
        ))}

        {taskIds.length === 0 && (
          <div className="h-32 border-2 border-dashed border-border-secondary/40 rounded-xl flex items-center justify-center text-text-secondary-muted text-xs font-medium">
            No tasks in {title}
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.columnId === nextProps.columnId &&
    prevProps.title === nextProps.title &&
    prevProps.draggedTaskId === nextProps.draggedTaskId &&
    prevProps.claimingTaskId === nextProps.claimingTaskId
  );
});

KanbanColumn.displayName = 'KanbanColumn';
export default KanbanColumn;
