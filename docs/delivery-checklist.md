# Delivery checklist (one client)

Target: customise in under 4 hours, deliver in 3 to 7 working days.
Tick every box before sending the client the link.

## 1. Collect from the client

- [ ] Name, address, phone, email, WhatsApp number (international format)
- [ ] Opening hours, including rest days and seasonal changes
- [ ] The menu: dish names, descriptions, prices, **allergens (from the client, not guessed)**
- [ ] 6 to 10 good photos (hero, 4 dishes, interior). Landscape hero, at least 1920 px wide
- [ ] Logo (SVG preferred) or agreement to use the name as a wordmark
- [ ] Brand colours, or take them from the logo
- [ ] Which languages, and who proofreads the translations
- [ ] Impressum and privacy policy text (required in DE / AT / CH)
- [ ] Where booking requests should arrive (email) and whether WhatsApp is welcome
- [ ] Domain name and who controls its DNS

## 2. Customise (see README, "New client in 8 steps")

- [ ] `data/config.json` filled in
- [ ] `data/content.<lang>.json` written for every active language
- [ ] `data/menu.json` + `data/menu.<lang>.json` complete
- [ ] Photos in `public/images/`, `images.hero`, `images.og`, dish `image` paths updated
- [ ] Demo files removed (`public/images/dishes/*` not used by this client, `data/case-study.json` unused)
- [ ] `features.caseStudy` set to `false`
- [ ] `legal.imprintUrl` and `legal.privacyUrl` set
- [ ] `npm run validate` shows **0 errors** and no warnings you cannot explain

## 3. Technical checks (on a production build: `npm run build && npm run start`)

- [ ] `npm run predeploy` passes (validate, typecheck, lint, unit tests, build)
- [ ] Lighthouse **mobile** on `/<lang>` and `/<lang>/menu`: Performance, Accessibility, Best
      Practices, SEO all at or above 95
      (`npx lighthouse http://localhost:3000/de --preset=perf --form-factor=mobile`, or Chrome DevTools)
- [ ] LCP < 1.5 s, INP < 150 ms, CLS < 0.05 (on the deployed site, PageSpeed Insights)
- [ ] Real phone: iPhone Safari and Android Chrome. Sticky bottom bar does not cover content
- [ ] Every language: no English text left, no truncated words, umlauts / accents correct
- [ ] Booking form: send a real request. It arrives in the restaurant's inbox. The guest receipt
      arrives. Reply-To works. A request for a closed day is refused
- [ ] WhatsApp button opens the right chat with the pre-filled text
- [ ] Phone link in the sticky bar dials
- [ ] Open / closed badge shows the right state for the venue's time zone
- [ ] Map: click loads it, "Get directions" opens the right place

## 4. Deploy (Vercel)

- [ ] Push to a **new repository per client** (use this repo as a GitHub template)
- [ ] Import in Vercel. Framework preset: Next.js. Region close to the client
- [ ] Environment variables (Production): `RESEND_API_KEY`, `RESERVATION_FROM_EMAIL`,
      `RESERVATION_TO_EMAIL`. **Do not** set `RESERVATION_DRY_RUN`
- [ ] Resend: sending domain verified (SPF, DKIM), test email not landing in spam
- [ ] Domain added in Vercel, DNS set, HTTPS active, `www` redirects to the apex (or the reverse)
- [ ] `siteUrl` in `config.json` equals the live domain. Redeploy
- [ ] `https://<domain>/sitemap.xml` and `/robots.txt` load. Submit the sitemap in Google Search Console
- [ ] Open Graph preview looks right (paste the link into WhatsApp / Slack)

## 5. QR codes

- [ ] `npm run qr` run **after** the real domain is set
- [ ] Scan `public/qr/menu.png` with two different phones, in two different languages
- [ ] Print test: at least 2.5 x 2.5 cm, high contrast, do not crop the white border, matt
      finish (glossy causes glare)
- [ ] Add a short text next to the code in every language ("Scan for the menu")

## 6. Google presence

- [ ] Website URL added to the Google Business Profile
- [ ] Menu link and reservation link added to the profile
- [ ] Opening hours on the profile match `config.hours`

## 7. Handover

- [ ] Client told how to change a price: edit `data/menu.json`, push, live in about a minute
      (or you do it for them: agree this before launch)
- [ ] Analytics: Vercel Analytics on, or Plausible domain set. Nothing needing a cookie banner
- [ ] Invoice / monthly plan agreed (80 to 150 EUR per month, or 800 to 1,500 EUR one-off)
- [ ] Calendar reminder to check the booking inbox works, one week after launch
