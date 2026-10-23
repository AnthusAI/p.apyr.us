# Backend and Amplify Hosting split

This draft moves the p.apyr.us backend and edge deployments into the public repository's GitHub Actions workflow. Amplify Hosting remains the existing SSR application and builds its frontend after backend deployment completes. The current production path stays active until the required AWS role and repository variable exist and this draft is reviewed.

## Pipeline

1. The existing CI job validates each pull request and push to `main`.
2. For a successful `main` push, `deploy-backend` reads the last successful backend commit from `/papyrus/amplify/ds6yswxui41yi/main/backend-commit` and compares it to the current commit.
3. Only `app/page.tsx` and `components/marketing/**` are allowlisted as frontend-only. Lockfiles, shared packages, `amplify/**`, `infra/**`, `papyrus.config.ts`, `web/**`, workflow files, and every unknown path require a backend deployment. Missing, invalid, unreachable, or unreadable marker state forces a backend deployment. The marker updates only after both edge and Amplify backend deployment succeed.
4. Amplify Hosting then starts the existing `RELEASE` job for the exact verified commit. Its buildspec generates `amplify_outputs.json` from the deployed branch with `ampx generate outputs`, then builds the existing Next.js SSR artifact.

The hosting build no longer runs `npm update anthus-footer` on the mutable `main` branch after `npm ci`. This step took 28.2 seconds in the measured p.apyr.us build and caused deployment dependencies to differ from the lockfile tested by GitHub CI. Update the dependency by committing a reviewed lockfile change instead.

The workflow's existing concurrency group serializes CI, backend state updates, and Amplify hosting. It permits one active and one latest pending main run; because path comparison starts from the last successful backend commit, the latest run still considers all commits not yet reflected in the marker. Failed backend deploys do not move the marker. If marker writing fails after a successful backend deployment, the next run repeats the deployment safely.

## Configuration changes outside Git

The backend configuration revision file is a guard for changes to Amplify environment settings that are not represented in Git. Increment `infra/backend-config-revision.txt` in the same reviewed change whenever a backend-affecting Amplify environment value changes. If a configuration change cannot be confidently classified, force a backend deployment. The pipeline never reads or logs environment-variable values.

## Setup required before merge

- Create a dedicated `p-apyr-us-backend-deploy` GitHub OIDC role in account `712236451410`, trusted only for `repo:AnthusAI/p.apyr.us:ref:refs/heads/main` with audience `sts.amazonaws.com` (or a protected production Environment subject with equivalent branch restrictions). GitHub's `id-token:write` is granted only to the main-branch deploy job.
- Add the nonsecret GitHub repository variable `P_APYR_BACKEND_DEPLOY_ROLE_ARN` for that role.
- Grant the backend role `ssm:GetParameter` and `ssm:PutParameter` only on `arn:aws:ssm:us-east-1:712236451410:parameter/papyrus/amplify/ds6yswxui41yi/main/backend-commit`. Deployment permissions must be derived and reviewed against the deployed CDK/CloudFormation stacks. Restrict CloudFormation to the p.apyr.us stack family, asset access to its CDK bootstrap assets, and `iam:PassRole` to a dedicated CloudFormation execution role with `iam:PassedToService=cloudformation.amazonaws.com`. Do not reuse the Amplify service role or grant broad AdministratorAccess.
- Keep hosting start/read on the existing `p-apyr-us-github-deploy` role, whose current policy is limited to `amplify:StartJob` and `amplify:GetJob` for this app's `main` jobs.
- The Amplify app's current service role is attached to `AdministratorAccess`. The shared CDK CloudFormation execution role `cdk-hnb659fds-cfn-exec-role-712236451410-us-east-1` is also attached to `AdministratorAccess`. Neither role is a safe least-privilege backend role.
- AWS documents `AmplifyBackendDeployFullAccess` as the baseline for Gen 2 branch deployments. Its current v9 policy includes wildcard Amplify metadata and AppSync actions, broad CDK toolkit role patterns, and SSM access across `/amplify/*`. Do not attach it unchanged for this production role. Derive the smaller deployment policy from the p.apyr.us stack templates and a non-production deployment review; create a dedicated per-site CloudFormation execution role instead of reusing the shared administrator execution role.
- Verify the generated IAM policy against a successful non-production deployment before production enablement. AWS currently documents the newer `ampx deploy --backend/--frontend` split as preview; this draft uses the established `ampx pipeline-deploy` command instead.

This draft does not create AWS resources or roles and must not be merged until the role policy, marker behavior, and branch workflow are reviewed. Backend deployment permissions are intentionally not included as a speculative inline policy.

## Measured expectation

One p.apyr.us run spent 233.6 seconds in `ampx pipeline-deploy`, 14.7 seconds in a no-op edge deployment, 82.9 seconds in `npm ci`, 28.2 seconds updating `anthus-footer`, and 116.0 seconds in the Next.js build. Skipping backend+edge work and the unpinned dependency update gives an observed target of about 5m01s total Amplify `BUILD` time versus 9m37s for that run, assuming other phases remain similar. Without removing the dependency update the target is about 5m29s. Neither is guaranteed. Backend changes still deploy the backend in GitHub and still require the Amplify SSR build.
