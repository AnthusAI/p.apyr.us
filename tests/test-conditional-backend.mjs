import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ACCOUNT_ID,
  APP_ID,
  MARKER_VERSION,
  fingerprintTree,
  isMatchingMarker,
  canSkipBackend,
  makeMarker,
} from "../bin/deploy-backend-if-needed.mjs";

const repository = mkdtempSync(join(tmpdir(), "papyrus-backend-fingerprint-"));

function git(...args) {
  return execFileSync("git", args, { cwd: repository, encoding: "utf8" }).trim();
}

function commitFile(path, content) {
  const fullPath = join(repository, path);
  mkdirSync(join(fullPath, ".."), { recursive: true });
  writeFileSync(fullPath, content);
  git("add", "--", path);
  git("commit", "-m", "Update " + path);
  return git("rev-parse", "HEAD");
}

try {
  git("init", "-q");
  git("config", "user.name", "Pipeline tests");
  git("config", "user.email", "pipeline-tests@example.invalid");
  commitFile("app/page.tsx", "export default function Page() { return null; }\n");
  commitFile("components/marketing/MarketingPage.tsx", "export const MarketingPage = () => null;\n");
  commitFile("package-lock.json", "{\"lockfileVersion\":3}\n");
  commitFile("amplify/backend.ts", "export {};\n");
  const baselineCommit = git("rev-parse", "HEAD");
  const baseline = fingerprintTree(baselineCommit, {}, repository);

  const frontendCommit = commitFile("components/marketing/MarketingPage.tsx", "export const MarketingPage = () => <main />;\n");
  assert.equal(fingerprintTree(frontendCommit, {}, repository), baseline);

  const lockfileCommit = commitFile("package-lock.json", "{\"lockfileVersion\":3,\"packages\":{}}\n");
  assert.notEqual(fingerprintTree(lockfileCommit, {}, repository), baseline);

  const envFingerprint = fingerprintTree(lockfileCommit, { PAPYRUS_FEATURE: "enabled" }, repository);
  assert.notEqual(envFingerprint, fingerprintTree(lockfileCommit, { PAPYRUS_FEATURE: "disabled" }, repository));
  assert.equal(fingerprintTree(lockfileCommit, { NEXT_PUBLIC_LABEL: "one" }, repository), fingerprintTree(lockfileCommit, { NEXT_PUBLIC_LABEL: "two" }, repository));

  const marker = makeMarker({ fingerprint: baseline, commit: baselineCommit });
  assert.equal(marker.schemaVersion, MARKER_VERSION);
  assert.equal(marker.accountId, ACCOUNT_ID);
  assert.equal(marker.appId, APP_ID);
  assert.equal(isMatchingMarker(marker, { fingerprint: baseline, commit: lockfileCommit }, repository), true);
  assert.equal(isMatchingMarker(marker, { fingerprint: fingerprintTree(lockfileCommit, {}, repository), commit: lockfileCommit }, repository), false);

  const afterFrontendFingerprint = fingerprintTree(frontendCommit, {}, repository);
  assert.equal(isMatchingMarker(marker, { fingerprint: afterFrontendFingerprint, commit: frontendCommit }, repository), true);
  assert.equal(isMatchingMarker({ ...marker, appId: "wrong" }, { fingerprint: afterFrontendFingerprint, commit: frontendCommit }, repository), false);
  assert.equal(isMatchingMarker({ ...marker, backendFingerprint: "bad" }, { fingerprint: afterFrontendFingerprint, commit: frontendCommit }, repository), false);
  assert.equal(isMatchingMarker("not-json", { fingerprint: afterFrontendFingerprint, commit: frontendCommit }, repository), false);
  const safeToSkip = {
    markerValue: marker,
    fingerprint: afterFrontendFingerprint,
    commit: frontendCommit,
    currentJobId: "job-current",
    jobs: [{ jobId: "job-current", status: "RUNNING" }],
    cwd: repository,
  };
  assert.equal(canSkipBackend(safeToSkip), true);
  assert.equal(canSkipBackend({ ...safeToSkip, jobs: [{ jobId: "job-current", status: "RUNNING" }, { jobId: "job-other", status: "PENDING" }] }), false);
  assert.equal(canSkipBackend({ ...safeToSkip, jobs: [{ jobId: "other-job", status: "RUNNING" }] }), false);
  assert.equal(canSkipBackend({ ...safeToSkip, hasMoreJobs: true }), false);
  assert.equal(canSkipBackend({ ...safeToSkip, markerValue: null }), false);

  console.log("Conditional backend fingerprint tests passed.");
} finally {
  rmSync(repository, { recursive: true, force: true });
}
