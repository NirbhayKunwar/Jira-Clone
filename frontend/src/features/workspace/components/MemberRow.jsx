import React, { useState } from 'react';
import { Eye, ShieldAlert, Trash2, Check, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useUiStore } from '../../../store/uiStore';
import { useUpdateWorkspaceMember, useRemoveWorkspaceMember, useTransferTasks } from '../hooks/useWorkspaceMembers';

export default function MemberRow({ member, workspaceId, allMembers = [] }) {
  const { user: currentUser } = useAuthStore();
  const { setProfileDrawer, setWorkspaceMembersFilter } = useUiStore();
  const updateMutation = useUpdateWorkspaceMember(workspaceId);
  const removeMutation = useRemoveWorkspaceMember(workspaceId);
  const transferTasksMutation = useTransferTasks(workspaceId);

  const [isTransferring, setIsTransferring] = useState(false);
  const [targetTransferUserId, setTargetTransferUserId] = useState('');
  const [requiresTransfer, setRequiresTransfer] = useState(false);
  const [activeTasksCount, setActiveTasksCount] = useState(0);

  const initials = member.user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const isMe = member.user.id === currentUser?.id;

  // Determine current logged-in user's role in this active workspace
  const myWorkspaceMember = allMembers.find(m => m.user?.id === currentUser?.id);
  const myWorkspaceRole = myWorkspaceMember?.role || currentUser?.rbacRole || 'MEMBER';

  const canManageRole = !isMe && (myWorkspaceRole === 'OWNER' || (myWorkspaceRole === 'ADMIN' && member.role !== 'OWNER'));
  const canManageStatus = !isMe && (myWorkspaceRole === 'OWNER' || (myWorkspaceRole === 'ADMIN' && member.role !== 'OWNER'));
  const canRemove = !isMe && (myWorkspaceRole === 'OWNER' || (myWorkspaceRole === 'ADMIN' && member.role !== 'OWNER'));

  const handleRoleChange = async (newRole) => {
    try {
      if (member.role === 'OWNER' && newRole !== 'OWNER' && !confirm('Are you sure you want to demote the owner? You will lose ownership control.')) {
        return;
      }
      await updateMutation.mutateAsync({
        memberId: member.id,
        role: newRole,
        status: member.status
      });
    } catch (error) {
      alert(error.message);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await updateMutation.mutateAsync({
        memberId: member.id,
        role: member.role,
        status: newStatus
      });
    } catch (error) {
      alert(error.message);
    }
  };

  const handleRemove = async () => {
    if (!confirm(`Are you sure you want to remove ${member.user.name} from the workspace?`)) {
      return;
    }

    try {
      const res = await removeMutation.mutateAsync(member.id);
      if (res?.requiresTransfer) {
        setRequiresTransfer(true);
        setActiveTasksCount(res.activeTasksCount || 1);
      } else {
        alert('Member removed successfully.');
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const handleTransferAndRemove = async (e) => {
    e.preventDefault();
    if (!targetTransferUserId) {
      alert('Please select a team member to transfer tasks to.');
      return;
    }

    try {
      setIsTransferring(true);
      await transferTasksMutation.mutateAsync({
        fromUserId: member.user.id,
        toUserId: targetTransferUserId
      });
      await removeMutation.mutateAsync(member.id);
      setRequiresTransfer(false);
      alert('Tasks transferred and member removed successfully.');
    } catch (error) {
      alert(error.message);
    } finally {
      setIsTransferring(false);
    }
  };

  // Determine workload indicator color
  const statusColor = member.status === 'ACTIVE' ? 'bg-green-500' : 'bg-red-500';

  return (
    <>
      <tr className="hover:bg-dominant-offset/20 transition-colors border-b border-border-secondary/30 last:border-0 text-left">
        {/* User Info */}
        <td className="px-6 py-4.5 whitespace-nowrap">
          <div className="flex items-center space-x-3.5">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-accent-light text-accent flex items-center justify-center font-bold text-sm border border-accent/10 shadow-sm">
                {initials}
              </div>
              <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-card-secondary ${statusColor}`} />
            </div>
            <div>
              <div className="text-sm font-bold text-text-secondary flex items-center">
                {member.user.name}
                {isMe && (
                  <span className="ml-2 px-1.5 py-0.5 text-[8px] bg-accent/15 text-accent font-bold rounded-full uppercase tracking-wider">You</span>
                )}
              </div>
              <div className="text-[10px] text-text-secondary-muted font-mono font-medium lowercase mt-0.5">@{member.user.email.split('@')[0]}</div>
            </div>
          </div>
        </td>

        {/* Workspace Role Dropdown */}
        <td className="px-6 py-4.5 whitespace-nowrap">
          {canManageRole ? (
            <select
              aria-label="Workspace Role"
              value={member.role}
              onChange={(e) => handleRoleChange(e.target.value)}
              disabled={member.role === 'OWNER' && myWorkspaceRole !== 'OWNER'}
              className="text-xs font-semibold bg-dominant border border-border-secondary rounded-lg px-2.5 py-1.5 text-text-secondary focus:outline-none cursor-pointer focus:ring-1 focus:ring-accent"
            >
              <option value="OWNER">Owner</option>
              <option value="ADMIN">Admin</option>
              <option value="MEMBER">Member</option>
              <option value="GUEST">Guest</option>
            </select>
          ) : (
            <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {member.role}
            </span>
          )}
        </td>

        {/* Member status actions */}
        <td className="px-6 py-4.5 whitespace-nowrap">
          {canManageStatus ? (
            <select
              aria-label="Status Control"
              value={member.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="text-xs font-semibold bg-dominant border border-border-secondary rounded-lg px-2.5 py-1.5 text-text-secondary focus:outline-none cursor-pointer focus:ring-1 focus:ring-accent"
            >
              <option value="ACTIVE">Active</option>
              <option value="DEACTIVATED">Deactivated</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          ) : (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
              member.status === 'ACTIVE' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
            }`}>
              {member.status}
            </span>
          )}
        </td>

        {/* Assigned Projects */}
        <td className="px-6 py-4.5 whitespace-nowrap text-xs text-text-secondary-muted font-medium">
          {member.projectMemberships?.length || 0} Projects
        </td>

        {/* Workload Indicator */}
        <td className="px-6 py-4.5 whitespace-nowrap text-xs text-text-secondary font-semibold">
          {member.teamMemberships?.length || 0} Teams
        </td>

        {/* Action Trigger Buttons */}
        <td className="px-6 py-4.5 whitespace-nowrap text-right text-xs font-medium">
          <div className="flex items-center justify-end space-x-2.5">
            <button
              onClick={() => setProfileDrawer(true, member.id)}
              className="p-1.5 rounded-lg text-text-secondary-muted hover:text-accent hover:bg-accent/5 transition-all cursor-pointer border-none bg-transparent"
              title="View Member Profile"
            >
              <Eye className="w-4 h-4" />
            </button>
            {canRemove && (
              <button
                onClick={handleRemove}
                className="p-1.5 rounded-lg text-text-secondary-muted hover:text-red-500 hover:bg-red-500/5 transition-all cursor-pointer border-none bg-transparent touch-target"
                title="Remove Member"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Task Transfer Modal overlay if needed */}
      {requiresTransfer && (
        <tr className="bg-red-500/5">
          <td colSpan="6" className="px-6 py-4">
            <div className="border border-red-500/20 bg-card-secondary p-4.5 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <h5 className="text-xs font-bold text-text-secondary">Task Transfer Required</h5>
                  <p className="text-[11px] text-text-secondary-muted mt-0.5">
                    {member.user.name} currently has <strong>{activeTasksCount} active tasks</strong>. You must transfer these tasks to another active workspace member before they can be removed.
                  </p>
                </div>
              </div>

              <form onSubmit={handleTransferAndRemove} className="flex items-center space-x-2.5 w-full md:w-auto">
                <select
                  aria-label="Select member to transfer tasks to"
                  required
                  value={targetTransferUserId}
                  onChange={(e) => setTargetTransferUserId(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-dominant border border-border-secondary rounded-lg focus:outline-none focus:ring-1 focus:ring-accent text-text-secondary cursor-pointer"
                >
                  <option value="">Select recipient...</option>
                  {(Array.isArray(allMembers) ? allMembers : [])
                    .filter(m => m && m.id !== member.id && m.status === 'ACTIVE')
                    .map(m => (
                      <option key={m.user.id} value={m.user.id}>
                        {m.user.name} ({m.user.email})
                      </option>
                    ))}
                </select>
                <button
                  type="submit"
                  disabled={isTransferring}
                  className="px-3.5 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer border-none flex items-center space-x-1"
                >
                  {isTransferring ? 'Transferring...' : 'Transfer & Remove'}
                </button>
                <button
                  type="button"
                  onClick={() => setRequiresTransfer(false)}
                  className="px-3 py-1.5 rounded-lg border border-border-secondary hover:bg-dominant-offset text-text-secondary-muted text-xs font-bold transition-all cursor-pointer bg-transparent"
                >
                  Cancel
                </button>
              </form>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
