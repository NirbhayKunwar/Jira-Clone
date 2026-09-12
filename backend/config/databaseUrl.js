const NEON_HOST_SUFFIX = '.neon.tech';

export function getRuntimeDatabaseUrl(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) return databaseUrl;
  const cleanUrl = String(databaseUrl).trim().replace(/^["']|["']$/g, '');
  try {
    const url = new URL(cleanUrl);
    if (cleanUrl.startsWith('mongodb+srv://') || cleanUrl.startsWith('mongodb://')) {
      url.searchParams.set('ssl', 'true');
      url.searchParams.set('tls', 'true');
      url.searchParams.set('tlsAllowInvalidCertificates', 'true');
      url.searchParams.set('sslverify', 'false');
      if (!url.searchParams.has('connectTimeoutMS')) {
        url.searchParams.set('connectTimeoutMS', '15000');
      }
      return url.toString();
    }

    if (!url.hostname.endsWith(NEON_HOST_SUFFIX)) return cleanUrl;

    if (!url.searchParams.has('connect_timeout')) {
      url.searchParams.set('connect_timeout', '15');
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', '15');
    }
    if (!url.searchParams.has('sslmode')) {
      url.searchParams.set('sslmode', 'require');
    }

    return url.toString();
  } catch {
    return cleanUrl;
  }
}
