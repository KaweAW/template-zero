# Template Zero

An ultra-fast, multilingual website plus QR table menu for restaurants, bars and cafes.
Built with Next.js 15 (App Router, strict TypeScript), Tailwind CSS 4, next-intl, React Hook Form + Zod,
Resend and Vercel. The demo client is **Trattoria da Marco, Munich** (languages: de, en, it, fr).

> Source-available under the [PolyForm Noncommercial 1.0.0](LICENSE) licence. See [Licence](#licence).

Everything that differs between clients lives in `data/` (JSON) and `public/images/`. You should not
need to touch code for a normal client.

Related docs:

- [`docs/decisions.md`](docs/decisions.md): what was built, what deviates from the brief, measured numbers, open points.
- [`docs/delivery-checklist.md`](docs/delivery-checklist.md): tick-list to run for every client before launch.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000 (redirects to the visitor's language)
```

Without `RESEND_API_KEY` the booking form runs in dry-run mode in development: the request is
logged to the console and the guest sees the success screen.

## Commands

| Command                | What it does                                                            |
| ---------------------- | ----------------------------------------------------------------------- |
| `npm run dev`          | Dev server (Turbopack)                                                  |
| `npm run build`        | Production build (all pages are static)                                 |
| `npm run start`        | Serve the production build                                              |
| `npm run validate`     | Validate all `data/*.json` files, translations, colour contrast, images |
| `npm run typecheck`    | `tsc --noEmit`                                                          |
| `npm run lint`         | ESLint                                                                  |
| `npm run test:unit`    | Unit tests (opening-hours logic, reservation validation)                |
| `npm run test:e2e`     | Playwright tests (needs `npx playwright install chromium` once)         |
| `npm run qr`           | Generate the menu QR code to `public/qr/menu.svg` and `menu.png`        |
| `npm run placeholders` | Regenerate the demo placeholder images (replace them with real photos)  |
| `npm run analyze`      | Bundle analyzer                                                         |
| `npm run predeploy`    | validate + typecheck + lint + unit tests + build                        |

## Project structure

```
data/                 Per-client content (the only place you normally edit)
  config.json         Name, colours, hours, contact, locales, reservation rules, features
  content.<lang>.json Page copy per language (hero, about, SEO descriptions...)
  menu.json           Menu structure: categories, prices, allergens, diet tags, images
  menu.<lang>.json    Dish names and descriptions per language
  case-study.json     Illustrative sample data for the case-study page (demo only)
messages/<lang>.json  UI strings (buttons, labels, form messages)
messages/errors.json  Error and 404 texts (all languages, loaded without a provider)
i18n/                 Routing, localised pathnames, request config
lib/                  Schemas (Zod), hours logic, reservation slots, SEO, JSON-LD
components/           UI, layout, home, menu, forms, contact, seo
app/                  Routes, server action (actions/reserve.ts), sitemap, robots
scripts/              validate, QR, placeholder generator
tests/                unit and e2e
```

## New client in 8 steps

1. **Create a repo** from this template (one repository per client).
2. **`data/config.json`**: name, type (`restaurant`, `bar`, `cafe`), `siteUrl`, address, phone, email,
   WhatsApp, colours, opening hours, time zone, languages and `defaultLocale`, reservation rules.
3. **`data/content.<lang>.json`**: hero text, about text, SEO descriptions for each active language.
4. **`data/menu.json`** (structure, prices, allergens, tags) and **`data/menu.<lang>.json`** (names and
   descriptions). A missing translation falls back to the default language and shows up in `npm run validate`.
5. **Images**: put real photos in `public/images/`, then update `images.hero`, `images.og` and each dish `image`.
   Delete the demo images you do not use.
6. **Switch off demo features**: `features.caseStudy: false`; fill `legal.imprintUrl` and `legal.privacyUrl`.
7. **`npm run validate`** until it shows 0 errors, then **`npm run build && npm run start`** and click through it.
8. **Deploy to Vercel** (see below), set the real `siteUrl`, redeploy, run **`npm run qr`**, print the QR code.

Then walk through [`docs/delivery-checklist.md`](docs/delivery-checklist.md).

## Update the menu (under a minute)

Edit `data/menu.json` (prices, availability, allergens) and the matching `data/menu.<lang>.json`
(texts), commit and push. Vercel rebuilds and the change is live in about a minute. The QR code never
changes, because it points to the stable URL `/menu?src=qr`, which redirects to the visitor's language.

## Add a language

1. Add the code to `SUPPORTED_LOCALES` and `LANGUAGE_NAMES` in `lib/constants.ts`.
2. Copy `messages/en.json` to `messages/<lang>.json` and translate it.
3. Add the language to `messages/errors.json`.
4. Copy `data/content.en.json` to `data/content.<lang>.json` and translate it.
5. Copy `data/menu.en.json` to `data/menu.<lang>.json` and translate it.
6. Add the localised paths for the new language in `i18n/pathnames.ts`.
7. Add its Open Graph locale (for example `nl: 'nl_NL'`) in `lib/seo.ts`.
8. Add the code to `locales` in `data/config.json`, then run `npm run validate` and `npm run typecheck`.
   TypeScript points at anything you forgot.

## Reservations

Two modes, set in `config.reservation.mode`: `email`, `whatsapp` or `both`.

- **Email**: the form calls a Server Action (`app/actions/reserve.ts`). It checks a honeypot, re-validates
  the slot against the opening hours, then sends the request to the restaurant through Resend. The guest
  can get a receipt copy.
- **WhatsApp**: a deep link with a pre-filled message (needs `contact.whatsapp` in international format).

Environment variables (see `.env.example`):

| Variable                   | Purpose                                                                   |
| -------------------------- | ------------------------------------------------------------------------- |
| `RESEND_API_KEY`           | Resend API key                                                            |
| `RESERVATION_FROM_EMAIL`   | Sender, on a domain verified in Resend (SPF and DKIM)                     |
| `RESERVATION_TO_EMAIL`     | Where requests arrive (defaults to `contact.email`)                       |
| `RESERVATION_DRY_RUN`      | `true` logs instead of sending. Tests only. **Never set on a live site.** |
| `UPSTASH_REDIS_REST_URL`   | Optional. Redis for shared rate-limit counters (see below)                |
| `UPSTASH_REDIS_REST_TOKEN` | Optional. Token for the Redis above                                       |

In production without `RESEND_API_KEY` the form returns an error, so a booking is never lost silently.

### Abuse protection

The form can send email, so it is rate limited (`lib/rate-limit.ts`): 5 requests per visitor per 10
minutes, and for guest receipts 2 per recipient address per hour and 50 per hour for the whole site.
Limits only count requests that passed validation, and never apply in dry-run. IP addresses and emails
are hashed before they are stored.

On a live site, set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (a free Upstash database is
enough) so the counters are shared by every serverless instance. Without them an in-memory fallback is
used: it slows a simple script down, but each server instance counts on its own. Set
`reservation.sendCustomerConfirmation` to `false` if you do not want receipts sent at all.

## Deploy on Vercel

1. Import the repository, framework preset Next.js, region close to the client.
2. Add the environment variables above (Production).
3. Add the domain, check HTTPS, and make sure `siteUrl` in `config.json` matches it. Redeploy.
4. Check `/sitemap.xml` and `/robots.txt`, then submit the sitemap in Google Search Console.

Analytics: `analytics.vercel` enables Vercel Analytics (rendered only on Vercel builds, to avoid a 404 on other hosts); `analytics.plausibleDomain` enables Plausible.
Neither uses cookies, so no consent banner is needed for them.

## QR codes

`npm run qr` writes `public/qr/menu.svg` and `public/qr/menu.png` for `<siteUrl>/menu?src=qr`.
Run it after the real domain is set. Print at least 2.5 x 2.5 cm, high contrast, with the white border,
on a matt surface. Details are in the checklist.

## Check before you show it to anyone

Already done on the demo (2026-10-05): unit tests (22), e2e tests (24 on mobile and desktop),
Lighthouse mobile on `/de` (98 / 100 / 100 / 100 once `siteUrl` matches the tested host; see
`docs/decisions.md`). Still to do for **every** client:

1. `npm run test:e2e` (first time: `npx playwright install chromium`).
2. Lighthouse on mobile for `/<lang>` and `/<lang>/menu` (target 95+ in all four categories). Test with
   `siteUrl` set to the tested host, otherwise the `canonical` audit fails. Then PageSpeed Insights on the
   deployed site (LCP < 1.5 s, INP < 150 ms, CLS < 0.05). The demo's lab LCP was 2.4 s.
3. A real booking sent through Resend, including the guest receipt.
4. A visual pass on a real phone (iOS Safari and Android Chrome).

## Performance notes

- All pages are statically generated; there is no client-side translation provider.
- Fonts are self-hosted (`next/font/local`), images use AVIF/WebP, the map loads only after a click.
- Measured gzipped JS per route: home 111.5 KB, menu 108.7 KB, contact 103.1 KB, case study 101.5 KB,
  reserve 124.8 KB (React Hook Form + Zod are required for the form; the lighter alternative is in
  `docs/decisions.md`).
- Look at `npm run analyze` before adding any dependency.

## Case-study page

`/case-study` uses **illustrative sample data** (`illustrative: true`), shows a visible notice, is `noindex`
and contains no invented testimonials. Replace it with real numbers from a real client, or turn it off with
`features.caseStudy: false`.

## Licence

Template Zero is released under the [PolyForm Noncommercial License 1.0.0](LICENSE).
It is **source-available**, not open source in the OSI sense.

You may read, run, modify and share the code for noncommercial purposes: personal projects,
learning, research, evaluation, teaching, and use by charitable, educational or public-interest
organisations, as defined in the licence text.

You may **not** use it commercially without a separate agreement. In particular, building or
operating a website for a paying client, or reselling or hosting the template as a product or
service, needs a commercial licence.

**Commercial licensing:** kawe.longon@gmail.com

Bundled fonts and other third-party material keep their own licences, see
[`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
