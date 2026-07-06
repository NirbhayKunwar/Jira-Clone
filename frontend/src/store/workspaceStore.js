import { create } from 'zustand';
import { API_URL } from '../config/api';

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
        const token = localStorage.getItem('jira_token');
        const response = await fetch(`${API_URL}/api/workspaces`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        });
        if (response.ok) {
          const resJson = await response.json();
          const workspacesList = Array.isArray(resJson.data) ? resJson.data : (Array.isArray(resJson) ? resJson : []);
          set({ workspaces: workspacesList, isLoadingWorkspaces: false });

          if (!currentUser.hasConfiguredWorkspace) {
            if (onViewChange) onViewChange('/workspace-setup');
          } else {
            // Check if saved workspace still exists
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
        const token = localStorage.getItem('jira_token');
        const response = await fetch(`${API_URL}/api/workspaces/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
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
    }
  };
});
