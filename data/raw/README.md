## Vendored lookup inputs

- `FedACHdir.txt` and `fpddir.txt` are the December 2018 Federal Reserve
  directory snapshots distributed by the open-source
  [moov-io/fed](https://github.com/moov-io/fed) project.
- `bic-crosswalk.json` is derived from the public
  [lstrihic/swift-bic-codes](https://github.com/lstrihic/swift-bic-codes)
  United States list. It is reference data, not a settlement instruction.

Replace either Fed file with a newer fixed-width directory and run
`npm run build:data` to regenerate the offline index.
