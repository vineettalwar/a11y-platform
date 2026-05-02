import { Router, Request, Response } from "express";
import { db, githubConnections, connectedRepos, scanResults, scanHistory } from "@workspace/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { ARIA_SYSTEM_PROMPT } from "./chat";

const router = Router();

interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
}

interface GitHubRepo {
  id: number;
  full_name: string;
  name: string;
  owner: { login: string };
  private: boolean;
  description: string | null;
  default_branch: string;
}

interface GitHubTreeEntry {
  path: string;
  type: string;
  url: string;
}

interface GitHubTreeResponse {
  tree: GitHubTreeEntry[];
}

interface GitHubFileResponse {
  encoding: string;
  content: string;
}

async function fetchGitHub<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

router.post("/github/connect", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "You must be logged in to connect GitHub" });
      return;
    }

    const { token } = req.body as { token?: unknown };
    if (!token || typeof token !== "string") {
      res.status(400).json({ error: "Token is required" });
      return;
    }

    const userId = req.user.id;
    const user = await fetchGitHub<GitHubUser>("/user", token);

    await db
      .insert(githubConnections)
      .values({
        userId,
        accessToken: token,
        githubLogin: user.login,
        githubUserId: String(user.id),
      })
      .onConflictDoUpdate({
        target: githubConnections.userId,
        set: {
          accessToken: token,
          githubLogin: user.login,
          githubUserId: String(user.id),
          updatedAt: new Date(),
        },
      });

    res.json({ login: user.login, avatarUrl: user.avatar_url });
  } catch (err: unknown) {
    console.error("GitHub connect error:", err);
    res.status(401).json({ error: "Invalid GitHub token — check your PAT has repo and read:user scopes" });
  }
});

router.get("/github/status", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      res.json({ connected: false });
      return;
    }

    const userId = req.user.id;

    const [conn] = await db
      .select()
      .from(githubConnections)
      .where(eq(githubConnections.userId, userId))
      .limit(1);

    if (!conn) {
      res.json({ connected: false });
      return;
    }

    const user = await fetchGitHub<GitHubUser>("/user", conn.accessToken);
    res.json({ connected: true, login: conn.githubLogin, avatarUrl: user.avatar_url });
  } catch {
    res.json({ connected: false });
  }
});

router.delete("/github/disconnect", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const userId = req.user.id;
    await db.delete(scanHistory).where(eq(scanHistory.userId, userId));
    await db.delete(scanResults).where(eq(scanResults.userId, userId));
    await db.delete(connectedRepos).where(eq(connectedRepos.userId, userId));
    await db.delete(githubConnections).where(eq(githubConnections.userId, userId));

    res.json({ success: true });
  } catch (err: unknown) {
    console.error("Disconnect error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/github/repos", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Not connected to GitHub" });
      return;
    }

    const userId = req.user.id;

    const [conn] = await db
      .select()
      .from(githubConnections)
      .where(eq(githubConnections.userId, userId))
      .limit(1);

    if (!conn) {
      res.status(401).json({ error: "Not connected to GitHub" });
      return;
    }

    const repos = await fetchGitHub<GitHubRepo[]>(
      "/user/repos?per_page=100&sort=updated&type=all",
      conn.accessToken,
    );

    res.json({
      repos: repos.map((r) => ({
        id: r.id,
        fullName: r.full_name,
        name: r.name,
        owner: r.owner.login,
        private: r.private,
        description: r.description,
        defaultBranch: r.default_branch,
      })),
    });
  } catch (err: unknown) {
    console.error("List repos error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/github/connect-repo", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Not connected to GitHub" });
      return;
    }

    const userId = req.user.id;

    const { repoFullName } = req.body as { repoFullName?: unknown };
    if (!repoFullName || typeof repoFullName !== "string") {
      res.status(400).json({ error: "repoFullName is required" });
      return;
    }
    const repoParts = repoFullName.split("/");
    if (repoParts.length !== 2 || !repoParts[0] || !repoParts[1]) {
      res.status(400).json({ error: "repoFullName must be in owner/repo format" });
      return;
    }

    const [owner, name] = repoParts;

    const existing = await db
      .select()
      .from(connectedRepos)
      .where(
        and(
          eq(connectedRepos.userId, userId),
          eq(connectedRepos.repoFullName, repoFullName),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      const r = existing[0];
      res.json({
        repo: {
          id: r.id,
          repoFullName: r.repoFullName,
          repoOwner: r.repoOwner,
          repoName: r.repoName,
          lastScannedAt: r.lastScannedAt?.toISOString() ?? null,
        },
      });
      return;
    }

    const [repo] = await db
      .insert(connectedRepos)
      .values({ userId, repoOwner: owner, repoName: name, repoFullName })
      .returning();

    res.json({
      repo: {
        id: repo.id,
        repoFullName: repo.repoFullName,
        repoOwner: repo.repoOwner,
        repoName: repo.repoName,
        lastScannedAt: repo.lastScannedAt?.toISOString() ?? null,
      },
    });
  } catch (err: unknown) {
    console.error("Connect repo error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/github/connected-repos", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      res.json({ repos: [] });
      return;
    }

    const userId = req.user.id;

    const repos = await db
      .select()
      .from(connectedRepos)
      .where(eq(connectedRepos.userId, userId))
      .orderBy(desc(connectedRepos.createdAt));

    res.json({
      repos: repos.map((r) => ({
        id: r.id,
        repoFullName: r.repoFullName,
        repoOwner: r.repoOwner,
        repoName: r.repoName,
        lastScannedAt: r.lastScannedAt?.toISOString() ?? null,
      })),
    });
  } catch (err: unknown) {
    console.error("Connected repos error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

type Severity = "critical" | "serious" | "moderate" | "minor";

interface WcagRule {
  id: string;
  pattern: RegExp;
  severity: Severity;
  description: string;
  wcagCriterion: string;
  getElement: (match: string) => string;
}

const WCAG_RULES: WcagRule[] = [
  {
    id: "missing-alt",
    pattern: /<img(?![^>]*alt=)[^>]*>/gi,
    severity: "critical",
    description: "Image missing alt attribute",
    wcagCriterion: "1.1.1 Non-text Content",
    getElement: (m) => m.slice(0, 60),
  },
  {
    id: "empty-alt",
    pattern: /<img[^>]*alt=""\s*[^>]*>/gi,
    severity: "serious",
    description: "Image has empty alt attribute — may be decorative or missing meaningful description",
    wcagCriterion: "1.1.1 Non-text Content",
    getElement: (m) => m.slice(0, 60),
  },
  {
    id: "missing-form-label",
    pattern: /<input(?![^>]*(?:aria-label|aria-labelledby|id=))[^>]*>/gi,
    severity: "critical",
    description: "Form input missing accessible label",
    wcagCriterion: "1.3.1 Info and Relationships",
    getElement: (m) => m.slice(0, 60),
  },
  {
    id: "empty-button",
    pattern: /<button[^>]*>\s*<\/button>/gi,
    severity: "critical",
    description: "Button has no text content or accessible label",
    wcagCriterion: "4.1.2 Name, Role, Value",
    getElement: (m) => m.slice(0, 60),
  },
  {
    id: "empty-link",
    pattern: /<a[^>]*href[^>]*>\s*<\/a>/gi,
    severity: "critical",
    description: "Link has no text content or accessible label",
    wcagCriterion: "2.4.4 Link Purpose",
    getElement: (m) => m.slice(0, 60),
  },
  {
    id: "missing-lang",
    pattern: /<html(?![^>]*lang=)[^>]*>/gi,
    severity: "serious",
    description: "HTML element missing lang attribute",
    wcagCriterion: "3.1.1 Language of Page",
    getElement: (m) => m.slice(0, 60),
  },
  {
    id: "onclick-no-keyboard",
    pattern: /<div[^>]*onClick[^>]*>/gi,
    severity: "serious",
    description: "Interactive div using onClick without keyboard support — use a button or add onKeyDown",
    wcagCriterion: "2.1.1 Keyboard",
    getElement: (m) => m.slice(0, 60),
  },
  {
    id: "outline-none",
    pattern: /outline\s*:\s*none|outline\s*:\s*0/gi,
    severity: "serious",
    description: "Focus outline removed — keyboard users lose focus visibility",
    wcagCriterion: "2.4.7 Focus Visible",
    getElement: (m) => m.slice(0, 60),
  },
  {
    id: "autoplay-media",
    pattern: /<(?:video|audio)[^>]*autoplay[^>]*>/gi,
    severity: "serious",
    description: "Media with autoplay may cause accessibility issues",
    wcagCriterion: "1.4.2 Audio Control",
    getElement: (m) => m.slice(0, 60),
  },
  {
    id: "table-no-headers",
    pattern: /<table(?![^<]*<th)[^>]*>[\s\S]*?<\/table>/gi,
    severity: "moderate",
    description: "Table without header cells — screen readers cannot associate data cells",
    wcagCriterion: "1.3.1 Info and Relationships",
    getElement: () => "<table> (no <th>)",
  },
  {
    id: "generic-link-text",
    pattern: /<a[^>]*href[^>]*>\s*(?:click here|read more|learn more|here|more)\s*<\/a>/gi,
    severity: "moderate",
    description: "Non-descriptive link text — screen reader users cannot determine link purpose",
    wcagCriterion: "2.4.4 Link Purpose",
    getElement: (m) => m.slice(0, 60),
  },
  {
    id: "missing-input-type",
    pattern: /<input(?![^>]*type=)[^>]*>/gi,
    severity: "minor",
    description: "Input missing type attribute — may affect keyboard and assistive technology behavior",
    wcagCriterion: "1.3.5 Identify Input Purpose",
    getElement: (m) => m.slice(0, 60),
  },
  {
    id: "max-scale-restriction",
    pattern: /maximum-scale\s*=\s*1|user-scalable\s*=\s*no/gi,
    severity: "minor",
    description: "Viewport meta restricts zooming — users with low vision cannot enlarge text",
    wcagCriterion: "1.4.4 Resize text",
    getElement: (m) => m.slice(0, 60),
  },
  {
    id: "missing-button-type",
    pattern: /<button(?![^>]*type=)[^>]*>/gi,
    severity: "minor",
    description: "Button missing type attribute — defaults to submit which may cause unexpected form behavior",
    wcagCriterion: "4.1.2 Name, Role, Value",
    getElement: (m) => m.slice(0, 60),
  },
  // --- New WCAG rules ---
  {
    id: "heading-skip",
    pattern: /<h[1-6][^>]*>/gi,
    severity: "moderate",
    description: "Heading level skipped — assistive technologies expect sequential heading hierarchy (e.g. h1→h2→h3)",
    wcagCriterion: "1.3.1 Info and Relationships",
    getElement: (m) => m.slice(0, 60),
  },
  {
    id: "missing-main-landmark",
    pattern: /^(?![\s\S]*<main[\s>])[\s\S]*$/gi,
    severity: "moderate",
    description: "Page missing <main> landmark — screen reader users cannot skip to main content",
    wcagCriterion: "1.3.6 Identify Purpose",
    getElement: () => "(no <main> landmark found)",
  },
  {
    id: "aria-hidden-focusable",
    pattern: /<(?:button|a|input|select|textarea)[^>]*aria-hidden\s*=\s*["']true["'][^>]*>/gi,
    severity: "critical",
    description: "Focusable element has aria-hidden=\"true\" — it is hidden from assistive technology but still receives keyboard focus",
    wcagCriterion: "4.1.2 Name, Role, Value",
    getElement: (m) => m.slice(0, 60),
  },
  {
    id: "invalid-aria-role",
    pattern: /role\s*=\s*["'](?!alert|alertdialog|application|article|banner|button|cell|checkbox|columnheader|combobox|complementary|contentinfo|definition|dialog|directory|document|feed|figure|form|grid|gridcell|group|heading|img|link|list|listbox|listitem|log|main|marquee|math|menu|menubar|menuitem|menuitemcheckbox|menuitemradio|navigation|none|note|option|presentation|progressbar|radio|radiogroup|region|row|rowgroup|rowheader|scrollbar|search|searchbox|separator|slider|spinbutton|status|switch|tab|table|tablist|tabpanel|term|textbox|timer|toolbar|tooltip|tree|treegrid|treeitem)([^"']+)["']/gi,
    severity: "serious",
    description: "Invalid ARIA role value — role does not match any allowed WAI-ARIA role",
    wcagCriterion: "4.1.2 Name, Role, Value",
    getElement: (m) => m.slice(0, 80),
  },
  {
    id: "iframe-missing-title",
    pattern: /<iframe(?![^>]*title=)[^>]*>/gi,
    severity: "serious",
    description: "<iframe> missing title attribute — screen readers cannot identify embedded content",
    wcagCriterion: "4.1.2 Name, Role, Value",
    getElement: (m) => m.slice(0, 60),
  },
  {
    id: "missing-skip-nav",
    pattern: /^(?![\s\S]*href\s*=\s*["']#(?:main|main-content|content|skip)["'])[\s\S]*$/gi,
    severity: "moderate",
    description: "Page missing skip navigation link — keyboard users cannot bypass repetitive navigation blocks",
    wcagCriterion: "2.4.1 Bypass Blocks",
    getElement: () => "(no skip-nav anchor found)",
  },
  {
    id: "missing-nav-landmark",
    pattern: /^(?![\s\S]*<nav[\s>])[\s\S]*$/gi,
    severity: "moderate",
    description: "Page missing <nav> landmark — screen reader users cannot navigate directly to navigation regions",
    wcagCriterion: "1.3.6 Identify Purpose",
    getElement: () => "(no <nav> landmark found)",
  },
  {
    id: "missing-header-landmark",
    pattern: /^(?![\s\S]*<header[\s>])[\s\S]*$/gi,
    severity: "minor",
    description: "Page missing <header> landmark — site header region is not identified for assistive technologies",
    wcagCriterion: "1.3.6 Identify Purpose",
    getElement: () => "(no <header> landmark found)",
  },
];

interface Finding {
  ruleId: string;
  severity: Severity;
  description: string;
  wcagCriterion: string;
  element: string;
  lineNumber: number;
}

function analyzeFileContent(content: string, filePath: string): Finding[] {
  const findings: Finding[] = [];
  const isHtmlFile = /\.(html|htm)$/i.test(filePath);

  // Duplicate ID check (custom logic — cannot be done with a simple regex)
  const PAGE_EXTENSIONS = /\.(html|htm|jsx|tsx|vue|svelte)$/i;
  if (PAGE_EXTENSIONS.test(filePath)) {
    const idRegex = /\bid\s*=\s*["']([^"']+)["']/gi;
    const idCounts = new Map<string, number>();
    let idMatch: RegExpExecArray | null;
    while ((idMatch = idRegex.exec(content)) !== null) {
      const idVal = idMatch[1]!.trim();
      idCounts.set(idVal, (idCounts.get(idVal) ?? 0) + 1);
    }
    for (const [idVal, count] of idCounts) {
      if (count > 1) {
        findings.push({
          ruleId: "duplicate-id",
          severity: "critical",
          description: `Duplicate id="${idVal}" found ${count} times — IDs must be unique per page`,
          wcagCriterion: "4.1.1 Parsing",
          element: `id="${idVal}"`,
          lineNumber: 1,
        });
        if (findings.length >= 50) return findings;
      }
    }
  }

  // div[role="button"] without tabindex — post-match filter avoids lookahead false positives
  {
    const divRoleButtonRegex = /<div[^>]*role\s*=\s*["']button["'][^>]*>/gi;
    let m: RegExpExecArray | null;
    while ((m = divRoleButtonRegex.exec(content)) !== null) {
      if (!/tabindex/i.test(m[0])) {
        findings.push({
          ruleId: "div-role-button-no-tabindex",
          severity: "serious",
          description: "<div role=\"button\"> missing tabindex — element is not keyboard-reachable",
          wcagCriterion: "2.1.1 Keyboard",
          element: m[0].slice(0, 60),
          lineNumber: content.slice(0, m.index).split("\n").length,
        });
        if (findings.length >= 50) return findings;
      }
    }
  }

  // <input type="image"> without alt — post-match filter avoids lookahead false positives
  {
    const inputImageRegex = /<input[^>]*type\s*=\s*["']image["'][^>]*>/gi;
    let m: RegExpExecArray | null;
    while ((m = inputImageRegex.exec(content)) !== null) {
      if (!/\balt\s*=/i.test(m[0])) {
        findings.push({
          ruleId: "input-image-missing-alt",
          severity: "critical",
          description: "<input type=\"image\"> missing alt attribute — image button purpose is not conveyed to screen readers",
          wcagCriterion: "1.1.1 Non-text Content",
          element: m[0].slice(0, 60),
          lineNumber: content.slice(0, m.index).split("\n").length,
        });
        if (findings.length >= 50) return findings;
      }
    }
  }

  const PAGE_LEVEL_RULES = new Set([
    "missing-main-landmark",
    "missing-skip-nav",
    "missing-nav-landmark",
    "missing-header-landmark",
  ]);

  for (const rule of WCAG_RULES) {
    // Page-level rules only run on HTML/JSX/TSX/Vue/Svelte files
    const isPageFile = isHtmlFile || /\.(jsx|tsx|vue|svelte)$/i.test(filePath);
    if (PAGE_LEVEL_RULES.has(rule.id) && !isPageFile) {
      continue;
    }

    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    let match: RegExpExecArray | null;

    // Page-level rules that fire at most once per file
    if (PAGE_LEVEL_RULES.has(rule.id)) {
      match = regex.exec(content);
      if (match) {
        findings.push({
          ruleId: rule.id,
          severity: rule.severity,
          description: rule.description,
          wcagCriterion: rule.wcagCriterion,
          element: rule.getElement(match[0]),
          lineNumber: 1,
        });
      }
      continue;
    }

    // heading-skip: detect actual level skips
    if (rule.id === "heading-skip") {
      const headingMatches: Array<{ level: number; index: number }> = [];
      const headingRegex = /<h([1-6])[^>]*>/gi;
      let hm: RegExpExecArray | null;
      while ((hm = headingRegex.exec(content)) !== null) {
        headingMatches.push({ level: parseInt(hm[1], 10), index: hm.index });
      }
      for (let i = 1; i < headingMatches.length; i++) {
        const prev = headingMatches[i - 1]!;
        const curr = headingMatches[i]!;
        if (curr.level > prev.level + 1) {
          const lineNumber = content.slice(0, curr.index).split("\n").length;
          findings.push({
            ruleId: rule.id,
            severity: rule.severity,
            description: `Heading jumps from h${prev.level} to h${curr.level} — expected h${prev.level + 1}`,
            wcagCriterion: rule.wcagCriterion,
            element: `<h${curr.level}>`,
            lineNumber,
          });
          if (findings.length >= 50) return findings;
        }
      }
      continue;
    }

    while ((match = regex.exec(content)) !== null) {
      const lineNumber = content.slice(0, match.index).split("\n").length;

      findings.push({
        ruleId: rule.id,
        severity: rule.severity,
        description: rule.description,
        wcagCriterion: rule.wcagCriterion,
        element: rule.getElement(match[0]),
        lineNumber,
      });

      if (findings.length >= 50) return findings;
    }
  }

  return findings;
}

const SCANNABLE_EXTENSIONS = [".html", ".htm", ".jsx", ".tsx", ".vue", ".svelte", ".css", ".ts", ".js"];
const DEFAULT_MAX_FILES = 200;

function computeScore(allFindings: Finding[], filesScanned: number): number {
  const counts: Record<Severity, number> = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  for (const f of allFindings) counts[f.severity as Severity]++;
  const maxPossible = filesScanned * 5;
  return Math.max(0, Math.round(100 - (allFindings.length / Math.max(maxPossible, 1)) * 100));
}

router.post("/github/scan", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Not connected to GitHub" });
      return;
    }

    const userId = req.user.id;

    const [conn] = await db
      .select()
      .from(githubConnections)
      .where(eq(githubConnections.userId, userId))
      .limit(1);

    if (!conn) {
      res.status(401).json({ error: "Not connected to GitHub" });
      return;
    }

    const { repoFullName, maxFiles } = req.body as { repoFullName?: unknown; maxFiles?: unknown };
    if (!repoFullName || typeof repoFullName !== "string") {
      res.status(400).json({ error: "repoFullName is required" });
      return;
    }
    const scanParts = repoFullName.split("/");
    if (scanParts.length !== 2 || !scanParts[0] || !scanParts[1]) {
      res.status(400).json({ error: "repoFullName must be in owner/repo format" });
      return;
    }

    const fileLimit = typeof maxFiles === "number" && maxFiles > 0 ? Math.min(maxFiles, 1000) : DEFAULT_MAX_FILES;

    const [owner, repoName] = scanParts;
    const scanId = crypto.randomUUID();

    const repoInfo = await fetchGitHub<{ default_branch: string }>(
      `/repos/${owner}/${repoName}`,
      conn.accessToken,
    );
    const treeResp = await fetchGitHub<GitHubTreeResponse>(
      `/repos/${owner}/${repoName}/git/trees/${repoInfo.default_branch}?recursive=1`,
      conn.accessToken,
    );

    const filesToScan = treeResp.tree
      .filter(
        (f) =>
          f.type === "blob" &&
          SCANNABLE_EXTENSIONS.some((ext) => f.path.toLowerCase().endsWith(ext)),
      )
      .slice(0, fileLimit);

    const allFindings: Array<Finding & { filePath: string }> = [];

    for (const file of filesToScan) {
      try {
        const fileData = await fetchGitHub<GitHubFileResponse>(
          `/repos/${owner}/${repoName}/contents/${file.path}`,
          conn.accessToken,
        );
        if (fileData.encoding === "base64" && fileData.content) {
          const content = Buffer.from(
            fileData.content.replace(/\n/g, ""),
            "base64",
          ).toString("utf-8");
          const findings = analyzeFileContent(content, file.path);
          for (const f of findings) {
            allFindings.push({ filePath: file.path, ...f });
          }
        }
      } catch {
        // Skip individual files that cannot be fetched
      }
    }

    if (allFindings.length > 0) {
      await db.insert(scanResults).values(
        allFindings.map((f) => ({
          userId,
          repoFullName,
          scanId,
          filePath: f.filePath,
          lineNumber: f.lineNumber,
          ruleId: f.ruleId,
          severity: f.severity,
          description: f.description,
          element: f.element,
          wcagCriterion: f.wcagCriterion,
          status: "open",
        })),
      );
    }

    await db
      .update(connectedRepos)
      .set({ lastScannedAt: new Date() })
      .where(
        and(
          eq(connectedRepos.userId, userId),
          eq(connectedRepos.repoFullName, repoFullName),
        ),
      );

    const counts: Record<Severity, number> = { critical: 0, serious: 0, moderate: 0, minor: 0 };
    for (const f of allFindings) counts[f.severity]++;

    const totalIssues = allFindings.length;
    const score = computeScore(allFindings, filesToScan.length);

    await db.insert(scanHistory).values({
      userId,
      repoFullName,
      scanId,
      scannedAt: new Date(),
      complianceScore: score,
      totalIssues,
      criticalCount: counts.critical,
      seriousCount: counts.serious,
      moderateCount: counts.moderate,
      minorCount: counts.minor,
    });

    res.json({
      repoFullName,
      summary: {
        score,
        totalIssues,
        ...counts,
        filesScanned: filesToScan.length,
        scannedAt: new Date().toISOString(),
      },
      issues: allFindings.map((f, i) => ({
        id: `ISS-${String(i + 1).padStart(2, "0")}`,
        filePath: f.filePath,
        lineNumber: f.lineNumber,
        ruleId: f.ruleId,
        severity: f.severity,
        description: f.description,
        element: f.element,
        wcagCriterion: f.wcagCriterion,
        status: "open",
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Scan error:", err);
    res.status(500).json({ error: message });
  }
});

router.get("/github/scan-stream", async (req: Request, res: Response) => {
  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    if (!req.isAuthenticated()) {
      send("error", { message: "Not authenticated" });
      res.end();
      return;
    }

    const userId = req.user.id;

    const [conn] = await db
      .select()
      .from(githubConnections)
      .where(eq(githubConnections.userId, userId))
      .limit(1);

    if (!conn) {
      send("error", { message: "Not connected to GitHub" });
      res.end();
      return;
    }

    const repoFullName = req.query["repoFullName"];
    const maxFilesParam = req.query["maxFiles"];

    if (!repoFullName || typeof repoFullName !== "string") {
      send("error", { message: "repoFullName is required" });
      res.end();
      return;
    }

    const scanParts = repoFullName.split("/");
    if (scanParts.length !== 2 || !scanParts[0] || !scanParts[1]) {
      send("error", { message: "repoFullName must be in owner/repo format" });
      res.end();
      return;
    }

    const fileLimit = maxFilesParam ? Math.min(Math.max(1, parseInt(maxFilesParam as string, 10) || DEFAULT_MAX_FILES), 1000) : DEFAULT_MAX_FILES;

    const [owner, repoName] = scanParts;
    const scanId = crypto.randomUUID();

    const repoInfo = await fetchGitHub<{ default_branch: string }>(
      `/repos/${owner}/${repoName}`,
      conn.accessToken,
    );
    const treeResp = await fetchGitHub<GitHubTreeResponse>(
      `/repos/${owner}/${repoName}/git/trees/${repoInfo.default_branch}?recursive=1`,
      conn.accessToken,
    );

    const filesToScan = treeResp.tree
      .filter(
        (f) =>
          f.type === "blob" &&
          SCANNABLE_EXTENSIONS.some((ext) => f.path.toLowerCase().endsWith(ext)),
      )
      .slice(0, fileLimit);

    send("start", { total: filesToScan.length });

    const allFindings: Array<Finding & { filePath: string }> = [];

    for (let i = 0; i < filesToScan.length; i++) {
      const file = filesToScan[i];
      if (!file) continue;

      send("progress", {
        current: i + 1,
        total: filesToScan.length,
        filePath: file.path,
      });

      try {
        const fileData = await fetchGitHub<GitHubFileResponse>(
          `/repos/${owner}/${repoName}/contents/${file.path}`,
          conn.accessToken,
        );
        if (fileData.encoding === "base64" && fileData.content) {
          const content = Buffer.from(
            fileData.content.replace(/\n/g, ""),
            "base64",
          ).toString("utf-8");
          const findings = analyzeFileContent(content, file.path);
          for (const f of findings) {
            allFindings.push({ filePath: file.path, ...f });
          }
        }
      } catch {
        // Skip individual files that cannot be fetched
      }
    }

    if (allFindings.length > 0) {
      await db.insert(scanResults).values(
        allFindings.map((f) => ({
          userId,
          repoFullName,
          scanId,
          filePath: f.filePath,
          lineNumber: f.lineNumber,
          ruleId: f.ruleId,
          severity: f.severity,
          description: f.description,
          element: f.element,
          wcagCriterion: f.wcagCriterion,
          status: "open",
        })),
      );
    }

    await db
      .update(connectedRepos)
      .set({ lastScannedAt: new Date() })
      .where(
        and(
          eq(connectedRepos.userId, userId),
          eq(connectedRepos.repoFullName, repoFullName),
        ),
      );

    const counts: Record<Severity, number> = { critical: 0, serious: 0, moderate: 0, minor: 0 };
    for (const f of allFindings) counts[f.severity]++;

    const totalIssues = allFindings.length;
    const score = computeScore(allFindings, filesToScan.length);

    await db.insert(scanHistory).values({
      userId,
      repoFullName,
      scanId,
      scannedAt: new Date(),
      complianceScore: score,
      totalIssues,
      criticalCount: counts.critical,
      seriousCount: counts.serious,
      moderateCount: counts.moderate,
      minorCount: counts.minor,
    });

    send("complete", {
      repoFullName,
      summary: {
        score,
        totalIssues,
        ...counts,
        filesScanned: filesToScan.length,
        scannedAt: new Date().toISOString(),
      },
      issues: allFindings.map((f, i) => ({
        id: `ISS-${String(i + 1).padStart(2, "0")}`,
        filePath: f.filePath,
        lineNumber: f.lineNumber,
        ruleId: f.ruleId,
        severity: f.severity,
        description: f.description,
        element: f.element,
        wcagCriterion: f.wcagCriterion,
        status: "open",
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("Scan stream error:", err);
    send("error", { message });
  } finally {
    res.end();
  }
});

router.get("/github/scan-results", async (req: Request, res: Response) => {
  try {
    const repoFullName = req.query["repoFullName"];

    if (!req.isAuthenticated() || typeof repoFullName !== "string" || !repoFullName) {
      res.json({
        repoFullName: typeof repoFullName === "string" ? repoFullName : "",
        summary: null,
        issues: [],
      });
      return;
    }

    const userId = req.user.id;

    // Get the most recent scanId for this repo/user
    const [latestHistory] = await db
      .select()
      .from(scanHistory)
      .where(
        and(
          eq(scanHistory.userId, userId),
          eq(scanHistory.repoFullName, repoFullName),
        ),
      )
      .orderBy(desc(scanHistory.scannedAt))
      .limit(1);

    if (!latestHistory) {
      res.json({ repoFullName, summary: null, issues: [] });
      return;
    }

    // Only return results from the latest scan
    const results = await db
      .select()
      .from(scanResults)
      .where(
        and(
          eq(scanResults.userId, userId),
          eq(scanResults.repoFullName, repoFullName),
          eq(scanResults.scanId, latestHistory.scanId),
        ),
      )
      .orderBy(desc(scanResults.createdAt));

    if (results.length === 0) {
      res.json({
        repoFullName,
        summary: {
          score: latestHistory.complianceScore,
          totalIssues: 0,
          critical: 0,
          serious: 0,
          moderate: 0,
          minor: 0,
          filesScanned: 0,
          scannedAt: latestHistory.scannedAt.toISOString(),
        },
        issues: [],
      });
      return;
    }

    const counts: Record<Severity, number> = { critical: 0, serious: 0, moderate: 0, minor: 0 };
    for (const r of results) {
      const sev = r.severity as Severity;
      if (sev in counts) counts[sev]++;
    }

    res.json({
      repoFullName,
      summary: {
        score: latestHistory.complianceScore,
        totalIssues: results.length,
        ...counts,
        filesScanned: new Set(results.map((r) => r.filePath)).size,
        scannedAt: latestHistory.scannedAt.toISOString(),
      },
      issues: results.map((r) => ({
        id: String(r.id),
        filePath: r.filePath,
        lineNumber: r.lineNumber,
        ruleId: r.ruleId,
        severity: r.severity,
        description: r.description,
        element: r.element,
        wcagCriterion: r.wcagCriterion,
        status: r.status,
      })),
    });
  } catch (err: unknown) {
    console.error("Scan results error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/github/issues/:id/status
router.patch("/github/issues/:id/status", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const userId = req.user.id;
    const id = parseInt(String(req.params["id"] ?? ""), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid issue ID" });
      return;
    }

    const { status } = req.body as { status?: unknown };
    const VALID_STATUSES = ["open", "in_progress", "resolved"];
    if (!status || typeof status !== "string" || !VALID_STATUSES.includes(status)) {
      res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` });
      return;
    }

    const [updated] = await db
      .update(scanResults)
      .set({ status })
      .where(and(eq(scanResults.id, id), eq(scanResults.userId, userId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Issue not found" });
      return;
    }

    res.json({ id: updated.id, status: updated.status });
  } catch (err: unknown) {
    console.error("Issue status update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/github/issues/bulk-status
router.post("/github/issues/bulk-status", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const userId = req.user.id;
    const { ids, status } = req.body as { ids?: unknown; status?: unknown };

    const VALID_STATUSES = ["open", "in_progress", "resolved"];
    if (!status || typeof status !== "string" || !VALID_STATUSES.includes(status)) {
      res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` });
      return;
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: "ids must be a non-empty array" });
      return;
    }

    const numericIds = ids.map((id) => parseInt(String(id), 10)).filter((id) => !isNaN(id));
    if (numericIds.length === 0) {
      res.status(400).json({ error: "No valid numeric IDs provided" });
      return;
    }

    await db
      .update(scanResults)
      .set({ status })
      .where(and(eq(scanResults.userId, userId), inArray(scanResults.id, numericIds)));

    res.json({ updated: numericIds.length, status });
  } catch (err: unknown) {
    console.error("Bulk status update error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/github/repos/:repoFullName/scan-history
router.get("/github/repos/:owner/:repo/scan-history", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const userId = req.user.id;
    const repoFullName = `${req.params["owner"]}/${req.params["repo"]}`;

    const history = await db
      .select()
      .from(scanHistory)
      .where(
        and(
          eq(scanHistory.userId, userId),
          eq(scanHistory.repoFullName, repoFullName),
        ),
      )
      .orderBy(desc(scanHistory.scannedAt));

    res.json({
      repoFullName,
      history: history.map((h) => ({
        id: h.id,
        scanId: h.scanId,
        scannedAt: h.scannedAt.toISOString(),
        complianceScore: h.complianceScore,
        totalIssues: h.totalIssues,
        criticalCount: h.criticalCount,
        seriousCount: h.seriousCount,
        moderateCount: h.moderateCount,
        minorCount: h.minorCount,
      })),
    });
  } catch (err: unknown) {
    console.error("Scan history error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/github/issues/:id/ai-fix

router.post("/github/issues/:id/ai-fix", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const userId = req.user.id;
    const id = parseInt(String(req.params["id"] ?? ""), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid issue ID" });
      return;
    }

    const [issue] = await db
      .select()
      .from(scanResults)
      .where(and(eq(scanResults.id, id), eq(scanResults.userId, userId)))
      .limit(1);

    if (!issue) {
      res.status(404).json({ error: "Issue not found" });
      return;
    }

    const prompt = `Please provide a specific code fix for this accessibility violation:

**Rule**: ${issue.ruleId}
**WCAG Criterion**: ${issue.wcagCriterion ?? "N/A"}
**Severity**: ${issue.severity}
**Description**: ${issue.description}
**File**: ${issue.filePath}${issue.lineNumber ? ` (Line ${issue.lineNumber})` : ""}
**Affected element**: \`${issue.element ?? "N/A"}\`

Provide the remediation code specific to this exact element and rule.`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await openai.chat.completions.create({
      model: "gpt-4.1",
      max_completion_tokens: 1024,
      messages: [
        { role: "system", content: ARIA_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: unknown) {
    console.error("AI fix error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`);
      res.end();
    }
  }
});

router.get("/github/dashboard", async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      res.json({ repos: [], stats: { totalProperties: 0, openIssues: 0, avgScore: 0 } });
      return;
    }

    const userId = req.user.id;

    const repos = await db
      .select()
      .from(connectedRepos)
      .where(eq(connectedRepos.userId, userId))
      .orderBy(desc(connectedRepos.createdAt));

    const allScanResults = await db
      .select()
      .from(scanResults)
      .where(eq(scanResults.userId, userId))
      .orderBy(desc(scanResults.createdAt));

    const resultsByRepo = new Map<string, typeof allScanResults>();
    for (const r of allScanResults) {
      if (!resultsByRepo.has(r.repoFullName)) resultsByRepo.set(r.repoFullName, []);
      resultsByRepo.get(r.repoFullName)!.push(r);
    }

    // Get latest scan history per repo for scoring
    const allHistory = await db
      .select()
      .from(scanHistory)
      .where(eq(scanHistory.userId, userId))
      .orderBy(desc(scanHistory.scannedAt));

    const latestHistoryByRepo = new Map<string, typeof allHistory[0]>();
    for (const h of allHistory) {
      if (!latestHistoryByRepo.has(h.repoFullName)) {
        latestHistoryByRepo.set(h.repoFullName, h);
      }
    }

    const repoSummaries = repos.map((repo) => {
      const latestHistory = latestHistoryByRepo.get(repo.repoFullName);
      const results = resultsByRepo.get(repo.repoFullName) ?? [];
      // Filter to latest scan only for critical count
      const latestResults = latestHistory
        ? results.filter((r) => r.scanId === latestHistory.scanId)
        : [];
      const criticalIssues = latestResults.filter((r) => r.severity === "critical").length;
      const totalIssues = latestResults.length;
      const score = latestHistory?.complianceScore ?? null;

      let status: string;
      if (score === null) {
        status = "never-scanned";
      } else if (criticalIssues >= 5) {
        status = "critical";
      } else if (criticalIssues > 0) {
        status = "needs-attention";
      } else {
        status = "good";
      }

      return {
        id: String(repo.id),
        repoFullName: repo.repoFullName,
        repoName: repo.repoName,
        repoOwner: repo.repoOwner,
        lastScannedAt: repo.lastScannedAt?.toISOString() ?? null,
        criticalIssues,
        totalIssues,
        score,
        status,
      };
    });

    const scannedRepos = repoSummaries.filter((r) => r.score !== null);
    const avgScore = scannedRepos.length
      ? Math.round(scannedRepos.reduce((a, r) => a + (r.score ?? 0), 0) / scannedRepos.length)
      : 0;

    // Only count open issues from the latest scan per repo
    const latestScanIdsByRepo = new Map<string, string>();
    for (const [repoName, h] of latestHistoryByRepo) {
      latestScanIdsByRepo.set(repoName, h.scanId);
    }
    const openIssues = allScanResults.filter((r) => {
      const latestScanId = latestScanIdsByRepo.get(r.repoFullName);
      return latestScanId && r.scanId === latestScanId && r.status !== "resolved";
    }).length;

    const activityFeed: Array<{ id: string; event: string; time: string; type: string }> = [];
    for (const repo of repos) {
      if (repo.lastScannedAt) {
        activityFeed.push({
          id: `scan-${repo.id}`,
          event: `Scan completed for ${repo.repoFullName}`,
          time: repo.lastScannedAt.toISOString(),
          type: "scan",
        });
      }
      activityFeed.push({
        id: `connect-${repo.id}`,
        event: `${repo.repoFullName} connected`,
        time: repo.createdAt.toISOString(),
        type: "connect",
      });
    }

    activityFeed.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    res.json({
      repos: repoSummaries,
      stats: {
        totalProperties: repos.length,
        openIssues,
        avgScore,
      },
      activityFeed: activityFeed.slice(0, 10),
    });
  } catch (err: unknown) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
