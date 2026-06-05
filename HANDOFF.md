# Luvia Nova — Project Handoff

## What is this?
Luvia Nova is a digital-first luxury brand selling high-end lab-grown diamonds (rings, earrings, bracelets), targeting North American buyers and the South Asian/Middle Eastern diaspora. Tagline: **"Modern Brilliance. Ancient Soul."**

Business model: made-to-order, no finished inventory, direct sourcing from diamond manufacturers.

---

## Live URLs
- **Site:** https://luvia-nova.vercel.app
- **GitHub:** https://github.com/amiteshb-personal/luvia-nova
- **Vercel project:** amiteshb-5681s-projects/luvia-nova

Auto-deploys on every push to `main`.

---

## Tech stack
- Plain HTML/CSS/JS — single `index.html`, no framework, no build step
- Vercel for hosting + serverless functions (`/api/` directory)
- GitHub for version control (connected to Vercel)

---

## File structure
```
luvia-nova/
├── index.html          ← entire site (HTML + CSS + JS inline)
├── logo.svg            ← brand logo, light background version
├── logo-dark.svg       ← brand logo, dark background version
├── BRIEF.md            ← original business brief
├── HANDOFF.md          ← this file
└── api/
    └── diamonds.js     ← Vercel serverless function — live diamond feed
```

---

## What's been built

### Site sections (top to bottom)
1. **Nav** — SVG logo (faceted diamond mark + wordmark), links, "Book a Consultation" CTA
2. **Hero** — full-viewport, grid texture, headline, two CTAs
3. **Trust bar** — 5 trust signals (Ethical, Lab-Grown, Gold Settings, Bespoke, GIA Certified)
4. **Philosophy** — two-column with pull quote
5. **Pillars** — 3 brand promises (Ethical, Custom, Accessible)
6. **Diamonds** — live feed section (see below)
7. **Settings** — tabbed by jewellery type (Rings / Earrings / Bracelets)
8. **Process** — 4-step: Consultation → Stone Selection → Design & Craft → Delivery
9. **Audience** — split panel: North American buyers / South Asian & Middle Eastern diaspora
10. **FAQ** — 8 accordion questions including no-return policy
11. **Lead capture form** — with no-return policy notice
12. **Footer** — dark, with logo, nav links, contact

### Diamond feed (`/api/diamonds.js`)
- Vercel serverless function that connects to **Nivoda GraphQL API**
- Live status bar: green pulsing dot when live, gold dot in demo mode
- Shape filter chips (Round, Oval, Emerald, Cushion, Pear, Radiant, Marquise)
- Skeleton loading cards, auto-refresh every 5 minutes, manual refresh button
- Falls back to 15 curated seed stones when API credentials not configured
- **To activate live feed:** add `NIVODA_CLIENT_ID` and `NIVODA_CLIENT_SECRET` to Vercel Environment Variables

### SVG illustrations
- Top-view facet diagrams for all 7 diamond cuts
- Side-profile ring illustrations for all 5 ring settings
- Matched-pair earring illustrations for all 4 earring styles
- SVG bracelet illustrations for all 3 bracelet styles

### Settings catalogue
**Rings (5):** Sienna Solitaire ($950), Zia Cathedral Halo ($1,650), Amara Trilogy ($1,800), Lana Petite Pavé ($1,400), Nova Vintage Filigree ($1,950)

**Earrings (4):** Cleo Stud ($650/pair), Isla Halo Stud ($1,100/pair), Celeste Drop ($1,400/pair), Luna Pavé Hoop ($1,800/pair)

**Bracelets (3):** Aria Tennis ($2,800), Soleil Pavé Bangle ($2,200), Devi Station ($1,600) — the Devi Station is inspired by the South Asian mangalsutra

### Brand logo
- Faceted octagonal diamond logomark (16-point star facets, glowing centre point)
- LUVIA in charcoal / NOVA in gold, spaced serif caps
- Fine gold rule + tagline in micro tracked sans-serif beneath
- Two variants: light bg (nav) and dark bg (footer)

### Policies
- No-return policy: in FAQ ("What is your return and cancellation policy?") and below the consultation form

---

## Phase 2 — Completed
- ✅ Mobile nav hamburger menu (slide-in drawer, closes on outside click)
- ✅ Interactive Ring Builder (3-step: choose diamond → choose setting → see creation + estimate)
- ✅ 3D CAD Preview request flow (pre-fills consultation form with full selection details)
- ✅ Custom built-in booking calendar (date picker + time slots + form, Mon–Sat, 9am–7pm EST)
- ✅ EmailJS integration for booking notifications (see setup below)
- ✅ VDB + IDEX API support in `/api/diamonds.js` (provider priority: Nivoda → VDB → IDEX → seed)

## EmailJS Setup (to activate booking emails)
1. Create a free account at https://www.emailjs.com
2. Add an **Email Service** (connect your Gmail/Outlook) → copy the **Service ID**
3. Create an **Email Template** with these variables:
   - `{{from_name}}` — customer full name
   - `{{from_email}}` — customer email
   - `{{phone}}` — customer phone
   - `{{booking_date}}` — selected date
   - `{{booking_time}}` — selected time slot
   - `{{interest}}` — what they're looking for
   - `{{message}}` — their notes
   - `{{signature}}` — typed name or "[Drawn signature — on file]"
   - `{{policy_agreed}}` — confirmation they signed the no-return policy
   - `{{booking_ref}}` — unique booking reference (e.g. LN-2026-A1B2)
   - `{{design_upload}}` — uploaded filename or "No design image uploaded"
4. Create a **Cancellation template** with: `{{from_name}}`, `{{booking_ref}}`, `{{booking_date}}`, `{{booking_time}}`, `{{cancel_reason}}`
5. Create a **Reschedule template** with: `{{from_name}}`, `{{booking_ref}}`, `{{old_date}}`, `{{new_date}}`
6. Copy your **Template IDs** and **Public Key** (Account → API Keys)
7. In `index.html`, replace the five placeholders near the top of the `<script>` block:
   ```js
   const EMAILJS_PUBLIC_KEY             = 'YOUR_PUBLIC_KEY';
   const EMAILJS_SERVICE_ID             = 'YOUR_SERVICE_ID';
   const EMAILJS_TEMPLATE_ID            = 'YOUR_TEMPLATE_ID';
   const EMAILJS_CANCEL_TEMPLATE_ID     = 'YOUR_CANCEL_TEMPLATE_ID';
   const EMAILJS_RESCHEDULE_TEMPLATE_ID = 'YOUR_RESCHEDULE_TEMPLATE_ID';
   ```

## Still To Do (Phase 3)
- Shopify migration
- Payment processing / Stripe checkout
- Account creation / order tracking
- VDB / IDEX credentials configured in Vercel env vars (see api/diamonds.js for env var names)
- Replace Calendly placeholder URL (`https://calendly.com/luvia-nova/consultation`) with real account

---

## Design tokens
```
--cream:     #f8f5f0
--ivory:     #fdfaf6
--charcoal:  #1a1a1a
--gold:      #b89a5e
--gold-light:#d4b97a
--muted:     #6b6560
```
Font stack: Georgia (serif headings) + Helvetica Neue (sans body/labels)

---

## How to run locally
```bash
cd /Users/amitbhushan/luvia-nova
python3 -m http.server 4321
# open http://localhost:4321
```
For the API function to work locally, use Vercel CLI:
```bash
vercel dev
```

---

## Key contacts / credentials
- GitHub account: amiteshb-personal
- Vercel account: amiteshb-5681s-projects
- Nivoda API credentials: not yet configured (add to Vercel env vars when ready)
