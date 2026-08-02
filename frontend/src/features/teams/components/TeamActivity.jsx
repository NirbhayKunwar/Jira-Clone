import React from 'react';
import { Activity, Clock } from 'lucide-react';
import { useWorkspaceActivity } from '../../audit/hooks/useAuditLogs';

export default function TeamActivity({ team, workspaceId }) {
  const { data: activities = [], isLoading } = useWorkspaceActivity(workspaceId);

  // Filter logs for this specific team
  const teamActivities = (Array.isArray(activities) ? activities : []).filter(a => a && a.resourceType === 'Team' && String(a.resourceId) === String(team?.id));

  return (
    <div className="space-y-5 text-left">
      <div className="flex items-center space-x-2.5">
        <Activity className="w-4.5 h-4.5 text-accent" />
        <h4 className="text-sm font-bold text-text-secondary">Recent Team Activity</h4>
      </div>

      {isLoading ? (
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      ) : teamActivities.length === 0 ? (
        <div className="bg-card-secondary border border-border-secondary/60 rounded-xl p-8 text-center text-xs text-text-secondary-muted italic">
          No audit logs or actions recorded for this team yet.
        </div>
      ) : (
        <div className="relative border-l border-border-secondary/40 ml-4.5 pl-6 space-y-5.5 py-2">
          {teamActivities.map((act) => {
            const timeStr = new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = new Date(act.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
            
            return (
              <div key={act.id} className="relative group">
                {/* Timeline circle */}
                <span className="absolute -left-[30px] top-1.5 w-2 h-2 rounded-full bg-accent ring-4 ring-dominant-offset group-hover:scale-125 transition-transform" />
                
                <div className="bg-card-secondary p-4 rounded-xl border border-border-secondary/50 shadow-xs hover:shadow transition-all">
                  <div className="flex items-center justify-between gap-4 text-[10px] text-text-secondary-muted font-bold">
                    <span className="text-accent uppercase tracking-wider">{act.action}</span>
                    <span className="flex items-center space-x-1 font-normal font-mono">
                      <Clock className="w-3 h-3" />
                      <span>{dateStr} {timeStr}</span>
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary font-medium mt-2 leading-relaxed">
                    <strong>{act.actor?.name || 'User'}</strong> performed <strong>{act.action}</strong>
                    {act.newValue && <span>: {act.newValue}</span>}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] text-text-secondary-muted mt-2 font-mono">
                    <span>IP: {act.ipAddress || '127.0.0.1'}</span>
                    <span>Device: {act.device || 'Desktop'}</span>
                    <span>Browser: {act.browser || 'Chrome'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
