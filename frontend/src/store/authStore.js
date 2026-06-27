import { create } from 'zustand';

export const useAuthStore = create((set) => {
  // Safe initializers for server environments or local storage
  const getInitialUser = () => {
    try {
      const saved = localStorage.getItem('jira_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  const getInitialTheme = () => {
    return localStorage.getItem('theme') || 'atlassian';
  };

  const getInitialMode = () => {
    return localStorage.getItem('mode') || 'light';
  };

  const getInitialToken = () => {
    return localStorage.getItem('jira_token') || null;
  };

  return {
    user: getInitialUser(),
    theme: getInitialTheme(),
    mode: getInitialMode(),
    token: getInitialToken(),

    setUser: (user) => {
      if (user) {
        localStorage.setItem('jira_current_user', JSON.stringify(user));
      } else {
        localStorage.removeItem('jira_current_user');
      }
      set({ user });
    },

    setToken: (token) => {
      if (token) {
        localStorage.setItem('jira_token', token);
      } else {
        localStorage.removeItem('jira_token');
      }
      set({ token });
    },

    setTheme: (theme) => {
      localStorage.setItem('theme', theme);
      set({ theme });
    },

    toggleMode: () => {
      set((state) => {
        const nextMode = state.mode === 'light' ? 'dark' : 'light';
        localStorage.setItem('mode', nextMode);
        return { mode: nextMode };
      });
    },

    login: (user, token) => {
      localStorage.setItem('jira_current_user', JSON.stringify(user));
      localStorage.setItem('jira_token', token);
      set({ user, token });
    },

    logout: () => {
      localStorage.removeItem('jira_current_user');
      localStorage.removeItem('jira_token');
      localStorage.removeItem('jira_active_workspace');
      localStorage.removeItem('jira_dashboard_active_tab');
      localStorage.removeItem('jira_recent_visits');
      set({ user: null, token: null });
    },

    updateProfile: (updatedUser) => {
      localStorage.setItem('jira_current_user', JSON.stringify(updatedUser));
      set({ user: updatedUser });
    }
  };
});
