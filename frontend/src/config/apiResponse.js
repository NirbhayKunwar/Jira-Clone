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
    // Look for common nested array properties (e.g. data.members, data.tasks, data.projects, etc.)
    const nestedArray = data.members || data.tasks || data.projects || data.users || data.items || data.teams || data.goals || data.events || data.notifications || data.data;
    if (Array.isArray(nestedArray)) {
      return nestedArray;
    }
  }
  console.warn(`[getApiList] ${resourceName} response is not an array:`, payload);
  return [];
}
