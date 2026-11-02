---
name: phase
description: Plan and build one phase of work, commit by commit. Use when asked to start, continue or check a build phase.
argument-hint: <what to build>
disable-model-invocation: true
---

Work on: $ARGUMENTS

1. Make sure the scope and the criteria for done are clear. If they aren't, ask.
2. Check that the work this depends on is finished. If it isn't, say so and stop.
3. Propose a short list of commits, each one logical change. List anything you need from the user, such as accounts, keys or new dependencies. Wait for approval.
4. Build only the next commit on the list, following `.claude/rules/`.
5. Run the checks and report the results. Commit when the user approves.
6. Stop and wait before the next commit.

When every commit is done, go through the criteria for done one at a time and report each as met or not met, with how you verified it. Don't start the next phase.
