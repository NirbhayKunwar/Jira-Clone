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
    staleTime: 60_000,   // 1 minute stale time to prevent unnecessary network refetches
    gcTime: 5 * 60_000   // hold in memory 5 minutes
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

    // Optimistic Update — task appears instantly on board < 5ms without waiting for API roundtrip
    onMutate: async (newTaskData) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', workspaceId] });
      const previousTasks = queryClient.getQueryData(['tasks', workspaceId]) || [];

      const tempTask = {
        id: `temp-${Date.now()}`,
        title: newTaskData.title,
        desc: newTaskData.desc || '',
        status: newTaskData.status || 'todo',
        priority: newTaskData.priority || 'Medium',
        epic: newTaskData.epic || 'General',
        assignee: newTaskData.assignee || 'You',
        assigneeId: newTaskData.assigneeId || null,
        workspaceId,
        createdAt: new Date().toISOString()
      };

      queryClient.setQueryData(
        ['tasks', workspaceId],
        [tempTask, ...previousTasks]
      );

      return { previousTasks, tempId: tempTask.id };
    },

    onSuccess: (response, newTaskData, context) => {
      const realTask = response?.data?.task || response?.data;
      if (realTask && context?.tempId) {
        queryClient.setQueryData(['tasks', workspaceId], (oldTasks = []) =>
          oldTasks.map((t) => (t.id === context.tempId ? realTask : t))
        );
      }
    },

    onError: (err, newTaskData, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', workspaceId], context.previousTasks);
      }
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

    // Optimistic Update — drag-and-drop card move is 60 FPS instant
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', workspaceId] });
      const previousTasks = queryClient.getQueryData(['tasks', workspaceId]);

      if (Array.isArray(previousTasks)) {
        queryClient.setQueryData(
          ['tasks', workspaceId],
          previousTasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  status,
                  completedAt: status === 'done' ? new Date().toISOString() : null
                }
              : task
          )
        );
      }

      return { previousTasks };
    },

    onSuccess: (response, { taskId }) => {
      const updatedTask = response?.data?.task || response?.data;
      if (updatedTask && taskId) {
        queryClient.setQueryData(['tasks', workspaceId], (oldTasks = []) =>
          oldTasks.map((t) => (t.id === taskId ? { ...t, ...updatedTask } : t))
        );
      }
    },

    onError: (err, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', workspaceId], context.previousTasks);
      }
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

    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', workspaceId] });
      const previousTasks = queryClient.getQueryData(['tasks', workspaceId]);

      if (Array.isArray(previousTasks)) {
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

    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', workspaceId] });
      const previousTasks = queryClient.getQueryData(['tasks', workspaceId]);

      if (Array.isArray(previousTasks)) {
        queryClient.setQueryData(
          ['tasks', workspaceId],
          previousTasks.map((t) => (t.id === taskId ? { ...t, assignee: 'You' } : t))
        );
      }
      return { previousTasks };
    },

    onSuccess: (response, taskId) => {
      const claimedTask = response?.data;
      if (claimedTask && taskId) {
        queryClient.setQueryData(['tasks', workspaceId], (oldTasks = []) =>
          oldTasks.map((t) => (t.id === taskId ? { ...t, ...claimedTask } : t))
        );
      }
    },

    onError: (err, taskId, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', workspaceId], context.previousTasks);
      }
    }
  });
}
