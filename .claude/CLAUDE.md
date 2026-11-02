# Rally Scout

Table tennis match logging and scouting app.

Design principle: code computes the facts; AI interprets them.

## Workflow

- Build one phase at a time. Never start the next phase until asked.
- Work commit by commit: one logical change per commit, then stop for review.
- Ask before adding a new dependency.
- Never commit secrets, and never print them in command output.

## Commands

Package manager is pnpm. These are available once the app is scaffolded:

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm db:migrate`
- `pnpm db:seed`

## Rules and skills

- Standards live in `.claude/rules/`: `code-style.md`, `typescript.md`, `configuration.md`, `logging.md`, `architecture.md`.
- Repeatable workflows live in `.claude/skills/`: `phase`, `db-change`, `ai-feature`.
