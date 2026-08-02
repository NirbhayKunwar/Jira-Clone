import React, { useState } from 'react';
import { UserCheck, Trash2, Plus, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useUiStore } from '../../../store/uiStore';
import { useWorkspaceMembers } from '../../workspace/hooks/useWorkspaceMembers';
import { useAddTeamMember, useUpdateTeamMember, useRemoveTeamMember, useTransferTeamLead } from '../hooks/useTeams';

export default function TeamMembers({ team, workspaceId }) {
  const { user: currentUser } = useAuthStore();
  const { setProfileDrawer } = useUiStore();

  const addMemberMutation = useAddTeamMember(team.id, workspaceId);
  const updateMemberMutation = useUpdateTeamMember(team.id, workspaceId);
  const removeMemberMutation = useRemoveTeamMember(team.id, workspaceId);
  const transferLeadMutation = useTransferTeamLead(team.id, workspaceId);

  // Fetch all active workspace members to show in "Add Member" dropdown
  const { data: wsMembers = [] } = useWorkspaceMembers(workspaceId, '', '', 'ACTIVE');

  const [selectedWsMemberId, setSelectedWsMemberId] = useState('');
  const [selectedRole, setSelectedRole] = useState('FULLSTACK_ENGINEER');

  const isLeader = team.teamLeadId === currentUser?.id;
  const isAdmin = currentUser?.rbacRole === 'ADMIN' || currentUser?.rbacRole === 'LEADER';
  const canManage = isAdmin || isLeader;

  // Filter out users who are already in the team
  const existingTeamMemberUserIds = team?.teamMembers?.map(m => m.workspaceMember?.userId) || [];
  const addableWsMembers = (Array.isArray(wsMembers) ? wsMembers : []).filter(m => m && !existingTeamMemberUserIds.includes(m.userId));

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!selectedWsMemberId) return;
    try {
      await addMemberMutation.mutateAsync({
        workspaceMemberId: selectedWsMemberId,
        role: selectedRole
      });
      setSelectedWsMemberId('');
      alert('Teammate added to team successfully.');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      await updateMemberMutation.mutateAsync({ memberId, role: newRole });
      alert('Team role updated.');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm('Are you sure you want to remove this member from the team?')) return;
    try {
      await removeMemberMutation.mutateAsync(memberId);
      alert('Member removed from team.');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleTransferLead = async (memberId) => {
    if (!confirm('Are you sure you want to transfer Team Lead to this member? You will be demoted to developer.')) return;
    try {
      await transferLeadMutation.mutateAsync(memberId);
      alert('Team Lead transferred successfully.');
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-5 text-left">
      
      {/* Add Member inline form */}
      {canManage && addableWsMembers.length > 0 && (
        <form onSubmit={handleAddMember} className="bg-card-secondary p-4 rounded-xl border border-border-secondary/60 flex flex-col md:flex-row items-end md:items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row gap-4 flex-grow">
            <div className="space-y-1 flex-grow">
              <label htmlFor="team-member-add-select" className="text-[10px] font-bold text-text-secondary-muted uppercase">Select Workspace Member</label>
              <select
                id="team-member-add-select"
                value={selectedWsMemberId}
                onChange={(e) => setSelectedWsMemberId(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-border-secondary bg-dominant text-text-secondary focus:outline-none cursor-pointer"
              >
                <option value="">Select teammate...</option>
                {addableWsMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.user.name} ({m.user.email})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="team-member-role-select" className="text-[10px] font-bold text-text-secondary-muted uppercase">Assign Team Role</label>
              <select
                id="team-member-role-select"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full text-xs p-2 rounded-lg border border-border-secondary bg-dominant text-text-secondary focus:outline-none cursor-pointer"
              >
                <option value="FULLSTACK_ENGINEER">Full Stack Engineer</option>
                <option value="FRONTEND_DEVELOPER">Frontend Developer</option>
                <option value="BACKEND_DEVELOPER">Backend Developer</option>
                <option value="QA_ENGINEER">QA Engineer</option>
                <option value="UI_UX_DESIGNER">UI/UX Designer</option>
                <option value="DEVOPS_ENGINEER">DevOps Engineer</option>
                <option value="PRODUCT_MANAGER">Product Manager</option>
                <option value="BUSINESS_ANALYST">Business Analyst</option>
                <option value="VIEWER">Viewer</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={!selectedWsMemberId}
            className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer border-none flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Member</span>
          </button>
        </form>
      )}

      {/* Team Members list table */}
      <div className="bg-card-secondary rounded-xl border border-border-secondary/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border-secondary/40 text-left">
            <thead className="bg-dominant-offset/10 text-xs font-bold text-text-secondary-muted uppercase tracking-wider select-none">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Team Role</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-secondary/35">
              {team.teamMembers?.map((m) => {
                const isMe = m.workspaceMember?.userId === currentUser?.id;
                const isLead = m.role === 'TEAM_LEAD';
                const initials = m.workspaceMember?.user?.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'TM';

                return (
                  <tr key={m.id} className="hover:bg-dominant-offset/5 transition-colors border-b border-border-secondary/30 last:border-0">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3.5">
                        <button
                          onClick={() => setProfileDrawer(true, m.workspaceMemberId)}
                          className="w-9 h-9 rounded-full bg-accent-light text-accent flex items-center justify-center font-bold text-xs border border-accent/15 cursor-pointer hover:bg-accent hover:text-white transition-all shadow-sm"
                        >
                          {initials}
                        </button>
                        <div>
                          <div className="text-sm font-bold text-text-secondary flex items-center">
                            {m.workspaceMember?.user?.name}
                            {isMe && (
                              <span className="ml-2 px-1.5 py-0.5 text-[8px] bg-accent/15 text-accent font-bold rounded-full uppercase tracking-wider">You</span>
                            )}
                          </div>
                          <div className="text-[10px] text-text-secondary-muted font-mono font-medium lowercase mt-0.5">@{m.workspaceMember?.user?.email.split('@')[0]}</div>
                        </div>
                      </div>
                    </td>

                    {/* Team Role select drop down */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {canManage && !isMe && !isLead ? (
                        <select
                          aria-label="Assign Team Role"
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.id, e.target.value)}
                          className="text-xs font-semibold bg-dominant border border-border-secondary rounded-lg px-2.5 py-1.5 text-text-secondary focus:outline-none cursor-pointer"
                        >
                          <option value="FULLSTACK_ENGINEER">Full Stack Engineer</option>
                          <option value="FRONTEND_DEVELOPER">Frontend Developer</option>
                          <option value="BACKEND_DEVELOPER">Backend Developer</option>
                          <option value="QA_ENGINEER">QA Engineer</option>
                          <option value="UI_UX_DESIGNER">UI/UX Designer</option>
                          <option value="DEVOPS_ENGINEER">DevOps Engineer</option>
                          <option value="PRODUCT_MANAGER">Product Manager</option>
                          <option value="BUSINESS_ANALYST">Business Analyst</option>
                          <option value="VIEWER">Viewer</option>
                        </select>
                      ) : (
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          isLead ? 'bg-accent/15 text-accent border border-accent/25' : 'bg-dominant-offset text-text-secondary-muted'
                        }`}>
                          {m.role}
                        </span>
                      )}
                    </td>

                    {/* Team Member Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-semibold">
                      <div className="flex items-center justify-end space-x-2.5">
                        {canManage && !isLead && !isMe && (
                          <button
                            onClick={() => handleTransferLead(m.id)}
                            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-accent/20 text-accent hover:bg-accent/5 transition-all cursor-pointer bg-transparent text-xs"
                            title="Make Team Lead"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Make Lead</span>
                          </button>
                        )}
                        {canManage && !isLead && !isMe && (
                          <button
                            onClick={() => handleRemoveMember(m.id)}
                            className="p-1.5 rounded-lg text-text-secondary-muted hover:text-red-500 hover:bg-red-500/5 transition-all cursor-pointer border-none bg-transparent"
                            title="Remove Member from Team"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(!team.teamMembers || team.teamMembers.length === 0) && (
                <tr>
                  <td colSpan="3" className="px-6 py-10 text-center text-xs text-text-secondary-muted italic">
                    No members assigned to this team.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
