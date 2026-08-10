import { create } from 'zustand';

const DEFAULT_COLUMNS = {
  todo: { id: 'todo', title: 'To Do', taskIds: [] },
  in_progress: { id: 'in_progress', title: 'In Progress', taskIds: [] },
  review: { id: 'review', title: 'In Review', taskIds: [] },
  done: { id: 'done', title: 'Done', taskIds: [] },
};

const DEFAULT_COLUMN_ORDER = ['todo', 'in_progress', 'review', 'done'];

export const useBoardStore = create((set, get) => ({
  tasksById: {},
  columns: DEFAULT_COLUMNS,
  columnOrder: DEFAULT_COLUMN_ORDER,

  /**
   * Normalizes incoming raw array of tasks into:
   * tasksById: Record<string, Task>
   * columns: Record<string, { id: string, title: string, taskIds: string[] }>
   */
  setTasks: (tasks = []) => {
    const tasksById = {};
    const columns = {
      todo: { id: 'todo', title: 'To Do', taskIds: [] },
      in_progress: { id: 'in_progress', title: 'In Progress', taskIds: [] },
      review: { id: 'review', title: 'In Review', taskIds: [] },
      done: { id: 'done', title: 'Done', taskIds: [] },
    };

    tasks.forEach((task) => {
      tasksById[task.id] = task;
      const colId = task.status || 'todo';
      if (!columns[colId]) {
        columns[colId] = { id: colId, title: colId, taskIds: [] };
      }
      columns[colId].taskIds.push(task.id);
    });

    set({ tasksById, columns });
  },

  /**
   * O(1) Optimistic Move Task across or within columns.
   * Modifies ONLY affected columns and task status, preventing board re-render storm.
   */
  moveTask: (taskId, sourceColId, destColId, sourceIndex, destIndex) => {
    const { tasksById, columns } = get();

    // Snapshot for optimistic rollback
    const previousState = {
      tasksById: { ...tasksById },
      columns: Object.keys(columns).reduce((acc, key) => {
        acc[key] = { ...columns[key], taskIds: [...columns[key].taskIds] };
        return acc;
      }, {}),
    };

    const sourceTaskIds = [...(columns[sourceColId]?.taskIds || [])];
    const destTaskIds = sourceColId === destColId ? sourceTaskIds : [...(columns[destColId]?.taskIds || [])];

    // Remove from source index
    const sIndex = sourceTaskIds.indexOf(taskId);
    if (sIndex !== -1) {
      sourceTaskIds.splice(sIndex, 1);
    }

    // Insert into destination index
    const targetIndex = Math.min(Math.max(0, destIndex), destTaskIds.length);
    destTaskIds.splice(targetIndex, 0, taskId);

    const updatedTask = {
      ...tasksById[taskId],
      status: destColId,
      completedAt: destColId === 'done' ? new Date().toISOString() : null,
    };

    const updatedColumns = {
      ...columns,
      [sourceColId]: {
        ...columns[sourceColId],
        taskIds: sourceTaskIds,
      },
      [destColId]: {
        ...columns[destColId],
        taskIds: destTaskIds,
      },
    };

    set({
      tasksById: {
        ...tasksById,
        [taskId]: updatedTask,
      },
      columns: updatedColumns,
    });

    return previousState;
  },

  /**
   * Add new task optimistically
   */
  addTask: (task) => {
    const { tasksById, columns } = get();
    const colId = task.status || 'todo';
    const targetCol = columns[colId] || { id: colId, title: colId, taskIds: [] };

    set({
      tasksById: { ...tasksById, [task.id]: task },
      columns: {
        ...columns,
        [colId]: {
          ...targetCol,
          taskIds: [task.id, ...targetCol.taskIds],
        },
      },
    });
  },

  /**
   * Update task fields in-place
   */
  updateTask: (taskId, patch) => {
    const { tasksById } = get();
    if (!tasksById[taskId]) return;

    set({
      tasksById: {
        ...tasksById,
        [taskId]: { ...tasksById[taskId], ...patch },
      },
    });
  },

  /**
   * Remove task optimistically
   */
  removeTask: (taskId) => {
    const { tasksById, columns } = get();
    const task = tasksById[taskId];
    if (!task) return;

    const colId = task.status || 'todo';
    const newTasksById = { ...tasksById };
    delete newTasksById[taskId];

    set({
      tasksById: newTasksById,
      columns: {
        ...columns,
        [colId]: {
          ...columns[colId],
          taskIds: columns[colId]?.taskIds.filter((id) => id !== taskId) || [],
        },
      },
    });
  },

  /**
   * Rollback state on mutation failure
   */
  rollback: (previousState) => {
    if (previousState) {
      set({
        tasksById: previousState.tasksById,
        columns: previousState.columns,
      });
    }
  },
}));
