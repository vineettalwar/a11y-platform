# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## GitHub Sync

The GitHub repo (`https://github.com/vineettalwar/a11y-platform.git`) is automatically kept in sync via the post-merge hook in `scripts/post-merge.sh`. After every task merge, the script pushes `HEAD` to the `main` branch using the `GITHUB_TOKEN` secret. A `--force-with-lease` push is used so Replit is always the source of truth while still guarding against accidentally overwriting unexpected remote commits. If `GITHUB_TOKEN` is unset the push step is skipped gracefully.

## Branch Protection

The `main` branch on GitHub is protected with the following rules (applied via the GitHub REST API):

- **Direct pushes are blocked** — all changes must arrive through a pull request
- **At least 1 approving review** is required before a PR can be merged
- **Stale reviews are dismissed** when new commits are pushed to the PR branch
- **Force pushes and branch deletions are disabled**

To reapply these rules (e.g. after a repo transfer or accidental removal):

```bash
GITHUB_TOKEN=<pat> pnpm --filter @workspace/scripts run protect-branch
```

The script lives at `scripts/src/protect-branch.ts` and uses the GitHub REST API (`PUT /repos/{owner}/{repo}/branches/{branch}/protection`). The token needs `repo` scope.
