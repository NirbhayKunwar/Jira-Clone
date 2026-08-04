import { create } from 'zustand';
import { API_URL, getAuthHeaders } from '../config/api';
import { useAuthStore } from './authStore';

export const useWorkspaceStore = create((set, get) => {
  const getInitialActiveWorkspace = () => {
    try {
      const saved = localStorage.getItem('jira_active_workspace');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  return {
    workspaces: [],
    activeWorkspace: getInitialActiveWorkspace(),
    isLoadingWorkspaces: false,
    workspaceError: null,

    setWorkspaces: (workspaces) => set({ workspaces }),
    
    setActiveWorkspace: (activeWorkspace) => {
      if (activeWorkspace) {
        localStorage.setItem('jira_active_workspace', JSON.stringify(activeWorkspace));
      } else {
        localStorage.removeItem('jira_active_workspace');
      }
      set({ activeWorkspace });
    },

    fetchWorkspaces: async (currentUser, onViewChange, currentView) => {
      if (!currentUser) return;
      set({ isLoadingWorkspaces: true });
      try {
        const response = await fetch(`${API_URL}/api/workspaces`, {
          headers: getAuthHeaders(),
          credentials: 'include'
        });

        if (response.status === 401) {
          useAuthStore.getState().logout();
          if (onViewChange) onViewChange('/auth');
          set({ isLoadingWorkspaces: false, workspaceError: null });
          return;
        }

        if (response.status === 403) {
          const resJson = await response.json();
          const message = resJson.message || '';
          if (message.toLowerCase().includes('token') || message.toLowerCase().includes('expired') || message.toLowerCase().includes('session')) {
            useAuthStore.getState().logout();
            if (onViewChange) onViewChange('/auth');
          } else {
            set({ workspaceError: message || 'Forbidden. Access to this workspace is denied.', isLoadingWorkspaces: false });
          }
          return;
        }

        if (response.ok) {
          const resJson = await response.json();
          let workspacesList = [];
          if (Array.isArray(resJson.data)) {
            workspacesList = resJson.data;
          } else if (resJson.data && Array.isArray(resJson.data.workspaces)) {
            workspacesList = resJson.data.workspaces;
          } else if (Array.isArray(resJson)) {
            workspacesList = resJson;
          }

          set({ workspaces: workspacesList, isLoadingWorkspaces: false, workspaceError: null });

          if (!currentUser.hasConfiguredWorkspace) {
            if (onViewChange) onViewChange('/workspace-setup');
          } else {
            const savedWS = get().activeWorkspace;
            const exists = savedWS ? workspacesList.some(w => w.id === savedWS.id) : false;
            
            if (exists) {
              const currentWS = workspacesList.find(w => w.id === savedWS.id);
              get().setActiveWorkspace(currentWS);
            } else {
              const defaultWS = workspacesList.length > 0 ? workspacesList[0] : null;
              get().setActiveWorkspace(defaultWS);
            }

            if (workspacesList.length === 0 && currentView !== '/workspace-setup' && onViewChange) {
              onViewChange('/workspace-setup');
            } else if (currentView === '/' && onViewChange) {
              onViewChange('/dashboard');
            }
          }
        } else {
          set({ isLoadingWorkspaces: false });
        }
      } catch (error) {
        console.error('Error fetching workspaces:', error);
        set({ isLoadingWorkspaces: false });
      }
    },

    deleteWorkspace: async (id, currentUser, onViewChange) => {
      try {
        const response = await fetch(`${API_URL}/api/workspaces/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
          credentials: 'include'
        });
        if (response.ok) {
          const updated = get().workspaces.filter(w => String(w.id) !== String(id));
          set({ workspaces: updated });
          
          if (updated.length === 0) {
            get().setActiveWorkspace(null);
            if (onViewChange) onViewChange('/workspace-setup');
          } else {
            get().setActiveWorkspace(updated[0]);
          }
          return true;
        } else {
          console.warn('Failed to delete workspace on backend.');
          return false;
        }
      } catch (error) {
        console.error('Error deleting workspace:', error);
        return false;
      }
    },

    resetWorkspaceStore: () => {
      localStorage.removeItem('jira_active_workspace');
      set({ workspaces: [], activeWorkspace: null, isLoadingWorkspaces: false, workspaceError: null });
    }
  };
});
