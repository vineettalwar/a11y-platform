import { Router, Request, Response } from "express";
import { db, githubConnections, connectedRepos, scanResults } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

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
];

interface Finding {
  ruleId: string;
  severity: Severity;
  description: string;
  wcagCriterion: string;
  element: string;
  lineNumber: number;
}

function analyzeFileContent(content: string): Finding[] {
  const findings: Finding[] = [];

  for (const rule of WCAG_RULES) {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    let match: RegExpExecArray | null;

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
          const findings = analyzeFileContent(content);
          for (const f of findings) {
            allFindings.push({ filePath: file.path, ...f });
          }
        }
      } catch {
        // Skip individual files that cannot be fetched
      }
    }

    await db
      .delete(scanResults)
      .where(
        and(
          eq(scanResults.userId, userId),
          eq(scanResults.repoFullName, repoFullName),
        ),
      );

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
    const maxPossible = filesToScan.length * 5;
    const score = Math.max(
      0,
      Math.round(100 - (totalIssues / Math.max(maxPossible, 1)) * 100),
    );

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
          const findings = analyzeFileContent(content);
          for (const f of findings) {
            allFindings.push({ filePath: file.path, ...f });
          }
        }
      } catch {
        // Skip individual files that cannot be fetched
      }
    }

    await db
      .delete(scanResults)
      .where(
        and(
          eq(scanResults.userId, userId),
          eq(scanResults.repoFullName, repoFullName),
        ),
      );

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
    const maxPossible = filesToScan.length * 5;
    const score = Math.max(
      0,
      Math.round(100 - (totalIssues / Math.max(maxPossible, 1)) * 100),
    );

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

    const results = await db
      .select()
      .from(scanResults)
      .where(
        and(
          eq(scanResults.userId, userId),
          eq(scanResults.repoFullName, repoFullName),
        ),
      )
      .orderBy(desc(scanResults.createdAt));

    if (results.length === 0) {
      res.json({ repoFullName, summary: null, issues: [] });
      return;
    }

    const counts: Record<Severity, number> = { critical: 0, serious: 0, moderate: 0, minor: 0 };
    for (const r of results) {
      const sev = r.severity as Severity;
      if (sev in counts) counts[sev]++;
    }

    const totalIssues = results.length;
    const score = Math.max(0, Math.round(100 - Math.min(totalIssues * 2, 100)));

    res.json({
      repoFullName,
      summary: {
        score,
        totalIssues,
        ...counts,
        filesScanned: new Set(results.map((r) => r.filePath)).size,
        scannedAt: results[0].createdAt.toISOString(),
      },
      issues: results.map((r, i) => ({
        id: `ISS-${String(i + 1).padStart(2, "0")}`,
        filePath: r.filePath,
        lineNumber: r.lineNumber,
        ruleId: r.ruleId,
        severity: r.severity,
        description: r.description,
        element: r.element,
        wcagCriterion: r.wcagCriterion,
      })),
    });
  } catch (err: unknown) {
    console.error("Scan results error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
