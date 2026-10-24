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
  normalizeJobId,
  workspaceInputsAreKnown,
  unknownWorkspaceInputs,
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
  writeFileSync(join(repository, ".gitignore"), ".next/\n.npm/\nnode_modules/\namplify_outputs.json\n.amplify/\n");
  git("add", ".gitignore");
  mkdirSync(join(repository, "node_modules/@anthusai/papyrus"), { recursive: true });
  writeFileSync(join(repository, "node_modules/@anthusai/papyrus/amplify-backend.js"), "export {};\n");
  commitFile("app/page.tsx", "export default function Page() { return null; }\n");
  commitFile("components/marketing/MarketingPage.tsx", "export const MarketingPage = () => null;\n");
  commitFile("package-lock.json", "{\"lockfileVersion\":3}\n");
  commitFile("amplify/backend.ts", "export {};\n");
  const baselineCommit = git("rev-parse", "HEAD");
  const baseline = fingerprintTree(baselineCommit, {}, repository);
  assert.equal(workspaceInputsAreKnown(repository), true);
  mkdirSync(join(repository, ".next/cache"), { recursive: true });
  writeFileSync(join(repository, ".next/cache/build-data"), "cached\n");
  mkdirSync(join(repository, ".npm"), { recursive: true });
  writeFileSync(join(repository, ".npm/cache-data"), "cached\n");
  assert.equal(workspaceInputsAreKnown(repository), true);
  rmSync(join(repository, ".next"), { recursive: true, force: true });
  rmSync(join(repository, ".npm"), { recursive: true, force: true });

  writeFileSync(join(repository, "amplify_outputs.json"), "{\"storage\":{\"bucket_name\":\"bucket-a\"}}\n");
  const outputStateFingerprint = fingerprintTree(baselineCommit, {}, repository);
  assert.notEqual(outputStateFingerprint, baseline);
  writeFileSync(join(repository, "amplify_outputs.json"), "{\"storage\":{\"bucket_name\":\"bucket-b\"}}\n");
  assert.notEqual(fingerprintTree(baselineCommit, {}, repository), outputStateFingerprint);
  rmSync(join(repository, "amplify_outputs.json"));

  writeFileSync(join(repository, "node_modules/@anthusai/papyrus/amplify-backend.js"), "export const backend = true;\n");
  assert.notEqual(fingerprintTree(baselineCommit, {}, repository), baseline);
  writeFileSync(join(repository, "node_modules/@anthusai/papyrus/amplify-backend.js"), "export {};\n");

  const frontendCommit = commitFile("components/marketing/MarketingPage.tsx", "export const MarketingPage = () => <main />;\n");
  assert.equal(fingerprintTree(frontendCommit, {}, repository), baseline);

  const lockfileCommit = commitFile("package-lock.json", "{\"lockfileVersion\":3,\"packages\":{}}\n");
  assert.notEqual(fingerprintTree(lockfileCommit, {}, repository), baseline);

  const envFingerprint = fingerprintTree(lockfileCommit, { PAPYRUS_FEATURE: "enabled" }, repository);
  assert.notEqual(envFingerprint, fingerprintTree(lockfileCommit, { PAPYRUS_FEATURE: "disabled" }, repository));
  assert.notEqual(fingerprintTree(lockfileCommit, { AMPLIFY_SSM_ENV_CONFIG: "{\"secret\":{\"path\":\"/a\"}}" }, repository), fingerprintTree(lockfileCommit, { AMPLIFY_SSM_ENV_CONFIG: "{\"secret\":{\"path\":\"/b\"}}" }, repository));
  assert.notEqual(fingerprintTree(lockfileCommit, { NEXT_PUBLIC_PAPYRUS_SITE_BRAND: "brand-a" }, repository), fingerprintTree(lockfileCommit, { NEXT_PUBLIC_PAPYRUS_SITE_BRAND: "brand-b" }, repository));
  assert.equal(fingerprintTree(lockfileCommit, { NEXT_PUBLIC_LABEL: "one" }, repository), fingerprintTree(lockfileCommit, { NEXT_PUBLIC_LABEL: "two" }, repository));

  mkdirSync(join(repository, ".amplify"), { recursive: true });
  writeFileSync(join(repository, ".amplify/ignored-generated-config.json"), "{}\n");
  assert.equal(workspaceInputsAreKnown(repository), false);
  assert.deepEqual(unknownWorkspaceInputs(repository), ["!! .amplify/"]);
  rmSync(join(repository, ".amplify"), { recursive: true, force: true });
  writeFileSync(join(repository, "unexpected.generated"), "unknown\n");
  assert.equal(workspaceInputsAreKnown(repository), false);
  rmSync(join(repository, "unexpected.generated"));

  const marker = makeMarker({ fingerprint: baseline, commit: baselineCommit, jobId: "0000000010", jobStartTime: 1000 });
  assert.equal(normalizeJobId("0000000001"), "1");
  assert.equal(normalizeJobId("job-current"), "job-current");
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
    currentJobId: "0000000001",
    jobs: [
      { jobId: "1", status: "RUNNING", startTime: "1970-01-01T00:00:02.000Z" },
      { jobId: "10", status: "SUCCEED", startTime: "1970-01-01T00:00:01.000Z" },
      { jobId: "job-older", status: "SUCCEED", startTime: "1970-01-01T00:00:00.500Z" },
    ],
    cwd: repository,
  };
  assert.equal(canSkipBackend(safeToSkip), true);
  assert.equal(canSkipBackend({ ...safeToSkip, jobs: [...safeToSkip.jobs, { jobId: "job-other", status: "PENDING", startTime: "1970-01-01T00:00:02.100Z" }] }), false);
  assert.equal(canSkipBackend({ ...safeToSkip, jobs: [{ jobId: "other-job", status: "RUNNING", startTime: "1970-01-01T00:00:02.000Z" }] }), false);
  assert.equal(canSkipBackend({ ...safeToSkip, jobs: [...safeToSkip.jobs, { jobId: "unguarded-success", status: "SUCCEED", startTime: "1970-01-01T00:00:01.500Z" }] }), false);
  assert.equal(canSkipBackend({ ...safeToSkip, jobs: safeToSkip.jobs.filter((job) => job.jobId !== "10") }), false);
  assert.equal(canSkipBackend({ ...safeToSkip, hasMoreJobs: true }), false);
  assert.equal(canSkipBackend({ ...safeToSkip, markerValue: null }), false);

  console.log("Conditional backend fingerprint tests passed.");
} finally {
  rmSync(repository, { recursive: true, force: true });
}
