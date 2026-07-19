import React from 'react';
import { Activity, Clock } from 'lucide-react';
import { useAuditLogs } from '../hooks/useAuditLogs';

export default function AuditTimeline({ workspaceId }) {
  const { data: auditLogs = [], isLoading, error } = useAuditLogs(workspaceId);

  return (
    <div className="space-y-5.5 text-left animate-[fade-in_200ms_ease-out]">
      <div>
        <h3 className="font-bold text-text-secondary text-base">Immutable Audit Ledger</h3>
        <p className="text-xs text-text-secondary-muted mt-0.5">Chronological record of administrative events, role updates, and organizational actions.</p>
      </div>

      {isLoading ? (
        <div className="bg-card-secondary border border-border-secondary/60 rounded-xl p-12 text-center text-text-secondary-muted text-xs font-semibold">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <span>Loading workspace audit logs...</span>
        </div>
      ) : error ? (
        <div className="bg-card-secondary border border-red-500/20 text-red-500 rounded-xl p-8 text-center text-xs font-bold">
          <span>Failed to load audit logs: {error.message}</span>
        </div>
      ) : auditLogs.length === 0 ? (
        <div className="bg-card-secondary border border-border-secondary/60 rounded-xl p-12 text-center text-xs text-text-secondary-muted italic">
          No audit logs recorded in this workspace.
        </div>
      ) : (
        <div className="bg-card-secondary border border-border-secondary/60 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border-secondary/40 text-left">
              <thead className="bg-dominant-offset/10 text-xs font-bold text-text-secondary-muted uppercase tracking-wider select-none">
                <tr>
                  <th className="px-6 py-4">Actor</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Resource Info</th>
                  <th className="px-6 py-4">Details</th>
                  <th className="px-6 py-4">Context (IP / Device)</th>
                  <th className="px-6 py-4">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-secondary/35 text-xs text-text-secondary font-medium">
                {auditLogs.map((log) => {
                  const dateStr = new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
                  const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  
                  return (
                    <tr key={log.id} className="hover:bg-dominant-offset/5 border-b border-border-secondary/30 last:border-0">
                      <td className="px-6 py-4.5">
                        <div className="font-bold text-text-secondary">{log.actor?.name || 'System'}</div>
                        <div className="text-[10px] text-text-secondary-muted font-normal lowercase mt-0.5">{log.actor?.email}</div>
                      </td>
                      <td className="px-6 py-4.5">
                        <span className="text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 font-mono text-[10px] text-text-secondary-muted">
                        {log.resourceType} ({log.resourceId?.slice(-6)})
                      </td>
                      <td className="px-6 py-4.5 max-w-xs truncate" title={log.newValue || log.oldValue}>
                        {log.newValue || log.oldValue || '—'}
                      </td>
                      <td className="px-6 py-4.5 text-[10px] text-text-secondary-muted font-mono">
                        <div>IP: {log.ipAddress || '127.0.0.1'}</div>
                        <div className="mt-0.5">{log.device || 'Desktop'} ({log.browser || 'Chrome'})</div>
                      </td>
                      <td className="px-6 py-4.5 text-text-secondary-muted flex items-center space-x-1 mt-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{dateStr} {timeStr}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
