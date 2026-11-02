# Code style

## Naming

- Names must make the code readable on their own. Prefer `pointsWonOnServe` to `pts` or `data`.
- No abbreviations except widely known ones (`id`, `url`, `db`, `ai`).
- Booleans read as questions: `isComplete`, `hasNotes`, `canAddPoint`.
- Functions start with a verb: `deriveState`, `computeMatchStats`.

## Comments

- Don't flood the code with comments or docstrings. Most code needs none.
- Don't restate what the code does, and don't narrate changes or reference tasks and phases.
- Write a comment only when the reason is not obvious, such as a table tennis rule edge case or a workaround. Keep it to one line where possible.
- If code needs a comment to be understood, try a better name or a smaller function first.

## Structure

- Keep functions small and single-purpose. Prefer early returns to nesting.
- No dead code, commented-out code or unused exports.
