import React, { useState } from 'react';
import { X, Send, AlertTriangle } from 'lucide-react';
import { useUiStore } from '../../../store/uiStore';
import { useInviteMember, useWorkspaceProjects } from '../../workspace/hooks/useWorkspaceMembers';
import { useTeams } from '../../teams/hooks/useTeams';

export default function InviteMemberModal({ workspaceId }) {
  const { isInviteModalOpen, setInviteModal } = useUiStore();
  const inviteMutation = useInviteMember(workspaceId);
  
  const { data: teams = [] } = useTeams(workspaceId);
  const { data: projects = [] } = useWorkspaceProjects(workspaceId);

  const [email, setEmail] = useState('');
  const [workspaceRole, setWorkspaceRole] = useState('MEMBER');
  const [teamId, setTeamId] = useState('');
  const [teamRole, setTeamRole] = useState('FULLSTACK_ENGINEER');
  const [projectId, setProjectId] = useState('');
  const [projectRole, setProjectRole] = useState('DEVELOPER');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isInviteModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      await inviteMutation.mutateAsync({
        email: email.trim(),
        workspaceRole,
        teamId: teamId || null,
        teamRole: teamId ? teamRole : null,
        projectId: projectId || null,
        projectRole: projectId ? projectRole : null
      });

      alert(`Invitation successfully sent to ${email}`);
      setEmail('');
      setTeamId('');
      setProjectId('');
      setInviteModal(false);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/65 z-55 flex items-center justify-center p-4 backdrop-blur-xs animate-[fade-in_150ms_ease-out]">
      <div className="bg-card-secondary border border-border-secondary rounded-2xl w-full max-w-lg shadow-2xl p-6 relative flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border-secondary/35">
          <div>
            <h4 className="text-base font-bold text-text-secondary flex items-center gap-2">
              <span>Invite Member to Workspace</span>
            </h4>
            <p className="text-[11px] text-text-secondary-muted mt-0.5">Send a secure registration or onboarding link to a colleague.</p>
          </div>
          <button
            onClick={() => setInviteModal(false)}
            className="p-1 rounded-lg hover:bg-dominant-offset text-text-secondary-muted hover:text-text-secondary transition-colors cursor-pointer border-none bg-transparent"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4 overflow-y-auto pr-1 flex-grow">
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-500 text-xs font-bold flex items-start space-x-2.5">
              <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Email input */}
          <div className="space-y-1">
            <label htmlFor="invite-email" className="text-[10px] font-bold text-text-secondary-muted uppercase">Email Address</label>
            <input
              id="invite-email"
              type="email"
              required
              placeholder="e.g. colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-border-secondary bg-dominant text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Workspace Role selection */}
          <div className="space-y-1">
            <label htmlFor="invite-ws-role" className="text-[10px] font-bold text-text-secondary-muted uppercase">Workspace Role</label>
            <select
              id="invite-ws-role"
              value={workspaceRole}
              onChange={(e) => setWorkspaceRole(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-border-secondary bg-dominant text-text-secondary focus:outline-none cursor-pointer"
            >
              <option value="ADMIN">Admin (Can manage settings, members, teams)</option>
              <option value="MEMBER">Member (Full collaboration, update tasks)</option>
              <option value="GUEST">Guest (Limited permissions, read-only viewer)</option>
            </select>
          </div>

          <div className="border-t border-border-secondary/20 my-2 pt-2" />

          {/* Assign Team (optional) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="invite-team" className="text-[10px] font-bold text-text-secondary-muted uppercase">Assign to Team (Optional)</label>
              <select
                id="invite-team"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-border-secondary bg-dominant text-text-secondary focus:outline-none cursor-pointer"
              >
                <option value="">No Team assignment</option>
                {teams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {teamId && (
              <div className="space-y-1">
                <label htmlFor="invite-team-role" className="text-[10px] font-bold text-text-secondary-muted uppercase">Team Role</label>
                <select
                  id="invite-team-role"
                  value={teamRole}
                  onChange={(e) => setTeamRole(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-border-secondary bg-dominant text-text-secondary focus:outline-none cursor-pointer"
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
            )}
          </div>

          {/* Assign Project (optional) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="invite-project" className="text-[10px] font-bold text-text-secondary-muted uppercase">Assign to Project (Optional)</label>
              <select
                id="invite-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-border-secondary bg-dominant text-text-secondary focus:outline-none cursor-pointer"
              >
                <option value="">No Project assignment</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.key})</option>
                ))}
              </select>
            </div>

            {projectId && (
              <div className="space-y-1">
                <label htmlFor="invite-project-role" className="text-[10px] font-bold text-text-secondary-muted uppercase">Project Role</label>
                <select
                  id="invite-project-role"
                  value={projectRole}
                  onChange={(e) => setProjectRole(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-border-secondary bg-dominant text-text-secondary focus:outline-none cursor-pointer"
                >
                  <option value="DEVELOPER">Developer</option>
                  <option value="PROJECT_LEAD">Project Lead</option>
                  <option value="TESTER">Tester</option>
                  <option value="DESIGNER">Designer</option>
                  <option value="OBSERVER">Observer</option>
                </select>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end space-x-2.5 pt-4 border-t border-border-secondary/35 mt-4">
            <button
              type="button"
              onClick={() => setInviteModal(false)}
              className="px-4 py-2 rounded-lg border border-border-secondary hover:bg-dominant-offset text-text-secondary text-xs font-bold transition-colors cursor-pointer bg-transparent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50 cursor-pointer border-none"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Sending...' : 'Send Invitation'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
