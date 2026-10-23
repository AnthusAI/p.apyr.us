import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const APP_ID = "ds6yswxui41yi";
export const ACCOUNT_ID = "712236451410";
export const REGION = "us-east-1";
export const MARKER_NAME = "/papyrus/amplify/ds6yswxui41yi/main/backend-deploy-marker";
export const MARKER_VERSION = 1;

const frontendOnlyPaths = new Set(["app/page.tsx"]);

export function isFrontendOnlyPath(path) {
  return frontendOnlyPaths.has(path) || path.startsWith("components/marketing/");
}

export function fingerprintTree(commit = "HEAD", env = process.env, cwd = process.cwd()) {
  const listing = execFileSync("git", ["ls-tree", "-rz", "--full-tree", commit], {
    encoding: "buffer",
    stdio: ["ignore", "pipe", "pipe"],
    cwd,
  });
  const hash = createHash("sha256");
  hash.update("papyrus-backend-inputs-v1\0");

  for (const entry of listing.toString("utf8").split("\0")) {
    if (!entry) continue;
    const tabIndex = entry.indexOf("\t");
    if (tabIndex < 0) throw new Error("Unexpected git ls-tree record");
    const path = entry.slice(tabIndex + 1);
    if (isFrontendOnlyPath(path)) continue;
    hash.update(entry);
    hash.update("\0");
  }

  for (const [name, value] of Object.entries(env)
    .filter(([name]) => name.startsWith("PAPYRUS_") || name === "SITE_ENV")
    .sort(([left], [right]) => left.localeCompare(right))) {
    hash.update(name);
    hash.update("\0");
    hash.update(value);
    hash.update("\0");
  }

  return hash.digest("hex");
}

export function makeMarker({ fingerprint, commit }) {
  return {
    schemaVersion: MARKER_VERSION,
    accountId: ACCOUNT_ID,
    appId: APP_ID,
    branch: "main",
    backendFingerprint: fingerprint,
    commit,
  };
}

export function isMatchingMarker(value, { fingerprint, commit }, cwd = process.cwd()) {
  try {
    const marker = typeof value === "string" ? JSON.parse(value) : value;
    const validIdentity = marker?.schemaVersion === MARKER_VERSION &&
      marker.accountId === ACCOUNT_ID &&
      marker.appId === APP_ID &&
      marker.branch === "main" &&
      /^[a-f0-9]{64}$/.test(marker.backendFingerprint) &&
      marker.backendFingerprint === fingerprint &&
      typeof marker.commit === "string" &&
      /^[a-f0-9]{40,64}$/.test(marker.commit) &&
      typeof commit === "string" &&
      /^[a-f0-9]{40,64}$/.test(commit);
    if (!validIdentity) return false;
    execFileSync("git", ["merge-base", "--is-ancestor", marker.commit, commit], { stdio: "ignore", cwd });
    return true;
  } catch {
    return false;
  }
}

export function jobsAllowSkip({ currentJobId, jobs, hasMoreJobs = false }) {
  if (!currentJobId || hasMoreJobs || !Array.isArray(jobs)) return false;
  let currentJobFound = false;
  const terminalStates = new Set(["SUCCEED", "FAILED", "CANCELLED"]);

  for (const job of jobs) {
    if (!job?.jobId || !job?.status) return false;
    if (String(job.jobId) === String(currentJobId)) {
      if (job.status !== "RUNNING") return false;
      currentJobFound = true;
    } else if (!terminalStates.has(job.status)) {
      return false;
    }
  }

  return currentJobFound;
}

export function canSkipBackend({ markerValue, fingerprint, commit, currentJobId, jobs, hasMoreJobs = false, cwd = process.cwd() }) {
  return Boolean(markerValue) &&
    isMatchingMarker(markerValue, { fingerprint, commit }, cwd) &&
    jobsAllowSkip({ currentJobId, jobs, hasMoreJobs });
}

function runAws(args, { allowFailure = false } = {}) {
  const result = spawnSync("aws", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (result.error || result.status !== 0) {
    if (allowFailure) return null;
    throw new Error(`AWS CLI failed (${result.status ?? result.error?.message ?? "unknown error"})`);
  }
  return result.stdout.trim();
}

function readMarker() {
  const value = runAws([
    "ssm", "get-parameter", "--name", MARKER_NAME, "--region", REGION,
    "--query", "Parameter.Value", "--output", "text",
  ], { allowFailure: true });
  return value || null;
}

function hasOtherActiveMainJob(currentJobId) {
  const output = runAws([
    "amplify", "list-jobs", "--app-id", APP_ID, "--branch-name", "main",
    "--region", REGION, "--max-items", "100", "--output", "json",
  ], { allowFailure: true });
  if (!output) return true;

  let response;
  try {
    response = JSON.parse(output);
  } catch {
    return true;
  }
  return !jobsAllowSkip({
    currentJobId,
    jobs: response.jobSummaries,
    hasMoreJobs: Boolean(response.NextToken || response.nextToken),
  });
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with status ${result.status}`);
}

function deployBackend() {
  run("npx", [
    "papyrus-infra", "deploy-edge",
    "--stack", "papyrus-edge-p-apyr-us",
    "--template", "infra/edge/p-apyr-us-edge.yaml",
    "--adoption-template", "infra/edge/p-apyr-us-edge-adoption.yaml",
    "--adopt-resources", "infra/edge/adopt-resources.json",
    "--parameter", "ReaderCertificateArn=arn:aws:acm:us-east-1:712236451410:certificate/5daf7da4-bdc1-42fe-93c4-a4fe2f948805",
    "--parameter", "SiteBucketRegionalDomainName=amplify-ds6yswxui41yi-main-bran-sitebucket397a1860-y3dzuduvsux5.s3.us-east-1.amazonaws.com",
    "--parameter", "RedirectsKeyValueStoreArn=arn:aws:cloudfront::712236451410:key-value-store/27bad446-124c-42fd-86cd-11bf831baf97",
    "--only-branch", "main",
    "--only-app-id", APP_ID,
  ]);
  run("npx", ["ampx", "pipeline-deploy", "--branch", process.env.AWS_BRANCH, "--app-id", APP_ID]);
}

function writeMarker(marker) {
  runAws([
    "ssm", "put-parameter", "--name", MARKER_NAME, "--type", "String", "--overwrite",
    "--value", JSON.stringify(marker), "--region", REGION,
  ]);
}

export function main(env = process.env) {
  if (env.AWS_APP_ID !== APP_ID) throw new Error(`Refusing unexpected Amplify app ID: ${env.AWS_APP_ID ?? "missing"}`);
  if (!env.AWS_BRANCH) throw new Error("Refusing to deploy because Amplify branch identity is missing.");

  const account = runAws(["sts", "get-caller-identity", "--query", "Account", "--output", "text", "--region", REGION]);
  if (account !== ACCOUNT_ID) throw new Error(`Refusing unexpected AWS account: ${account}`);

  if (env.AWS_BRANCH !== "main") {
    console.log(`Backend deployment required: branch ${env.AWS_BRANCH} is not the production main branch.`);
    deployBackend();
    return "deployed";
  }

  if (!env.AWS_COMMIT_ID) {
    console.log("Backend deployment required: Amplify commit identity is missing.");
    deployBackend();
    return "deployed";
  }

  const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  if (head !== env.AWS_COMMIT_ID) {
    console.log("Backend deployment required: checkout does not match Amplify commit.");
    deployBackend();
    return "deployed";
  }

  let fingerprint;
  try {
    fingerprint = fingerprintTree(head, env);
  } catch {
    console.log("Backend deployment required: unable to calculate the tracked-input fingerprint.");
    deployBackend();
    return "deployed";
  }

  const currentJobIsConcurrent = hasOtherActiveMainJob(env.AWS_JOB_ID);
  if (currentJobIsConcurrent) {
    console.log("Backend deployment required: another main-branch job is active or concurrency could not be verified.");
    deployBackend();
    writeMarker(makeMarker({ fingerprint, commit: head }));
    return "deployed";
  }

  const priorValue = readMarker();
  if (canSkipBackend({
    markerValue: priorValue,
    fingerprint,
    commit: head,
    currentJobId: env.AWS_JOB_ID,
    jobs: [{ jobId: env.AWS_JOB_ID, status: "RUNNING" }],
  })) {
    console.log("Backend and edge deployment skipped: tracked backend inputs match the last successful deployment marker.");
    return "skipped";
  }

  console.log("Backend and edge deployment required: no valid marker matches the tracked backend inputs.");
  deployBackend();
  writeMarker(makeMarker({ fingerprint, commit: head }));
  return "deployed";
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
