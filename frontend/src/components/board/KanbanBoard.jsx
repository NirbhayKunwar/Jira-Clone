import React, { useCallback, useState } from 'react';
import KanbanColumn from './KanbanColumn';
import { useBoardStore } from '../../store/boardStore';
import { useUpdateTaskStatus, useDeleteTask, useClaimTask } from '../../hooks/useTasks';

const COLUMN_TITLES = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'In Review',
  done: 'Done',
};

export default function KanbanBoard({ workspaceId }) {
  const columnOrder = useBoardStore((state) => state.columnOrder);
  const moveTask = useBoardStore((state) => state.moveTask);
  const rollback = useBoardStore((state) => state.rollback);

  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [claimingTaskId, setClaimingTaskId] = useState(null);

  const updateStatusMutation = useUpdateTaskStatus(workspaceId);
  const deleteTaskMutation = useDeleteTask(workspaceId);
  const claimTaskMutation = useClaimTask(workspaceId);

  const handleDragStart = useCallback((e, taskId) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    async (e, destColId) => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
      setDraggedTaskId(null);

      if (!taskId) return;

      const state = useBoardStore.getState();
      const task = state.tasksById[taskId];
      if (!task) return;

      const sourceColId = task.status || 'todo';
      if (sourceColId === destColId) return;

      const destTaskIds = state.columns[destColId]?.taskIds || [];

      // 1. Instant 0ms Optimistic UI Move
      const snapshot = moveTask(taskId, sourceColId, destColId, 0, destTaskIds.length);

      // 2. Async Network Mutation
      try {
        await updateStatusMutation.mutateAsync({ taskId, status: destColId });
      } catch (err) {
        // Rollback state on error
        rollback(snapshot);
      }
    },
    [draggedTaskId, moveTask, rollback, updateStatusMutation]
  );

  const handleDeleteTask = useCallback(
    async (taskId) => {
      const state = useBoardStore.getState();
      const task = state.tasksById[taskId];
      if (!task) return;

      state.removeTask(taskId);

      try {
        await deleteTaskMutation.mutateAsync(taskId);
      } catch (err) {
        state.addTask(task);
      }
    },
    [deleteTaskMutation]
  );

  const handleClaimTask = useCallback(
    async (taskId) => {
      setClaimingTaskId(taskId);
      try {
        await claimTaskMutation.mutateAsync(taskId);
      } finally {
        setClaimingTaskId(null);
      }
    },
    [claimTaskMutation]
  );

  return (
    <div className="flex space-x-6 overflow-x-auto pb-6 pt-2">
      {columnOrder.map((colId) => (
        <KanbanColumn
          key={colId}
          columnId={colId}
          title={COLUMN_TITLES[colId] || colId}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDeleteTask={handleDeleteTask}
          onClaimTask={handleClaimTask}
          claimingTaskId={claimingTaskId}
          draggedTaskId={draggedTaskId}
        />
      ))}
    </div>
  );
}
