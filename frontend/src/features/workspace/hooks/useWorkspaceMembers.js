import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL, getAuthHeaders } from '../../../config/api';

export const useWorkspaceMembers = (
  workspaceId,
  search = '',
  role = '',
  status = 'ACTIVE'
) => {
  return useQuery({
    queryKey: ['workspace-members', workspaceId, search, role, status],

    queryFn: async () => {
      if (!workspaceId) return [];

      const queryParams = new URLSearchParams({
        search,
        role,
        status
      });

      const res = await fetch(
        `${API_URL}/api/workspaces/${workspaceId}/members?${queryParams}`,
        {
          headers: getAuthHeaders()
        }
      );

      if (!res.ok) {
        let errorMessage = 'Failed to fetch workspace members';

        try {
          const errorData = await res.json();
          errorMessage =
            errorData?.message ||
            errorData?.error ||
            errorMessage;
        } catch {
          // Ignore JSON parsing errors
        }

        throw new Error(errorMessage);
      }

      const json = await res.json();

      /*
       * Backend normally returns:
       *
       * {
       *   success: true,
       *   data: [...]
       * }
       *
       * Older code expected:
       *
       * {
       *   success: true,
       *   data: {
       *     members: [...]
       *   }
       * }
       *
       * Support both response shapes so the hook never
       * returns undefined to React Query.
       */
      const members = Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json?.data?.members)
          ? json.data.members
          : [];

      return members;
    },

    enabled: !!workspaceId
  });
};

export const useUpdateWorkspaceMember = (workspaceId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, role, status }) => {
      const res = await fetch(
        `${API_URL}/api/workspaces/${workspaceId}/members/${memberId}`,
        {
          method: 'PATCH',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            role,
            status
          })
        }
      );

      if (!res.ok) {
        let errorMessage = 'Failed to update workspace member';

        try {
          const errorData = await res.json();
          errorMessage =
            errorData?.message ||
            errorData?.error ||
            errorMessage;
        } catch {
          // Ignore JSON parsing errors
        }

        throw new Error(errorMessage);
      }

      return res.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['workspace-members', workspaceId]
      });

      queryClient.invalidateQueries({
        queryKey: ['activity', workspaceId]
      });

      queryClient.invalidateQueries({
        queryKey: ['audit-log', workspaceId]
      });
    }
  });
};

export const useRemoveWorkspaceMember = (workspaceId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId) => {
      const res = await fetch(
        `${API_URL}/api/workspaces/${workspaceId}/members/${memberId}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders()
        }
      );

      if (!res.ok) {
        let errorData = {};

        try {
          errorData = await res.json();
        } catch {
          // Ignore JSON parsing errors
        }

        // Return structured information if task transfer is required
        if (
          res.status === 422 &&
          errorData?.requiresTransfer
        ) {
          return {
            requiresTransfer: true,
            message: errorData.message
          };
        }

        throw new Error(
          errorData?.message ||
          errorData?.error ||
          'Failed to remove workspace member'
        );
      }

      return res.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['workspace-members', workspaceId]
      });

      queryClient.invalidateQueries({
        queryKey: ['activity', workspaceId]
      });

      queryClient.invalidateQueries({
        queryKey: ['audit-log', workspaceId]
      });
    }
  });
};

export const useTransferTasks = (workspaceId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, targetUserId }) => {
      const res = await fetch(
        `${API_URL}/api/workspaces/${workspaceId}/members/${memberId}/transfer-tasks`,
        {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            targetUserId
          })
        }
      );

      if (!res.ok) {
        let errorMessage = 'Failed to transfer tasks';

        try {
          const errorData = await res.json();

          errorMessage =
            errorData?.message ||
            errorData?.error ||
            errorMessage;
        } catch {
          // Ignore JSON parsing errors
        }

        throw new Error(errorMessage);
      }

      return res.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['tasks']
      });

      queryClient.invalidateQueries({
        queryKey: ['workspace-members', workspaceId]
      });

      queryClient.invalidateQueries({
        queryKey: ['audit-log', workspaceId]
      });
    }
  });
};

export const useWorkspaceInvitations = (workspaceId) => {
  return useQuery({
    queryKey: ['invitations', workspaceId],

    queryFn: async () => {
      if (!workspaceId) return [];

      const res = await fetch(
        `${API_URL}/api/workspaces/${workspaceId}/invitations`,
        {
          headers: getAuthHeaders()
        }
      );

      if (!res.ok) {
        throw new Error('Failed to fetch invitations');
      }

      const json = await res.json();

      return json?.data ?? [];
    },

    enabled: !!workspaceId
  });
};

export const useInviteMember = (workspaceId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await fetch(
        `${API_URL}/api/workspaces/${workspaceId}/invitations`,
        {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      if (!res.ok) {
        let errorMessage = 'Failed to invite member';

        try {
          const errorData = await res.json();

          errorMessage =
            errorData?.message ||
            errorData?.error ||
            errorMessage;
        } catch {
          // Ignore JSON parsing errors
        }

        throw new Error(errorMessage);
      }

      return res.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['workspace-members', workspaceId]
      });

      queryClient.invalidateQueries({
        queryKey: ['workspaceMembers', workspaceId]
      });

      queryClient.invalidateQueries({
        queryKey: ['invitations', workspaceId]
      });

      queryClient.invalidateQueries({
        queryKey: ['audit-log', workspaceId]
      });

      queryClient.invalidateQueries({
        queryKey: ['users']
      });
    }
  });
};

export const useRevokeInvitation = (workspaceId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteId) => {
      const res = await fetch(
        `${API_URL}/api/workspaces/${workspaceId}/invitations/${inviteId}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders()
        }
      );

      if (!res.ok) {
        throw new Error('Failed to revoke invitation');
      }

      return res.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['invitations', workspaceId]
      });

      queryClient.invalidateQueries({
        queryKey: ['audit-log', workspaceId]
      });
    }
  });
};

export const useResendInvitation = (workspaceId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteId) => {
      const res = await fetch(
        `${API_URL}/api/workspaces/${workspaceId}/invitations/${inviteId}/resend`,
        {
          method: 'POST',
          headers: getAuthHeaders()
        }
      );

      if (!res.ok) {
        throw new Error('Failed to resend invitation');
      }

      return res.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['invitations', workspaceId]
      });

      queryClient.invalidateQueries({
        queryKey: ['audit-log', workspaceId]
      });
    }
  });
};

export const useWorkspaceProjects = (workspaceId) => {
  return useQuery({
    queryKey: ['projects', workspaceId],

    queryFn: async () => {
      if (!workspaceId) return [];

      const res = await fetch(
        `${API_URL}/api/workspaces/${workspaceId}/projects`,
        {
          headers: getAuthHeaders()
        }
      );

      if (!res.ok) {
        throw new Error('Failed to fetch projects');
      }

      const json = await res.json();

      return json?.data ?? [];
    },

    enabled: !!workspaceId
  });
};

export const useRemoveProjectMember = (workspaceId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, memberId }) => {
      const res = await fetch(
        `${API_URL}/api/workspaces/${workspaceId}/projects/${projectId}/members/${memberId}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders()
        }
      );

      if (!res.ok) {
        let errorMessage = 'Failed to remove member from project';

        try {
          const errorData = await res.json();

          errorMessage =
            errorData?.message ||
            errorData?.error ||
            errorMessage;
        } catch {
          // Ignore JSON parsing errors
        }

        throw new Error(errorMessage);
      }

      return res.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['workspace-members', workspaceId]
      });

      queryClient.invalidateQueries({
        queryKey: ['workspaceMembers', workspaceId]
      });

      queryClient.invalidateQueries({
        queryKey: ['memberProfile']
      });

      queryClient.invalidateQueries({
        queryKey: ['projects', workspaceId]
      });
    }
  });
};