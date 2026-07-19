import React from 'react';
import { CheckCircle2, Clock } from 'lucide-react';

export default function TasksTab({ tasks }) {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'Medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      default: return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    }
  };

  return (
    <div className="space-y-5.5 text-left">
      {/* Active Tasks */}
      <div>
        <h5 className="text-[10px] font-bold text-text-secondary-muted uppercase tracking-wider mb-2.5 flex items-center space-x-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span>Active Tasks ({tasks.activeCount})</span>
        </h5>
        
        {tasks.active?.length === 0 ? (
          <p className="text-xs text-text-secondary-muted italic pl-1">No active tasks assigned.</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {tasks.active?.map((task) => (
              <div key={task.id} className="bg-card-secondary p-3 rounded-lg border border-border-secondary/50 flex justify-between items-center gap-4 hover:border-accent/20 transition-colors">
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-text-secondary truncate">{task.title}</span>
                  <span className="block text-[9px] text-text-secondary-muted font-mono mt-0.5 uppercase">{task.status || 'todo'}</span>
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider flex-shrink-0 ${getPriorityColor(task.priority)}`}>
                  {task.priority || 'Medium'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Tasks summary */}
      <div className="border-t border-border-secondary/20 pt-4">
        <h5 className="text-[10px] font-bold text-text-secondary-muted uppercase tracking-wider mb-2.5 flex items-center space-x-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          <span>Completed ({tasks.completedCount})</span>
        </h5>
        <div className="bg-green-500/5 border border-green-500/15 p-4 rounded-xl flex items-center justify-between text-xs text-green-500 font-bold">
          <span>Completion efficiency</span>
          <span>{tasks.completedCount} Total items</span>
        </div>
      </div>
    </div>
  );
}
