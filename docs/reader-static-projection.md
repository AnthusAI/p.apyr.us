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

The Amplify reader app `ds6yswxui41yi` (`main.ds6yswxui41yi.amplifyapp.com`) still serves the old reader at `/`, the items keep their legacy deck and byline columns, and `papyrus-reader-edge` (the old viewer-request function) is still in the stack. To go back: update `papyrus-edge-p-apyr-us` with the template as it was before the edge change (`git show 4a5f036:infra/edge/p-apyr-us-edge.yaml`; it has no bucket or key-value store parameters, so leave them out), which points `ReaderDistribution` back at the Amplify origin. Create a change set, read it (expect Modify on `ReaderDistribution` and removal of the site function and OAC), execute it, then invalidate `/*` on `E2EM0JLBC2W9WW`. Aliases, certificate and DNS never moved. The Amplify build runs `papyrus-infra deploy-edge` on every `main` build, so revert `infra/edge/p-apyr-us-edge.yaml` and `amplify.yml` on `main` in the same change, or the next build re-applies the static edge.

Cutover record (2026-10-21): change set `reader-static-projection-2` (Modify `ReaderDistribution`, Add the site OAC and function, no replacement); 162 polls every 2 seconds of `/`, two old `/articles/` URLs and `/robots.txt` through the change returned 200 every time; one `/*` invalidation afterwards.

## Leftovers

- `papyrus-reader-edge` stays in the stack until the Amplify reader is retired; the new function carries the `/newsroom` redirect.
- The Amplify reader app is retired by hand after a quiet week.
