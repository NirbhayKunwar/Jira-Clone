import React from 'react';
import { Plus, UserPlus, FileText, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useUiStore } from '../../../store/uiStore';
import { useWorkspaceMembers } from '../hooks/useWorkspaceMembers';
import MemberFilters from './MemberFilters';
import MemberRow from './MemberRow';

export default function MembersTable({ workspaceId }) {
  const { user } = useAuthStore();
  const { setInviteModal, workspaceMembersFilter } = useUiStore();

  const { data: members = [], isLoading, error } = useWorkspaceMembers(
    workspaceId,
    workspaceMembersFilter.search,
    workspaceMembersFilter.role,
    workspaceMembersFilter.status
  );

  const canInvite = user?.rbacRole === 'ADMIN' || user?.rbacRole === 'LEADER';

  return (
    <div className="space-y-5 animate-[fade-in_200ms_ease-out]">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-text-secondary text-base">Workspace Members</h3>
          <p className="text-xs text-text-secondary-muted mt-0.5">Manage access controls, update workspace roles, view workloads, and invite teammates.</p>
        </div>
        {canInvite && (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setInviteModal(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-sm transition-all cursor-pointer border-none"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite Teammate</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter Row */}
      <MemberFilters />

      {/* Loading / Error States */}
      {isLoading ? (
        <div className="bg-card-secondary border border-border-secondary/60 rounded-xl p-12 text-center text-text-secondary-muted text-xs font-semibold">
          <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <span>Loading workspace members...</span>
        </div>
      ) : error ? (
        <div className="bg-card-secondary border border-red-500/20 text-red-500 rounded-xl p-8 text-center text-xs font-bold">
          <span>Failed to load members: {error.message}</span>
        </div>
      ) : members.length === 0 ? (
        <div className="bg-card-secondary border border-border-secondary/60 rounded-xl p-12 text-center space-y-4">
          <Users className="w-8 h-8 text-accent mx-auto" />
          <div>
            <h4 className="text-sm font-bold text-text-secondary">No members found</h4>
            <p className="text-xs text-text-secondary-muted mt-1 max-w-sm mx-auto">Try refining your search queries or filter conditions.</p>
          </div>
        </div>
      ) : (
        /* Members Table Container */
        <div className="bg-card-secondary rounded-xl border border-border-secondary/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="min-w-full divide-y divide-border-secondary/40 text-left">
              <thead className="bg-dominant-offset/10 text-xs font-bold text-text-secondary-muted uppercase tracking-wider select-none">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Workspace Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Projects</th>
                  <th className="px-6 py-4">Workload</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-secondary/35">
                {members.map((member) => (
                  <MemberRow key={member.id} member={member} workspaceId={workspaceId} allMembers={members} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
