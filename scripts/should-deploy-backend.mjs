import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const frontendOnlyPaths = [
  (path) => path === 'app/page.tsx',
  (path) => path.startsWith('components/marketing/'),
];

export function shouldDeployForChangedPaths(changedPaths) {
  if (!Array.isArray(changedPaths)) return true;
  return changedPaths.some((path) =>
    typeof path !== 'string' ||
    path.length === 0 ||
    !frontendOnlyPaths.some((isFrontendOnly) => isFrontendOnly(path)),
  );
}

export function shouldDeployBackend({ baseSha, headSha, baseConfigRevision, configRevision, changedPaths }) {
  if (!/^[0-9a-f]{40}$/.test(baseSha ?? '') || !/^[0-9a-f]{40}$/.test(headSha ?? '')) return true;
  if (!/^[0-9]+$/.test(baseConfigRevision ?? '') || !/^[0-9]+$/.test(configRevision ?? '')) return true;
  if (baseConfigRevision !== configRevision) return true;
  return shouldDeployForChangedPaths(changedPaths);
}

function writeDecision(deployBackend, reason) {
  if (!process.env.GITHUB_OUTPUT) {
    throw new Error('GITHUB_OUTPUT is required');
  }
  appendFileSync(process.env.GITHUB_OUTPUT, `deploy_backend=${deployBackend}\n`);
  console.log(`Backend deployment ${deployBackend ? 'required' : 'skipped'}: ${reason}`);
}

export function getBackendDecision(baseSha, headSha, baseConfigRevision, configRevision, cwd = process.cwd()) {
  if (!/^[0-9a-f]{40}$/.test(baseSha) || !/^[0-9a-f]{40}$/.test(headSha)) {
    return { deployBackend: true, reason: 'backend marker or current commit is missing or invalid' };
  }
  if (!/^[0-9]+$/.test(baseConfigRevision) || !/^[0-9]+$/.test(configRevision)) {
    return { deployBackend: true, reason: 'backend configuration revision is missing or invalid' };
  }
  if (baseConfigRevision !== configRevision) {
    return { deployBackend: true, reason: 'backend configuration revision changed' };
  }

  const ancestor = spawnSync('git', ['merge-base', '--is-ancestor', baseSha, headSha], {
    encoding: 'utf8',
    cwd,
  });
  if (ancestor.status !== 0) {
    return { deployBackend: true, reason: 'backend marker is not an ancestor of this commit' };
  }

  const diff = spawnSync('git', ['diff', '--no-renames', '--name-only', '-z', `${baseSha}..${headSha}`], {
    encoding: 'utf8',
    cwd,
  });
  if (diff.status !== 0) {
    return { deployBackend: true, reason: 'git could not compare the backend marker to this commit' };
  }

  const changedPaths = diff.stdout.split('\0').filter(Boolean);
  if (shouldDeployForChangedPaths(changedPaths)) {
    return { deployBackend: true, reason: 'a backend-affecting or unclassified path changed' };
  }
  if (changedPaths.length === 0) {
    return { deployBackend: false, reason: 'no code changes since the last successful backend deployment' };
  }
  return { deployBackend: false, reason: 'only allowlisted frontend paths changed' };
}

const isDirectExecution = process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectExecution) {
  const result = getBackendDecision(
    process.env.PAPYRUS_BACKEND_BASE_SHA ?? '',
    process.env.GITHUB_SHA ?? '',
    process.env.PAPYRUS_BACKEND_BASE_CONFIG_REVISION ?? '',
    process.env.PAPYRUS_BACKEND_CONFIG_REVISION ?? '',
  );
  writeDecision(result.deployBackend, result.reason);
}
