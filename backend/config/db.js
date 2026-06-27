import pg from 'pg';
import dotenv from 'dotenv';
import { execSync } from 'child_process';

dotenv.config();

const { Pool } = pg;

// Helper to check and create database
const ensureDatabaseExists = async () => {
  const adminConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: 'postgres', // connect to default db first
  };

  const adminPool = new Pool(adminConfig);
  const dbName = process.env.DB_NAME || 'jira_clone';

  try {
    const res = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );

    if (res.rowCount === 0) {
      console.log(`[DATABASE] Database "${dbName}" does not exist. Creating...`);
      await adminPool.query(`CREATE DATABASE "${dbName}"`);
      console.log(`[DATABASE] Database "${dbName}" created successfully.`);
    }
  } catch (error) {
    console.error(`[DATABASE] Error checking/creating database "${dbName}":`, error);
  } finally {
    await adminPool.end();
  }
};

// Main pool configuration for the application database (kept as fallback/compatibility if imported)
const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'jira_clone',
};

export const pool = new Pool(poolConfig);

export const initializeDatabase = async () => {
  // 1. Ensure the database exists
  await ensureDatabaseExists();

  // 2. Synchronize Prisma models with PostgreSQL and generate the client
  try {
    console.log('[DATABASE] Running Prisma database schema synchronization (db push)...');
    execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
    console.log('[DATABASE] Prisma schema synchronization completed successfully.');
  } catch (error) {
    console.error('[DATABASE] Prisma schema synchronization failed:', error);
    throw error;
  }
};
