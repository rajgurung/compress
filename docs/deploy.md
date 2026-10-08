# Deploy

Live at https://compress.rajgurung.me (Cloudflare Pages project `compress`,
also at https://compress-el9.pages.dev).

## Deploying

Deploys are manual uploads of `dist/` with Wrangler (needs Node 22+):

```sh
npm run build
CLOUDFLARE_ACCOUNT_ID=<account id> npx wrangler pages deploy dist --project-name compress --branch main
```

`CLOUDFLARE_API_TOKEN` must allow **Account → Cloudflare Pages → Edit**. The
token in `~/.config/deploy/credentials.env` ("Claude Code Softly") has it.

## DNS

`compress.rajgurung.me` is a CNAME to `compress-el9.pages.dev`, set to
**DNS only** on purpose. When proxied, the `rajgurung.me` zone's Web Analytics
injects a beacon from `static.cloudflareinsights.com`. The CSP blocks it, but
the attempt still breaks the "no outside requests" promise and the privacy test.

## After a deploy

```sh
BASE_URL=https://compress.rajgurung.me npm run e2e
```

Runs every browser test against the live site, including the check that no
request leaves it.
