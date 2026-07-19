import React from 'react';
import { Rocket, Info } from 'lucide-react';
import { useWorkspaceProjects } from '../../workspace/hooks/useWorkspaceMembers';

export default function TeamProjects({ team, workspaceId }) {
  const { data: projects = [], isLoading } = useWorkspaceProjects(workspaceId);

  return (
    <div className="space-y-5 text-left">
      <div className="bg-card-secondary p-5 rounded-xl border border-border-secondary/60">
        <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Team Projects scope</h4>
        <p className="text-xs text-text-secondary-muted leading-relaxed">
          Teammates assigned to the following projects will collaborate on shared tasks, boards, and milestones.
        </p>
      </div>

      {isLoading ? (
        <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
      ) : projects.length === 0 ? (
        <div className="bg-card-secondary rounded-xl border border-border-secondary/60 p-8 text-center text-xs text-text-secondary-muted italic">
          No projects created or assigned to this workspace yet. Add a project inside Workspace Settings.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((project) => (
            <div key={project.id} className="bg-card-secondary p-5.5 rounded-xl border border-border-secondary/60 hover:border-accent/25 transition-all shadow-sm relative flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center font-bold text-xs">
                    <Rocket className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-text-secondary">{project.name}</h5>
                    <span className="text-[10px] text-text-secondary-muted font-mono tracking-wide">{project.key}</span>
                  </div>
                </div>
                <p className="text-xs text-text-secondary-muted mt-3 leading-relaxed">
                  {project.description || 'No description provided.'}
                </p>
              </div>
              <div className="border-t border-border-secondary/20 pt-3 mt-4 flex items-center justify-between text-[10px] text-text-secondary-muted font-bold uppercase">
                <span>Status: <strong className="text-accent">{project.status}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
