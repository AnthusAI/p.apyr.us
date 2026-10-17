# p.apyr.us

The Papyrus product site and newspaper. The routes below describe the current combined deployment.

## Marketing/publication separation plan

The agreed destination is **p.apyr.us for marketing**, with source in private `AnthusAI/Papyrus-web`, and **read.p.apyr.us for this open publication**. This repository remains public and retains the publication configuration/content, backend integration and history. Shared CMS/renderer/backend code belongs in `AnthusAI/Papyrus`. No content or source is relocated by this documentation update.

Marketing must use actual hosted Papyrus CMS/browser editing and real Markus rendering to S3. Committed Markdown rendering alone does not meet that requirement. The marketing CMS hostname has not been chosen. The reader path on the new publication host (`/information` or `/`) also remains to be decided.

Verified 2026-10-17: this repository’s main is `5b29af6` (footer PR18), following pricing [PR19](https://github.com/AnthusAI/p.apyr.us/pull/19) at `30ba4d2`; publication Amplify `ds6yswxui41yi` job19 succeeded at `5b29af6`. CloudFront `E2QW8WOFWQT0H4` still serves p.apyr.us/apyr.us from that app. No read.p.apyr.us DNS record was returned in the inspected zone. Preserve current pricing, content, backend and auth while the split is reviewed.

Private marketing delivery currently uses AWS-owned main-triggered Amplify, without GitHub Actions minutes; draft [Papyrus-web PR6](https://github.com/AnthusAI/Papyrus-web/pull/6) proposes CodePipeline and is not provisioned. Routine code merges must deploy without an agent AWS login. Public projects may use GitHub Actions CI with AWS CD. Production/default is `main`; preserve existing `develop` promotion conventions where present.

Before cutover: prove hosted draft save/reload/preview/publish and authorization; decide the reader URL path; review TLS/DNS, redirects, canonical/media links, callback/logout/revalidation settings and rollback. This update authorizes no implementation, deployment, migration, IAM, credential, deletion or DNS work.

Private-source collaborators: start at the [canonical handoff](https://github.com/AnthusAI/Papyrus-web/blob/chore/kanbus-reconciliation-20261016/docs/marketing-publication-handoff.md) and [planning PR3](https://github.com/AnthusAI/Papyrus-web/pull/3), with Kanbus `papw-100008` and `papw-b7a5a65a-a5fe-4e08-92c5-dccf4927dd68`. These are draft review-branch records, not claims that the plan is implemented. This repository has no Kanbus project; related product-board PPY records preserve the earlier combined-site plan as history.

## Current routes

- `/` is the marketing site: what Papyrus is, the four-tier pricing ladder, and no wait-list form yet (hidden behind `SHOW_WAITLIST` in `components/marketing/MarketingPage.tsx` until a real waitlist system exists).
- `/information` is the newspaper (Information about information systems), mounted by `readerBasePath` in `papyrus.config.ts`.
- `/newsroom` is the staff newsroom app.
- Old newspaper paths (`/YYYY/<month>/DD...`, `/articles/<slug>`, `/archive`, `/settings`) redirect permanently to `/information/...`. The rules live in `legacyRedirects.mjs`.

This repository is the publication. The application is the published [`@anthusai/papyrus`](https://www.npmjs.com/package/@anthusai/papyrus) package, pinned in `package.json` and `infra/site.json`. See [`AGENTS.md`](AGENTS.md) for the layout and the workflow.

```bash
npm ci
npm test
npm run dev
```

Building needs a generated `amplify_outputs.json` (gitignored) from a deployed backend.

Built by [Anthus AI Solutions](https://anth.us).
