# Management and coding workflow

Product director supplies occasional goals and playtest feedback. Manager translates decisions into prioritized GitHub issues, reviews diffs and test evidence, updates roadmap and identifies blockers. Coding agent executes one ready issue per run, following AGENTS.md. GitHub stores handoffs; do not rely on chat history.

## Initial handoff (manual until dispatch is verified)
Open a GitHub-connected coding agent with repository astrgd27/CardGameCreator and current main after bootstrap merges. Give it this standing prompt:

> Read AGENTS.md, ROADMAP.md and DEVELOPMENT_STATUS.md. Inspect open issues and PRs. Select the highest-priority ready implementation issue (start with #1; skip management-only #9). Implement and test it on a dedicated branch, open a PR, and stop for review. If blocked, document why in the issue. Do not merge or deploy.

Manager checks PR diff, actual CI status, acceptance criteria and compatibility; requests fixes or recommends merge. Product director approves merge until a later policy explicitly delegates it. Use milestone summaries instead of repeated chat transcripts.

## Automation
First verify agent access and actual dispatch mechanism (#9). A scheduled management review may inspect open issues, PRs and CI and produce a short report or issue comments; it cannot be assumed to start a separate Work chat. A real dispatch integration (e.g. approved coding agent/API) needs configuration, credentials held outside repo, scoped permissions, cost caps, idempotent task claiming, concurrency limits and a stop switch. Do not enable unattended merges or deployments. No dispatch integration is installed by this documentation.
