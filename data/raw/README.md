## Vendored lookup inputs

- `FedACHdir.txt` and `fpddir.txt` are the December 2018 Federal Reserve
  directory snapshots distributed by the open-source
  [moov-io/fed](https://github.com/moov-io/fed) project. Leave these files
  unchanged unless you have a licensed newer fixed-width directory.
- `bic-us.json` is a compact US-only extract rebuilt by `npm run fetch:bic`.
  It is **not** the upstream bulk dump.
  - Names and BIC8s come from the monthly
    [OpenSanctions ISO 9362 BIC](https://www.opensanctions.org/datasets/iso9362_bic/)
    FollowTheMoney file (`entities.ftm.json`), filtered to BICs whose country
    code (positions 5–6) is `US`. OpenSanctions derives that dataset from
    official SWIFT/ISO 9362 PDFs and excludes branch listings.
  - GLEIF/SWIFT
    [BIC-to-LEI relationship files](https://www.gleif.org/en/lei-data/lei-mapping/download-bic-to-lei-relationship-files)
    confirm those BIC8s and contribute 11-character variants of the same BIC8.
    LEI values are stored when unique; they are **not** used to attach routing
    numbers.
- `curated-bics.json` is a small hand-maintained override list for major US
  banks. `build-data` applies it after the public extract and prefers those
  head-office codes in `data/index.json`.

Bulk OpenSanctions (~19 MB JSONL) and GLEIF zip downloads are cached under
`.cache/` and are gitignored. `npm run fetch:bic` needs network access and
the `unzip` CLI. Re-run it to refresh `bic-us.json`, then `npm run build:data`.

OpenSanctions data is free for non-commercial use; businesses need a license
(https://www.opensanctions.org/licensing/). The GLEIF mapping is subject to
the BIC/LEI Mapping Table License Agreement on the GLEIF download page.
