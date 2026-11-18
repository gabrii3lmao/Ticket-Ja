import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export interface DatabaseState {
  containerId: string;
  databaseUrl: string;
}

export const STATE_FILE = join(
  process.env.TMPDIR ?? '/tmp',
  'ticket-ja',
  'integration-db.json',
);

export function writeDatabaseState(state: DatabaseState): void {
  mkdirSync(dirname(STATE_FILE), { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state), 'utf8');
}

export function readDatabaseState(): DatabaseState {
  if (!existsSync(STATE_FILE)) {
    throw new Error(
      `Integration database state not found at ${STATE_FILE}. ` +
        'The global setup did not start the PostgreSQL container.',
    );
  }

  return JSON.parse(readFileSync(STATE_FILE, 'utf8')) as DatabaseState;
}
