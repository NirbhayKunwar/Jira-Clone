import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API_URL, getAuthHeaders } from '../config/api';
import { getApiList } from '../config/apiResponse';

export function useTasks(workspaceId) {
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
    enabled: !!workspaceId,
    staleTime: 5000 // 5 seconds stale time for dynamic board sync
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
    // Optimistic Update
    onMutate: async ({ taskId, status }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['tasks', workspaceId] });

      // Snapshot previous tasks
      const previousTasks = queryClient.getQueryData(['tasks', workspaceId]);

      // Optimistically update to the new status
      if (previousTasks) {
        queryClient.setQueryData(
          ['tasks', workspaceId],
          previousTasks.map((task) =>
            task.id === taskId ? { ...task, status } : task
          )
        );
      }

      // Return context for rollback
      return { previousTasks };
    },
    onError: (err, variables, context) => {
      // Rollback to previous state
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', workspaceId], context.previousTasks);
      }
    },
    onSettled: () => {
      // Invalidate query to sync back with database
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] });
    }
  });
}
