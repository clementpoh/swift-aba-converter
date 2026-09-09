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

To rebuild the committed indexes after replacing the raw source files:

```bash
npm run build:data
```

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
2. The workflow `.github/workflows/pages.yml` runs `GITHUB_PAGES=true npm run build`,
   which sets `basePath` / `assetPrefix` to `/swift-aba-converter` so assets
   load from the project Pages URL.
3. The `out/` directory is uploaded and deployed with `actions/deploy-pages`.

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
- BIC reference names come from the public
  [lstrihic/swift-bic-codes](https://github.com/lstrihic/swift-bic-codes)
  US directory and are linked to routing institutions by normalized legal
  name. Branch BICs are included where a confident institution-name match
  exists.

The generated snapshot contains roughly 19,000 valid routing numbers and
10,000 matched US BIC records. Replace `data/raw/FedACHdir.txt` and
`data/raw/fpddir.txt` with licensed, current fixed-width files to refresh
routing data.

## Important limitation

This is a reference and discovery tool, **not a source of production
settlement instructions**. The routing snapshot is historical, name-based BIC
linkage can be incomplete, and mergers or renumbering after 2018 are not
represented. Always verify the exact ACH, wire, and SWIFT instructions with
the receiving financial institution before sending funds.
