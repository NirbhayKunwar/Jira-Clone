import React from 'react';
import { Rocket } from 'lucide-react';

export default function ProjectsTab({ projects }) {
  return (
    <div className="space-y-4 text-left">
      <h5 className="text-[10px] font-bold text-text-secondary-muted uppercase tracking-wider mb-1">Project Memberships ({projects?.length || 0})</h5>
      
      {projects?.length === 0 ? (
        <p className="text-xs text-text-secondary-muted italic pl-1">Not assigned to any projects.</p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {projects?.map((pm) => (
            <div key={pm.id} className="bg-card-secondary p-3.5 rounded-lg border border-border-secondary/50 flex justify-between items-center gap-4">
              <div className="flex items-center space-x-2.5 min-w-0">
                <Rocket className="w-4.5 h-4.5 text-accent flex-shrink-0" />
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-text-secondary truncate">{pm.project?.name || 'Unknown Project'}</span>
                  <span className="block text-[9px] text-text-secondary-muted font-mono uppercase mt-0.5">{pm.project?.key}</span>
                </div>
              </div>
              
              <span className="text-[10px] font-bold bg-accent/10 text-accent px-2 py-0.5 rounded uppercase tracking-wider flex-shrink-0">
                {pm.role}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
