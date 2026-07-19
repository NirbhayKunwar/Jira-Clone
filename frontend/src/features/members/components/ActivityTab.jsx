import React from 'react';
import { Activity, Clock } from 'lucide-react';

export default function ActivityTab({ activities }) {
  return (
    <div className="space-y-4 text-left">
      <h5 className="text-[10px] font-bold text-text-secondary-muted uppercase tracking-wider mb-1">Audit timeline ({activities?.length || 0})</h5>
      
      {activities?.length === 0 ? (
        <p className="text-xs text-text-secondary-muted italic pl-1">No activities recorded.</p>
      ) : (
        <div className="relative border-l border-border-secondary/40 ml-3 pl-5 space-y-4 py-1.5 max-h-80 overflow-y-auto pr-1">
          {activities.map((act) => {
            const timeStr = new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = new Date(act.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
            
            return (
              <div key={act.id} className="relative group">
                <span className="absolute -left-[25px] top-1.5 w-1.5 h-1.5 rounded-full bg-accent ring-4 ring-dominant-offset group-hover:scale-125 transition-transform" />
                
                <div className="text-xs">
                  <div className="flex items-center space-x-1.5 text-[9px] text-text-secondary-muted font-mono">
                    <Clock className="w-3 h-3" />
                    <span>{dateStr} {timeStr}</span>
                  </div>
                  <p className="text-text-secondary font-medium mt-1 leading-relaxed">
                    <strong>{act.actor?.name || 'User'}</strong> performed <strong>{act.action}</strong>
                    {act.newValue && <span className="text-text-secondary-muted"> ({act.newValue})</span>}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
