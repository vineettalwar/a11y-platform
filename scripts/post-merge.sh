#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter db push

if [ -n "$GITHUB_TOKEN" ]; then
  REMOTE_URL="https://x-access-token:${GITHUB_TOKEN}@github.com/vineettalwar/a11y-platform.git"
  git fetch "$REMOTE_URL" main:refs/remotes/github-mirror/main 2>/dev/null || true
  git push --force-with-lease=main:refs/remotes/github-mirror/main "$REMOTE_URL" HEAD:main
else
  echo "GITHUB_TOKEN is not set — skipping GitHub sync"
fi
