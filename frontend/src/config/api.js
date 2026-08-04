const _getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (import.meta.env.DEV) return 'http://localhost:5000';
  return typeof window !== 'undefined' ? window.location.origin : '';
};
export const API_URL = _getApiUrl();

export const getAuthHeaders = () => {
  const token = localStorage.getItem('jira_token');
  const validToken = token && token !== 'null' && token !== 'undefined' ? token : '';
  return {
    'Content-Type': 'application/json',
    ...(validToken ? { 'Authorization': `Bearer ${validToken}` } : {})
  };
};
