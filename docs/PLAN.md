# Personal Shopping Assistant — Plan

Status: **draft v3**, all open questions answered. Phases 0 to 4 are
built; see each phase's status line.

## Goal

A native app that:

1. knows my household (people, diet, allergies, goals, budget, cooking time),
2. suggests dinners for the week from recipe sites I like,
3. lets me pick the recipes I want from those suggestions,
4. turns the picked recipes into concrete Collect&Go products,
5. uses a year of my receipt data to choose the products I actually buy, and
   to recommend things I regularly buy that no recipe asks for (coffee, milk,
   toilet paper, …),
6. puts that basket into Collect&Go automatically.

The app is in English, plans dinners only, and is shared by the members of
the household.

We start small and add one feature at a time. Each phase below ends with
something I can use on my phone.

## Starting point: the Ella framework

The repo copies Ella's monorepo setup. All of it except the games:

| Ella                                                                       | Personal assistant   | Notes                                                                                                                 |
| -------------------------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| pnpm workspace + Turborepo                                                 | same                 | same Node/pnpm versions and `overrides` (React, RN, Reanimated pinned to the Expo SDK)                                |
| `apps/mobile` (Expo 57, React Navigation, dev client)                      | `apps/mobile`        | navigation, auth screens, Convex provider, logger, app-update, settings carried over; `features/games` dropped        |
| `apps/web` (Next.js)                                                       | **left out for now** | add it later if a desktop view for the receipt import or the plan turns out to be useful                              |
| `packages/backend` (Convex + Convex Auth + Resend)                         | `packages/backend`   | auth, users, permissions, errors, tests (convex-test + vitest) carried over; game/content/codenames functions dropped |
| `packages/ui` (Tamagui)                                                    | `packages/ui`        | copied as is; restyled later                                                                                          |
| `packages/shared`, `eslint-config`, `prettier-config`, `typescript-config` | same                 |                                                                                                                       |
| `.github/workflows/pr-checks.yml`                                          | same                 | prettier, lint, types, tests                                                                                          |

Ella's Dutch UI strings are replaced by English ones.

Name: "Personal Assistant". Package scope renamed `@pa/*` → `@pa/*`. Expo
app id `app.personalassistant.shop`.

Convex deployment: `dev:youthful-finch-562`
(`https://youthful-finch-562.eu-west-1.convex.cloud`, EU region, so
personal data stays in the EU). Set in `.env` as `CONVEX_DEPLOYMENT` /
`CONVEX_URL`, the same way Ella does. Phases 0 to 4 were first built on
`tangible-aardvark-598`; on 2026-10-23 the project moved to
`youthful-finch-562` (functions pushed, JWT keys and `ANTHROPIC_API_KEY`
set). Data on the old deployment did not move; receipts are imported again.

Git: `main` + `develop`, work on `develop`, same as Ella. Remote:
https://github.com/BuitenZijn/Personal_Assistant; `pr-checks.yml` runs
prettier, lint, types and tests on pull requests.

## Architecture

```
Expo app (phones of household members)
   │  Convex React client (queries/mutations, live updates)
   │  Collect&Go session (see "Collect&Go access" below)
   ▼
Convex backend (tangible-aardvark-598, eu-west-1)
   ├─ auth (Convex Auth, several users sharing one household)
   ├─ household, receipts, products, recipes, meal plans, baskets
   ├─ actions → recipe sites (fetch + parse recipes)
   ├─ actions → Claude API (pick suggestions, ingredient→product matching)
   └─ import script (receipt CSV → receipts/products tables)
```

- All personal data and receipts live only in Convex. Nothing on third-party
  analytics.
- LLM calls happen in Convex **actions** with the Anthropic API key stored as
  a Convex env var, never in the app.
- LLM: Claude, kept cheap. Default model **Claude Haiku 5.5**
  (`claude-haiku-5-5`) with prompt caching on the household profile and
  product list; only move a task to a bigger model if Haiku's results are not
  good enough.
- The receipt import runs from my machine (a Node script in
  `packages/backend/scripts/`) and can be re-run with newer receipt CSVs.

## Data model (second draft)

| Table                   | What                                                                                                                                                                                |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users` (+ auth tables) | from Ella                                                                                                                                                                           |
| `households`            | name, people we cook for (name, age, diet, allergies, dislikes), cooking time on weekdays/weekends, budget per week, number of dinners to plan, preferences (cuisines, "less meat") |
| `householdMembers`      | household → user, role (`owner` / `member`). App users who share the household; not every person we cook for needs an account                                                       |
| `householdInvites`      | email, household, token, expiry; sent with Resend (already in Ella)                                                                                                                 |
| `recipes`               | title, source URL, site, servings, time, course, ingredients (name, amount, unit, site ingredient id), steps, tags, image; shared by all households                                 |
| `householdRecipes`      | household → recipe, when saved (picked for a plan or added by link)                                                                                                                 |
| `products`              | one row per product: Collect&Go product id (if known), article number from receipts (if present), name, brand, unit/size, category, last price                                      |
| `receipts`              | date, store, total                                                                                                                                                                  |
| `receiptLines`          | receipt → product, quantity, price, discount                                                                                                                                        |
| `productStats`          | derived per product: times bought, last bought, average interval, average quantity (feeds "you usually buy this every 2 weeks")                                                     |
| `mealPlans`             | household, week (Monday), status, suggestions (recipe, reason, picked, servings), spares, turned-down recipes, progress while suggesting                                            |
| `baskets`               | meal plan → lines (product, quantity, reason: `recipe` / `recurring` / `manual`), status, Collect&Go sync status per line                                                           |

All tables with household data are scoped by `householdId`, and every query
and mutation checks that the user is a member of that household.

## Phases

### Phase 0 — Scaffold

- Copy the Ella framework into this folder, remove games and the web app,
  rename packages, switch UI text to English.
- New local git repo with `main` + `develop`.
- Point it at `tangible-aardvark-598`, set the auth env vars, sign in on the
  phone with email + password, in **Expo Go** (no APK or dev build at this
  stage).
- No email verification at this stage: sign-up signs in straight away. It
  can be turned on later with `AUTH_EMAIL_VERIFICATION=on` plus a Resend key.
- Checks green locally (prettier, lint, types, tests).

**Done when:** I can sign in on my phone and see an empty home screen.

**Status (2026-10-21):** scaffold committed; schema and functions pushed to
`tangible-aardvark-598`; JWT keys set; checks green locally. Email
verification off; the app runs in Expo Go. Left: sign in on the phone.
Without a Resend key, "forgot password" can't send its email yet. The house
style (drawn from mijnxtra.be) is in, ahead of "restyled later".

### Phase 0b — Collect&Go access analysis (spike, in parallel)

Automatic basket filling is a hard requirement, and Collect&Go has no public
API, so this is the riskiest part of the project. It is investigated first,
before the phases that depend on it, and written up in
`docs/collect-and-go-analysis.md`. We do it together: you log in to
Collect&Go in your browser and share what the dev tools show, I read and
document the calls. Questions to answer:

1. **API surface**: which calls the Collect&Go website/app makes (with
   browser dev tools on my own account) for: product search, product details
   (id, price, unit, image), current basket, add/update/remove basket line.
2. **Authentication**: how login works (Colruyt account / OAuth, tokens,
   cookies, lifetime, refresh), and whether there is bot protection
   (captcha, Akamai/Cloudflare, device checks) that blocks non-browser
   clients.
3. **Where the calls run**, which decides where my Colruyt credentials live:
   - **A. In the app, through a WebView**: I log in to Collect&Go inside an
     in-app WebView; the app uses that session to add products. Credentials
     never leave the phone and requests look like normal browser traffic.
     Preferred if it works.
   - **B. In the app, direct HTTP** with a token taken from that WebView login.
   - **C. In a Convex action**: needs my Colruyt credentials or token stored
     server-side, and requests come from a cloud IP. Least preferred.
4. **Product identity**: whether receipt article numbers match Collect&Go
   product ids, or products must be matched by name/brand/size via search.
5. **Store choice**: how the selected pickup point affects assortment and
   prices.
6. **Risk**: terms of use, how likely it is to break, and what the app does
   when it breaks (fall back to the checklist below).

Outcome: a go/no-go per option, plus a small proof of concept that adds one
known product to my Collect&Go basket from code.

### Phase 1 — Household and profile

- Household created on first sign-in; invite other household members by
  email; they sign up and join the same household.
- One screen to fill in the people we cook for, diet, allergies, dislikes,
  cooking time, budget, how many dinners per week.
- Stored in `households`; editable by every member.

**Done when:** two of us are signed in to the same household and see the same
profile.

**Status (2026-10-22):** built and pushed to `tangible-aardvark-598`; checks
green locally. A new "Household" tab shows the people we cook for, the dinner
preferences (dinners per week, cooking time, budget, cuisines, less meat) and
the members. How it works:

- Each user is in exactly one household, set up on first sign-in.
- An invite is a code for one email address, valid for 14 days. It is emailed
  when the deployment has a Resend key; otherwise the app shares the code via
  the share sheet. The invitee signs in with that address and enters the code
  under Household → "Join a household", which leaves their own household (and
  deletes it if nobody else is in it).
- Deleting an account takes the user out of the household; the next member
  becomes owner, or the household is deleted when it was the last one.

Left: try it with two accounts on the phone.

### Phase 2 — Receipt import

- Import script for the receipt CSV (columns confirmed, see the status below),
  filling `receipts`, `receiptLines`, `products`. The receipts have
  both article numbers and names; the article number is the product key.
- Compute `productStats`.
- Simple "My products" screen: most-bought products, search.

**Done when:** a year of receipts is in Convex and I can browse what I buy.

**Status (2026-10-22):** built and pushed to `tangible-aardvark-598`; checks
green locally. Left: run the import, and look at the Products tab.

The export (see `packages/backend/scripts/receiptCsv.ts`) is UTF-16,
tab-separated, one row per article per receipt: date, receipt number, article
number, name, amount paid (discounts included) and quantity, with decimal
commas. Things learned from the example:

- Articles sold by weight (names ending in "W", or a fractional quantity)
  count in units of 100 g: "BH CHIPOLATA +-350GW" at 3,500 is 350 g. They are
  stored in kg.
- Zero rows ("PUBLIKAART") are loyalty-card scans and are skipped.
- The receipt number starts with the date and the store number
  ("20260326 3515 …"), which gives each receipt its store.
- There is no category, brand or size column; those come later (names hold
  the size, e.g. "250G").

`products` holds Colruyt articles for every household; what a household
bought is in its `receipts`, `receiptLines` and `productStats`. Import with
`pnpm import:receipts <file.csv>`, which signs in with your app account.
Importing again replaces receipts already there, so an overlapping export is
safe.

### Phase 3 — Recipes

Recipes come from recipe sites, never from the LLM. The first site is
**colruyt.be** (Colruyt's own recipes); its pages are what the parser is
built and tested against. We don't collect whole sites: Phase 4 looks up the
recipes that fit the week's plan, and the recipes we keep are the household's
**saved recipes**.

- Read a recipe from its page: a Convex action fetches the page and reads the
  recipe from its schema.org `Recipe` JSON-LD (most recipe sites have it).
  Only if that is missing, Claude extracts title, ingredients and steps from
  the page text.
- Save a recipe by pasting its URL (sharing from the browser into the app
  needs a development build, so later).
- Recipes tab: an overview of the saved recipes, search, recipe detail.

**Done when:** I can save a recipe from colruyt.be and from another site by
its link, and see my saved recipes in the Recipes tab.

**Status (2026-10-22):** built and pushed to `tangible-aardvark-598`; checks
green locally; saving a colruyt.be recipe by link works from the deployment.
Left: save a recipe from another site. (A first version collected all of
colruyt.be's recipes up front; dropped in favour of looking them up per plan.)

What colruyt.be offers:

- `robots.txt` allows `/nl/recepten/` with `crawl-delay: 5`. Recipes are in
  Dutch only, which suits matching them to the (Dutch) receipts.
- `/nl/sitemap.recipes.xml` lists ~9,970 recipe pages, with descriptive
  addresses (`/nl/recepten/gnocchi-met-aubergine-en-kip`).
- Every page has schema.org `Recipe` JSON-LD (title, servings, total time when
  known, course, keywords such as "Vegetarisch"/"Veganistisch", image, steps).
- **Ingredients link to Colruyt's own ingredient ids**: the page's
  `data-ingredient-data` gives each ingredient's quantity, unit, name and an
  ingredient id, which the site uses for "product suggestions for this
  recipe". The ids are stored with each ingredient (`sourceId`); Phase 0b
  should look at the call behind those suggestions, which could map
  ingredients to products for Phase 5 without guessing.
- No product links in the page itself.

Recipes are stored once for everyone (they are the sites' public content);
`householdRecipes` holds each household's saved ones. Pages without recipe
data are read by Claude Haiku 5.5 when the deployment has an
`ANTHROPIC_API_KEY` (not set yet); Claude only copies what the page says.

### Phase 4 — Meal plan suggestions and picking

- Find ~10 dinners on colruyt.be that fit the week, using the profile (diet,
  allergies, time, budget, cuisines) and lightly the products I usually buy.
  How to find candidates without reading the whole site is decided at the
  start of this phase: e.g. Claude picks likely dinners from the recipe
  sitemap's descriptive addresses (~10,000 short names, cheap on Haiku), or
  the site's own recipe search; then only those pages are read (one every 5
  seconds) and checked against allergies, diet and time.
- Recipes are always read from their page, never generated. If fewer recipes
  fit than requested (e.g. an allergy rules most out), the app shows fewer
  suggestions and says why.
- Suggestion cards; tap to see ingredients and steps; "replace this one".
- Select the recipes I want (e.g. 5 of 10), adjust servings; saved as this
  week's plan, visible to every household member. Picked recipes are saved.

**Done when:** we have a confirmed weekly plan.

**Status (2026-10-22):** built and pushed to `tangible-aardvark-598`; checks
green locally. Left: set `ANTHROPIC_API_KEY` on the deployment, then plan a
week on the phone. (Tested on the deployment up to the Claude step: the
catalog of 9,971 colruyt.be recipes downloads and is cached.)

How it works (the Home tab is now "Meal plan"):

1. **Find** (`findCandidates`): each site's catalog is its recipe sitemap
   turned into names ("gnocchi met aubergine en kip"), cached as a file for a
   week. Names that are plainly not a dinner (desserts, soups, drinks,
   breakfast, snacks) are left out, and each run takes a random 3,500 of the
   rest, so the prompt stays under the 100K tokens above which Haiku costs
   five times as much (the full list is ~200K tokens: $0.20 a run instead of
   a few cents). Claude Haiku 5.5 picks likely dinners by number from those
   for the household's profile: twice as many as the suggestions wanted,
   asked again for the rest when it returns too few. Recently picked and
   turned-down recipes are left out.
   The sites are colruyt.be and dagelijksekost.vrt.be (~3,600 recipes);
   a household picks which in Settings → Recipe sites (all of them until
   it chooses). A site whose catalog won't load is skipped. Checked and
   left out for now: 15gram.be has no `Recipe` JSON-LD (its ingredients sit
   in a script, so it needs its own reader); libelle-lekker.be shows a
   login page instead of the recipe.
2. **Read** (`readCandidate`): those pages are read one every 5 seconds;
   recipes read in the last 30 days are reused. Only dinners count.
3. **Choose** (`chooseSuggestionsStep`): recipes over the cooking time are
   dropped, then Claude chooses the ones that suit everyone (allergies in
   Dutch ingredient names, diets, time, preferences) with a one-line reason.
   The first `2 × dinners per week` (at most 14) are suggestions; the rest
   are spares for "Replace". Fewer than wanted comes with a note saying why.

The household then picks dinners (tap a card), sets servings (default: the
number of people), replaces suggestions and confirms; confirmed recipes are
saved. A plan is for the week starting Monday: this week until Thursday,
next week from Friday (Belgian time). "Plan again" sets the current
suggestions aside as turned down. A suggestion run takes a few minutes and
carries on with the app closed; one stuck for 10 minutes can be restarted.

### Phase 5 — Productise into a basket

- Combine ingredients across the picked recipes (2 × 200 g minced meat → 400 g).
- Map each ingredient to a product:
  1. a product I have bought before (from `products`, ranked by
     `productStats`),
  2. otherwise a Collect&Go product search (from Phase 0b) with Claude
     choosing among the results, which I confirm or change.
- Add recurring products that are "due" according to `productStats`
  (e.g. milk, last bought 6 days ago, usually every 7).
- Basket screen: lines grouped by category, quantities editable, remove lines,
  total estimate from last known prices.

**Done when:** I see a shopping basket of real Collect&Go products for the
week.

**Status (2026-10-23):** a first version is built, without Collect&Go
search (Phase 0b isn't done). Settings moved off the tab bar (the avatar
opens it); its tab is now **Shop**:

- "Make shopping list" turns this week's confirmed dinners into a list
  (`functions/shoppingLists.ts`, table `shoppingLists`, one per household
  and week). Ingredients are combined and scaled to servings, then Claude
  Haiku matches them to the 600 products the household buys most, with the
  number of packs (or kg). Basics (salt, oil, …) go to "Check you have";
  ingredients with no match stay on the list as text. Building again
  remakes the dinners' lines and keeps added products.
- "You might be running out": products bought 3+ times whose usual
  interval has (nearly) passed, most overdue first, to add with one tap in
  the usual amount. No Claude call.
- Lines: amount up/down, remove; an estimate from the last receipt prices.
- "Order online": the webshop choice (Collect&Go, Delhaize, Albert Heijn)
  and a disabled order button only; ordering is Phase 6.

### Phase 6 — Into Collect&Go

- "Send to Collect&Go" fills my Collect&Go basket automatically, using the
  approach chosen in Phase 0b.
- Each line shows its sync status; failed lines (product unavailable, out of
  stock, session expired) are listed so I can fix them.
- Fallback: if the automatic route breaks, the basket works as a checklist I
  tick off while adding items in the Collect&Go app myself.

**Done when:** one tap puts the week's basket into my Collect&Go account.

### Later

- Learn from what we pick and reject.
- Leftovers: plan recipes that use up the rest of an ingredient.
- Pantry ("I still have rice").
- Price tracking and promotions.
- Lunch/breakfast planning.
- Receipt import from inside the app instead of a script.

## Decisions

| Topic        | Decision                                                                                                    |
| ------------ | ----------------------------------------------------------------------------------------------------------- |
| Store        | Colruyt Collect&Go only                                                                                     |
| Receipt data | CSV with article numbers and names; example file to follow                                                  |
| Handoff      | Automatic; analysis first (Phase 0b), checklist only as fallback                                            |
| C&G analysis | Done together, from your logged-in browser session                                                          |
| Users        | Several household members, each with their own account                                                      |
| LLM          | Claude API, low cost (Haiku 5.5 by default)                                                                 |
| Recipes      | From recipe sites (colruyt.be first), looked up per plan, never generated; saved recipes kept per household |
| Language     | English                                                                                                     |
| Meals        | Dinners only                                                                                                |
| Name         | "Personal Assistant", `@pa/*`, app id `app.personalassistant.shop`                                          |
| Convex       | `tangible-aardvark-598` is empty; `npx convex dev` may push to it                                           |
| Git          | `main` + `develop` on GitHub (BuitenZijn/Personal_Assistant)                                                |
