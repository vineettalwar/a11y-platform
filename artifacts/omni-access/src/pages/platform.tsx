import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, AlertCircle, Info, CheckCircle2, Github, RefreshCw, LogOut, ChevronDown, Loader2, Search } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useGetGithubStatus,
  useConnectGithub,
  useDisconnectGithub,
  useListGithubRepos,
  useGetConnectedRepos,
  useConnectRepo,
  useScanRepo,
  useGetScanResults,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetGithubStatusQueryKey, getGetConnectedReposQueryKey, getGetScanResultsQueryKey, type GetScanResultsParams } from "@workspace/api-client-react";

const STATIC_ISSUES = [
  { id: "ISS-01", severity: "critical", wcagCriterion: "1.1.1 Non-text Content", element: "<img src='hero.jpg'>", filePath: "/checkout", status: "open" },
  { id: "ISS-02", severity: "critical", wcagCriterion: "2.1.1 Keyboard", element: "<div onClick={submit}>", filePath: "/cart", status: "open" },
  { id: "ISS-03", severity: "critical", wcagCriterion: "1.4.3 Contrast (Minimum)", element: "<span class='text-gray-400'>", filePath: "/login", status: "in-progress" },
  { id: "ISS-04", severity: "serious", wcagCriterion: "4.1.2 Name, Role, Value", element: "<button class='btn'>", filePath: "/profile", status: "open" },
  { id: "ISS-05", severity: "serious", wcagCriterion: "1.3.1 Info and Relationships", element: "<table> (no th)", filePath: "/dashboard", status: "in-progress" },
  { id: "ISS-06", severity: "serious", wcagCriterion: "2.4.7 Focus Visible", element: "input:focus { outline: none }", filePath: "Global", status: "resolved" },
  { id: "ISS-07", severity: "moderate", wcagCriterion: "2.4.4 Link Purpose", element: "<a href='/#'>Click here</a>", filePath: "/blog", status: "open" },
  { id: "ISS-08", severity: "minor", wcagCriterion: "1.4.4 Resize text", element: "meta viewport maximum-scale=1", filePath: "Global", status: "resolved" },
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
    case "in-progress": return <Badge variant="outline" className="text-orange-600 border-orange-500/50 bg-orange-500/10">In Progress</Badge>;
    case "resolved": return <Badge variant="outline" className="text-green-700 border-green-600/50 bg-green-600/10 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Resolved</Badge>;
    default: return null;
  }
};

interface GitHubConnectCardProps {
  activeRepo: string | null;
  onSelectRepo: (repo: string) => void;
}

function GitHubConnectCard({ activeRepo, onSelectRepo }: GitHubConnectCardProps) {
  const queryClient = useQueryClient();
  const [pat, setPat] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");
  const [showRepoDropdown, setShowRepoDropdown] = useState(false);

  const { data: status, isLoading: statusLoading } = useGetGithubStatus();
  const connectMutation = useConnectGithub();
  const disconnectMutation = useDisconnectGithub();
  const { data: reposData, isLoading: reposLoading } = useListGithubRepos({ query: { enabled: status?.connected === true } });
  const { data: connectedReposData, refetch: refetchConnectedRepos } = useGetConnectedRepos();
  const connectRepoMutation = useConnectRepo();
  const scanMutation = useScanRepo();

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

  const handleScan = async (repoFullName: string) => {
    onSelectRepo(repoFullName);
    await scanMutation.mutateAsync({ data: { repoFullName } });
    queryClient.invalidateQueries({ queryKey: getGetScanResultsQueryKey({ repoFullName } as GetScanResultsParams) });
    refetchConnectedRepos();
  };

  const filteredRepos = reposData?.repos?.filter((r) =>
    r.fullName.toLowerCase().includes(repoSearch.toLowerCase())
  ) ?? [];

  const connectedRepos = connectedReposData?.repos ?? [];

  if (statusLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Checking GitHub connection…</span>
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
              <span className={selectedRepo ? "text-foreground" : "text-muted-foreground"}>
                {selectedRepo || "Select a repository…"}
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

        {connectedRepos.length > 0 && (
          <div className="space-y-2">
            <Label>Connected Repositories</Label>
            <div className="space-y-2">
              {connectedRepos.map((repo) => {
                const isActive = activeRepo === repo.repoFullName;
                const isScanning = scanMutation.isPending && scanMutation.variables?.data?.repoFullName === repo.repoFullName;
                return (
                  <div
                    key={repo.id}
                    className={`flex items-center justify-between gap-3 border rounded-md px-3 py-2 text-sm transition-colors ${isActive ? "bg-primary/5 border-primary/30" : "bg-muted/20"}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{repo.repoFullName}</p>
                        {isActive && <Badge variant="outline" className="text-xs text-primary border-primary/40 bg-primary/5 shrink-0">Viewing</Badge>}
                      </div>
                      {repo.lastScannedAt ? (
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
                        disabled={isScanning}
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
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LiveDashboard({ repoFullName }: { repoFullName: string | null }) {
  const isLive = !!repoFullName;

  const { data: scanData, isLoading } = useGetScanResults(
    { repoFullName: repoFullName ?? "" },
    { query: { enabled: isLive } }
  );

  const hasResults = isLive && scanData?.summary && scanData.summary.totalIssues >= 0 && scanData.issues.length > 0;
  const complianceScore = hasResults ? scanData!.summary!.score : 74;
  const issues = hasResults
    ? scanData!.issues.map((issue) => ({
        id: issue.id,
        severity: issue.severity,
        wcagCriterion: issue.wcagCriterion ?? issue.ruleId,
        element: issue.element ?? issue.ruleId,
        filePath: issue.filePath,
        status: "open",
      }))
    : STATIC_ISSUES;

  const totalIssues = hasResults ? scanData!.summary!.totalIssues : 47;
  const critical = hasResults ? scanData!.summary!.critical : 8;
  const inProgress = hasResults ? 0 : 12;
  const resolved = hasResults ? 0 : 6;
  const scannedAt = hasResults ? new Date(scanData!.summary!.scannedAt).toLocaleString() : "Today 08:00 AM";

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

      <Card data-testid="card-issue-tracker">
        <CardHeader>
          <CardTitle className="font-serif">Active Issue Backlog</CardTitle>
          <CardDescription>
            {hasResults
              ? `${issues.length} violations found in ${repoFullName}`
              : "Prioritized list of identified WCAG violations requiring engineering remediation"}
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
                  <TableHead>{hasResults ? "File" : "Page"}</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issues.map((issue) => (
                  <TableRow key={issue.id} data-testid={`issue-row-${issue.id}`}>
                    <TableCell className="font-medium">{getSeverityBadge(issue.severity)}</TableCell>
                    <TableCell className="text-sm">{issue.wcagCriterion}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs font-mono bg-muted/30 p-1 rounded max-w-xs truncate">
                      {issue.element}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[140px]">
                      {issue.filePath}
                    </TableCell>
                    <TableCell className="text-right">{getStatusBadge(issue.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export default function Platform() {
  const [activeRepo, setActiveRepo] = useState<string | null>(null);
  const { data: connectedReposData } = useGetConnectedRepos();
  const connectedRepos = connectedReposData?.repos ?? [];

  const resolvedActiveRepo =
    activeRepo ?? connectedRepos[0]?.repoFullName ?? null;

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4" data-testid="page-platform">
      <div className="container mx-auto max-w-7xl space-y-8">
        <GitHubConnectCard
          activeRepo={resolvedActiveRepo}
          onSelectRepo={setActiveRepo}
        />
        <LiveDashboard repoFullName={resolvedActiveRepo} />
      </div>
    </div>
  );
}
