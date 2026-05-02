/**
 * Applies GitHub branch protection rules to the `main` branch of
 * vineettalwar/a11y-platform.
 *
 * Rules enforced:
 *  - Direct pushes to `main` are blocked
 *  - All changes must arrive via a pull request
 *  - At least 1 approving review is required before merging
 *  - Stale reviews are dismissed when new commits are pushed
 *  - Force pushes and branch deletions are disabled
 *
 * Usage:
 *   GITHUB_TOKEN=<pat> pnpm --filter @workspace/scripts run protect-branch
 *
 * The token needs `repo` scope (for private repos) or `public_repo` (for public).
 */

const OWNER = "vineettalwar";
const REPO = "a11y-platform";
const BRANCH = "main";

const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error("ERROR: GITHUB_TOKEN environment variable is not set.");
  process.exit(1);
}

const url = `https://api.github.com/repos/${OWNER}/${REPO}/branches/${BRANCH}/protection`;

const protectionRules = {
  required_status_checks: null,
  enforce_admins: false,
  required_pull_request_reviews: {
    dismiss_stale_reviews: true,
    require_code_owner_reviews: false,
    required_approving_review_count: 1,
  },
  restrictions: null,
  allow_force_pushes: false,
  allow_deletions: false,
  block_creations: false,
  required_conversation_resolution: false,
};

const response = await fetch(url, {
  method: "PUT",
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  },
  body: JSON.stringify(protectionRules),
});

if (!response.ok) {
  const error = await response.json();
  console.error(`ERROR ${response.status}:`, JSON.stringify(error, null, 2));
  process.exit(1);
}

const result = await response.json();
console.log(`Branch protection applied to '${BRANCH}':`);
console.log(
  `  Required PR reviews: ${result.required_pull_request_reviews?.required_approving_review_count} approver(s)`
);
console.log(
  `  Dismiss stale reviews: ${result.required_pull_request_reviews?.dismiss_stale_reviews}`
);
console.log(
  `  Force pushes allowed: ${result.allow_force_pushes?.enabled ?? false}`
);
console.log(
  `  Branch deletions allowed: ${result.allow_deletions?.enabled ?? false}`
);
console.log(`\nView settings: https://github.com/${OWNER}/${REPO}/settings/branches`);
