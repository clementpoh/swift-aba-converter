# Routebridge

Routebridge is a bidirectional, fully offline lookup utility for US bank
identifiers. Search by SWIFT/BIC, a 9-digit ABA routing transit number, or an
institution name to see its known ACH and Fedwire capabilities.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:34917](http://localhost:34917).

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

## Offline data

The application makes no runtime network requests except to its own Next.js
lookup route. `data/routing.json.gz` and `data/index.json` are generated and
committed with the app.

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
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
