# OARC

OARC is a club management portal for members, attendance, tasks, events, fundraisers, and announcements.

## Setup

Use Node.js 24 and pnpm. Install dependencies with `pnpm install --frozen-lockfile`.

Set these environment variables in the API's deployment settings (Replit Secrets on Replit):

- `DATABASE_URL`: the PostgreSQL connection string.
- `OARC_PASSCODE`: a **new** club passcode. The old passcode was committed to Git and must be considered exposed; removing it from current source does not erase Git history.
- `OARC_ALLOWED_EMAILS`: comma-separated school emails allowed to edit club records. The allowlist is server configuration, not a public source file.
- `SESSION_SECRET`: a randomly generated value of at least 32 characters. For example, generate one locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Production refuses missing or short secrets. Changing it invalidates existing sessions.
- `CORS_ORIGINS` (optional): comma-separated exact frontend origins when the browser calls a separately hosted API. Leave empty for same-origin hosting.

The `.env.example` file documents these values. The application reads its process environment; a local `.env` file is not automatically loaded. Do not commit populated credentials.

Start the API with `PORT=5000 pnpm --filter @workspace/api-server run dev`. For the frontend, set `PORT` and `BASE_PATH` (usually `/`) and run `pnpm --filter @workspace/club-hub run dev`. Hosting must route `/api` to the API service.

The existing public read-only view remains available. Authentication permits edits; it is not an individual school account verification system. The shared passcode must only be given to authorized editors. The default session store is in memory, so sessions reset when the API restarts and this configuration should run as a single API instance.

## Checks

- `pnpm run typecheck`
- `pnpm --filter @workspace/api-server test`
- `PORT=5173 BASE_PATH=/ pnpm run build`

Regenerate the API client and validation schemas after changing `lib/api-spec/openapi.yaml`:

```sh
pnpm --filter @workspace/api-spec run codegen
```

Regression tests cover malformed logins, session renewal and logout, login rate limits, production session secrets, nullable update fields, and calendar dates in the America/Los_Angeles timezone. They do not need a database; validating database operations against a deployed PostgreSQL instance is a separate integration check.
