import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Plus,
  ClipboardCheck,
  Activity,
  ExternalLink,
  GitBranch,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";

interface RepoSummary {
  id: string;
  repoFullName: string;
  repoName: string;
  repoOwner: string;
  lastScannedAt: string | null;
  criticalIssues: number;
  totalIssues: number;
  score: number | null;
  status: string;
}

interface ActivityItem {
  id: string;
  event: string;
  time: string;
  type: string;
}

interface DashboardData {
  repos: RepoSummary[];
  stats: {
    totalProperties: number;
    openIssues: number;
    avgScore: number;
  };
  activityFeed: ActivityItem[];
}

async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch("/api/github/dashboard");
  if (!res.ok) throw new Error("Failed to fetch dashboard data");
  return res.json() as Promise<DashboardData>;
}

function scoreColor(score: number) {
  if (score >= 85) return "text-green-700";
  if (score >= 70) return "text-orange-600";
  return "text-destructive";
}

function statusBadge(status: string) {
  switch (status) {
    case "critical":
      return <Badge variant="destructive" className="text-xs">Critical</Badge>;
    case "needs-attention":
      return <Badge className="text-xs bg-orange-500 hover:bg-orange-600">Needs Attention</Badge>;
    case "good":
      return <Badge variant="outline" className="text-xs text-green-700 border-green-600/40 bg-green-600/10">Good</Badge>;
    case "never-scanned":
      return <Badge variant="outline" className="text-xs text-muted-foreground">Not Scanned</Badge>;
    default:
      return null;
  }
}

function activityIcon(type: string) {
  switch (type) {
    case "scan":
      return { icon: ClipboardCheck, color: "text-primary" };
    case "connect":
      return { icon: GitBranch, color: "text-muted-foreground" };
    default:
      return { icon: Activity, color: "text-muted-foreground" };
  }
}

function timeAgo(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

function StatSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-4 rounded" />
        </div>
        <Skeleton className="h-9 w-16 mt-1" />
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const [, navigate] = useLocation();

  const { data, isLoading, isError } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const repos = data?.repos ?? [];
  const stats = data?.stats ?? { totalProperties: 0, openIssues: 0, avgScore: 0 };
  const activityFeed = data?.activityFeed ?? [];

  return (
    <div className="bg-muted/20 min-h-screen" data-testid="page-dashboard">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

        {/* Page header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-serif font-bold tracking-tight text-primary" data-testid="dashboard-heading">
              Workspace
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Accessibility Governance</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" asChild data-testid="btn-view-issues">
              <Link href="/issues" className="gap-1.5 flex items-center">
                <AlertCircle className="h-3.5 w-3.5" />
                View Issues
              </Link>
            </Button>
            <Button size="sm" asChild data-testid="btn-start-audit">
              <Link href="/platform" className="gap-1.5 flex items-center">
                <ClipboardCheck className="h-3.5 w-3.5" />
                Start Audit
              </Link>
            </Button>
            <Button size="sm" variant="outline" data-testid="btn-add-property" onClick={() => navigate("/platform?connect=true")}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Property
            </Button>
          </div>
        </div>

        {/* Global stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4" data-testid="global-stats">
          {isLoading ? (
            <>
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
            </>
          ) : (
            <>
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Properties</p>
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-3xl font-serif font-bold text-primary" data-testid="stat-properties">
                    {stats.totalProperties}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-destructive/20">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-destructive uppercase tracking-wider">Open Issues</p>
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  </div>
                  <p className="text-3xl font-serif font-bold text-destructive" data-testid="stat-open-issues">
                    {stats.openIssues}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Compliance</p>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p
                    className={`text-3xl font-serif font-bold ${stats.avgScore > 0 ? scoreColor(stats.avgScore) : "text-muted-foreground"}`}
                    data-testid="stat-avg-score"
                  >
                    {stats.avgScore > 0 ? `${stats.avgScore}%` : "—"}
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Properties table */}
          <Card className="lg:col-span-2" data-testid="card-properties">
            <CardHeader className="pb-3">
              <CardTitle className="font-serif text-base">Connected Repositories</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : isError ? (
                <p className="text-sm text-destructive p-6">Failed to load repositories.</p>
              ) : repos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-3">
                  <GitBranch className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">No repositories connected yet.</p>
                  <Button size="sm" variant="outline" onClick={() => navigate("/platform?connect=true")}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Connect a Repo
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Repository</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead className="hidden sm:table-cell">Last Scan</TableHead>
                      <TableHead className="text-center">Critical</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {repos.map((repo) => (
                      <TableRow
                        key={repo.id}
                        data-testid={`property-row-${repo.id}`}
                        className="cursor-pointer hover:bg-muted/40 transition-colors"
                        tabIndex={0}
                        role="button"
                        aria-label={`Open audit workspace for ${repo.repoFullName}`}
                        onClick={() => navigate(`/platform?repo=${encodeURIComponent(repo.repoFullName)}`)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            navigate(`/platform?repo=${encodeURIComponent(repo.repoFullName)}`);
                          }
                        }}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm flex items-center gap-1.5">
                              {repo.repoFullName}
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            </p>
                            <p className="text-xs text-muted-foreground">{repo.repoOwner}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {repo.score !== null ? (
                            <div className="space-y-1">
                              <p className={`text-sm font-bold font-serif ${scoreColor(repo.score)}`}>{repo.score}%</p>
                              <Progress value={repo.score} className="h-1 w-16" />
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Not scanned</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {repo.lastScannedAt ? timeAgo(repo.lastScannedAt) : "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          {repo.criticalIssues > 0 ? (
                            <span className="text-destructive font-bold text-sm">{repo.criticalIssues}</span>
                          ) : (
                            <span className="text-green-700 font-bold text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {statusBadge(repo.status)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Recent activity feed */}
          <Card data-testid="card-activity">
            <CardHeader className="pb-3">
              <CardTitle className="font-serif text-base flex items-center justify-between">
                Recent Activity
                {activityFeed.length === 0 && !isLoading && (
                  <span className="text-xs font-normal text-muted-foreground">No events yet</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Skeleton className="h-4 w-4 mt-0.5 rounded flex-shrink-0" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-2 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activityFeed.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Activity will appear here once you connect and scan repositories.
                </p>
              ) : (
                activityFeed.map((item) => {
                  const { icon: Icon, color } = activityIcon(item.type);
                  return (
                    <div key={item.id} className="flex items-start gap-3" data-testid={`activity-${item.id}`}>
                      <div className={`mt-0.5 flex-shrink-0 ${color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-snug">{item.event}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(item.time)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
