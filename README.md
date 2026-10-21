# Personal Assistant

A household shopping assistant: it knows the household, suggests dinners from
recipe sites we like, turns the picked recipes into Colruyt Collect&Go
products using a year of receipt data, and fills the Collect&Go basket.

The foundation (Convex Auth, the Tamagui design system, the mobile app shell)
is copied from the Ella repo. The plan and the decisions behind it are in
[`docs/PLAN.md`](docs/PLAN.md).

## Structure

| Path                | What                                         |
| ------------------- | -------------------------------------------- |
| `apps/mobile`       | Expo / React Native app                      |
| `packages/backend`  | Convex functions and schema                  |
| `packages/ui`       | Tamagui design system                        |
| `packages/shared`   | Dependency-free helpers and shared config    |
| `docs/`             | The plan                                     |

## Setup

```bash
pnpm install
cp .env.example .env    # points the app at the dev deployment
```

The Convex deployment's environment variables are listed in
[`packages/backend/README.md`](packages/backend/README.md).

## Running and checks

```bash
pnpm dev            # Convex
pnpm dev:all        # Convex + mobile (Expo)
pnpm format:check && pnpm lint && pnpm check-types && pnpm test
```

There is no GitHub remote yet, so `.github/workflows/pr-checks.yml` does not
run; run the checks above locally before merging into `develop`.
