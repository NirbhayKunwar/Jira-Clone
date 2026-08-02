import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, Trash2, Plus, CheckCircle2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getAuthHeaders, API_URL } from '../../../config/api';

export default function ProjectMembersModal({ isOpen, onClose, project, workspaceId, workspaceMembers = [] }) {
  const queryClient = useQueryClient();
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedRole, setSelectedRole] = useState('DEVELOPER');
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

  const assignedMemberIds = new Set(
    localMembers.map(pm => pm.workspaceMember?.id || pm.workspaceMemberId || pm.workspaceMember?.user?.id)
  );

  const availableMembers = workspaceMembers.filter(wm => 
    !assignedMemberIds.has(wm.id) && 
    !assignedMemberIds.has(wm.userId) && 
    !assignedMemberIds.has(wm.user?.id)
  );

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!selectedMemberId) return;
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const targetProjId = project.id || workspaceId;
      const res = await fetch(`${API_URL}/api/workspace-members/${workspaceId}/projects/${targetProjId}/members`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ workspaceMemberId: selectedMemberId, role: selectedRole })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to add member to project');

      const addedPm = data.data;
      if (addedPm) {
        setLocalMembers(prev => [...prev, addedPm]);
      }

      setSuccessMsg('Member added to project successfully!');
      setSelectedMemberId('');
      queryClient.invalidateQueries(['workspaceMembers', workspaceId]);
      queryClient.invalidateQueries(['workspaceProjects', workspaceId]);
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
      const res = await fetch(`${API_URL}/api/workspace-members/${workspaceId}/projects/${targetProjId}/members/${projectMemberId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to remove member from project');

      setLocalMembers(prev => prev.filter(pm => pm.id !== projectMemberId));
      setSuccessMsg(`Removed ${memberName} from project.`);
      queryClient.invalidateQueries(['workspaceMembers', workspaceId]);
      queryClient.invalidateQueries(['workspaceProjects', workspaceId]);
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
            <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center space-x-1.5">
              <UserPlus className="w-3.5 h-3.5 text-accent" />
              <span>Add Teammate to Project</span>
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="sm:col-span-2 text-xs p-2.5 rounded-lg border border-border-secondary bg-dominant-offset text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
              >
                <option value="">Select workspace member...</option>
                {availableMembers.map(wm => (
                  <option key={wm.id} value={wm.id}>
                    {wm.user?.name} ({wm.user?.email})
                  </option>
                ))}
              </select>

              <button
                type="submit"
                disabled={!selectedMemberId || isSubmitting}
                className="px-3 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all cursor-pointer border-none flex items-center justify-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Member</span>
              </button>
            </div>
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
