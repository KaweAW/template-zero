# Decision log

This file records what Template Zero contains, why it is built the way it is, and where it differs
from the original specification. It states trade-offs plainly, including what has **not** been
verified.

Version 1.1, last updated 8 October 2026.

---

## 1. Status at a glance

| Area                                 | State                                                                   |
| ------------------------------------ | ----------------------------------------------------------------------- |
| Scaffold, config system, 4 languages | Done. `next build` passes, 25 static pages.                             |
| Pages: home, menu, reserve, contact  | Done, plus a sales-demo `case-study` page.                              |
| Demo "Trattoria da Marco, Munich"    | Done, in de / en / it / fr.                                             |
| Unit tests                           | 29 tests, all passing (`npm run test:unit`).                            |
| End-to-end tests (Playwright)        | 24 / 24 passing (12 tests x mobile and desktop), last run 2026-10-05.   |
| Content validation, QR generation    | Done (`npm run validate`, `npm run qr`).                                |
| Lighthouse                           | Measured on 2026-10-05, see section 3.                                  |
| Visual check on real devices         | **Not done.** Only a desktop-browser Lighthouse screenshot was seen.    |
| Booking emails through Resend        | Code complete, **never run against a real API key.**                    |
| Rate limiting of the booking form    | Implemented (decision 4.6). Redis backend not yet tried on a live site. |
| Licence                              | PolyForm Noncommercial 1.0.0 (decision 4.13).                           |

Still open before showing the template to a prospect: a visual pass on a real phone, one real send
through Resend, and PageSpeed Insights on a deployed site (commands are in the README).

---

## 2. Differences from the original specification

| Specification said                                    | Implemented                                                                                                | Why                                                                                                                                                                     |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Folders `prenota/`, `contatti/`                       | `reserve/`, `contact/`, with **localised URLs** (`/de/reservieren`, `/it/prenota`, ...)                    | A German guest should not see Italian paths, and localised URLs help local SEO. Defined in `i18n/pathnames.ts`.                                                         |
| `app/api/prenotazione/route.ts` _or_ a Server Action  | Server Action only (`app/actions/reserve.ts`)                                                              | One mechanism is enough. No public endpoint to protect.                                                                                                                 |
| `data/menu.<lang>.json` with the full menu            | `data/menu.json` holds structure, **prices**, tags, allergens, images. `menu.<lang>.json` holds only words | Prices exist once. With 4 full copies, changing one price means editing 4 files and risking a mismatch. This is what makes "update the menu in < 60 seconds" realistic. |
| `components/ui` = shadcn with Radix                   | shadcn-style components (CVA) **without installing Radix**. `components.json` is there                     | No component needs Radix yet (no dialog, no dropdown). `npx shadcn add dialog` will pull it in when needed.                                                             |
| Framer Motion "only where needed"                     | Not installed. One CSS animation on the hero text                                                          | Nothing needed it, and it would cost bundle size.                                                                                                                       |
| Font: Inter + Playfair or Instrument Serif            | Inter + **Instrument Serif**, both **self-hosted** from `app/fonts/`                                       | No request to Google (privacy, relevant in Germany), no download at build time, deterministic builds.                                                                   |
| Client copy in `messages/`                            | Client-specific copy lives in `data/content.<lang>.json`; `messages/` is template UI text only             | Clean rule for a new client: **edit `data/` and `public/`, never `messages/`** (unless adding a language).                                                              |
| next-intl                                             | next-intl used **on the server only**, no client provider                                                  | See decision 4.3.                                                                                                                                                       |
| "Case Study page with invented but realistic metrics" | Built, but marked as sample data (see decision 4.9)                                                        | Showing invented figures to prospects as real results is a legal risk in the EU.                                                                                        |

---

## 3. Performance: what was measured and what was not

### Bundle size

Gzipped JavaScript a first visit downloads, from the production build, including the roughly
100 KB that Next.js and React themselves cost:

| Route              | JS (gzip)    | Target < 120 KB |
| ------------------ | ------------ | --------------- |
| Home               | 111.5 KB     | yes             |
| Menu (the QR page) | 108.7 KB     | yes             |
| Contact            | 103.1 KB     | yes             |
| Case study         | 101.5 KB     | yes             |
| **Reserve**        | **124.8 KB** | **no, +5 KB**   |

How the numbers were brought down (they started at 120 / 120 / 114 / 153 KB):

- Removed `tailwind-merge` (it shipped 8 KB gzipped to every page). `cn()` is plain `clsx`.
- Stopped importing next-intl's navigation helpers from server components (they pulled next-intl
  client code into every page).
- Switched the reservation schema to `zod/mini`: the reserve page went from 153 KB to 125 KB.

### The reserve page is over budget

The specification asks for both "React Hook Form + Zod" and "< 120 KB JS". React Hook Form alone is
about 10 KB gzipped and Zod about 8 KB, on top of the 100 KB baseline. Both targets can only be met
with a different approach:

1. **Keep the current implementation** (the present state). 125 KB on the one page that is not a
   landing page did not prevent a Lighthouse mobile score of 95+ on the home page; the reserve page
   itself has not been measured.
2. **Drop React Hook Form**: a plain `<form action>` with `useActionState` and validation only on the
   server. About 112 KB and works without JavaScript, but loses instant inline errors. It is a
   one-file change in `components/forms/ReservationForm.tsx`.

### Lighthouse results

Lighthouse 13, mobile preset, local production build, 2026-10-05, page `/de`:

| Category       | Score                         |
| -------------- | ----------------------------- |
| Performance    | 98                            |
| Accessibility  | 100                           |
| Best Practices | 96 -> 100 after the fix below |
| SEO            | 92 -> 100 after the fix below |

Lab metrics on `/de`: FCP 0.8 s, Speed Index 0.8 s, TBT 50 ms, CLS 0, **LCP 2.4 s**. The LCP target
(< 1.5 s) is **not met in the lab**. Lighthouse simulates slow 4G and a 4x slower CPU, and the LCP
element is the hero image (breakdown: TTFB 458 ms, load delay 694 ms, load time 204 ms, render
delay 1048 ms). Field numbers on Vercel (CDN, cached optimised image) will differ: measure with
PageSpeed Insights after the first deploy before quoting any figure to a client.

Two failures were artefacts of testing on `localhost`, not bugs:

- **SEO `canonical`**: canonical and hreflang URLs are built from `siteUrl`
  (`https://trattoria-da-marco.example` in the demo). Lighthouse compares them with the page it is
  testing on `localhost`. With `siteUrl` temporarily set to `http://localhost:3000` the audit passes,
  and it passes on a real domain when `siteUrl` equals it. Nothing to change in the code.
- **Best Practices `errors-in-console`**: `@vercel/analytics` requested `/_vercel/insights/script.js`,
  which only exists on Vercel (404 elsewhere). Fixed: the component is now rendered only when
  `process.env.VERCEL === '1'` (see `app/[locale]/layout.tsx`).

Re-run with both applied (`siteUrl` = localhost): 98 / 100 / 100 / 100.

---

## 3b. Design direction

The template has to feel specific to a restaurant, not generic. Choices made:

- **Type is the personality.** Instrument Serif (single weight, large, tight) for headings and dish
  names; Inter for everything people read. The hero title goes up to 8 rem.
- **The menu looks like a printed menu**: a dotted leader line from dish to price, tiny `V` / `VG` /
  `GF` marks instead of coloured pills, allergens as plain text.
- **Colour comes from `config.json`**: five hex values. Text colour on top of primary and accent is
  computed for contrast (`lib/color.ts`). The demo is bottle green and tomato red on near-white (a
  trattoria's colours), deliberately not the usual cream-and-terracotta.
- **One piece of motion**: the hero text settles into place on load. It respects reduced motion.
- **Square-ish corners** (4 to 6 px), not pills and cards everywhere.
- **Light theme only.** Dark mode was optional in the specification and doubles the visual QA.

The placeholder images are generated vector art (a gingham tablecloth, plates), clearly not photos,
produced by `npm run placeholders`. They are replaced with the client's photography.

---

## 4. Decision records

### 4.1 One config file per client, validated at build time

`data/config.json` is the only file with business facts. It is checked with Zod (`lib/schemas.ts`)
when the site builds: a wrong colour, a missing field or `mode: "whatsapp"` without a WhatsApp
number fails the build with the exact field name. `npm run validate` adds checks a schema cannot
do (missing translations, mismatched `{placeholders}` between languages, photos that do not exist,
contrast).

### 4.2 Content is split by who edits it

- `data/` and `public/`: everything specific to a client.
- `messages/`: UI text of the template (buttons, labels, validation errors, emails).
- Adding a language touches both. See the README.

### 4.3 next-intl on the server only

Translations are resolved on the server. Client components (open/closed badge, menu filters,
reservation form, map, language switcher) receive **plain strings as props**. Placeholders such as
`{time}` are filled in the browser with a 3-line helper (`lib/format.ts#fill`); plural forms
("2 dishes") are pre-computed on the server per count.

- Cost: a little prop plumbing.
- Benefit: no translation runtime in the browser (about 10 KB gzipped saved).
- Consequence: do not use `useTranslations` in a client component; pass strings in.

### 4.4 Localised URLs, one stable menu URL

`/de/reservieren`, `/it/prenota`, `/en/reserve`, `/fr/reserver`. The menu is `/menu` in every
language **on purpose**: it is what is printed on tables and must never change.

The QR code points to **`/menu?src=qr`** (no language). The middleware redirects to the visitor's
browser language and keeps `?src=qr`, so one printed code serves tourists and locals, and analytics
can tell QR scans from search visits. Per-language codes are also generated.

### 4.5 Opening hours are the single source of truth

`config.hours` drives the live "Open now / closes at 22:30" badge, the hours table, the JSON-LD
`openingHoursSpecification`, and the bookable time slots. A closing time earlier than the opening
time means "after midnight" (bars). The badge uses the **venue's** time zone, not the visitor's.
The logic is in `lib/hours.ts` with unit tests (lunch/dinner gaps, closed day, midnight,
daylight-saving change).

The page is static, so the status can only be computed in the browser: the server renders an empty
box of the same height (no layout shift) and the browser fills it in.

### 4.6 Reservation is a request, not a confirmed booking

Copy says "request" everywhere, and the guest email says "this is not yet a confirmed booking".
There is no calendar or table management, so promising a booking would be misleading.

- Time slots are generated from the opening hours (30-minute steps, last slot 60 minutes before
  closing, minimum notice 60 minutes, window 60 days: all in `config.reservation`).
- The Server Action **re-validates everything** (it never trusts the browser), including that the
  slot exists.
- Email goes through Resend: to the restaurant (in the restaurant's language, `Reply-To` set to the
  guest) and an optional receipt to the guest (in the guest's language; its failure never fails the
  request).
- **Fail loudly in production**: without `RESEND_API_KEY` the form shows an error instead of
  pretending it worked. A silently lost booking is the worst outcome. In development it logs the
  request ("dry-run"). `RESERVATION_DRY_RUN=true` forces dry-run for the e2e tests only.
- Alternative path: a WhatsApp deep link (`wa.me`) with a message pre-filled from the form fields.
  `reservation.mode` is `form`, `whatsapp` or `both`.

**Abuse protection** (added in 1.1; replaces the earlier "no rate limiting yet"):

- An invisible honeypot field. Bots get a fake "ok".
- Rate limits in `lib/rate-limit.ts`: 5 requests per visitor per 10 minutes, and for guest receipts
  2 per recipient address per hour and 50 per hour site-wide. They stop the form from being used to
  flood the restaurant's inbox or to mail third parties from the restaurant's domain, which would
  also harm the sender reputation of that domain.
- Limits count only requests that passed validation and never apply in dry-run.
- Counters live in Upstash Redis through its REST API (plain `fetch`, no new dependency) when
  `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set. Otherwise an in-memory fallback
  is used. **That fallback counts per server instance**, so on serverless hosting it slows a simple
  script down but does not stop a determined one. Configure Redis on every live site.
- IP addresses and emails are hashed (SHA-256) before they reach either backend.
- The client address is read from `x-real-ip` / `x-forwarded-for`. These are trustworthy on Vercel,
  where the platform sets them; on other hosts they can be spoofed.
- If Redis is unreachable the limiter falls back to memory rather than blocking real guests.
- A site that does not want receipts at all sets `reservation.sendCustomerConfirmation` to `false`.

### 4.7 The map is click-to-load

The Google Maps iframe only loads after the visitor clicks "Show the map". This keeps the page fast
and avoids sending visitor IPs to Google without consent, so no cookie banner is needed for it.
Caveat: it uses the keyless `output=embed` URL. It works today but is not an official API; if
Google restricts it, switch to the Embed API (needs a key) or OpenStreetMap.

### 4.8 SEO

Per page: title, description, canonical, `hreflang` for every active language plus `x-default`,
Open Graph and Twitter card. JSON-LD: `Restaurant` / `BarOrPub` / `CafeOrCoffeeShop` on the home
page (address, geo, hours, cuisine, price range, `hasMenu`, `acceptsReservations`) and a full `Menu`
with prices and dietary info on the menu page. `sitemap.xml` and `robots.txt` are generated.

### 4.9 The case-study page and sample numbers

The specification asked for a case study with "invented but realistic" metrics. The page exists
(`/<lang>/case-study`, before/after table), with these safeguards:

- `data/case-study.json` has `"illustrative": true`, which shows a visible "Sample data" notice.
  It should be set to `false` only when the numbers are real, measured ones.
- The page is `noindex`, left out of the sitemap, and can be turned off with `features.caseStudy`.
- It contains **no testimonial quotes**. Fabricated customer words are the riskiest part.

Reason: presenting made-up results to prospects as if they came from a real client can count as
misleading advertising (in Germany under the UWG), and the target markets are Germany, Switzerland
and the Netherlands. The honest version works almost as well, and once there is one real client the
notice can go. Keep it until then.

### 4.10 Legal pages are not included

German, Austrian and Swiss business sites **must** have an Impressum and a Datenschutzerklärung.
They are client-specific, so the template does not include them. The footer shows links when
`legal.imprintUrl` / `legal.privacyUrl` are set, and `npm run validate` warns while they are empty
for DE/AT/CH. Treat this as a go-live blocker.

### 4.11 Allergen data in the demo is fictional

EU rules require allergen information to be accurate. The demo menu's allergens are plausible, not
verified. For a real client the restaurateur must provide and confirm them, and the "ask our team"
note stays on the menu.

### 4.12 Tooling

ESLint 9, Prettier (with the Tailwind class sorter), lint-staged and Husky. Husky is installed
through the `prepare` script, but **no hook is committed yet**: lint-staged is configured
(`.lintstagedrc.json`) and can be switched on with `npx husky init` and a `pre-commit` file that
runs `npx lint-staged`. Bundle analyser: `npm run analyze`. Package-level JS breakdown:
`SOURCEMAPS=true npm run build`, then `npx source-map-explorer .next/static/chunks/*.js --no-border-checks`.

### 4.13 Licence: PolyForm Noncommercial 1.0.0

The code is **source-available** under the PolyForm Noncommercial License 1.0.0 (`LICENSE`).

- Why not MIT: Template Zero is the base of a commercial service (websites for paying clients).
  A permissive licence would let anyone resell the template itself.
- Why not "no licence": with no licence the legal position is unclear to anyone reading the code,
  and it discourages evaluation. An explicit licence lets people read, run and learn from it.
- Consequence: noncommercial use is allowed (study, research, evaluation, personal projects, and
  charitable or educational organisations). Commercial use needs a separate agreement. The
  licensor is not bound by their own licence, so client sites are delivered under that agreement
  or the client contract.
- This is **not** an OSI-approved open-source licence, and the README says so.
- Bundled fonts (Inter, Instrument Serif) stay under the SIL Open Font License 1.1. Their licence
  texts sit next to the font files in `app/fonts/` and are listed in `THIRD_PARTY_NOTICES.md`.

The choice of licence is a business decision and not legal advice; have it reviewed before relying
on it in a contract.

### 4.14 Continuous integration

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main`:

- **Checks (Node 20, Node 22)**: `validate`, `typecheck`, `lint`, `format:check`, unit tests and the
  production build. Running both Node versions backs up the `engines` field in `package.json`
  (Node 20.9 or newer).
- **E2E (Playwright)**: installs Chromium, builds the site and runs the 24 end-to-end tests on a
  mobile and a desktop profile. Traces of failed tests are kept as an artifact for 7 days.
- Not included: Lighthouse. Scores depend on the machine, so a threshold in CI would be flaky; the
  measurement stays a manual step before delivery (see the README).
- Action versions are pinned to major tags. Dependabot for `github-actions` and `npm` is a
  sensible next step (see open points).

---

## 5. Open points

1. **Reserve page weight**: keep 125 KB, or drop React Hook Form? (section 3)
2. **Case study**: keep the "Sample data" notice until real numbers exist (4.9).
3. **Real Resend account**: a verified sending domain is needed before the form can email anyone.
4. **Redis for rate limiting**: create an Upstash database for each live site (4.6).
5. **Domain**: `siteUrl` is `trattoria-da-marco.example`. The QR codes and sitemap use it; run
   `npm run qr` again after setting the real one.
6. **Impressum and privacy policy** for each German-speaking client (4.10).
7. **Demo contact details**: replace the placeholder phone and WhatsApp numbers with numbers that
   cannot belong to a real person.
8. **Content Security Policy**: only `X-Frame-Options` and `Permissions-Policy` are set today; a CSP
   is a possible hardening step.
9. **Dependabot** for npm and GitHub Actions updates.
10. **Languages beyond four** (nl, sv, da): add messages, data files and `i18n/pathnames.ts` entries
    (README, "Add a language"). About an hour per language, mostly translation.
11. **Not built, on purpose**: online ordering and payments, table management, a CMS. Data is JSON
    now and shaped so it can move to Sanity, Payload or Supabase later.
