# Decisions log

This file explains what was built, why, and where it differs from the brief. It is written for
the owner of the project (Kawe), so it is blunt about trade-offs and about what is **not** verified.

Version 1.0, 5 October 2026.

---

## 1. Status at a glance

| Area                                   | State                                                                |
| -------------------------------------- | -------------------------------------------------------------------- |
| Scaffold, config system, 4 languages   | Done. `next build` passes, 25 static pages.                          |
| Pages: home, menu, reserve, contact    | Done. Plus a sales-demo `case-study` page.                           |
| Demo "Trattoria da Marco, Munich"      | Done, in de / en / it / fr.                                          |
| Unit tests                             | 22 tests, all passing (`npm run test:unit`).                         |
| Content validation, QR generation      | Done (`npm run validate`, `npm run qr`).                             |
| End-to-end tests (Playwright)          | **Written, never run.** No browser could be installed in my sandbox. |
| Lighthouse score                       | **Not measured.** Same reason. See section 3.                        |
| Visual check on a real phone / browser | **Not done.** I only inspected the generated HTML.                   |
| Booking emails through Resend          | Code complete, **never run against a real API key.**                 |

Please run the three "not verified" items on your machine before showing this to a prospect
(commands are in the README, "Checks before you show it to anyone").

---

## 2. Deviations from the brief

| Brief said                                            | I did                                                                                                      | Why                                                                                                                                                                     |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Folders `prenota/`, `contatti/`                       | `reserve/`, `contact/`, with **localised URLs** (`/de/reservieren`, `/it/prenota`, ...)                    | A German guest should not see Italian paths, and localised URLs help local SEO. Defined in `i18n/pathnames.ts`.                                                         |
| `app/api/prenotazione/route.ts` _or_ a Server Action  | Server Action only (`app/actions/reserve.ts`)                                                              | One mechanism is enough. No public endpoint to protect.                                                                                                                 |
| `data/menu.<lang>.json` with the full menu            | `data/menu.json` holds structure, **prices**, tags, allergens, images. `menu.<lang>.json` holds only words | Prices exist once. With 4 full copies, changing one price means editing 4 files and risking a mismatch. This is what makes "update the menu in < 60 seconds" realistic. |
| `components/ui` = shadcn with Radix                   | shadcn-style components (CVA) **without installing Radix**. `components.json` is there                     | No component needs Radix yet (no dialog, no dropdown). `npx shadcn add dialog` will pull it in when needed.                                                             |
| Framer Motion "only where needed"                     | Not installed. One CSS animation on the hero text                                                          | Nothing needed it. It would cost bundle size.                                                                                                                           |
| Font: Inter + Playfair or Instrument Serif            | Inter + **Instrument Serif**, both **self-hosted** from `app/fonts/`                                       | No request to Google (privacy, relevant in Germany), no download at build time, deterministic builds.                                                                   |
| Client copy in `messages/`                            | Client-specific copy lives in `data/content.<lang>.json`; `messages/` is template UI text only             | Clean rule for a new client: **edit `data/` and `public/`, never `messages/`** (unless adding a language).                                                              |
| next-intl                                             | next-intl used **on the server only**, no client provider                                                  | See decision 4.3.                                                                                                                                                       |
| "Case Study page with invented but realistic metrics" | Built, but marked as sample data (see decision 4.9)                                                        | Showing invented figures to prospects as real results is a legal risk in the EU.                                                                                        |

---

## 3. Performance: what was measured and what was not

**Measured** (from the production build, gzipped JavaScript a first visit downloads, including the
~100 KB that Next.js + React themselves cost):

| Route              | JS (gzip)    | Target < 120 KB |
| ------------------ | ------------ | --------------- |
| Home               | 111.5 KB     | yes             |
| Menu (the QR page) | 108.7 KB     | yes             |
| Contact            | 103.1 KB     | yes             |
| Case study         | 101.5 KB     | yes             |
| **Reserve**        | **124.8 KB** | **no, +5 KB**   |

How the numbers were brought down (started at 120 / 120 / 114 / 153 KB):

- Removed `tailwind-merge` (it shipped 8 KB gzipped to every page). `cn()` is plain `clsx`.
- Stopped importing next-intl's navigation helpers from server components (they pulled next-intl
  client code into every page).
- Switched the reservation schema to `zod/mini`: reserve page went from 153 KB to 125 KB.

**The reserve page is over budget** because the brief asks for both "React Hook Form + Zod" and
"< 120 KB JS". React Hook Form alone is ~10 KB gzipped, Zod ~8 KB, on top of the 100 KB baseline.
You can have both only with a different approach. Options:

1. **Accept it** (my default). 125 KB on the one page that is not a landing page will not stop a
   Lighthouse mobile score of 95+, but I have not measured that.
2. **Drop React Hook Form**: plain `<form action>` + `useActionState`, validation only on the
   server. About 112 KB, works without JavaScript, but you lose instant inline errors.

Tell me which you prefer. It is a one-file change in `components/forms/ReservationForm.tsx`.

**Not measured: Lighthouse, LCP, INP, CLS.** The sandbox could not download Chromium. What I did
to make the targets likely: static pages, one `priority` hero image with a reserved box (no layout
shift), `next/font` with size-adjusted fallbacks, the open/closed badge renders an empty box of
fixed height on the server, and almost no JavaScript beyond the framework. "Likely" is not
"measured". Run Lighthouse on a production build before quoting any number to a client.

---

## 3b. Design direction

The brief asked for a template that must feel specific to a restaurant, not generic. Choices made:

- **Type is the personality.** Instrument Serif (single weight, large, tight) for headings and
  dish names; Inter for everything you read. Hero title is up to 8 rem.
- **The menu looks like a printed menu**: dotted leader line from dish to price, tiny `V` / `VG` /
  `GF` marks instead of coloured pills, allergens as plain text.
- **Colour comes from `config.json`**: five hex values. Text colour on top of primary and accent
  is computed for contrast (`lib/color.ts`). The demo is bottle green + tomato red on near-white
  (a trattoria's colours), deliberately not the usual cream-and-terracotta.
- **One piece of motion**: the hero text settles into place on load. Respects reduced motion.
- **Square-ish corners** (4 to 6 px), not pills and cards everywhere.
- **Light theme only.** Dark mode was marked optional in the brief and doubles the visual QA.

The placeholder photos are generated vector art (a gingham tablecloth, plates), clearly not photos,
produced by `npm run placeholders`. Replace them with the client's photography.

---

## 4. Decision records

### 4.1 One config file per client, validated at build time

`data/config.json` is the only file with business facts. It is checked with Zod
(`lib/schemas.ts`) when the site builds: a wrong colour, a missing field or `mode: "whatsapp"`
without a WhatsApp number fails the build with the exact field name. `npm run validate` adds
checks a schema cannot do (missing translations, mismatched `{placeholders}` between languages,
photos that do not exist, contrast).

### 4.2 Content is split by who edits it

- `data/` + `public/`: everything specific to a client.
- `messages/`: UI text of the template (buttons, labels, validation errors, emails).
- Adding a language touches both. See README.

### 4.3 next-intl on the server only

Translations are resolved on the server. Client components (open/closed badge, menu filters,
reservation form, map, language switcher) receive **plain strings as props**. Placeholders such as
`{time}` are filled in the browser with a 3-line helper (`lib/format.ts#fill`); plural forms
("2 dishes") are pre-computed on the server per count. Cost: a little prop plumbing. Benefit: no
translation runtime in the browser (about 10 KB gzipped saved).
Consequence: do not use `useTranslations` in a client component; pass strings in.

### 4.4 Localised URLs, one stable menu URL

`/de/reservieren`, `/it/prenota`, `/en/reserve`, `/fr/reserver`. The menu is `/menu` in every
language **on purpose**: it is what is printed on tables and must never change.
The QR code points to **`/menu?src=qr`** (no language). The middleware redirects to the visitor's
browser language and keeps `?src=qr`, so one printed code serves tourists and locals, and analytics
can tell QR scans from search visits. Per-language codes are also generated.

### 4.5 Opening hours are the single source of truth

`config.hours` drives: the live "Open now / closes at 22:30" badge, the hours table, the
JSON-LD `openingHoursSpecification`, and the bookable time slots. A closing time earlier than the
opening time means "after midnight" (bars). The badge uses the **venue's** time zone, not the
visitor's. Logic is in `lib/hours.ts` with unit tests (lunch/dinner gaps, closed day, midnight,
daylight-saving change).
The page is static, so the status can only be computed in the browser: the server renders an empty
box of the same height (no layout shift), the browser fills it in.

### 4.6 Reservation = a request, not a confirmed booking

Copy says "request" everywhere, and the guest email says "this is not yet a confirmed booking".
There is no calendar or table management, so promising a booking would be a lie.

- Time slots are generated from the opening hours (30 min steps, last slot 60 min before closing,
  minimum notice 60 min, window 60 days: all in `config.reservation`).
- The Server Action **re-validates everything** (never trusts the browser), including that the
  slot exists.
- Spam: an invisible honeypot field. Bots get a fake "ok".
- **No rate limiting yet.** If a site gets abused, add Vercel Firewall rules or Upstash. Not
  built, to avoid an extra paid dependency in v1.
- Email through Resend: to the restaurant (in the restaurant's language, `Reply-To` = guest) and an
  optional receipt to the guest (in the guest's language; its failure never fails the request).
- **Fail loudly in production**: without `RESEND_API_KEY` the form shows an error instead of
  pretending it worked. A silently lost booking is the worst outcome. In development it logs the
  request ("dry-run"). `RESERVATION_DRY_RUN=true` forces dry-run for the e2e tests only.
- Alternative path: a WhatsApp deep link (`wa.me`) with a pre-filled message built from the form
  fields. `reservation.mode` = `form` | `whatsapp` | `both`.

### 4.7 The map is click-to-load

The Google Maps iframe only loads after the visitor clicks "Show the map". Keeps the page fast and
avoids sending visitor IPs to Google without consent, so no cookie banner is needed for it.
Caveat: it uses the keyless `output=embed` URL. It works today but is not an official API; if
Google restricts it, switch to the Embed API (needs a key) or OpenStreetMap.

### 4.8 SEO

Per page: title, description, canonical, `hreflang` for every active language + `x-default`, Open
Graph, Twitter card. JSON-LD: `Restaurant` / `BarOrPub` / `CafeOrCoffeeShop` on the home page
(address, geo, hours, cuisine, price range, `hasMenu`, `acceptsReservations`) and a full `Menu`
with prices and dietary info on the menu page. `sitemap.xml` and `robots.txt` are generated.

### 4.9 The case-study page and invented numbers

You asked for a case study with "invented but realistic" metrics. I built the page
(`/<lang>/case-study`, before/after table), but:

- `data/case-study.json` has `"illustrative": true`, which shows a visible "Sample data" notice.
  Set it to `false` only when the numbers are real, measured ones.
- It is `noindex`, left out of the sitemap, and can be turned off with `features.caseStudy`.
- I wrote **no testimonial quotes**. Fabricated customer words are the riskiest part.

Reason: presenting made-up results to prospects as if they came from a real client is
misleading advertising (in Germany, a violation of the UWG), and you are selling into Germany,
Switzerland and the Netherlands. The honest version works almost as well, and once you have one
real client the badge goes away. This is your call, but I would not remove the notice.

### 4.10 Legal pages are not included

German, Austrian and Swiss business sites **must** have an Impressum and a Datenschutzerklärung.
They are client-specific, so I did not write them. The footer shows links when
`legal.imprintUrl` / `legal.privacyUrl` are set, and `npm run validate` warns while they are empty
for DE/AT/CH. Treat this as a go-live blocker.

### 4.11 Allergen data in the demo is fictional

EU rules require allergen information to be accurate. The demo menu's allergens are plausible, not
verified. For a real client the restaurateur must provide and confirm them, and the "ask our team"
note stays on the menu.

### 4.12 Tooling

ESLint 9 + Prettier (with the Tailwind class sorter) + lint-staged + Husky (installed by
`npm install` through `prepare`; I ran `git init` but made **no commit**). Bundle analyser:
`npm run analyze`. Package-level JS breakdown: `SOURCEMAPS=true npm run build` then
`npx source-map-explorer .next/static/chunks/*.js --no-border-checks`.

---

## 5. Open points for you

1. **Reserve page weight**: accept 125 KB or drop React Hook Form? (section 3)
2. **Case study**: keep the "Sample data" notice until you have real numbers? (4.9)
3. **Real Resend account**: needs a verified sending domain before the form can email anyone.
4. **Domain**: `siteUrl` is `trattoria-da-marco.example`. The QR codes and sitemap use it; run
   `npm run qr` again after setting the real one.
5. **Impressum and privacy policy** for each German-speaking client (4.10).
6. **Languages beyond 4** (nl, sv, da): add messages + data files + `i18n/pathnames.ts` entries
   (README, "Add a language"). Takes about an hour per language, mostly translation.
7. Not built, on purpose: online ordering and payments, table management, CMS. Data is JSON now
   and shaped so it can move to Sanity / Payload / Supabase later.
