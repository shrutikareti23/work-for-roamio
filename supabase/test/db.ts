import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { PGlite, type Transaction } from '@electric-sql/pglite';

const here = import.meta.dirname;

/** A fresh database with the Supabase shim and all our migrations applied. */
export async function freshDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(readFileSync(join(here, 'supabase-shim.sql'), 'utf8'));
  const dir = join(here, '..', 'migrations');
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    await db.exec(readFileSync(join(dir, file), 'utf8'));
  }
  return db;
}

/** Create a user the way Supabase Auth would (this also fires our profile trigger). */
export async function createUser(
  db: PGlite,
  id: string,
  email: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await db.query('insert into auth.users (id, email, raw_user_meta_data) values ($1, $2, $3)', [
    id,
    email,
    JSON.stringify(metadata),
  ]);
}

/**
 * Run queries as a signed-in user (role "authenticated" + their id),
 * or as a logged-out visitor when userId is null (role "anon").
 */
export async function as<T>(
  db: PGlite,
  userId: string | null,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${userId ? 'authenticated' : 'anon'}`);
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId ?? '']);
    return fn(tx);
  });
}
