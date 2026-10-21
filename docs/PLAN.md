# Personal Shopping Assistant — Plan

Status: **draft v3**, all open questions answered. Nothing is built yet.

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

Convex deployment: `dev:tangible-aardvark-598`
(`https://tangible-aardvark-598.eu-west-1.convex.cloud`, EU region, so
personal data stays in the EU). Empty, so `npx convex dev` can push the schema
and functions. Set in `.env` as `CONVEX_DEPLOYMENT` / `CONVEX_URL`, the same
way Ella does.

Git: a new local repo with `main` + `develop`, work on `develop`, same as
Ella. No GitHub remote for now, so `pr-checks.yml` is kept but does not run;
the same checks (prettier, lint, types, tests) run locally.

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
| `recipeSites`           | household → site name, base URL, enabled                                                                                                                                            |
| `recipes`               | title, source URL, site, servings, time, ingredients (name, amount, unit), steps, tags, image                                                                                       |
| `products`              | one row per product: Collect&Go product id (if known), article number from receipts (if present), name, brand, unit/size, category, last price                                      |
| `receipts`              | date, store, total                                                                                                                                                                  |
| `receiptLines`          | receipt → product, quantity, price, discount                                                                                                                                        |
| `productStats`          | derived per product: times bought, last bought, average interval, average quantity (feeds "you usually buy this every 2 weeks")                                                     |
| `mealPlans`             | household, week, suggested recipes, which ones were picked, servings per recipe, status                                                                                             |
| `baskets`               | meal plan → lines (product, quantity, reason: `recipe` / `recurring` / `manual`), status, Collect&Go sync status per line                                                           |

All tables with household data are scoped by `householdId`, and every query
and mutation checks that the user is a member of that household.

## Phases

### Phase 0 — Scaffold

- Copy the Ella framework into this folder, remove games and the web app,
  rename packages, switch UI text to English.
- New local git repo with `main` + `develop`.
- Point it at `tangible-aardvark-598`, set the auth env vars, sign in on the
  phone with email + password.
- Checks green locally (prettier, lint, types, tests).

**Done when:** I can sign in on my phone and see an empty home screen.

**Status (2026-10-21):** scaffold committed; schema and functions pushed to
`tangible-aardvark-598`; JWT keys set; checks green locally. Left: the
Resend key on the deployment, and a development build on the phone (the new
app id means Ella's dev client can't be reused).

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

### Phase 2 — Receipt import

- Import script for the receipt CSV (columns to be confirmed when the example
  arrives), filling `receipts`, `receiptLines`, `products`. The receipts have
  both article numbers and names; the article number is the product key.
- Compute `productStats`.
- Simple "My products" screen: most-bought products, search.

**Done when:** a year of receipts is in Convex and I can browse what I buy.

### Phase 3 — Recipe sites and library

Recipes come from sites I choose, never from the LLM. The first site is
**colruyt.be** (Colruyt's own recipes); its pages are what the parser is
built and tested against. To check in this phase: whether Colruyt recipe
pages link ingredients to Colruyt products, which would make Phase 5 much
easier for those recipes.

- Screen to add/remove recipe sites.
- Add a single recipe by pasting or sharing its URL (share sheet from the
  browser into the app).
- A Convex action fetches the page and reads the recipe from its
  schema.org `Recipe` JSON-LD (most recipe sites have it). Only if that is
  missing, Claude extracts title, ingredients and steps from the page text.
- Per site, collect recipes into the library from its sitemap or recipe
  index, at a polite rate and only from sites whose terms allow it.
- Library screen: list, search, recipe detail.

**Done when:** my library holds the colruyt.be recipes, and adding a recipe
from another site by URL works.

### Phase 4 — Meal plan suggestions and picking

- Convex action asks Claude to choose ~10 dinners for the week **from the
  library**, using the profile (diet, allergies, time, budget) and lightly
  the products I usually buy. Claude only returns recipe ids and a short
  reason, so it cannot invent recipes and the call stays cheap.
- If fewer recipes fit than requested (e.g. an allergy rules most of the
  library out), the app shows fewer suggestions and says why; it never
  generates a recipe.
- Suggestion cards; tap to see ingredients and steps; "replace this one".
- Select the recipes I want (e.g. 5 of 10), adjust servings; saved as this
  week's plan, visible to every household member.

**Done when:** we have a confirmed weekly plan.

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

| Topic        | Decision                                                              |
| ------------ | --------------------------------------------------------------------- |
| Store        | Colruyt Collect&Go only                                               |
| Receipt data | CSV with article numbers and names; example file to follow            |
| Handoff      | Automatic; analysis first (Phase 0b), checklist only as fallback      |
| C&G analysis | Done together, from your logged-in browser session                    |
| Users        | Several household members, each with their own account                |
| LLM          | Claude API, low cost (Haiku 5.5 by default)                           |
| Recipes      | From recipe sites added in the app, never generated; colruyt.be first |
| Language     | English                                                               |
| Meals        | Dinners only                                                          |
| Name         | "Personal Assistant", `@pa/*`, app id `app.personalassistant.shop`    |
| Convex       | `tangible-aardvark-598` is empty; `npx convex dev` may push to it     |
| Git          | New local repo, `main` + `develop`; no GitHub for now                 |
