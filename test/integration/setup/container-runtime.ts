import { existsSync } from 'node:fs';
import { userInfo } from 'node:os';
import { join } from 'node:path';

/**
 * Testcontainers supports Docker out of the box. This helper also makes the
 * suite work with a rootless Podman socket, which is common on Linux
 * workstations. Ryuk cannot share a rootless Podman socket with the reaper
 * container on SELinux-enabled hosts, so cleanup is performed explicitly by
 * the global teardown.
 */
export function configureContainerRuntime(): void {
  if (process.env.DOCKER_HOST) {
    if (process.env.DOCKER_HOST.includes('podman')) {
      process.env.TESTCONTAINERS_RYUK_DISABLED ??= 'true';
    }
    return;
  }

  if (existsSync('/var/run/docker.sock')) {
    return;
  }

  const candidates = [
    process.env.XDG_RUNTIME_DIR &&
      join(process.env.XDG_RUNTIME_DIR, 'podman', 'podman.sock'),
    `/run/user/${userInfo().uid}/podman/podman.sock`,
    '/run/podman/podman.sock',
  ].filter((candidate): candidate is string => Boolean(candidate));

  const socketPath = candidates.find((candidate) => existsSync(candidate));

  if (socketPath) {
    process.env.DOCKER_HOST = `unix://${socketPath}`;
    process.env.TESTCONTAINERS_RYUK_DISABLED ??= 'true';
  }
}
