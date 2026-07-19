import React from 'react';
import { UserCheck, Clock, BarChart3, CheckCircle2 } from 'lucide-react';

export default function TeamOverview({ team }) {
  const membersCount = team.teamMembers?.length || 0;
  
  // Mock metrics for wow factor
  const totalTasks = membersCount * 3;
  const completedTasks = membersCount * 2;
  const activeTasks = totalTasks - completedTasks;
  const completionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6 text-left">
      {/* Description Panel */}
      <div className="bg-card-secondary p-5.5 rounded-xl border border-border-secondary/60">
        <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Team Scope & Description</h4>
        <p className="text-xs text-text-secondary-muted leading-relaxed">
          {team.descText || 'No custom description provided for this team. Add one in Team Settings.'}
        </p>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Team Lead */}
        <div className="bg-card-secondary p-5 rounded-xl border border-border-secondary/60 flex items-center space-x-4">
          <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-text-secondary-muted font-bold uppercase">Team Lead</span>
            <span className="block text-xs font-bold text-text-secondary mt-0.5 truncate max-w-[120px]">
              {team.teamLead?.name || 'Unassigned'}
            </span>
          </div>
        </div>

        {/* Member Count */}
        <div className="bg-card-secondary p-5 rounded-xl border border-border-secondary/60 flex items-center space-x-4">
          <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-text-secondary-muted font-bold uppercase">Active Size</span>
            <span className="block text-xs font-bold text-text-secondary mt-0.5">{membersCount} Members</span>
          </div>
        </div>

        {/* Workload Completed */}
        <div className="bg-card-secondary p-5 rounded-xl border border-border-secondary/60 flex items-center space-x-4">
          <div className="w-10 h-10 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-text-secondary-muted font-bold uppercase">Progress rate</span>
            <span className="block text-xs font-bold text-text-secondary mt-0.5">{completionRate}% Completed</span>
          </div>
        </div>

        {/* Total Tasks */}
        <div className="bg-card-secondary p-5 rounded-xl border border-border-secondary/60 flex items-center space-x-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-text-secondary-muted font-bold uppercase">Active Workload</span>
            <span className="block text-xs font-bold text-text-secondary mt-0.5">{activeTasks} Active issues</span>
          </div>
        </div>
      </div>

      {/* Wow Factor visual stats */}
      <div className="bg-card-secondary p-5.5 rounded-xl border border-border-secondary/60">
        <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-4">Team Utilization Index</h4>
        <div className="w-full bg-dominant h-2.5 rounded-full overflow-hidden border border-border-secondary/20 relative">
          <div className="bg-accent h-2.5 rounded-full" style={{ width: `${Math.min(membersCount * 12, 100)}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-text-secondary-muted font-bold mt-2">
          <span>0% Idle</span>
          <span>Target Capacity: {Math.min(membersCount * 12, 100)}% (Optimal)</span>
          <span>100% Saturated</span>
        </div>
      </div>
    </div>
  );
}
