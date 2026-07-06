const NEON_HOST_SUFFIX = '.neon.tech';

export function getRuntimeDatabaseUrl(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) return databaseUrl;

  const url = new URL(databaseUrl);
  if (!url.hostname.endsWith(NEON_HOST_SUFFIX)) return databaseUrl;

  // Neon may need more than Prisma's five-second default while waking an idle
  // compute. Preserve explicit deployment settings and only provide defaults.
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
}
