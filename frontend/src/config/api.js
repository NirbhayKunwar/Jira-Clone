const _getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (import.meta.env.DEV) return 'http://localhost:5000';
  return typeof window !== 'undefined' ? window.location.origin : '';
};

const _getFastApiUrl = () => {
  if (import.meta.env.VITE_FASTAPI_URL) return import.meta.env.VITE_FASTAPI_URL;
  if (import.meta.env.DEV) return 'http://localhost:8000';
  return typeof window !== 'undefined' ? window.location.origin : '';
};

const _getWsUrl = () => {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  if (import.meta.env.DEV) return 'ws://localhost:8000/ws';
  return typeof window !== 'undefined' ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws` : '';
};

export const API_URL = _getApiUrl();
export const FASTAPI_URL = _getFastApiUrl();
export const WS_URL = _getWsUrl();

export const getAuthHeaders = () => {
  const token = localStorage.getItem('jira_token');
  const validToken = token && token !== 'null' && token !== 'undefined' ? token : '';
  return {
    'Content-Type': 'application/json',
    ...(validToken ? { 'Authorization': `Bearer ${validToken}` } : {})
  };
};
