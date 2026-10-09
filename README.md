# p.apyr.us

The Papyrus product site and newspaper.

- `/` is the marketing site: what Papyrus is, the four-tier pricing ladder, and a design-only wait-list form.
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
