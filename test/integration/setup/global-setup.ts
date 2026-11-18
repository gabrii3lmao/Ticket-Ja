import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { configureContainerRuntime } from './container-runtime';
import { STATE_FILE, writeDatabaseState } from './state';

const PROJECT_ROOT = join(__dirname, '..', '..', '..');

function prismaBinary(): string {
  const binary = process.platform === 'win32' ? 'prisma.cmd' : 'prisma';
  return join(PROJECT_ROOT, 'node_modules', '.bin', binary);
}

export default async function globalSetup(): Promise<void> {
  configureContainerRuntime();

  const [{ PostgreSqlContainer }, { Wait }] = await Promise.all([
    import('@testcontainers/postgresql'),
    import('testcontainers'),
  ]);

  const container = await new PostgreSqlContainer('postgres:15-alpine')
    .withDatabase('ticketmaster_test')
    .withUsername('postgres')
    .withPassword('postgres')
    // The initdb process starts a temporary server before the final one.
    // Wait for the second readiness log to avoid connecting during shutdown.
    .withWaitStrategy(
      Wait.forLogMessage(/database system is ready to accept connections/, 2),
    )
    .start();

  const databaseUrl = `${container.getConnectionUri()}?schema=public`;

  writeDatabaseState({ containerId: container.getId(), databaseUrl });

  try {
    process.env.DATABASE_URL = databaseUrl;

    execFileSync(prismaBinary(), ['migrate', 'deploy'], {
      cwd: PROJECT_ROOT,
      env: process.env,
      stdio: 'inherit',
    });
  } catch (error) {
    await container.stop().catch(() => undefined);
    rmSync(STATE_FILE, { force: true });
    throw error;
  }
}
