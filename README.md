# p.apyr.us

The Papyrus product site and newspaper.

- `/` is the marketing site: what Papyrus is, the four-tier pricing ladder, and no wait-list form yet (hidden behind `SHOW_WAITLIST` in `components/marketing/MarketingPage.tsx` until a real waitlist system exists).
- `read.p.apyr.us` is the newspaper (Information about information systems), a plain stream with editions off, served by the same app and chosen by host in `app/page.tsx`.
- `/newsroom` is the staff newsroom app.

This repository is the publication. The application is the published [`@anthusai/papyrus`](https://www.npmjs.com/package/@anthusai/papyrus) package, pinned in `package.json` and `infra/site.json`. See [`AGENTS.md`](AGENTS.md) for the layout and the workflow.

```bash
npm ci
npm test
npm run dev
```

Building needs a generated `amplify_outputs.json` (gitignored) from a deployed backend.

## Publication doctrine

`corpora/papyrus-publication-doctrine.yml` mirrors the production doctrine records edited at `/newsroom/administration/policies`. Ryan approved it on 2026-10-21. It is the doctrine the relevance classifier criteria derive from. Nothing in the build reads this file; it is here for version control.

Built by [Anthus AI Solutions](https://anth.us).
