import React, { useState } from 'react';
import { AlertTriangle, Archive, Trash2 } from 'lucide-react';
import { useArchiveTeam } from '../hooks/useTeams';
import { useUiStore } from '../../../store/uiStore';

export default function TeamSettings({ team, workspaceId }) {
  const archiveMutation = useArchiveTeam(team.id, workspaceId);
  const { setSelectedTeam } = useUiStore();
  const [teamName, setTeamName] = useState(team.name);
  const [teamDesc, setTeamDesc] = useState(team.descText || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdateTeam = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Mock update for details setting
      const res = await fetch(`/api/teams/${team.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: teamName, descText: teamDesc })
      });
      if (!res.ok) throw new Error('Failed to update team details');
      alert('Team settings updated successfully.');
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!confirm('Are you sure you want to archive this team? Members will lose team-specific access.')) {
      return;
    }
    try {
      await archiveMutation.mutateAsync();
      alert('Team archived successfully.');
      setSelectedTeam(null);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Settings Form */}
      <form onSubmit={handleUpdateTeam} className="bg-card-secondary p-5.5 rounded-xl border border-border-secondary/60 space-y-4">
        <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider pb-1.5 border-b border-border-secondary/20">General Settings</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="team-settings-name" className="text-[10px] font-bold text-text-secondary-muted uppercase">Team Name</label>
            <input
              id="team-settings-name"
              type="text"
              required
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-border-secondary bg-dominant text-text-secondary focus:outline-none"
            />
          </div>
          
          <div className="space-y-1">
            <label htmlFor="team-settings-desc" className="text-[10px] font-bold text-text-secondary-muted uppercase">Description</label>
            <input
              id="team-settings-desc"
              type="text"
              value={teamDesc}
              onChange={(e) => setTeamDesc(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-border-secondary bg-dominant text-text-secondary focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer border-none"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="bg-red-500/5 p-5.5 rounded-xl border border-red-500/15 space-y-4">
        <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider pb-1.5 border-b border-red-500/10 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <span>Danger Zone</span>
        </h4>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h5 className="text-xs font-bold text-text-secondary">Archive this Team</h5>
            <p className="text-[11px] text-text-secondary-muted mt-0.5 leading-relaxed">
              Archiving a team prevents members from viewing team boards, but preserves past task comments and workloads.
            </p>
          </div>
          <button
            type="button"
            onClick={handleArchive}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold shadow-sm cursor-pointer border-none"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Archive Team</span>
          </button>
        </div>
      </div>
    </div>
  );
}
