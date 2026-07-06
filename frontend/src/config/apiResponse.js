export function getApiData(payload) {
  if (payload && typeof payload === 'object' && !Array.isArray(payload) && 'data' in payload) {
    return payload.data;
  }
  return payload;
}

export function getApiList(payload, resourceName = 'API') {
  const data = getApiData(payload);
  if (!Array.isArray(data)) {
    throw new TypeError(`${resourceName} response must contain an array.`);
  }
  return data;
}
