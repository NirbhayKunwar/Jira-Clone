import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, Trash2, Plus, CheckCircle2, Mail } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getAuthHeaders, API_URL } from '../../../config/api';
import { useUiStore } from '../../../store/uiStore';

export default function ProjectMembersModal({ isOpen, onClose, project, workspaceId, workspaceMembers = [] }) {
  const queryClient = useQueryClient();
  const { setInviteModal } = useUiStore();
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedRole, setSelectedRole] = useState('DEVELOPER');
  const [addMode, setAddMode] = useState('select'); // 'select' or 'email'
  const [inviteEmail, setInviteEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [localMembers, setLocalMembers] = useState([]);

  useEffect(() => {
    if (project) {
      setLocalMembers(project.projectMembers || []);
    }
  }, [project]);

  if (!isOpen || !project) return null;

  const safeLocalMembers = Array.isArray(localMembers) ? localMembers : [];
  
  // Extract members array whether workspaceMembers is raw array or enveloped object ({ members: [...] })
  const rawWsMembersList = Array.isArray(workspaceMembers)
    ? workspaceMembers
    : (Array.isArray(workspaceMembers?.members)
        ? workspaceMembers.members
        : (Array.isArray(workspaceMembers?.data)
            ? workspaceMembers.data
            : []));

  const assignedMemberIds = new Set(
    safeLocalMembers.map(pm => String(pm?.workspaceMember?.id || pm?.workspaceMemberId || pm?.workspaceMember?.user?.id || pm?.id || ''))
  );

  const availableMembers = rawWsMembersList.filter(wm => {
    if (!wm) return false;
    const wmId = String(wm.id || '');
    const userId = String(wm.user?.id || '');
    return !assignedMemberIds.has(wmId) && !assignedMemberIds.has(userId);
  });

  const handleAddMember = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const targetProjId = project.id || workspaceId;

      if (addMode === 'email' || !selectedMemberId) {
        if (!inviteEmail.trim()) {
          setErrorMsg('Please select a workspace member or enter an email address.');
          setIsSubmitting(false);
          return;
        }

        // Invite / Add user by email directly to workspace + project
        const res = await fetch(`${API_URL}/api/workspaces/${workspaceId}/invitations`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            email: inviteEmail.trim(),
            workspaceRole: 'MEMBER',
            projectId: targetProjId,
            projectRole: selectedRole
          })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to add member');

        setSuccessMsg(data.message || `Member processed for ${inviteEmail}`);
        setInviteEmail('');
        queryClient.invalidateQueries(['workspaceMembers', workspaceId]);
        queryClient.invalidateQueries(['workspaceProjects', workspaceId]);
        queryClient.invalidateQueries(['workspace-members', workspaceId]);
        return;
      }

      // Add existing workspace member
      const res = await fetch(`${API_URL}/api/workspaces/${workspaceId}/projects/${targetProjId}/members`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ workspaceMemberId: selectedMemberId, role: selectedRole })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add member to project');

      const addedPm = data.data;
      if (addedPm) {
        setLocalMembers(prev => [...(Array.isArray(prev) ? prev : []), addedPm]);
      }

      setSuccessMsg('Member added to project successfully!');
      setSelectedMemberId('');
      queryClient.invalidateQueries(['workspaceMembers', workspaceId]);
      queryClient.invalidateQueries(['workspaceProjects', workspaceId]);
      queryClient.invalidateQueries(['workspace-members', workspaceId]);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (projectMemberId, memberName) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from project "${project.name}"? They will remain in the workspace.`)) {
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const targetProjId = project.id || workspaceId;
      const res = await fetch(`${API_URL}/api/workspaces/${workspaceId}/projects/${targetProjId}/members/${projectMemberId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to remove member from project');

      setLocalMembers(prev => (Array.isArray(prev) ? prev : []).filter(pm => pm.id !== projectMemberId));
      setSuccessMsg(`Removed ${memberName} from project.`);
      queryClient.invalidateQueries(['workspaceMembers', workspaceId]);
      queryClient.invalidateQueries(['workspaceProjects', workspaceId]);
      queryClient.invalidateQueries(['workspace-members', workspaceId]);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fade-in_150ms_ease-out]">
      <div className="bg-card-secondary border border-border-secondary/80 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-border-secondary/40 flex items-center justify-between bg-dominant-offset/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-secondary">Project Members</h3>
              <p className="text-xs text-text-secondary-muted font-medium">{project.name} ({project.key})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-secondary-muted hover:text-text-secondary hover:bg-dominant-offset transition-colors border-none bg-transparent cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-left">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-500 rounded-lg text-xs font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Add Member Section */}
          <form onSubmit={handleAddMember} className="space-y-3 bg-dominant p-4 rounded-xl border border-border-secondary/50">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center space-x-1.5">
                <UserPlus className="w-3.5 h-3.5 text-accent" />
                <span>Add Teammate to Project</span>
              </h4>
              <div className="flex items-center space-x-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setAddMode('select')}
                  className={`px-2 py-0.5 rounded font-bold cursor-pointer border-none transition-colors ${addMode === 'select' ? 'bg-accent text-white' : 'bg-dominant-offset text-text-secondary-muted'}`}
                >
                  Select Member
                </button>
                <button
                  type="button"
                  onClick={() => setAddMode('email')}
                  className={`px-2 py-0.5 rounded font-bold cursor-pointer border-none transition-colors ${addMode === 'email' ? 'bg-accent text-white' : 'bg-dominant-offset text-text-secondary-muted'}`}
                >
                  By Email
                </button>
              </div>
            </div>
            
            {availableMembers.length === 0 && addMode === 'select' ? (
              <div className="p-3 bg-accent/5 border border-accent/20 rounded-lg text-xs space-y-2">
                <div className="text-text-secondary font-medium">
                  {rawWsMembersList.length <= 1 
                    ? 'You are currently the only member in this workspace. Invite teammates to your workspace first or enter their email directly below.' 
                    : 'All workspace members are already assigned to this project.'}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setAddMode('email')}
                    className="px-3 py-1 bg-accent text-white rounded text-xs font-bold border-none cursor-pointer flex items-center gap-1"
                  >
                    <Mail className="w-3 h-3" />
                    <span>Type Email Directly</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      setInviteModal(true);
                    }}
                    className="px-3 py-1 bg-dominant-offset hover:bg-dominant-offset/80 text-text-secondary rounded text-xs font-semibold border border-border-secondary/60 cursor-pointer"
                  >
                    Invite to Workspace
                  </button>
                </div>
              </div>
            ) : addMode === 'email' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="email"
                  required
                  placeholder="Enter colleague's email address..."
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="sm:col-span-2 text-xs p-2.5 rounded-lg border border-border-secondary bg-dominant-offset text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
                />

                <button
                  type="submit"
                  disabled={!inviteEmail.trim() || isSubmitting}
                  className="px-3 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all cursor-pointer border-none flex items-center justify-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Adding...' : 'Add Member'}</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="sm:col-span-2 text-xs p-2.5 rounded-lg border border-border-secondary bg-dominant-offset text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
                >
                  <option value="">Select workspace member...</option>
                  {availableMembers.map(wm => {
                    const optionId = wm.id || wm.workspaceMemberId || wm.user?.id;
                    const name = wm.user?.name || wm.name || 'Member';
                    const email = wm.user?.email || wm.email || '';
                    return (
                      <option key={optionId} value={optionId}>
                        {name} {email ? `(${email})` : ''}
                      </option>
                    );
                  })}
                </select>

                <button
                  type="submit"
                  disabled={!selectedMemberId || isSubmitting}
                  className="px-3 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all cursor-pointer border-none flex items-center justify-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Adding...' : 'Add Member'}</span>
                </button>
              </div>
            )}
          </form>

          {/* Current Project Members List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                Assigned Project Members ({localMembers.length})
              </h4>
            </div>

            {localMembers.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-secondary-muted italic bg-dominant/40 rounded-xl border border-dashed border-border-secondary/40">
                No team members assigned to this project yet. Use the form above to add members.
              </div>
            ) : (
              <div className="divide-y divide-border-secondary/30 rounded-xl border border-border-secondary/50 overflow-hidden bg-dominant">
                {localMembers.map(pm => {
                  const u = pm.workspaceMember?.user || {};
                  const initials = (u.name || 'Member').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

                  return (
                    <div key={pm.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-dominant-offset/20 transition-colors">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 text-accent font-bold text-xs flex items-center justify-center flex-shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <span className="block text-xs font-bold text-text-secondary truncate">{u.name || 'Workspace Member'}</span>
                          <span className="block text-[11px] text-text-secondary-muted truncate">{u.email}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-[9px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded uppercase tracking-wider">
                          {pm.role || 'DEVELOPER'}
                        </span>
                        <button
                          onClick={() => handleRemoveMember(pm.id, u.name || 'Member')}
                          className="p-1.5 rounded-lg text-text-secondary-muted hover:text-red-500 hover:bg-red-500/10 transition-all cursor-pointer border-none bg-transparent"
                          title="Remove from Project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
