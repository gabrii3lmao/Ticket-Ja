import { existsSync, rmSync } from 'node:fs';
import { configureContainerRuntime } from './container-runtime';
import { STATE_FILE, readDatabaseState } from './state';

export default async function globalTeardown(): Promise<void> {
  if (!existsSync(STATE_FILE)) {
    return;
  }

  const { containerId } = readDatabaseState();
  configureContainerRuntime();

  try {
    const { getContainerRuntimeClient } = await import('testcontainers');
    const client = await getContainerRuntimeClient();
    const container = client.container.getById(containerId);

    await client.container
      .stop(container, { timeout: 10 })
      .catch(() => undefined);
    await client.container
      .remove(container, { removeVolumes: true })
      .catch(() => undefined);
  } finally {
    rmSync(STATE_FILE, { force: true });
  }
}
