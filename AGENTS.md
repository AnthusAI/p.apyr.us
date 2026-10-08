# p.apyr.us publication

This repository holds only what is specific to the Papyrus product site and newspaper. The newsroom application, the Pretext reader, the Amplify Gen 2 backend and the deployment constructs come from the pinned `@anthusai/papyrus` package. Do not copy Papyrus application code (`app/` shims, `lib/`, `components/` from the package, `amplify/functions/`) into this repository. Fix Papyrus in the Papyrus repository and bump the pin.

## Layout

- `papyrus.config.ts`: the brand (newsprint newspaper), `readerBasePath: "/information"`, and the backend options (`defineSite`).
- `app/page.tsx`: the site-owned marketing root. `papyrus-app sync` leaves it alone.
- `components/marketing/`: marketing page, pricing tiers, design-only wait-list form, and `marketing.css`, every rule scoped under `.papyrus-marketing` so the shared Papyrus root layout styles do not leak in or out.
- `legacyRedirects.mjs`, `next.config.mjs`: permanent redirects from the old newspaper paths to `/information`.
- `features/`: Gherkin for the redirects and the marketing site. `tests/` implements them (`npm test`).
- `corpora/`: the small configuration files the reader reads at runtime.
- `amplify/`: one-line re-exports from the package.
- `infra/site.json`: the CDK app shell description (`papyrus-infra synth --site infra/site.json`).

## Workflow

1. `npm ci` then `npm run dev` (runs `papyrus-app sync`, which writes route shims that are gitignored).
2. Build against a backend with a generated `amplify_outputs.json` (gitignored): `npm run build`.
3. Changing the Papyrus version: edit the exact pin in `package.json` and `infra/site.json` together.
4. Pricing text matches chattic.us and aurit.us. Change it in `components/marketing/pricingTiers.ts` only with Ryan's approval.
5. Never commit secrets, real email addresses or `amplify_outputs.json`.

## Rules

- No line-level comments. Use long, clear names.
- Gherkin first for any behavior change.
- Do not read or write a `project/` Kanbus directory directly; use `kbs`.
