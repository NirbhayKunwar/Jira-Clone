import { PrismaClient } from '@prisma/client';
import { getRuntimeDatabaseUrl } from './databaseUrl.js';

const databaseUrl = getRuntimeDatabaseUrl();
const globalForPrisma = globalThis;

const prisma = globalForPrisma.__jiraPrisma ?? new PrismaClient({
  log: ['info', 'warn', 'error'],
  ...(databaseUrl && {
    datasources: {
      db: { url: databaseUrl }
    }
  })
});

// A warm serverless instance should reuse its existing engine and pool.
globalForPrisma.__jiraPrisma = prisma;

export default prisma;
