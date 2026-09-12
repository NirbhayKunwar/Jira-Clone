// frontend/src/workers/boardWorker.js

self.onmessage = function (e) {
  const { tasksById, filterText, assigneeFilter, epicFilter } = e.data;
  const text = (filterText || '').toLowerCase();
  const resultIds = [];

  const keys = Object.keys(tasksById || {});
  for (let i = 0; i < keys.length; i++) {
    const task = tasksById[keys[i]];
    if (!task) continue;

    if (assigneeFilter && task.assigneeId !== assigneeFilter) continue;
    if (epicFilter && task.epic !== epicFilter) continue;
    const taskTitle = task.title ? String(task.title).toLowerCase() : '';
    if (text && !taskTitle.includes(text)) continue;

    resultIds.push(task.id);
  }

  self.postMessage({ resultIds });
};
