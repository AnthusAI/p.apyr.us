import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const APP_ID = "ds6yswxui41yi";
export const ACCOUNT_ID = "712236451410";
export const REGION = "us-east-1";
export const MARKER_NAME = "/papyrus/amplify/ds6yswxui41yi/main/backend-deploy-marker";
export const MARKER_VERSION = 1;

const frontendOnlyPaths = new Set(["app/page.tsx"]);
const knownBuildCachePaths = new Set([".next/", ".npm/", "node_modules/"]);

export function isFrontendOnlyPath(path) {
  return frontendOnlyPaths.has(path) || path.startsWith("components/marketing/");
}

export function workspaceInputsAreKnown(cwd = process.cwd()) {
  try {
    const status = execFileSync("git", ["status", "--porcelain=v1", "-z", "--untracked-files=all", "--ignored=matching"], {
      encoding: "buffer",
      stdio: ["ignore", "pipe", "pipe"],
      cwd,
    }).toString("utf8");
    for (const entry of status.split("\0")) {
      if (!entry) continue;
      const state = entry.slice(0, 2);
      const path = entry.slice(3);
      if (state === "!!" && (knownBuildCachePaths.has(path) || path === "amplify_outputs.json")) continue;
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function hashDirectory(hash, directory, root = directory) {
  for (const name of readdirSync(directory).sort()) {
    const path = join(directory, name);
    const pathFromRoot = relative(root, path).split(sep).join("/");
    const stat = lstatSync(path);
    hash.update(pathFromRoot);
    hash.update("\0");
    if (stat.isSymbolicLink()) {
      hash.update("symlink\0");
      hash.update(readFileSync(path, "utf8"));
      hash.update("\0");
    } else if (stat.isDirectory()) {
      hash.update("directory\0");
      hashDirectory(hash, path, root);
    } else if (stat.isFile()) {
      hash.update("file\0");
      hash.update(readFileSync(path));
      hash.update("\0");
    } else {
      throw new Error(`Unsupported installed package input: ${pathFromRoot}`);
    }
  }
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
    .filter(([name]) => name.startsWith("PAPYRUS_") || ["SITE_ENV", "AMPLIFY_SSM_ENV_CONFIG", "NEXT_PUBLIC_PAPYRUS_SITE_BRAND"].includes(name))
    .sort(([left], [right]) => left.localeCompare(right))) {
    hash.update(name);
    hash.update("\0");
    hash.update(value);
    hash.update("\0");
  }

  hash.update(`runtime\0${process.version}\0${process.platform}\0${process.arch}\0${env.npm_config_user_agent ?? ""}\0${env.AWS_REGION ?? ""}\0`);
  const outputsPath = join(cwd, "amplify_outputs.json");
  if (existsSync(outputsPath)) {
    hash.update("amplify_outputs.json\0");
    hash.update(readFileSync(outputsPath));
    hash.update("\0");
  } else {
    hash.update("amplify_outputs.json\0missing\0");
  }

  const papyrusPackage = join(cwd, "node_modules/@anthusai/papyrus");
  if (!existsSync(papyrusPackage) || !lstatSync(papyrusPackage).isDirectory()) {
    throw new Error("Installed Papyrus package is unavailable for fingerprinting");
  }
  hashDirectory(hash, papyrusPackage, papyrusPackage);

  return hash.digest("hex");
}

export function makeMarker({ fingerprint, commit, jobId, jobStartTime }) {
  return {
    schemaVersion: MARKER_VERSION,
    accountId: ACCOUNT_ID,
    appId: APP_ID,
    branch: "main",
    backendFingerprint: fingerprint,
    commit,
    jobId: normalizeJobId(jobId),
    jobStartTime,
  };
}

export function normalizeJobId(jobId) {
  const value = String(jobId ?? "");
  return /^\d+$/.test(value) ? value.replace(/^0+(?=\d)/, "") : value;
}

function sameJobId(left, right) {
  return normalizeJobId(left) === normalizeJobId(right);
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
      typeof marker.jobId === "string" &&
      Number.isFinite(marker.jobStartTime) &&
      marker.jobStartTime > 0 &&
      typeof commit === "string" &&
      /^[a-f0-9]{40,64}$/.test(commit);
    if (!validIdentity) return false;
    execFileSync("git", ["merge-base", "--is-ancestor", marker.commit, commit], { stdio: "ignore", cwd });
    return true;
  } catch {
    return false;
  }
}

export function jobsAllowSkip({ markerValue, currentJobId, jobs, hasMoreJobs = false }) {
  if (!currentJobId || hasMoreJobs || !Array.isArray(jobs)) return false;
  let marker;
  try {
    marker = typeof markerValue === "string" ? JSON.parse(markerValue) : markerValue;
  } catch {
    return false;
  }
  if (!marker?.jobId || !Number.isFinite(marker.jobStartTime)) return false;
  let currentJobFound = false;
  let markerJobFound = false;
  const terminalStates = new Set(["SUCCEED", "FAILED", "CANCELLED"]);
  const toEpoch = (value) => typeof value === "number" ? value : Date.parse(value);

  for (const job of jobs) {
    const jobStartTime = toEpoch(job?.startTime);
    if (!job?.jobId || !job?.status || !Number.isFinite(jobStartTime)) return false;
    if (sameJobId(job.jobId, currentJobId)) {
      if (job.status !== "RUNNING") return false;
      currentJobFound = true;
    } else if (sameJobId(job.jobId, marker.jobId)) {
      if (job.status !== "SUCCEED" || jobStartTime !== marker.jobStartTime) return false;
      markerJobFound = true;
    } else if (!terminalStates.has(job.status)) {
      return false;
    } else if (jobStartTime >= marker.jobStartTime) {
      return false;
    }
  }

  return currentJobFound && markerJobFound;
}

export function canSkipBackend({ markerValue, fingerprint, commit, currentJobId, jobs, hasMoreJobs = false, cwd = process.cwd() }) {
  return Boolean(markerValue) &&
    isMatchingMarker(markerValue, { fingerprint, commit }, cwd) &&
    jobsAllowSkip({ markerValue, currentJobId, jobs, hasMoreJobs });
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

function listMainJobs() {
  const allJobs = [];
  const seenTokens = new Set();
  let nextToken;

  for (let page = 0; page < 100; page += 1) {
    const args = [
      "amplify", "list-jobs", "--no-paginate", "--app-id", APP_ID, "--branch-name", "main",
      "--region", REGION, "--max-results", "50", "--output", "json",
    ];
    if (nextToken) args.push("--next-token", nextToken);
    const output = runAws(args, { allowFailure: true });
    if (!output) return null;

    let response;
    try {
      response = JSON.parse(output);
    } catch {
      return null;
    }
    if (!Array.isArray(response.jobSummaries)) return null;
    allJobs.push(...response.jobSummaries);
    nextToken = response.nextToken ?? response.NextToken;
    if (!nextToken) return allJobs;
    if (seenTokens.has(nextToken)) return null;
    seenTokens.add(nextToken);
  }

  return null;
}

function currentJobIsOnlyActive(jobs, currentJobId) {
  if (!Array.isArray(jobs)) return false;
  const current = jobs.find((job) => sameJobId(job?.jobId, currentJobId));
  if (!current || current.status !== "RUNNING") return false;
  return jobs.every((job) => sameJobId(job?.jobId, currentJobId) || ["SUCCEED", "FAILED", "CANCELLED"].includes(job?.status));
}

function mainJobsAreSerialized(currentJobId) {
  return currentJobIsOnlyActive(listMainJobs(), currentJobId);
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

function invalidateMarker() {
  runAws([
    "ssm", "put-parameter", "--name", MARKER_NAME, "--type", "String", "--overwrite",
    "--value", JSON.stringify({ schemaVersion: 0, invalidated: true }), "--region", REGION,
  ]);
}

function deployMainBackend({ fingerprint, commit, jobId, jobStartTime } = {}) {
  invalidateMarker();
  deployBackend();
  if (fingerprint && commit && jobId && jobStartTime) writeMarker(makeMarker({ fingerprint, commit, jobId, jobStartTime }));
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

  if (!mainJobsAreSerialized(env.AWS_JOB_ID)) {
    throw new Error("Refusing main deployment because another job is active or the complete job queue could not be verified.");
  }

  if (!env.AWS_COMMIT_ID) {
    console.log("Backend deployment required: Amplify commit identity is missing.");
    deployMainBackend();
    return "deployed";
  }

  const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  if (head !== env.AWS_COMMIT_ID) {
    console.log("Backend deployment required: checkout does not match Amplify commit.");
    deployMainBackend();
    return "deployed";
  }

  if (!workspaceInputsAreKnown()) {
    console.log("Backend deployment required: the build workspace contains unknown or modified inputs.");
    deployMainBackend();
    return "deployed";
  }

  let fingerprint;
  try {
    fingerprint = fingerprintTree(head, env);
  } catch {
    console.log("Backend deployment required: unable to calculate the tracked-input fingerprint.");
    deployMainBackend();
    return "deployed";
  }

  const priorValue = readMarker();
  const jobs = listMainJobs();
  if (canSkipBackend({
    markerValue: priorValue,
    fingerprint,
    commit: head,
    currentJobId: env.AWS_JOB_ID,
    jobs,
  })) {
    const currentJob = jobs.find((job) => sameJobId(job.jobId, env.AWS_JOB_ID));
    const currentJobStartTime = typeof currentJob.startTime === "number" ? currentJob.startTime : Date.parse(currentJob.startTime);
    try {
      writeMarker(makeMarker({ fingerprint, commit: head, jobId: env.AWS_JOB_ID, jobStartTime: currentJobStartTime }));
    } catch {
      throw new Error("Unable to advance the guarded deployment marker; refusing to publish this frontend build.");
    }
    console.log("Backend and edge deployment skipped: tracked backend inputs match the last successful deployment marker.");
    return "skipped";
  }

  console.log("Backend and edge deployment required: no valid marker matches the tracked backend inputs.");
  const currentJobs = listMainJobs();
  if (!currentJobIsOnlyActive(currentJobs, env.AWS_JOB_ID)) {
    throw new Error("Refusing main deployment because another job is active or the complete job queue could not be verified.");
  }
  const currentJob = Array.isArray(currentJobs) ? currentJobs.find((job) => sameJobId(job.jobId, env.AWS_JOB_ID)) : null;
  const currentJobStartTime = typeof currentJob?.startTime === "number" ? currentJob.startTime : Date.parse(currentJob?.startTime);
  deployMainBackend({ fingerprint, commit: head, jobId: env.AWS_JOB_ID, jobStartTime: currentJobStartTime });
  return "deployed";
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
