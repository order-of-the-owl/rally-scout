# Rally Scout

Rally Scout helps club table tennis players stop losing to the same opponents for the same reasons. Score matches point by point, see your patterns, and get an AI scouting report before the rematch.

Built with Next.js, TypeScript, Postgres (Drizzle), Clerk and Gemini.

## What you need

- [Node.js](https://nodejs.org) 20.12 or newer
- [pnpm](https://pnpm.io) 12: `npm install -g pnpm@12.16.1`
- [Docker Desktop](https://www.docker.com/products/docker-desktop), which runs the local database
- A free [Clerk](https://clerk.com) application with Google and email sign-in turned on
- A free [Gemini API key](https://aistudio.google.com)

## Setup

1. Clone the repo and install dependencies:

   ```bash
   git clone https://github.com/order-of-the-owl/rally-scout.git
   cd rally-scout
   pnpm install
   ```

2. Create your env file:

   ```bash
   cp .env.example .env.local
   ```

3. Fill in these values in `.env.local`:

   ```
   DATABASE_URL=postgresql://rally_scout:rally_scout@localhost:5432/rally_scout
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<from Clerk>
   CLERK_SECRET_KEY=<from Clerk>
   AI_API_KEY=<your Gemini key>
   ```

   The app won't start if any of these are missing. Leave the other values as they are.

4. Start the database and create the tables:

   ```bash
   pnpm services:up
   pnpm db:migrate
   ```

5. Run the app:

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) and create an account.

## Add demo data (optional)

Sign up and finish onboarding first, then copy your user ID from the Clerk dashboard and run:

```bash
pnpm db:seed --user <your Clerk user ID>
```

This adds 4 opponents and 14 matches. You can run it again safely, as it only replaces its own demo data.

## Useful commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Runs the app locally |
| `pnpm build` | Creates a production build |
| `pnpm lint` | Checks code style |
| `pnpm typecheck` | Checks types |
| `pnpm test` | Runs the unit tests |
| `pnpm test:integration` | Runs the database tests against local Docker |
| `pnpm db:generate` | Creates a migration after a schema change |
| `pnpm db:migrate` | Applies migrations to the database in `DATABASE_URL` |
| `pnpm services:down` | Stops the local database and keeps your data |

## Deploying

The app runs on [Vercel](https://vercel.com) with a [Neon](https://neon.com) database, and both have free plans.

1. Create a Neon project and apply the migrations using its **direct** connection string:

   ```bash
   DATABASE_URL='<direct Neon string>' pnpm db:migrate
   ```

2. Import the repo into Vercel and add these environment variables:
   - `DATABASE_URL`: the **pooled** Neon string
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `AI_API_KEY`
3. Deploy. Every push to `main` then deploys automatically.

If sign-in is rejected on your Vercel URL, add that URL to the allowed origins in your Clerk settings.
