export function getApiData(payload) {
  if (payload && typeof payload === 'object' && !Array.isArray(payload) && 'data' in payload) {
    return payload.data;
  }
  return payload;
}

export function getApiList(payload, resourceName = 'API') {
  if (!payload) return [];
  const data = getApiData(payload);
  if (Array.isArray(data)) {
    return data;
  }
  if (data && typeof data === 'object') {
    // Look for common nested array properties
    const nestedArray = data.members || data.tasks || data.projects || data.users || data.items || data.teams || data.goals || data.events || data.notifications || data.data || data.list || data.results || data.rows || data.teamMembers || data.workspaceMembers || data.projectMembers;
    if (Array.isArray(nestedArray)) {
      return nestedArray;
    }
    // Search Object.values for the first array property
    const firstArrayValue = Object.values(data).find(val => Array.isArray(val));
    if (firstArrayValue) {
      return firstArrayValue;
    }
  }
  console.warn(`[getApiList] ${resourceName} response is not an array:`, payload);
  return [];
}
