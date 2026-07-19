import React from 'react';
import { ChevronLeft, Info } from 'lucide-react';
import { useUiStore } from '../../../store/uiStore';
import { useTeamDetails } from '../hooks/useTeams';
import TeamOverview from './TeamOverview';
import TeamMembers from './TeamMembers';
import TeamProjects from './TeamProjects';
import TeamActivity from './TeamActivity';
import TeamSettings from './TeamSettings';

export default function TeamDetailsWrapper({ workspaceId }) {
  const { selectedTeamId, setSelectedTeam, activeTeamTab, setSelectedTeam: setActiveTab } = useUiStore();
  const { data: team, isLoading, error } = useTeamDetails(selectedTeamId);

  if (isLoading) {
    return (
      <div className="bg-card-secondary rounded-xl border border-border-secondary/60 p-12 text-center text-text-secondary-muted text-xs font-semibold">
        <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span>Loading team details...</span>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="bg-card-secondary border border-red-500/20 text-red-500 rounded-xl p-8 text-center text-xs font-bold">
        <span>Failed to load team details: {error?.message || 'Team not found.'}</span>
      </div>
    );
  }

  const handleBack = () => setSelectedTeam(null);
  const handleTabChange = (tab) => setSelectedTeam(selectedTeamId, tab);

  return (
    <div className="space-y-6 animate-[fade-in_200ms_ease-out]">
      {/* Header Back button row */}
      <div className="flex items-center space-x-3 text-left">
        <button
          onClick={handleBack}
          className="p-2 rounded-lg border border-border-secondary text-text-secondary-muted hover:text-text-secondary hover:bg-dominant-offset cursor-pointer transition-colors bg-transparent flex items-center justify-center"
          title="Back to Teams Directory"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div>
          <h3 className="font-bold text-text-secondary text-base flex items-center space-x-2">
            <span>{team.name}</span>
          </h3>
          <p className="text-xs text-text-secondary-muted mt-0.5">
            Manage custom project teams, assign members, and track group workload distribution.
          </p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-border-secondary/35 bg-card-secondary rounded-xl p-1 overflow-x-auto">
        {['overview', 'members', 'projects', 'activity', 'settings'].map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`flex-grow sm:flex-grow-0 px-5 py-2.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer border-none bg-transparent ${
              activeTeamTab === tab
                ? 'bg-accent/15 text-accent shadow-sm'
                : 'text-text-secondary-muted hover:text-text-secondary hover:bg-dominant-offset'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tabs View Panels */}
      <div className="bg-card-secondary rounded-xl border border-border-secondary/60 p-6">
        {activeTeamTab === 'overview' && <TeamOverview team={team} />}
        {activeTeamTab === 'members' && <TeamMembers team={team} workspaceId={workspaceId} />}
        {activeTeamTab === 'projects' && <TeamProjects team={team} workspaceId={workspaceId} />}
        {activeTeamTab === 'activity' && <TeamActivity team={team} workspaceId={workspaceId} />}
        {activeTeamTab === 'settings' && <TeamSettings team={team} workspaceId={workspaceId} />}
      </div>
    </div>
  );
}
