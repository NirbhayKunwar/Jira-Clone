import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL, getAuthHeaders } from '../../../config/api';

export const useTeams = (workspaceId) => {
  return useQuery({
    queryKey: ['teams', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      // Backward compatibility check: fetch teams from standard /api/teams endpoint,
      // and filter by workspaceId client-side or server-side.
      const res = await fetch(`${API_URL}/api/teams`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to fetch teams');
      const json = await res.json();
      const rawData = json?.data ?? json;
      const list = Array.isArray(rawData) ? rawData : (Array.isArray(rawData?.teams) ? rawData.teams : []);
      return list.filter(t => t && (t.workspaceId === workspaceId || !t.workspaceId));
    },
    enabled: !!workspaceId
  });
};

export const useTeamDetails = (teamId) => {
  return useQuery({
    queryKey: ['team-details', teamId],
    queryFn: async () => {
      if (!teamId) return null;
      const res = await fetch(`${API_URL}/api/teams/${teamId}`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to fetch team details');
      const json = await res.json();
      return json.data;
    },
    enabled: !!teamId
  });
};

export const useTeamMembers = (teamId) => {
  return useQuery({
    queryKey: ['team-members', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const res = await fetch(`${API_URL}/api/teams/${teamId}/members`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to fetch team members');
      const json = await res.json();
      return json.data;
    },
    enabled: !!teamId
  });
};

export const useAddTeamMember = (teamId, workspaceId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ workspaceMemberId, role }) => {
      const res = await fetch(`${API_URL}/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ workspaceMemberId, role })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to add member to team');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', teamId] });
      queryClient.invalidateQueries({ queryKey: ['team-details', teamId] });
      queryClient.invalidateQueries({ queryKey: ['teams', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['audit-log', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
    }
  });
};

export const useUpdateTeamMember = (teamId, workspaceId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, role }) => {
      const res = await fetch(`${API_URL}/api/teams/${teamId}/members/${memberId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update team member role');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', teamId] });
      queryClient.invalidateQueries({ queryKey: ['team-details', teamId] });
      queryClient.invalidateQueries({ queryKey: ['audit-log', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
    }
  });
};

export const useRemoveTeamMember = (teamId, workspaceId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (memberId) => {
      const res = await fetch(`${API_URL}/api/teams/${teamId}/members/${memberId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to remove member from team');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', teamId] });
      queryClient.invalidateQueries({ queryKey: ['team-details', teamId] });
      queryClient.invalidateQueries({ queryKey: ['teams', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['audit-log', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
    }
  });
};

export const useTransferTeamLead = (teamId, workspaceId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newLeadMemberId) => {
      const res = await fetch(`${API_URL}/api/teams/${teamId}/lead`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ newLeadMemberId })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to transfer team lead');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', teamId] });
      queryClient.invalidateQueries({ queryKey: ['team-details', teamId] });
      queryClient.invalidateQueries({ queryKey: ['teams', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['audit-log', workspaceId] });
    }
  });
};

export const useArchiveTeam = (teamId, workspaceId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_URL}/api/teams/${teamId}/archive`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to archive team');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['audit-log', workspaceId] });
    }
  });
};
