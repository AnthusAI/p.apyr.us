# read.p.apyr.us: the static reader

`read.p.apyr.us` is the standard Papyrus front end: pages are written to the S3 projection bucket by the CMS backend (`backend.publication` in `papyrus.config.ts`) and served by CloudFront distribution `E2EM0JLBC2W9WW` (stack `papyrus-edge-p-apyr-us`, resource `ReaderDistribution`). The newsroom stays on Amplify SSR at `p.apyr.us/newsroom`; the reader redirects any `/newsroom*` request there.

## What the site owns

- `web/projection.json`: settings (two sections, `Papyrus` at `/papyrus/` and `Newsroom How-To` at `/how-to/`, nav, feeds, sitemap).
- `web/css/site-theme.css`: the dark newsprint look of the old reader.
- Editorial values (title, description, author, date, aliases) are item front matter in the CMS. `bin/front_matter_migration.py` wrote them from the legacy deck and byline columns on 2026-10-21 (columns kept, so the Amplify reader still renders).

## URL shapes

The old reader served `/articles/<slug>`. Each is now a 301 to `/<section base>/<slug>/` through the redirects key-value store (an alias on each item). The old `/?section=<name>` filters are gone; the section listings are `/papyrus/` and `/how-to/`.

## Operations

`papyrus ops content project --all` re-renders the site (the backend deploy does this itself). One `/*` invalidation per full render.

## Rollback

The Amplify reader app `ds6yswxui41yi` (`main.ds6yswxui41yi.amplifyapp.com`) still serves the old reader at `/`, and the items keep their legacy columns. To go back: update `papyrus-edge-p-apyr-us` with the previous template (`git show <commit before the edge PR>:infra/edge/p-apyr-us-edge.yaml`), which points `ReaderDistribution` back at the Amplify origin; the aliases, certificate and DNS never moved. Then invalidate `/*` on the distribution.
