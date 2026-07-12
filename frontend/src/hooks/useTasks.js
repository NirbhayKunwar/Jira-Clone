import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL, getAuthHeaders } from '../config/api';
import { getApiList } from '../config/apiResponse';
import { useAuthStore } from '../store/authStore';

export function useTasks(workspaceId) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ['tasks', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const response = await fetch(`${API_URL}/api/tasks?workspaceId=${workspaceId}`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      return getApiList(await response.json(), 'Tasks');
    },
    enabled: !!workspaceId && !!user,
    // Tasks are live-board data — keep stale window short so moves/assignments
    // are reflected quickly, but avoid a fetch on every component mount.
    staleTime: 10_000,  // 10 seconds
    gcTime: 3 * 60_000  // hold in cache 3 min
  });
}

export function useCreateTask(workspaceId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskData) => {
      const response = await fetch(`${API_URL}/api/tasks`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...taskData, workspaceId })
      });
      if (!response.ok) {
        throw new Error('Failed to create task');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
    }
  });
}

export function useUpdateTaskStatus(workspaceId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, status }) => {
      const response = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status })
      });
      if (!response.ok) {
        throw new Error('Failed to update task status');
      }
      return response.json();
    },

    // Optimistic Update — board moves feel instant
    onMutate: async ({ taskId, status }) => {
      // Cancel outgoing queries to avoid overwriting our optimistic state
      await queryClient.cancelQueries({ queryKey: ['tasks', workspaceId] });

      // Snapshot previous tasks for potential rollback
      const previousTasks = queryClient.getQueryData(['tasks', workspaceId]);

      // Immediately update the card's column in the UI
      if (previousTasks) {
        queryClient.setQueryData(
          ['tasks', workspaceId],
          previousTasks.map((task) =>
            task.id === taskId ? { ...task, status } : task
          )
        );
      }

      return { previousTasks };
    },

    onError: (err, variables, context) => {
      // Roll back to the pre-mutation snapshot on error
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', workspaceId], context.previousTasks);
      }
    },

    onSettled: () => {
      // Always re-sync with the server to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
    }
  });
}

export function useDeleteTask(workspaceId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId) => {
      const response = await fetch(`${API_URL}/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        throw new Error('Failed to delete task');
      }
      return response.json();
    },

    // Optimistic deletion — card disappears immediately without waiting for the server
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', workspaceId] });
      const previousTasks = queryClient.getQueryData(['tasks', workspaceId]);

      if (previousTasks) {
        queryClient.setQueryData(
          ['tasks', workspaceId],
          previousTasks.filter((task) => task.id !== taskId)
        );
      }

      return { previousTasks };
    },

    onError: (err, taskId, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', workspaceId], context.previousTasks);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
    }
  });
}

export function useClaimTask(workspaceId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId) => {
      const response = await fetch(`${API_URL}/api/tasks/${taskId}/claim`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to claim task');
      }
      return response.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
    }
  });
}
