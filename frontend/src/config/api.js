export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const getAuthHeaders = () => {
  const token = localStorage.getItem('jira_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};
