# Backend

Convex backend for Personal Assistant: auth, users, and (later) the
household, recipes, receipts and baskets. See `docs/PLAN.md` at the repo root.

## Usage in other packages

```typescript
import { api } from '@pa/backend/api'
import type { Id } from '@pa/backend/dataModel'
```

## Deployment environment variables

Set with `npx convex env set <NAME> <value>` from this folder:

| Name                     | What                                                           |
| ------------------------ | -------------------------------------------------------------- |
| `JWT_PRIVATE_KEY`, `JWKS` | from `node scripts/generateKeys.mjs`                          |
| `AUTH_RESEND_KEY`        | Resend API key for verification and password-reset emails      |
| `EMAIL_FROM`             | optional; defaults to `Personal Assistant <noreply@buitenzijnvzw.be>` |
| `SITE_URL`               | optional; only for web redirects, unused while there is no web app |

`CONVEX_SITE_URL` is set by Convex itself; the password-reset email links to
its `/reset-password` page (see `convex/http.ts`).
