# Compress

Live at https://compress.rajgurung.me

Make PDFs and JPGs smaller, right in your browser. Your files never leave your
device: compression runs locally in WebAssembly, and the site makes no requests
anywhere but itself.

- JPG: mozjpeg via [jSquash](https://github.com/jamsinclair/jSquash).
- PDF: [Ghostscript](https://ghostscript.com) compiled to WebAssembly.

## Develop

```sh
npm install
npm run dev     # local server
npm test        # unit tests
npm run e2e     # browser tests (uses your installed Chrome)
npm run build   # production build in dist/
```

See `SPEC.md` for what this is and `TASKS.md` for the build plan.

## Licence

AGPL-3.0, because Compress ships Ghostscript. See `LICENSE`.
