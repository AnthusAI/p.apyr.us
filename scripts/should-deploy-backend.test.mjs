import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { getBackendDecision, shouldDeployBackend, shouldDeployForChangedPaths } from './should-deploy-backend.mjs';

test('skips backend for the narrow allowlisted marketing frontend paths', () => {
  assert.equal(
    shouldDeployForChangedPaths([
      'app/page.tsx',
      'components/marketing/MarketingPage.tsx',
      'components/marketing/marketing.css',
    ]),
    false,
  );
});

test('requires backend deployment for package, lock, config, static projection, infra, and unknown paths', () => {
  for (const path of [
    'package.json',
    'package-lock.json',
    'papyrus.config.ts',
    'amplify/data/resource.ts',
    'infra/site.json',
    'infra/edge/p-apyr-us-edge.yaml',
    'web/projection.json',
    'components/unknown/feature.tsx',
  ]) {
    assert.equal(shouldDeployForChangedPaths([path]), true, path);
  }
});

test('fails closed for invalid paths and empty/unavailable change lists', () => {
  assert.equal(shouldDeployForChangedPaths(undefined), true);
  assert.equal(shouldDeployForChangedPaths(['']), true);
  assert.equal(shouldDeployForChangedPaths([null]), true);
});

test('requires a backend deployment when the marker or config revision is missing or stale', () => {
  const base = {
    baseSha: 'a'.repeat(40),
    headSha: 'b'.repeat(40),
    baseConfigRevision: '4',
    configRevision: '4',
    changedPaths: ['app/page.tsx'],
  };
  assert.equal(shouldDeployBackend(base), false);
  assert.equal(shouldDeployBackend({ ...base, baseConfigRevision: '3' }), true);
  assert.equal(shouldDeployBackend({ ...base, baseSha: '' }), true);
  assert.equal(shouldDeployBackend({ ...base, configRevision: '' }), true);
});

test('compares all commits since the last successful backend deploy and fails closed on missing history', () => {
  const directory = mkdtempSync(join(tmpdir(), 'papyrus-backend-diff-'));
  const runGit = (args) => {
    const result = spawnSync('git', args, {
      cwd: directory,
      encoding: 'utf8',
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'Test',
        GIT_AUTHOR_EMAIL: 'test@example.invalid',
        GIT_COMMITTER_NAME: 'Test',
        GIT_COMMITTER_EMAIL: 'test@example.invalid',
      },
    });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };

  try {
    runGit(['init', '-b', 'main']);
    mkdirSync(join(directory, 'app'), { recursive: true });
    writeFileSync(join(directory, 'app/page.tsx'), 'initial');
    runGit(['add', '.']);
    runGit(['commit', '-m', 'baseline']);
    const baseSha = runGit(['rev-parse', 'HEAD']);

    writeFileSync(join(directory, 'app/page.tsx'), 'frontend change');
    runGit(['add', '.']);
    runGit(['commit', '-m', 'frontend']);
    const frontendSha = runGit(['rev-parse', 'HEAD']);
    assert.equal(getBackendDecision(baseSha, frontendSha, '1', '1', directory).deployBackend, false);

    writeFileSync(join(directory, 'package-lock.json'), '{}');
    runGit(['add', '.']);
    runGit(['commit', '-m', 'dependency change']);
    const dependencySha = runGit(['rev-parse', 'HEAD']);
    assert.equal(getBackendDecision(baseSha, dependencySha, '1', '1', directory).deployBackend, true);
    assert.equal(getBackendDecision('f'.repeat(40), dependencySha, '1', '1', directory).deployBackend, true);

    runGit(['rm', 'package-lock.json']);
    mkdirSync(join(directory, 'components/marketing'), { recursive: true });
    writeFileSync(join(directory, 'components/marketing/package-lock.json'), '{}');
    runGit(['add', '.']);
    runGit(['commit', '-m', 'move backend input']);
    const renamedSha = runGit(['rev-parse', 'HEAD']);
    assert.equal(getBackendDecision(dependencySha, renamedSha, '1', '1', directory).deployBackend, true);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
