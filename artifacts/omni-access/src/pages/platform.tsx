import { useState, useRef, useCallback, useEffect } from "react";
import { useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, AlertCircle, Info, CheckCircle2, Github, RefreshCw, LogOut, ChevronDown, Loader2, Search, ExternalLink, FileCode2, X, LogIn, FileDown, FileText, Filter, Sparkles, TrendingUp } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";
import {
  useGetGithubStatus,
  useConnectGithub,
  useDisconnectGithub,
  useListGithubRepos,
  useGetConnectedRepos,
  useConnectRepo,
  useGetScanResults,
  useUpdateIssueStatus,
  useBulkUpdateIssueStatus,
  useGetRepoScanHistory,
  type IssueStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetGithubStatusQueryKey, getGetConnectedReposQueryKey, getGetScanResultsQueryKey, type GetScanResultsParams } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";

const BASE_URL = import.meta.env.BASE_URL ?? "/";

interface ScanProgress {
  current: number;
  total: number;
  filePath: string;
}

interface Issue {
  id: string;
  severity: string;
  wcagCriterion: string;
  element: string;
  filePath: string;
  lineNumber?: number;
  description?: string;
  ruleId?: string;
  status: string;
}

interface ScanHistoryPoint {
  scannedAt: string;
  complianceScore: number;
  totalIssues: number;
  criticalCount: number;
}

const STATIC_ISSUES: Issue[] = [
  { id: "ISS-01", severity: "critical", wcagCriterion: "1.1.1 Non-text Content", element: "<img src='hero.jpg'>", filePath: "/checkout", description: "Image missing alt attribute", status: "open" },
  { id: "ISS-02", severity: "critical", wcagCriterion: "2.1.1 Keyboard", element: "<div onClick={submit}>", filePath: "/cart", description: "Interactive div using onClick without keyboard support — use a button or add onKeyDown", status: "open" },
  { id: "ISS-03", severity: "critical", wcagCriterion: "1.4.3 Contrast (Minimum)", element: "<span class='text-gray-400'>", filePath: "/login", description: "Text colour does not meet minimum contrast ratio against its background", status: "in_progress" },
  { id: "ISS-04", severity: "serious", wcagCriterion: "4.1.2 Name, Role, Value", element: "<button class='btn'>", filePath: "/profile", description: "Button has no text content or accessible label", status: "open" },
  { id: "ISS-05", severity: "serious", wcagCriterion: "1.3.1 Info and Relationships", element: "<table> (no th)", filePath: "/dashboard", description: "Table without header cells — screen readers cannot associate data cells", status: "in_progress" },
  { id: "ISS-06", severity: "serious", wcagCriterion: "2.4.7 Focus Visible", element: "input:focus { outline: none }", filePath: "Global", description: "Focus outline removed — keyboard users lose focus visibility", status: "resolved" },
  { id: "ISS-07", severity: "moderate", wcagCriterion: "2.4.4 Link Purpose", element: "<a href='/#'>Click here</a>", filePath: "/blog", description: "Non-descriptive link text — screen reader users cannot determine link purpose", status: "open" },
  { id: "ISS-08", severity: "minor", wcagCriterion: "1.4.4 Resize text", element: "meta viewport maximum-scale=1", filePath: "Global", description: "Viewport meta restricts zooming — users with low vision cannot enlarge text", status: "resolved" },
];

const getSeverityBadge = (severity: string) => {
  switch (severity) {
    case "critical": return <Badge variant="destructive" className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Critical</Badge>;
    case "serious": return <Badge className="bg-orange-500 hover:bg-orange-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Serious</Badge>;
    case "moderate": return <Badge variant="secondary" className="flex items-center gap-1"><Info className="w-3 h-3" /> Moderate</Badge>;
    case "minor": return <Badge variant="outline" className="flex items-center gap-1">Minor</Badge>;
    default: return null;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "open": return <Badge variant="outline" className="text-destructive border-destructive/50 bg-destructive/10">Open</Badge>;
    case "in_progress": return <Badge variant="outline" className="text-orange-600 border-orange-500/50 bg-orange-500/10">In Progress</Badge>;
    case "resolved": return <Badge variant="outline" className="text-green-700 border-green-600/50 bg-green-600/10 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Resolved</Badge>;
    default: return null;
  }
};

interface GitHubConnectCardProps {
  activeRepo: string | null;
  onSelectRepo: (repo: string) => void;
  autoOpenConnect?: boolean;
}

function GitHubConnectCard({ activeRepo, onSelectRepo, autoOpenConnect }: GitHubConnectCardProps) {
  const queryClient = useQueryClient();
  const [pat, setPat] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");
  const [showRepoDropdown, setShowRepoDropdown] = useState(false);
  const [scanningRepo, setScanningRepo] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const { isAuthenticated, isLoading: authLoading, login } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: status, isLoading: statusLoading } = useGetGithubStatus({ query: { enabled: isAuthenticated } as any });

  useEffect(() => {
    if (autoOpenConnect && !statusLoading) {
      if (status?.connected) {
        setShowRepoDropdown(true);
      } else if (status?.connected === false) {
        setShowInput(true);
      }
    }
  }, [autoOpenConnect, status?.connected, statusLoading]);
  const connectMutation = useConnectGithub();
  const disconnectMutation = useDisconnectGithub();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: reposData, isLoading: reposLoading } = useListGithubRepos({ query: { enabled: status?.connected === true } as any });
  const { data: connectedReposData, refetch: refetchConnectedRepos } = useGetConnectedRepos();
  const connectRepoMutation = useConnectRepo();

  const handleConnect = async () => {
    if (!pat.trim()) return;
    try {
      await connectMutation.mutateAsync({ data: { token: pat.trim() } });
      setPat("");
      setShowInput(false);
      queryClient.invalidateQueries({ queryKey: getGetGithubStatusQueryKey() });
    } catch {
      // error shown inline
    }
  };

  const handleDisconnect = async () => {
    await disconnectMutation.mutateAsync();
    queryClient.invalidateQueries({ queryKey: getGetGithubStatusQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetConnectedReposQueryKey() });
  };

  const handleConnectRepo = async (repoFullName: string) => {
    await connectRepoMutation.mutateAsync({ data: { repoFullName } });
    onSelectRepo(repoFullName);
    setShowRepoDropdown(false);
    refetchConnectedRepos();
  };

  const handleScan = useCallback((repoFullName: string) => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    onSelectRepo(repoFullName);
    setScanningRepo(repoFullName);
    setScanProgress(null);
    setScanError(null);

    const url = `${BASE_URL}api/github/scan-stream?repoFullName=${encodeURIComponent(repoFullName)}`;
    const es = new EventSource(url, { withCredentials: true });
    esRef.current = es;

    es.addEventListener("start", () => {
      setScanProgress({ current: 0, total: 0, filePath: "" });
    });

    es.addEventListener("progress", (e: MessageEvent) => {
      const data = JSON.parse(e.data) as { current: number; total: number; filePath: string };
      setScanProgress(data);
    });

    es.addEventListener("complete", (e: MessageEvent) => {
      JSON.parse(e.data);
      es.close();
      esRef.current = null;
      setScanningRepo(null);
      setScanProgress(null);
      queryClient.invalidateQueries({ queryKey: getGetScanResultsQueryKey({ repoFullName } as GetScanResultsParams) });
      refetchConnectedRepos();
    });

    es.addEventListener("error", (e: MessageEvent) => {
      let msg = "Scan failed";
      try {
        const data = JSON.parse(e.data) as { message?: string };
        if (data.message) msg = data.message;
      } catch { /* noop */ }
      es.close();
      esRef.current = null;
      setScanningRepo(null);
      setScanProgress(null);
      setScanError(msg);
    });

    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        esRef.current = null;
        setScanningRepo(null);
        setScanProgress(null);
      }
    };
  }, [onSelectRepo, queryClient, refetchConnectedRepos]);

  const filteredRepos = reposData?.repos?.filter((r) =>
    r.fullName.toLowerCase().includes(repoSearch.toLowerCase())
  ) ?? [];

  const connectedReposList = connectedReposData?.repos ?? [];

  if (authLoading || statusLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {authLoading ? "Checking session…" : "Checking GitHub connection…"}
          </span>
        </CardContent>
      </Card>
    );
  }

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-serif flex items-center gap-2">
            <Github className="w-5 h-5" /> GitHub Integration
          </CardTitle>
          <CardDescription>
            Sign in to connect your GitHub account and scan repositories for accessibility violations. Your connection will be remembered across sessions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={login} className="gap-2">
            <LogIn className="w-4 h-4" /> Sign in to continue
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!status?.connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-serif flex items-center gap-2">
            <Github className="w-5 h-5" /> GitHub Integration
          </CardTitle>
          <CardDescription>
            Connect your GitHub account to scan real repositories for accessibility violations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showInput ? (
            <Button onClick={() => setShowInput(true)} className="gap-2">
              <Github className="w-4 h-4" /> Connect GitHub
            </Button>
          ) : (
            <div className="space-y-3 max-w-sm">
              <div className="space-y-1">
                <Label htmlFor="pat">Personal Access Token</Label>
                <p className="text-xs text-muted-foreground">
                  Create a token at{" "}
                  <a href="https://github.com/settings/tokens/new?scopes=repo,read:user" target="_blank" rel="noreferrer" className="underline text-primary">
                    github.com/settings/tokens
                  </a>{" "}
                  with <code className="font-mono bg-muted px-1 rounded">repo</code> and <code className="font-mono bg-muted px-1 rounded">read:user</code> scopes.
                </p>
              </div>
              <Input
                id="pat"
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={pat}
                onChange={(e) => setPat(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              />
              {connectMutation.isError && (
                <p className="text-sm text-destructive">Invalid token — please check your PAT and try again.</p>
              )}
              <div className="flex gap-2">
                <Button onClick={handleConnect} disabled={!pat.trim() || connectMutation.isPending} className="gap-2">
                  {connectMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  Connect
                </Button>
                <Button variant="outline" onClick={() => { setShowInput(false); setPat(""); }}>Cancel</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="font-serif flex items-center gap-2">
              <Github className="w-5 h-5" /> GitHub Integration
            </CardTitle>
            <CardDescription className="mt-1">
              Connected as <span className="font-semibold text-foreground">@{status.login}</span>
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDisconnect}
            disabled={disconnectMutation.isPending}
            className="text-muted-foreground gap-1 shrink-0"
          >
            <LogOut className="w-3 h-3" /> Disconnect
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Add Repository</Label>
          <div className="relative max-w-sm">
            <div
              className="flex items-center justify-between border rounded-md px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors text-sm"
              onClick={() => setShowRepoDropdown((v) => !v)}
            >
              <span className={activeRepo ? "text-foreground" : "text-muted-foreground"}>
                {activeRepo || "Select a repository…"}
              </span>
              {reposLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            {showRepoDropdown && (
              <div className="absolute z-10 mt-1 w-full border rounded-md bg-popover shadow-md">
                <div className="p-2 border-b">
                  <div className="flex items-center gap-2">
                    <Search className="w-3 h-3 text-muted-foreground shrink-0" />
                    <input
                      className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                      placeholder="Search repos…"
                      value={repoSearch}
                      onChange={(e) => setRepoSearch(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredRepos.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">No repositories found</p>
                  ) : (
                    filteredRepos.map((repo) => (
                      <div
                        key={repo.id}
                        className="px-3 py-2 text-sm cursor-pointer hover:bg-muted/40 flex items-center justify-between gap-2"
                        onClick={() => handleConnectRepo(repo.fullName)}
                      >
                        <span className="truncate">{repo.fullName}</span>
                        {repo.private && <Badge variant="outline" className="text-xs shrink-0">Private</Badge>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {scanError && (
          <Alert variant="destructive" className="py-2">
            <AlertDescription className="text-xs flex items-center justify-between gap-2">
              <span>{scanError}</span>
              <button className="shrink-0" onClick={() => setScanError(null)}><X className="w-3 h-3" /></button>
            </AlertDescription>
          </Alert>
        )}

        {connectedReposList.length > 0 && (
          <div className="space-y-2">
            <Label>Connected Repositories</Label>
            <div className="space-y-2">
              {connectedReposList.map((repo) => {
                const isActive = activeRepo === repo.repoFullName;
                const isScanning = scanningRepo === repo.repoFullName;
                const progress = isScanning ? scanProgress : null;
                const progressPct = progress && progress.total > 0
                  ? Math.round((progress.current / progress.total) * 100)
                  : 0;
                return (
                  <div
                    key={repo.id}
                    className={`border rounded-md px-3 py-2 text-sm transition-colors ${isActive ? "bg-primary/5 border-primary/30" : "bg-muted/20"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{repo.repoFullName}</p>
                          {isActive && <Badge variant="outline" className="text-xs text-primary border-primary/40 bg-primary/5 shrink-0">Viewing</Badge>}
                        </div>
                        {isScanning ? (
                          <p className="text-xs text-muted-foreground truncate">
                            {progress && progress.total > 0
                              ? `Scanning file ${progress.current} of ${progress.total}…`
                              : "Preparing scan…"}
                          </p>
                        ) : repo.lastScannedAt ? (
                          <p className="text-xs text-muted-foreground">
                            Last scanned: {new Date(repo.lastScannedAt).toLocaleString()}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">Never scanned</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!isActive && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1 text-muted-foreground"
                            onClick={() => onSelectRepo(repo.repoFullName)}
                          >
                            View
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          disabled={isScanning || !!scanningRepo}
                          onClick={() => handleScan(repo.repoFullName)}
                        >
                          {isScanning ? (
                            <><Loader2 className="w-3 h-3 animate-spin" /> Scanning…</>
                          ) : (
                            <><RefreshCw className="w-3 h-3" /> Scan Now</>
                          )}
                        </Button>
                      </div>
                    </div>
                    {isScanning && progress && progress.total > 0 && (
                      <div className="mt-2 space-y-1">
                        <Progress value={progressPct} className="h-1.5" />
                        <p className="text-xs text-muted-foreground truncate" title={progress.filePath}>
                          {progress.filePath}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function buildGithubFileUrl(repoFullName: string, filePath: string, lineNumber?: number): string {
  const base = `https://github.com/${repoFullName}/blob/HEAD/${filePath}`;
  return lineNumber ? `${base}#L${lineNumber}` : base;
}

const SUGGESTED_FIXES: Record<string, string> = {
  "missing-alt": "Add a descriptive alt attribute to the <img> element. For decorative images use alt=\"\".",
  "empty-alt": "If the image conveys meaning, add a descriptive alt value. If it is purely decorative, keep alt=\"\" and confirm it is correct.",
  "missing-form-label": "Associate a <label> element using a matching for/id pair, or add aria-label / aria-labelledby to the input.",
  "empty-button": "Add visible text content or an aria-label attribute to the button so assistive technologies can announce its purpose.",
  "empty-link": "Add descriptive text inside the <a> element, or use aria-label to describe the link destination.",
  "missing-lang": "Add a lang attribute to the <html> element (e.g. lang=\"en\") so screen readers use the correct pronunciation rules.",
  "onclick-no-keyboard": "Replace the <div> with a <button> element, or add role=\"button\", tabIndex={0}, and an onKeyDown handler for Enter/Space.",
  "outline-none": "Remove outline: none / outline: 0 from focus styles. Use a visible custom focus indicator instead, such as outline: 2px solid currentColor.",
  "autoplay-media": "Remove the autoplay attribute, or provide a mechanism to pause, stop, or mute the media before it starts.",
  "table-no-headers": "Add <th> elements to identify column or row headers, and use scope attributes to associate them with data cells.",
  "generic-link-text": "Replace vague link text (\"click here\", \"read more\") with a description of the link's destination or purpose.",
  "missing-input-type": "Add an explicit type attribute (e.g. type=\"text\", type=\"email\") to improve keyboard behaviour and autofill hints.",
  "max-scale-restriction": "Remove maximum-scale=1 and user-scalable=no from the viewport meta tag to allow users to zoom.",
  "missing-button-type": "Add type=\"button\" (or type=\"submit\" / type=\"reset\") to prevent unintended form submissions.",
  "heading-skip": "Ensure heading levels are sequential without skipping. Use h1 → h2 → h3 without jumping levels.",
  "div-role-button-no-tabindex": "Add tabindex=\"0\" to make the element keyboard-reachable, and add an onKeyDown handler for Enter/Space keys.",
  "missing-main-landmark": "Add a <main> element wrapping the primary page content so screen reader users can navigate directly to it.",
  "aria-hidden-focusable": "Remove aria-hidden=\"true\" from focusable elements, or remove the focusable attributes (tabindex, disabled) if the element should be hidden.",
  "invalid-aria-role": "Replace the invalid role with a valid WAI-ARIA role from the allowed roles list, or remove the role attribute if not needed.",
  "iframe-missing-title": "Add a descriptive title attribute to the <iframe> element (e.g. title=\"Payment form\") so screen readers can identify embedded content.",
  "input-image-missing-alt": "Add an alt attribute describing the button's action (e.g. alt=\"Submit form\") to the <input type=\"image\"> element.",
  "missing-skip-nav": "Add a skip navigation link as the first element in <body>: <a href=\"#main-content\" class=\"sr-only focus:not-sr-only\">Skip to main content</a>",
};

function getSuggestedFix(ruleId?: string, wcagCriterion?: string): string {
  if (ruleId && SUGGESTED_FIXES[ruleId]) return SUGGESTED_FIXES[ruleId];
  if (wcagCriterion?.startsWith("1.1.1")) return SUGGESTED_FIXES["missing-alt"];
  if (wcagCriterion?.startsWith("2.1.1")) return SUGGESTED_FIXES["onclick-no-keyboard"];
  if (wcagCriterion?.startsWith("2.4.7")) return SUGGESTED_FIXES["outline-none"];
  if (wcagCriterion?.startsWith("4.1.2")) return SUGGESTED_FIXES["empty-button"];
  if (wcagCriterion?.startsWith("1.3.1")) return SUGGESTED_FIXES["table-no-headers"];
  if (wcagCriterion?.startsWith("2.4.4")) return SUGGESTED_FIXES["generic-link-text"];
  if (wcagCriterion?.startsWith("1.4.4")) return SUGGESTED_FIXES["max-scale-restriction"];
  return "Review the WCAG success criterion and update the element to meet the required accessibility standard.";
}

function useAiFix(issueId: string | null) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFix = useCallback(async (id: string) => {
    setContent("");
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}api/github/issues/${id}/ai-fix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        setError("Failed to get AI fix");
        return;
      }
      if (!res.body) {
        setError("No response body");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(trimmed.slice(6));
            if (data.done) continue;
            if (data.error) { setError(data.error); continue; }
            if (data.content) {
              accumulated += data.content;
              setContent(accumulated);
            }
          } catch { /* noop */ }
        }
      }
    } catch {
      setError("Connection error — please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setContent("");
    setError(null);
    setLoading(false);
  }, []);

  return { content, loading, error, fetchFix, reset };
}

function ComplianceTrendChart({ repoFullName }: { repoFullName: string }) {
  const parts = repoFullName.split("/");
  const owner = parts[0] ?? "";
  const repo = parts[1] ?? "";
  const { data: historyData, isLoading: loading } = useGetRepoScanHistory(owner, repo, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query: { enabled: parts.length === 2 && !!owner && !!repo } as any,
  });
  const history: ScanHistoryPoint[] = (historyData?.history ?? []).map((h) => ({
    scannedAt: h.scannedAt,
    complianceScore: h.complianceScore,
    totalIssues: h.totalIssues,
    criticalCount: h.criticalCount,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground gap-2 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading trend data…
      </div>
    );
  }

  const chartData = [...history]
    .reverse()
    .map((h) => ({
      date: new Date(h.scannedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      score: h.complianceScore,
      issues: h.totalIssues,
    }));

  if (chartData.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2 text-sm">
        <TrendingUp className="w-6 h-6 opacity-40" />
        <span>Run another scan to see compliance trends</span>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <Tooltip
          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 12 }}
          formatter={(value: number) => [`${value}%`, "Score"]}
        />
        <Area
          type="monotone"
          dataKey="score"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fill="url(#scoreGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function IssueDetailSheet({
  issue,
  repoFullName,
  hasResults,
  isLive,
  onClose,
  onStatusChange,
}: {
  issue: Issue | null;
  repoFullName: string | null;
  hasResults: boolean;
  isLive: boolean;
  onClose: () => void;
  onStatusChange?: (issueId: string, newStatus: string) => void;
}) {
  const [statusUpdating, setStatusUpdating] = useState(false);
  const { content: aiContent, loading: aiLoading, error: aiError, fetchFix, reset: resetAi } = useAiFix(null);
  const [aiOpen, setAiOpen] = useState(false);
  const updateStatusMutation = useUpdateIssueStatus();

  const handleStatusChange = async (newStatus: string) => {
    if (!issue) return;
    const prevStatus = issue.status;
    // Optimistic update — apply immediately, revert on failure
    onStatusChange?.(issue.id, newStatus);
    setStatusUpdating(true);
    try {
      await updateStatusMutation.mutateAsync({
        id: parseInt(issue.id, 10),
        data: { status: newStatus as IssueStatus },
      });
    } catch {
      onStatusChange?.(issue.id, prevStatus);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleGetAiFix = () => {
    if (!issue) return;
    resetAi();
    setAiOpen(true);
    fetchFix(issue.id);
  };

  useEffect(() => {
    if (!issue) {
      resetAi();
      setAiOpen(false);
    }
  }, [issue, resetAi]);

  return (
    <Sheet open={!!issue} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {issue && (
          <>
            <SheetHeader className="pr-6">
              <div className="flex items-center gap-2 mb-1">
                {getSeverityBadge(issue.severity)}
                <span className="text-xs text-muted-foreground font-mono">{issue.id}</span>
              </div>
              <SheetTitle className="font-serif text-lg leading-snug">
                {issue.wcagCriterion}
              </SheetTitle>
              <SheetDescription className="text-sm">
                {issue.description ?? "No description available."}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Location</p>
                {isLive && hasResults && repoFullName && issue.lineNumber ? (
                  <div className="flex flex-col gap-1 rounded-md border bg-muted/30 px-3 py-2.5">
                    <a
                      href={buildGithubFileUrl(repoFullName, issue.filePath, issue.lineNumber)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-sm font-mono text-primary hover:underline break-all"
                      data-testid="drawer-file-link"
                    >
                      <FileCode2 className="w-4 h-4 shrink-0" />
                      {issue.filePath}
                      <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
                    </a>
                    <span className="text-xs text-muted-foreground pl-5">Line {issue.lineNumber}</span>
                  </div>
                ) : (
                  <div className="rounded-md border bg-muted/30 px-3 py-2.5 text-sm font-mono text-muted-foreground">
                    {issue.filePath}
                    {issue.lineNumber && <span className="ml-2 text-muted-foreground/70">Line {issue.lineNumber}</span>}
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Affected Element</p>
                <pre className="rounded-md border bg-muted/40 px-3 py-2.5 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
                  {issue.element}
                </pre>
              </div>

              <Separator />

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">WCAG Criterion</p>
                <p className="text-sm font-medium">{issue.wcagCriterion}</p>
                {issue.ruleId && (
                  <p className="text-xs text-muted-foreground font-mono mt-1">Rule: {issue.ruleId}</p>
                )}
              </div>

              <Separator />

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Status</p>
                {hasResults ? (
                  <Select
                    value={issue.status}
                    onValueChange={handleStatusChange}
                    disabled={statusUpdating}
                  >
                    <SelectTrigger className="w-40 h-8 text-xs" data-testid="issue-status-select">
                      {statusUpdating && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  getStatusBadge(issue.status)
                )}
              </div>

              <Separator />

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Suggested Fix</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {getSuggestedFix(issue.ruleId, issue.wcagCriterion)}
                </p>
              </div>

              {hasResults && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Fix Suggestion</p>
                      {!aiOpen && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs h-7"
                          onClick={handleGetAiFix}
                          data-testid="btn-get-ai-fix"
                        >
                          <Sparkles className="w-3 h-3" /> Get AI Fix
                        </Button>
                      )}
                    </div>
                    {aiOpen && (
                      <div className="rounded-md border bg-muted/20 p-3">
                        {aiLoading && !aiContent && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="w-3 h-3 animate-spin" /> Generating fix suggestion…
                          </div>
                        )}
                        {aiError && (
                          <p className="text-xs text-destructive">{aiError}</p>
                        )}
                        {aiContent && (
                          <div className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-mono">
                            {aiContent}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <SheetClose asChild>
              <Button variant="outline" size="sm" className="mt-8 w-full gap-2">
                <X className="w-3.5 h-3.5" /> Close
              </Button>
            </SheetClose>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function LiveDashboard({ repoFullName }: { repoFullName: string | null }) {
  const isLive = !!repoFullName;
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [issueStatuses, setIssueStatuses] = useState<Record<string, string>>({});

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: scanData, isLoading } = useGetScanResults(
    { repoFullName: repoFullName ?? "" },
    { query: { enabled: isLive } as any }
  );

  const hasResults = isLive && !!scanData?.summary;

  const complianceScore = hasResults ? scanData!.summary!.score : 78;

  const issues: Issue[] = hasResults
    ? scanData!.issues.map((issue) => ({
        id: String(issue.id),
        severity: issue.severity,
        wcagCriterion: issue.wcagCriterion ?? issue.ruleId,
        element: issue.element ?? issue.ruleId,
        filePath: issue.filePath,
        lineNumber: issue.lineNumber ?? undefined,
        description: issue.description,
        ruleId: issue.ruleId,
        status: issueStatuses[String(issue.id)] ?? (issue.status ?? "open"),
      }))
    : STATIC_ISSUES;

  const totalIssues = hasResults ? scanData!.summary!.totalIssues : 47;
  const critical = hasResults ? scanData!.summary!.critical : 8;
  const inProgress = issues.filter((i) => i.status === "in_progress").length;
  const resolved = issues.filter((i) => i.status === "resolved").length;
  const scannedAt = hasResults ? new Date(scanData!.summary!.scannedAt).toLocaleString() : "Today 08:00 AM";

  const handleStatusChange = (issueId: string, newStatus: string) => {
    setIssueStatuses((prev) => ({ ...prev, [issueId]: newStatus }));
    if (selectedIssue?.id === issueId) {
      setSelectedIssue((prev) => prev ? { ...prev, status: newStatus } : null);
    }
  };

  return (
    <>
      {!isLive && (
        <Alert className="bg-primary/5 border-primary/20" data-testid="alert-preview-notice">
          <Info className="h-5 w-5 text-primary" />
          <AlertTitle className="text-primary font-bold">Platform Preview</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            This is a static preview showing example data. Connect a GitHub repository above and click "Scan Now" to see real results.
          </AlertDescription>
        </Alert>
      )}

      {isLive && !hasResults && !isLoading && (
        <Alert className="bg-amber-500/5 border-amber-500/20">
          <Info className="h-5 w-5 text-amber-600" />
          <AlertTitle className="text-amber-700 font-bold">No Scan Results Yet</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            Select a connected repository and click "Scan Now" to analyse it for accessibility violations.
          </AlertDescription>
        </Alert>
      )}

      {isLive && isLoading && (
        <div className="flex items-center gap-3 text-muted-foreground py-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading scan results…</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-primary">Governance Dashboard</h1>
          <p className="text-muted-foreground">
            {isLive && hasResults ? repoFullName : "Acme Corp Product Suite"}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="px-3 py-1 font-medium bg-background text-sm">
            Last Scan: {scannedAt}
          </Badge>
          {hasResults && (
            <Badge variant="outline" className="px-3 py-1 font-medium bg-green-500/10 text-green-700 border-green-600/30 text-sm">
              Live Data
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="stats-grid">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground mb-1">Total Issues</p>
            <h3 className="text-3xl font-bold font-serif text-primary" data-testid="stat-total">{totalIssues}</h3>
          </CardContent>
        </Card>
        <Card className="border-destructive/20">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-destructive mb-1">Critical</p>
            <h3 className="text-3xl font-bold font-serif text-destructive" data-testid="stat-critical">{critical}</h3>
          </CardContent>
        </Card>
        <Card className="border-orange-500/20">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-orange-600 mb-1">In Progress</p>
            <h3 className="text-3xl font-bold font-serif text-orange-600" data-testid="stat-progress">{inProgress}</h3>
          </CardContent>
        </Card>
        <Card className="border-green-600/20">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-green-700 mb-1">Resolved</p>
            <h3 className="text-3xl font-bold font-serif text-green-700" data-testid="stat-resolved">{resolved}</h3>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 flex flex-col" data-testid="card-compliance-score">
          <CardHeader>
            <CardTitle className="font-serif">Compliance Score</CardTitle>
            <CardDescription>Overall WCAG 2.2 AA adherence</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col items-center justify-center">
            <div className="relative w-full" style={{ aspectRatio: "1 / 1" }}>
              <svg width="100%" height="100%" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="80" fill="none" stroke="hsl(var(--muted))" strokeWidth="20" />
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke="hsl(var(--accent))"
                  strokeWidth="20"
                  strokeDasharray={`${2 * Math.PI * 80 * (complianceScore / 100)} ${2 * Math.PI * 80}`}
                  strokeDashoffset={`${2 * Math.PI * 80 * 0.25}`}
                  strokeLinecap="round"
                  transform="rotate(-90 100 100)"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-4xl font-serif font-bold text-primary">{complianceScore}%</span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Score</span>
              </div>
            </div>

            <div className="w-full space-y-3 mt-4">
              {(hasResults ? [
                { label: "Critical", value: Math.max(0, 100 - scanData!.summary!.critical * 10), color: "" },
                { label: "Serious", value: Math.max(0, 100 - scanData!.summary!.serious * 5), color: "" },
                { label: "Moderate", value: Math.max(0, 100 - scanData!.summary!.moderate * 3), color: "" },
                { label: "Minor", value: Math.max(0, 100 - scanData!.summary!.minor * 1), color: "" },
              ] : [
                { label: "Perceivable", value: 82 },
                { label: "Operable", value: 68 },
                { label: "Understandable", value: 79 },
                { label: "Robust", value: 71 },
              ]).map(({ label, value }) => (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{label}</span>
                    <span className="text-muted-foreground">{value}%</span>
                  </div>
                  <Progress value={value} className="h-1.5" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2" data-testid="card-roadmap">
          <CardHeader>
            <CardTitle className="font-serif">Remediation Roadmap</CardTitle>
            <CardDescription>Track progress against structured compliance goals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</div>
                  <h4 className="font-medium text-base">Critical Issues (Blockers)</h4>
                </div>
                <span className="font-bold text-primary">
                  {hasResults ? `${Math.max(0, 100 - scanData!.summary!.critical * 20)}%` : "40%"}
                </span>
              </div>
              <Progress value={hasResults ? Math.max(0, 100 - scanData!.summary!.critical * 20) : 40} className="h-2.5" />
              <p className="text-xs text-muted-foreground">
                {hasResults
                  ? `${scanData!.summary!.critical} critical violations detected across ${scanData!.summary!.filesScanned} scanned files.`
                  : "Focusing on 1.1.1, 2.1.1, and 4.1.2 violations across high-traffic flows."}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">2</div>
                  <h4 className="font-medium text-base">Serious Issues</h4>
                </div>
                <span className="font-bold text-muted-foreground">
                  {hasResults ? `${Math.max(0, 100 - scanData!.summary!.serious * 10)}%` : "15%"}
                </span>
              </div>
              <Progress value={hasResults ? Math.max(0, 100 - scanData!.summary!.serious * 10) : 15} className="h-2.5 bg-muted/50" />
              <p className="text-xs text-muted-foreground">
                {hasResults
                  ? `${scanData!.summary!.serious} serious violations found. Address focus management and ARIA states.`
                  : "Addressing complex focus management and custom component ARIA states."}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">3</div>
                  <h4 className="font-medium text-base">Full AA Compliance</h4>
                </div>
                <span className="font-bold text-muted-foreground">
                  {hasResults ? `${complianceScore >= 90 ? "80" : "0"}%` : "0%"}
                </span>
              </div>
              <Progress value={hasResults && complianceScore >= 90 ? 80 : 0} className="h-2.5 bg-muted/40" />
              <p className="text-xs text-muted-foreground">Final sweep of minor contrast and semantic structural issues.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLive && hasResults && repoFullName && (
        <Card data-testid="card-trend-chart">
          <CardHeader>
            <CardTitle className="font-serif flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Compliance Score Over Time
            </CardTitle>
            <CardDescription>Score trend across all scans for this repository</CardDescription>
          </CardHeader>
          <CardContent>
            <ComplianceTrendChart repoFullName={repoFullName} />
          </CardContent>
        </Card>
      )}

      <Card data-testid="card-issue-tracker">
        <CardHeader>
          <CardTitle className="font-serif">Active Issue Backlog</CardTitle>
          <CardDescription>
            {hasResults
              ? `${issues.length} violations found in ${repoFullName} — click a row for details`
              : "Prioritized list of identified WCAG violations requiring engineering remediation — click a row for details"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Severity</TableHead>
                  <TableHead>WCAG Criterion</TableHead>
                  <TableHead className="hidden md:table-cell">Affected Element</TableHead>
                  <TableHead>{hasResults ? "File & Line" : "Page"}</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue) => (
                  <TableRow
                    key={issue.id}
                    data-testid={`issue-row-${issue.id}`}
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                    tabIndex={0}
                    role="button"
                    aria-label={`View details for ${issue.id}: ${issue.wcagCriterion}`}
                    onClick={() => setSelectedIssue(issue)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedIssue(issue); } }}
                  >
                    <TableCell className="font-medium">{getSeverityBadge(issue.severity)}</TableCell>
                    <TableCell className="text-sm">{issue.wcagCriterion}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs font-mono bg-muted/30 p-1 rounded max-w-xs truncate">
                      {issue.element}
                    </TableCell>
                    <TableCell className="max-w-[180px]">
                      {hasResults && repoFullName ? (
                        <div className="flex flex-col gap-0.5">
                          <a
                            href={buildGithubFileUrl(repoFullName, issue.filePath, issue.lineNumber)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-xs font-mono text-primary hover:underline truncate"
                            onClick={(e) => e.stopPropagation()}
                            data-testid={`file-link-${issue.id}`}
                          >
                            <FileCode2 className="w-3 h-3 shrink-0" />
                            <span className="truncate">{issue.filePath}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-60" />
                          </a>
                          {issue.lineNumber && (
                            <span className="text-xs text-muted-foreground pl-4">Line {issue.lineNumber}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground truncate">{issue.filePath}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{getStatusBadge(issue.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <IssueDetailSheet
        issue={selectedIssue}
        repoFullName={repoFullName}
        hasResults={hasResults}
        isLive={isLive}
        onClose={() => setSelectedIssue(null)}
        onStatusChange={handleStatusChange}
      />
    </>
  );
}

export function ReportsTab() {
  const { toast } = useToast();

  const handleExport = (format: string) => {
    toast({
      title: `Exporting ${format} report…`,
      description: "Your report will be ready to download shortly.",
    });
  };

  return (
    <div className="space-y-6" data-testid="tab-reports">
      <div>
        <h2 className="text-lg font-serif font-semibold text-primary">Reports & Exports</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Generate and download compliance reports for stakeholders.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card data-testid="card-export-pdf">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="font-serif text-base">PDF Compliance Report</CardTitle>
            </div>
            <CardDescription>Full audit report including issue details, WCAG citations, and remediation guidance. Suitable for executive review and legal documentation.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="gap-2" onClick={() => handleExport("PDF")} data-testid="btn-export-pdf">
              <FileDown className="h-4 w-4" />
              Export PDF Report
            </Button>
          </CardContent>
        </Card>

        <Card data-testid="card-export-csv">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileDown className="h-5 w-5 text-primary" />
              <CardTitle className="font-serif text-base">CSV Issue Export</CardTitle>
            </div>
            <CardDescription>Raw issue data in CSV format for import into Jira, Linear, or any project management tool. Includes all metadata fields.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="gap-2" onClick={() => handleExport("CSV")} data-testid="btn-export-csv">
              <FileDown className="h-4 w-4" />
              Export CSV
            </Button>
          </CardContent>
        </Card>

        <Card data-testid="card-report-schedule">
          <CardHeader>
            <CardTitle className="font-serif text-base">Scheduled Reports</CardTitle>
            <CardDescription>Automatically send compliance reports to stakeholders on a schedule.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
              <div>
                <p className="text-sm font-medium">Weekly Summary</p>
                <p className="text-xs text-muted-foreground">Every Monday at 9:00 AM</p>
              </div>
              <Badge variant="outline" className="text-xs text-green-700 border-green-600/40 bg-green-600/10">Active</Badge>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" data-testid="btn-add-schedule">
              <Filter className="h-3.5 w-3.5" /> Add Schedule
            </Button>
          </CardContent>
        </Card>

        <Card data-testid="card-report-history">
          <CardHeader>
            <CardTitle className="font-serif text-base">Report History</CardTitle>
            <CardDescription>Previously generated reports for this workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: "April 2026 Full Audit", date: "Apr 30, 2026", format: "PDF" },
              { label: "Q1 2026 Summary", date: "Mar 31, 2026", format: "PDF" },
              { label: "Issue Export — Mar 2026", date: "Mar 15, 2026", format: "CSV" },
            ].map((report, i) => (
              <div key={i} className="flex items-center justify-between gap-2 py-1.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{report.label}</p>
                  <p className="text-xs text-muted-foreground">{report.date}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="outline" className="text-xs">{report.format}</Badge>
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => handleExport(report.format)}>
                    <FileDown className="h-3 w-3" /> Download
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function csvEscapeField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function exportIssuesToCSV(issues: Issue[]) {
  const headers = ["ID", "Severity", "WCAG Criterion", "Rule ID", "Description", "File Path", "Line Number", "Element", "Status"];
  const rows = issues.map((i) => [
    i.id,
    i.severity,
    i.wcagCriterion ?? "",
    i.ruleId ?? "",
    i.description ?? "",
    i.filePath,
    String(i.lineNumber ?? ""),
    i.element ?? "",
    i.status,
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvEscapeField).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "accessibility-issues.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function IssuesTab({ repoFullName }: { repoFullName: string | null }) {
  const { toast } = useToast();
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [issueStatuses, setIssueStatuses] = useState<Record<string, string>>({});
  const bulkUpdateMutation = useBulkUpdateIssueStatus();
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const isLive = !!repoFullName;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: scanData } = useGetScanResults(
    { repoFullName: repoFullName ?? "" },
    { query: { enabled: isLive } as any }
  );

  const hasResults = isLive && !!scanData?.summary;

  const allIssues: Issue[] = hasResults
    ? scanData!.issues.map((issue) => ({
        id: String(issue.id),
        severity: issue.severity,
        wcagCriterion: issue.wcagCriterion ?? issue.ruleId,
        element: issue.element ?? issue.ruleId,
        filePath: issue.filePath,
        lineNumber: issue.lineNumber ?? undefined,
        description: issue.description,
        ruleId: issue.ruleId,
        status: issueStatuses[String(issue.id)] ?? (issue.status ?? "open"),
      }))
    : STATIC_ISSUES;

  const filtered = allIssues.filter((issue) => {
    const sevOk = severityFilter === "all" || issue.severity === severityFilter;
    const stOk = statusFilter === "all" || issue.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const searchOk = !q
      || issue.wcagCriterion?.toLowerCase().includes(q)
      || issue.filePath?.toLowerCase().includes(q)
      || issue.description?.toLowerCase().includes(q)
      || issue.ruleId?.toLowerCase().includes(q);
    return sevOk && stOk && searchOk;
  });

  const allFilteredSelected = filtered.length > 0 && filtered.every((i) => selectedIds.has(i.id));

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((i) => next.delete(i.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((i) => next.add(i.id));
        return next;
      });
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkStatus = async (newStatus: string) => {
    if (!hasResults || selectedIds.size === 0) return;
    setBulkUpdating(true);
    const ids = Array.from(selectedIds).map(Number).filter((n) => !isNaN(n));
    try {
      await bulkUpdateMutation.mutateAsync({
        data: { ids, status: newStatus as IssueStatus },
      });
      const updates: Record<string, string> = {};
      selectedIds.forEach((id) => { updates[id] = newStatus; });
      setIssueStatuses((prev) => ({ ...prev, ...updates }));
      setSelectedIds(new Set());
      toast({ title: `${ids.length} issue${ids.length !== 1 ? "s" : ""} marked as ${newStatus}` });
    } catch {
      toast({ title: "Failed to update statuses", variant: "destructive" });
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleBulkExport = () => {
    const selected = allIssues.filter((i) => selectedIds.has(i.id));
    exportIssuesToCSV(selected);
    toast({ title: `Exported ${selected.length} issue${selected.length !== 1 ? "s" : ""} to CSV` });
  };

  const handleStatusChange = (issueId: string, newStatus: string) => {
    setIssueStatuses((prev) => ({ ...prev, [issueId]: newStatus }));
    if (selectedIssue?.id === issueId) {
      setSelectedIssue((prev) => prev ? { ...prev, status: newStatus } : null);
    }
  };

  return (
    <div className="space-y-4" data-testid="tab-issues">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            className="h-8 pl-8 text-xs"
            placeholder="Search by criterion, file path, description…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="issues-search"
          />
          {searchQuery && (
            <button
              className="absolute right-2.5 top-1/2 -translate-y-1/2"
              onClick={() => setSearchQuery("")}
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          <span>Filter:</span>
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="h-8 w-36 text-xs" data-testid="filter-severity">
            <SelectValue placeholder="Severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="serious">Serious</SelectItem>
            <SelectItem value="moderate">Moderate</SelectItem>
            <SelectItem value="minor">Minor</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-36 text-xs" data-testid="filter-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} issue{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <Card data-testid="card-issues-table">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allFilteredSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Select all filtered issues"
                      data-testid="checkbox-select-all"
                    />
                  </TableHead>
                  <TableHead className="w-[100px]">Severity</TableHead>
                  <TableHead>WCAG Criterion</TableHead>
                  <TableHead className="hidden md:table-cell">Affected Element</TableHead>
                  <TableHead>{hasResults ? "File & Line" : "Page"}</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((issue) => (
                  <TableRow
                    key={issue.id}
                    data-testid={`issue-row-${issue.id}`}
                    className={`cursor-pointer hover:bg-muted/40 transition-colors ${selectedIds.has(issue.id) ? "bg-primary/5" : ""}`}
                    tabIndex={0}
                    role="button"
                    aria-label={`View details for ${issue.id}: ${issue.wcagCriterion}`}
                    onClick={() => setSelectedIssue(issue)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedIssue(issue); } }}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(issue.id)}
                        onCheckedChange={() => toggleOne(issue.id)}
                        aria-label={`Select issue ${issue.id}`}
                        data-testid={`checkbox-issue-${issue.id}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{getSeverityBadge(issue.severity)}</TableCell>
                    <TableCell className="text-sm">{issue.wcagCriterion}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs font-mono bg-muted/30 p-1 rounded max-w-xs truncate">
                      {issue.element}
                    </TableCell>
                    <TableCell className="max-w-[180px]">
                      {hasResults && repoFullName ? (
                        <div className="flex flex-col gap-0.5">
                          <a
                            href={buildGithubFileUrl(repoFullName, issue.filePath, issue.lineNumber)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-xs font-mono text-primary hover:underline truncate"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FileCode2 className="w-3 h-3 shrink-0" />
                            <span className="truncate">{issue.filePath}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-60" />
                          </a>
                          {issue.lineNumber && (
                            <span className="text-xs text-muted-foreground pl-4">Line {issue.lineNumber}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground truncate">{issue.filePath}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{getStatusBadge(issue.status)}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                      No issues match the current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {selectedIds.size > 0 && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-card border shadow-2xl rounded-xl px-4 py-3"
          data-testid="bulk-action-bar"
        >
          <span className="text-sm font-medium text-foreground mr-1">
            {selectedIds.size} selected
          </span>
          <Separator orientation="vertical" className="h-5" />
          <span className="text-xs text-muted-foreground">Mark as:</span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            disabled={bulkUpdating || !hasResults}
            onClick={() => handleBulkStatus("open")}
            data-testid="bulk-mark-open"
          >
            Open
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 text-orange-600 border-orange-500/40"
            disabled={bulkUpdating || !hasResults}
            onClick={() => handleBulkStatus("in_progress")}
            data-testid="bulk-mark-in-progress"
          >
            In Progress
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 text-green-700 border-green-600/40"
            disabled={bulkUpdating || !hasResults}
            onClick={() => handleBulkStatus("resolved")}
            data-testid="bulk-mark-resolved"
          >
            Resolved
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={handleBulkExport}
            data-testid="bulk-export-csv"
          >
            <FileDown className="w-3 h-3" /> Export CSV
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs ml-1"
            onClick={() => setSelectedIds(new Set())}
          >
            <X className="w-3 h-3" />
          </Button>
          {bulkUpdating && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
        </div>
      )}

      <IssueDetailSheet
        issue={selectedIssue}
        repoFullName={repoFullName}
        hasResults={hasResults}
        isLive={isLive}
        onClose={() => setSelectedIssue(null)}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}

export default function Platform() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const repoParam = params.get("repo");
  const connectParam = params.get("connect") === "true";

  const [activeRepo, setActiveRepo] = useState<string | null>(repoParam);
  const { data: connectedReposData } = useGetConnectedRepos();
  const connectedReposList = connectedReposData?.repos ?? [];

  useEffect(() => {
    if (repoParam) {
      setActiveRepo(repoParam);
    }
  }, [repoParam]);

  const resolvedActiveRepo =
    activeRepo ?? connectedReposList[0]?.repoFullName ?? null;

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4" data-testid="page-platform">
      <div className="container mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-bold tracking-tight text-primary">Audit Workspace</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage audits, review issues, and generate compliance reports.</p>
        </div>

        <GitHubConnectCard
          activeRepo={resolvedActiveRepo}
          onSelectRepo={setActiveRepo}
          autoOpenConnect={connectParam}
        />

        <Tabs defaultValue="overview" className="space-y-4" data-testid="platform-tabs">
          <TabsList className="h-9">
            <TabsTrigger value="overview" data-testid="tab-trigger-overview">Overview</TabsTrigger>
            <TabsTrigger value="issues" data-testid="tab-trigger-issues">Issues</TabsTrigger>
            <TabsTrigger value="reports" data-testid="tab-trigger-reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" data-testid="tab-content-overview">
            <LiveDashboard repoFullName={resolvedActiveRepo} />
          </TabsContent>

          <TabsContent value="issues" data-testid="tab-content-issues">
            <IssuesTab repoFullName={resolvedActiveRepo} />
          </TabsContent>

          <TabsContent value="reports" data-testid="tab-content-reports">
            <ReportsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
