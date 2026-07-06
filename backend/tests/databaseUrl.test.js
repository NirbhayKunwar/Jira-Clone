import { describe, expect, it } from 'vitest';
import { getRuntimeDatabaseUrl } from '../config/databaseUrl.js';

describe('getRuntimeDatabaseUrl', () => {
  it('adds serverless-safe timeout and TLS defaults to Neon URLs', () => {
    const configured = new URL(getRuntimeDatabaseUrl(
      'postgresql://user:password@example-pooler.ap-southeast-1.aws.neon.tech/app'
    ));

    expect(configured.searchParams.get('connect_timeout')).toBe('15');
    expect(configured.searchParams.get('pool_timeout')).toBe('15');
    expect(configured.searchParams.get('sslmode')).toBe('require');
  });

  it('preserves explicitly configured Neon parameters', () => {
    const configured = new URL(getRuntimeDatabaseUrl(
      'postgresql://user:password@example.neon.tech/app?connect_timeout=30&pool_timeout=20&sslmode=verify-full'
    ));

    expect(configured.searchParams.get('connect_timeout')).toBe('30');
    expect(configured.searchParams.get('pool_timeout')).toBe('20');
    expect(configured.searchParams.get('sslmode')).toBe('verify-full');
  });

  it('does not modify non-Neon database URLs', () => {
    const databaseUrl = 'postgresql://postgres:password@db:5432/app?schema=public';
    expect(getRuntimeDatabaseUrl(databaseUrl)).toBe(databaseUrl);
  });
});
