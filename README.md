# Routebridge

Routebridge is a bidirectional, fully offline lookup utility for US bank
identifiers. Search by SWIFT/BIC, a 9-digit ABA routing transit number, or an
institution name to see its known ACH and Fedwire capabilities.

Live site (GitHub Pages):
[https://clementpoh.github.io/swift-aba-converter/](https://clementpoh.github.io/swift-aba-converter/)

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:34917](http://localhost:34917). Lookups run in the
browser against the committed directory; results update as you type.

To refresh BIC reference data from OpenSanctions and GLEIF, then rebuild the
committed indexes:

```bash
npm run fetch:bic
npm run build:data
```

`fetch:bic` downloads the latest OpenSanctions ISO 9362 FollowTheMoney dump and
the current GLEIF BIC-to-LEI zip, then writes a compact US-only file at
`data/raw/bic-us.json`. Bulk downloads stay in `data/raw/.cache/` (gitignored).
`build:data` joins that file to the December 2018 Fed ACH/Fedwire snapshots and
regenerates `data/index.json` and `data/routing.json.gz`.

## Try these

- `BOFAUS3N` — Bank of America BIC
- `CHASUS33` — JPMorgan Chase BIC
- `021000021` — Chase, New York
- `121000358` — Bank of America, California
- `wells fargo` — name search

## GitHub Pages

The app is a static Next.js export. There is no Node server and no `/api`
route at runtime: `data/routing.json.gz` and `data/index.json` are copied into
`public/data/` at build time, then searched with Fuse.js in the browser.

Push to `main` (or run the **Deploy to GitHub Pages** workflow) to publish.

1. In the GitHub repo: **Settings → Pages → Source: GitHub Actions**.
2. Pull requests run the same `GITHUB_PAGES=true npm run build` check without
   publishing. Pushes to `main` upload `out/` and deploy with
   `actions/deploy-pages`.
3. The Pages build sets `basePath` / `assetPrefix` to `/swift-aba-converter`
   so assets load from the project Pages URL.

After the first successful deploy the site is served at:

`https://clementpoh.github.io/swift-aba-converter/`

Preview the same static output locally (without the Pages base path):

```bash
npm run build
npx --yes serve out
```

To preview with the GitHub Pages prefix:

```bash
GITHUB_PAGES=true npm run build
```

The HTML and `/_next` assets will be rooted at `/swift-aba-converter/`.

## Offline data

The application does not send search queries to a server. It downloads the
committed snapshot once, then matches BIC, ABA routing numbers, and names
locally.

- ABA/ACH and Fedwire participant data comes from the December 2018 Federal
  Reserve snapshots preserved by
  [moov-io/fed](https://github.com/moov-io/fed). The Federal Reserve stopped
  publicly distributing complete files in December 2018.
- BIC legal names come from the monthly
  [OpenSanctions ISO 9362 BIC](https://www.opensanctions.org/datasets/iso9362_bic/)
  reference dataset (derived from official SWIFT/ISO PDFs). This app keeps US
  BICs (ISO country code `US` in positions 5–6) and links them to routing
  institutions by normalized legal name. OpenSanctions omits branch-level
  BIC11s; head-office BIC8 / `XXX` forms are indexed.
- Where a BIC appears in the monthly
  [GLEIF/SWIFT BIC-to-LEI relationship file](https://www.gleif.org/en/lei-data/lei-mapping/download-bic-to-lei-relationship-files),
  the same BIC8 family is treated as confirmed and any 11-character GLEIF
  variant of that BIC8 is kept. LEI codes are not used to invent ABA links.
- `data/raw/curated-bics.json` still overrides major-bank head-office codes
  when the name match is ambiguous.

The generated snapshot contains roughly 19,000 valid routing numbers. BIC
coverage is the count of US codes that fuzzy-match a Fed legal name, plus
curated overrides — not a complete SWIFT directory. Replace
`data/raw/FedACHdir.txt` and `data/raw/fpddir.txt` with licensed, current
fixed-width files to refresh routing data. Re-run `npm run fetch:bic` to
refresh BIC names.

### Licensing and attribution

- **Federal Reserve / moov-io/fed** — historical public ACH and Fedwire
  participant files, December 2018.
- **OpenSanctions ISO 9362 BIC** — free for non-commercial use. Businesses
  must obtain a [data license](https://www.opensanctions.org/licensing/) from
  OpenSanctions. This public GitHub Pages reference app uses the dataset
  under that non-commercial terms.
- **GLEIF/SWIFT BIC-to-LEI mapping** — published monthly as an open
  relationship file. Use is subject to the
  [BIC/LEI Mapping Table License Agreement](https://www.gleif.org/en/lei-data/lei-mapping/download-bic-to-lei-relationship-files).
  SWIFT © and database rights in the mapping table (see the GLEIF file date,
  currently August 2026). All rights reserved. The mapping table was developed
  by SWIFT.

## Important limitation

This is a reference and discovery tool, **not a source of production
settlement instructions**. The routing snapshot is historical, name-based BIC
linkage can be incomplete, OpenSanctions BIC data is not licensed for
unlicensed commercial screening products, and mergers or renumbering after
2018 are not represented. Always verify the exact ACH, wire, and SWIFT
instructions with the receiving financial institution before sending funds.
