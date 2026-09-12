import React, { memo, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { useBoardStore } from '../../store/boardStore';
import { useAuthStore } from '../../store/authStore';

const isAssignedToUser = (task, currentUser) => {
  if (!task || !currentUser) return false;
  if (task.assigneeId) {
    return currentUser.id ? String(task.assigneeId) === String(currentUser.id) : false;
  }
  if (!task.assignee || task.assignee === 'Unassigned') return false;
  if (currentUser.name && task.assignee.toLowerCase() === currentUser.name.toLowerCase()) return true;
  return false;
};

const getPriorityStyle = (p) => {
  switch (p) {
    case 'High':
      return 'text-red-500 bg-red-500/10 border-red-500/20';
    case 'Medium':
      return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    default:
      return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
  }
};

const getEpicStyle = (epic) => {
  switch (epic) {
    case 'Design System':
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
    case 'DevOps & Security':
      return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
    case 'Integrations':
      return 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20';
    case 'Tech Stack Upgrade':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    case 'General':
    default:
      return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
  }
};

const TaskCard = memo(function TaskCard({
  taskId,
  onDragStart,
  onDelete,
  onClaim,
  isClaiming,
  isDragging,
  isPreview,
}) {
  const task = useBoardStore((state) => state.tasksById[taskId]);
  const user = useAuthStore((state) => state.user);

  if (!task) return null;

  const canDeleteOrEdit =
    user?.rbacRole === 'ADMIN' ||
    user?.rbacRole === 'LEADER' ||
    isAssignedToUser(task, user);

  const isUnassigned =
    !task.assigneeId && (!task.assignee || task.assignee === 'Unassigned');

  return (
    <div
      draggable={!isPreview}
      onDragStart={(e) => onDragStart && onDragStart(e, task.id)}
      className={`bg-card-secondary p-4.5 rounded-xl border border-border-secondary/40 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-transform transition-opacity duration-150 will-change-transform cursor-grab active:cursor-grabbing group relative overflow-hidden ${
        isDragging ? 'opacity-40 scale-95 border-accent/40 bg-accent-light/5' : ''
      } ${isPreview ? 'pointer-events-none shadow-2xl border-accent/60' : ''}`}
    >
      {/* Epic Badge */}
      <span
        className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded border mb-2.5 uppercase tracking-wider ${getEpicStyle(
          task.epic
        )}`}
      >
        {task.epic || 'Task'}
      </span>

      {/* Task Summary */}
      <h4 className="text-xs font-bold text-text-secondary leading-normal group-hover:text-accent transition-colors">
        {task.title}
      </h4>

      {isUnassigned && (
        <div className="mt-2.5 flex items-center space-x-2">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 border border-red-500/20 uppercase tracking-wider">
            Unassigned
          </span>
          {user && (
            <button
              disabled={isClaiming}
              onClick={(e) => {
                e.stopPropagation();
                if (onClaim) onClaim(task.id);
              }}
              className="text-[9px] font-bold px-2 py-0.5 rounded bg-accent hover:bg-accent-hover text-white cursor-pointer border-none shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
              title="Assign this task to yourself"
            >
              {isClaiming ? (
                <>
                  <span className="w-2 h-2 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Assigning...</span>
                </>
              ) : (
                <span>Assign to Me</span>
              )}
            </button>
          )}
        </div>
      )}

      {/* Task Description */}
      {task.desc && (
        <p className="text-[10px] text-text-secondary-muted mt-1.5 leading-relaxed line-clamp-2">
          {task.desc}
        </p>
      )}

      {/* Task Footer Meta */}
      <div className="mt-3.5 pt-2.5 border-t border-border-secondary/30 flex items-center justify-between">
        <span
          className={`text-[9px] font-semibold px-2 py-0.5 rounded border ${getPriorityStyle(
            task.priority
          )}`}
        >
          {task.priority || 'Medium'}
        </span>

        <div className="flex items-center space-x-2">
          {canDeleteOrEdit && onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              className="opacity-0 group-hover:opacity-100 text-text-secondary-muted hover:text-red-500 transition-opacity p-1 rounded hover:bg-red-500/10"
              title="Delete task"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <div
            className="w-5 h-5 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-[9px] font-bold text-accent uppercase"
            title={task.assignee || 'Unassigned'}
          >
            {task.assignee ? task.assignee.charAt(0) : '?'}
          </div>
        </div>
      </div>
    </div>
  );
});

TaskCard.displayName = 'TaskCard';
export default TaskCard;
