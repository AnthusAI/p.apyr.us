import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fingerprintTree, makeMarker } from "../bin/deploy-backend-if-needed.mjs";

const helper = resolve("bin/deploy-backend-if-needed.mjs");
const repository = mkdtempSync(join(tmpdir(), "papyrus-backend-cli-"));
const fakeBin = join(repository, "fake-bin");
const state = join(repository, "state");
const awsPath = join(fakeBin, "aws");
const npxPath = join(fakeBin, "npx");
const markerPath = join(state, "marker.json");
const npmLog = join(state, "npx.jsonl");
const putCountPath = join(state, "put-count");
const listCountPath = join(state, "list-count");

mkdirSync(fakeBin, { recursive: true });
mkdirSync(state, { recursive: true });

writeFileSync(awsPath, `#!/usr/bin/env node
const { readFileSync, writeFileSync, existsSync } = require("node:fs");
const { join } = require("node:path");
const args = process.argv.slice(2);
const state = process.env.FAKE_STATE;
if (args[0] === "sts") { process.stdout.write("712236451410\\n"); process.exit(0); }
if (args[0] === "amplify" && args[1] === "list-jobs") {
  const listCount = Number(existsSync(process.env.LIST_COUNT_PATH) ? readFileSync(process.env.LIST_COUNT_PATH, "utf8") : "0") + 1;
  writeFileSync(process.env.LIST_COUNT_PATH, String(listCount));
  const currentJobId = String(process.env.AWS_JOB_ID).replace(/^0+(?=\\d)/, "");
  if (process.env.PAGINATE === "1") {
    if (args.includes("--next-token")) process.stdout.write(JSON.stringify({ jobSummaries: [{ jobId: "later-active", status: "RUNNING" }] }));
    else process.stdout.write(JSON.stringify({ jobSummaries: [{ jobId: currentJobId, status: "RUNNING", startTime: "2026-10-23T21:00:02.000Z", commitId: process.env.FAKE_COMMIT_ID }], nextToken: "second-page" }));
  } else {
    const markerPath = join(state, "marker.json");
    const marker = existsSync(markerPath) ? JSON.parse(readFileSync(markerPath, "utf8")) : null;
    const jobs = [{ jobId: currentJobId, status: "RUNNING", startTime: "2026-10-23T21:00:02.000Z", commitId: process.env.FAKE_COMMIT_ID }];
    if (marker?.jobId) jobs.push({ jobId: String(marker.jobId).replace(/^0+(?=\\d)/, ""), status: "SUCCEED", startTime: new Date(marker.jobStartTime).toISOString() });
    if (process.env.DUPLICATE_CURRENT_JOB === "first" || (process.env.DUPLICATE_CURRENT_JOB === "second" && listCount === 2)) {
      jobs.push({ jobId: "00000000" + currentJobId, status: "FAILED", startTime: "2026-10-23T21:00:03.000Z", commitId: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" });
    }
    if (process.env.PAGINATE_SUCCESS === "1") {
      if (args.includes("--next-token")) process.stdout.write(JSON.stringify({ jobSummaries: [{ jobId: "older-terminal", status: "FAILED", startTime: "2026-10-23T20:00:00.000Z" }] }));
      else process.stdout.write(JSON.stringify({ jobSummaries: jobs, nextToken: "second-page" }));
    } else process.stdout.write(JSON.stringify({ jobSummaries: jobs }));
  }
  process.exit(0);
}
if (args[0] === "ssm" && args[1] === "get-parameter") {
  if (!existsSync(join(state, "marker.json"))) { process.stderr.write("ParameterNotFound\\n"); process.exit(1); }
  process.stdout.write(readFileSync(join(state, "marker.json"), "utf8") + "\\n");
  process.exit(0);
}
if (args[0] === "ssm" && args[1] === "put-parameter") {
  const countPath = join(state, "put-count");
  const count = (Number(existsSync(countPath) ? readFileSync(countPath, "utf8") : "0") + 1);
  writeFileSync(countPath, String(count));
  if (process.env.FAIL_PUT_CALL === String(count)) { process.stderr.write("simulated SSM write failure\\n"); process.exit(1); }
  const value = args[args.indexOf("--value") + 1];
  writeFileSync(join(state, "marker.json"), value);
  process.exit(0);
}
process.stderr.write("unexpected AWS CLI command\\n");
process.exit(2);
`);

writeFileSync(npxPath, `#!/usr/bin/env node
const { appendFileSync, writeFileSync } = require("node:fs");
const args = process.argv.slice(2);
appendFileSync(process.env.NPX_LOG, JSON.stringify(args) + "\\n");
if (process.env.FAIL_PIPELINE === "1" && args[0] === "ampx" && args[1] === "pipeline-deploy") process.exit(7);
if (process.env.FAIL_OUTPUTS === "1" && args[0] === "ampx" && args[1] === "generate") process.exit(8);
if (process.env.BLOCK_EDGE === "1" && args[0] === "papyrus-infra") {
  writeFileSync(process.env.EDGE_STARTED, "started");
  setInterval(() => {}, 1000);
}
`);
chmodSync(awsPath, 0o755);
chmodSync(npxPath, 0o755);

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function createRepository() {
  const cwd = mkdtempSync(join(repository, "fixture-"));
  git(cwd, "init", "-q");
  git(cwd, "config", "user.name", "Pipeline tests");
  git(cwd, "config", "user.email", "pipeline-tests@example.invalid");
  writeFileSync(join(cwd, ".gitignore"), ".next/\n.npm/\nnode_modules/\namplify_outputs.json\n.amplify/\n");
  mkdirSync(join(cwd, "app"), { recursive: true });
  mkdirSync(join(cwd, "components/marketing"), { recursive: true });
  mkdirSync(join(cwd, "node_modules/@anthusai/papyrus"), { recursive: true });
  writeFileSync(join(cwd, "app/page.tsx"), "marketing A\n");
  writeFileSync(join(cwd, "components/marketing/MarketingPage.tsx"), "marketing component A\n");
  writeFileSync(join(cwd, "node_modules/@anthusai/papyrus/backend.js"), "export {};\n");
  writeFileSync(join(cwd, "backend.ts"), "backend A\n");
  git(cwd, "add", ".");
  git(cwd, "commit", "-m", "initial");
  const initial = git(cwd, "rev-parse", "HEAD");
  writeFileSync(join(cwd, "backend.ts"), "backend B\n");
  git(cwd, "add", "backend.ts");
  git(cwd, "commit", "-m", "backend change");
  const changed = git(cwd, "rev-parse", "HEAD");
  return { cwd, initial, changed };
}

function writeMarker(cwd, commit) {
  const marker = makeMarker({ fingerprint: fingerprintTree(commit, { ...process.env, AWS_REGION: "us-east-1" }, cwd), commit, jobId: "0000000010", jobStartTime: Date.parse("2026-10-23T21:00:00.000Z") });
  writeFileSync(markerPath, JSON.stringify(marker));
  return marker;
}

function childEnv(cwd, overrides = {}) {
  return {
    ...process.env,
    PATH: fakeBin + ":" + process.env.PATH,
    FAKE_STATE: state,
    LIST_COUNT_PATH: listCountPath,
    NPX_LOG: npmLog,
    AWS_APP_ID: "ds6yswxui41yi",
    AWS_BRANCH: "main",
    AWS_JOB_ID: "0000000001",
    AWS_COMMIT_ID: git(cwd, "rev-parse", "HEAD"),
    FAKE_COMMIT_ID: git(cwd, "rev-parse", "HEAD"),
    AWS_REGION: "us-east-1",
    ...overrides,
  };
}

function clearState() {
  for (const path of [markerPath, npmLog, putCountPath, listCountPath]) {
    if (existsSync(path)) rmSync(path);
  }
}

function runHelper(cwd, overrides = {}) {
  return spawnSync(process.execPath, [helper], {
    cwd,
    env: childEnv(cwd, overrides),
    encoding: "utf8",
  });
}

function loggedNpxCalls() {
  return existsSync(npmLog) ? readFileSync(npmLog, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line)) : [];
}

try {
  const { cwd, initial, changed } = createRepository();
  writeFileSync(join(cwd, "amplify.sh"), "#!/bin/sh\necho build\n");
  const firstWrapperMarker = writeMarker(cwd, changed);
  const wrapperSkip = runHelper(cwd, { AWS_JOB_ID: "0000000002" });
  assert.equal(wrapperSkip.status, 0, wrapperSkip.stderr);
  assert.match(wrapperSkip.stdout, /Backend and edge deployment skipped/);
  assert.equal(loggedNpxCalls().length, 0);
  assert.equal(JSON.parse(readFileSync(markerPath, "utf8")).backendFingerprint, firstWrapperMarker.backendFingerprint);
  assert.equal(JSON.parse(readFileSync(markerPath, "utf8")).jobId, "2");

  writeFileSync(join(cwd, "amplify.sh"), "#!/bin/sh\necho changed build\n");
  const wrapperChange = runHelper(cwd, { AWS_JOB_ID: "0000000003" });
  assert.equal(wrapperChange.status, 0, wrapperChange.stderr);
  assert.deepEqual(loggedNpxCalls().map((call) => call[0] === "papyrus-infra" ? "edge" : call[1]), ["edge", "pipeline-deploy"]);
  assert.equal(JSON.parse(readFileSync(markerPath, "utf8")).backendFingerprint, fingerprintTree(changed, { ...process.env, AWS_REGION: "us-east-1" }, cwd));

  clearState();
  rmSync(join(cwd, "amplify.sh"));
  writeMarker(cwd, initial);

  const failedBackend = runHelper(cwd, { FAIL_PIPELINE: "1" });
  assert.notEqual(failedBackend.status, 0);
  assert.equal(JSON.parse(readFileSync(markerPath, "utf8")).schemaVersion, 0);
  assert.deepEqual(loggedNpxCalls().map((call) => call[0] === "papyrus-infra" ? "edge" : call[1]), ["edge", "pipeline-deploy"]);

  for (const path of [npmLog, putCountPath]) if (existsSync(path)) rmSync(path);
  writeFileSync(join(cwd, "backend.ts"), "backend A\n");
  git(cwd, "add", "backend.ts");
  git(cwd, "commit", "-m", "revert backend");
  const reverted = git(cwd, "rev-parse", "HEAD");
  assert.notEqual(reverted, initial);
  assert.equal(JSON.parse(readFileSync(markerPath, "utf8")).schemaVersion, 0, "failed backend marker remains invalid across a revert");
  const recovery = runHelper(cwd);
  assert.equal(recovery.status, 0, recovery.stderr);
  assert.deepEqual(loggedNpxCalls().map((call) => call[0] === "papyrus-infra" ? "edge" : call[1]), ["edge", "pipeline-deploy"]);
  assert.equal(JSON.parse(readFileSync(markerPath, "utf8")).backendFingerprint, fingerprintTree(reverted, { ...process.env, AWS_REGION: "us-east-1" }, cwd));
  assert.equal(JSON.parse(readFileSync(markerPath, "utf8")).commit, reverted, "successful deployment records the commit from the Amplify job summary");

  clearState();
  git(cwd, "checkout", "--detach", changed);
  writeMarker(cwd, initial);
  const backendDeployWithoutCommitEnvironment = runHelper(cwd, { AWS_COMMIT_ID: "" });
  assert.equal(backendDeployWithoutCommitEnvironment.status, 0, backendDeployWithoutCommitEnvironment.stderr);
  assert.deepEqual(loggedNpxCalls().map((call) => call[0] === "papyrus-infra" ? "edge" : call[1]), ["edge", "pipeline-deploy"]);
  assert.equal(JSON.parse(readFileSync(markerPath, "utf8")).schemaVersion, 1);
  assert.equal(JSON.parse(readFileSync(markerPath, "utf8")).commit, changed, "full deployment can record a success marker from the authoritative job summary without AWS_COMMIT_ID");

  clearState();
  git(cwd, "checkout", "--detach", changed);
  writeMarker(cwd, initial);
  const invalidationFailure = runHelper(cwd, { FAIL_PUT_CALL: "1" });
  assert.notEqual(invalidationFailure.status, 0);
  assert.equal(loggedNpxCalls().length, 0);
  assert.equal(JSON.parse(readFileSync(markerPath, "utf8")).backendFingerprint, fingerprintTree(initial, { ...process.env, AWS_REGION: "us-east-1" }, cwd));

  clearState();
  git(cwd, "checkout", "--detach", changed);
  writeMarker(cwd, initial);
  const restoreFailure = runHelper(cwd, { FAIL_PUT_CALL: "2" });
  assert.notEqual(restoreFailure.status, 0);
  assert.equal(JSON.parse(readFileSync(markerPath, "utf8")).schemaVersion, 0);
  assert.deepEqual(loggedNpxCalls().map((call) => call[0] === "papyrus-infra" ? "edge" : call[1]), ["edge", "pipeline-deploy"]);

  clearState();
  writeMarker(cwd, changed);
  const paginatedConcurrency = runHelper(cwd, { PAGINATE: "1" });
  assert.notEqual(paginatedConcurrency.status, 0);
  assert.equal(loggedNpxCalls().length, 0);
  assert.equal(JSON.parse(readFileSync(markerPath, "utf8")).backendFingerprint, fingerprintTree(changed, { ...process.env, AWS_REGION: "us-east-1" }, cwd));

  clearState();
  const firstReadMarker = writeMarker(cwd, changed);
  const duplicateCurrentJobOnFirstRead = runHelper(cwd, { DUPLICATE_CURRENT_JOB: "first" });
  assert.notEqual(duplicateCurrentJobOnFirstRead.status, 0);
  assert.equal(loggedNpxCalls().length, 0, "conflicting duplicate current-job records reject before deployment");
  assert.deepEqual(JSON.parse(readFileSync(markerPath, "utf8")), firstReadMarker, "the marker remains unchanged when the first history read is ambiguous");

  clearState();
  git(cwd, "checkout", "--detach", changed);
  const secondReadMarker = writeMarker(cwd, initial);
  const duplicateCurrentJobOnSecondRead = runHelper(cwd, { DUPLICATE_CURRENT_JOB: "second" });
  assert.notEqual(duplicateCurrentJobOnSecondRead.status, 0);
  assert.equal(loggedNpxCalls().length, 0, "conflicting duplicate current-job records reject before backend mutation");
  assert.deepEqual(JSON.parse(readFileSync(markerPath, "utf8")), secondReadMarker, "the marker remains unchanged when the second history read is ambiguous");

  clearState();
  writeMarker(cwd, changed);
  const skip = runHelper(cwd);
  assert.equal(skip.status, 0, skip.stderr);
  assert.match(skip.stdout, /deployment skipped/);
  assert.equal(loggedNpxCalls().length, 0);

  clearState();
  writeMarker(cwd, changed);
  const missingCommitEnvironment = runHelper(cwd, { AWS_COMMIT_ID: "" });
  assert.equal(missingCommitEnvironment.status, 0, missingCommitEnvironment.stderr);
  assert.match(missingCommitEnvironment.stdout, /deployment skipped/);
  assert.equal(JSON.parse(readFileSync(markerPath, "utf8")).commit, changed);

  clearState();
  writeMarker(cwd, changed);
  const mismatchedCommitEnvironment = runHelper(cwd, { AWS_COMMIT_ID: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" });
  assert.notEqual(mismatchedCommitEnvironment.status, 0);
  assert.equal(loggedNpxCalls().length, 0, "mismatched commit identity aborts before mutation");
  assert.equal(JSON.parse(readFileSync(markerPath, "utf8")).backendFingerprint, fingerprintTree(changed, { ...process.env, AWS_REGION: "us-east-1" }, cwd));

  clearState();
  writeMarker(cwd, changed);
  const paginatedTerminalHistory = runHelper(cwd, { PAGINATE_SUCCESS: "1" });
  assert.equal(paginatedTerminalHistory.status, 0, paginatedTerminalHistory.stderr);
  assert.match(paginatedTerminalHistory.stdout, /deployment skipped/);
  assert.equal(loggedNpxCalls().length, 0, "complete multi-page history with no newer job allows a guarded skip");

  clearState();
  writeMarker(cwd, initial);
  const edgeStarted = join(state, "edge-started");
  const cancellation = spawn(process.execPath, [helper], {
    cwd,
    env: childEnv(cwd, { BLOCK_EDGE: "1", EDGE_STARTED: edgeStarted }),
    detached: true,
    stdio: "ignore",
  });
  for (let attempt = 0; attempt < 100 && !existsSync(edgeStarted); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.equal(existsSync(edgeStarted), true, "edge deployment began");
  assert.equal(JSON.parse(readFileSync(markerPath, "utf8")).schemaVersion, 0);
  process.kill(-cancellation.pid, "SIGTERM");
  await new Promise((resolve) => cancellation.once("close", resolve));
  assert.equal(JSON.parse(readFileSync(markerPath, "utf8")).schemaVersion, 0);

  clearState();
  const buildSpec = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "amplify.yml"), "utf8");
  const outputGate = buildSpec.split("\n").map((line) => line.trim()).find((line) => line.startsWith("- npx ampx generate outputs"));
  assert.ok(outputGate, "buildspec contains output generation before publication");
  const outputFailure = spawnSync("/bin/sh", ["-c", outputGate.slice(2)], {
    cwd,
    env: childEnv(cwd, { FAIL_OUTPUTS: "1" }),
    encoding: "utf8",
  });
  assert.notEqual(outputFailure.status, 0);
  assert.deepEqual(loggedNpxCalls(), [["ampx", "generate", "outputs", "--branch", "main", "--app-id", "ds6yswxui41yi"]]);

  console.log("Conditional backend CLI regression tests passed.");
} finally {
  rmSync(repository, { recursive: true, force: true });
}
