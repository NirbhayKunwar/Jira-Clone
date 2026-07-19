import { useQuery } from '@tanstack/react-query';
import { API_URL, getAuthHeaders } from '../../../config/api';

export const useAuditLogs = (workspaceId) => {
  return useQuery({
    queryKey: ['audit-log', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const res = await fetch(`${API_URL}/api/workspaces/${workspaceId}/audit-logs`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      const json = await res.json();
      return json.data;
    },
    enabled: !!workspaceId
  });
};

export const useWorkspaceActivity = (workspaceId) => {
  return useQuery({
    queryKey: ['activity', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const res = await fetch(`${API_URL}/api/workspaces/${workspaceId}/activity`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to fetch workspace activity feed');
      const json = await res.json();
      return json.data;
    },
    enabled: !!workspaceId
  });
};
