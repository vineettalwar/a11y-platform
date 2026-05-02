import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Plus,
  ClipboardCheck,
  AlertTriangle,
  Activity,
  ExternalLink,
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

const MOCK_PROPERTIES = [
  {
    id: "p-1",
    name: "acme.com",
    type: "Web App",
    score: 74,
    lastScan: "2026-04-29",
    criticalIssues: 3,
    status: "needs-attention",
  },
  {
    id: "p-2",
    name: "acme-mobile (iOS)",
    type: "iOS App",
    score: 88,
    lastScan: "2026-04-27",
    criticalIssues: 1,
    status: "good",
  },
  {
    id: "p-3",
    name: "portal.acme.com",
    type: "Web App",
    score: 61,
    lastScan: "2026-04-25",
    criticalIssues: 7,
    status: "critical",
  },
  {
    id: "p-4",
    name: "docs.acme.com",
    type: "Web App",
    score: 95,
    lastScan: "2026-04-30",
    criticalIssues: 0,
    status: "good",
  },
];

const ACTIVITY_FEED = [
  { id: 1, event: "Scan completed for acme.com", time: "2 hours ago", icon: ClipboardCheck, color: "text-primary" },
  { id: 2, event: "ISS-03 marked In Progress by @jsmith", time: "4 hours ago", icon: Activity, color: "text-orange-500" },
  { id: 3, event: "Scan completed for docs.acme.com", time: "6 hours ago", icon: ClipboardCheck, color: "text-primary" },
  { id: 4, event: "ISS-06 resolved — focus outline restored", time: "Yesterday", icon: CheckCircle2, color: "text-green-600" },
  { id: 5, event: "portal.acme.com added to workspace", time: "2 days ago", icon: Plus, color: "text-muted-foreground" },
  { id: 6, event: "ISS-08 resolved — viewport meta fixed", time: "3 days ago", icon: CheckCircle2, color: "text-green-600" },
];

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
    default:
      return null;
  }
}

const avgScore = Math.round(MOCK_PROPERTIES.reduce((a, p) => a + p.score, 0) / MOCK_PROPERTIES.length);
const totalCritical = MOCK_PROPERTIES.reduce((a, p) => a + p.criticalIssues, 0);

export default function Home() {
  return (
    <div className="bg-muted/20 min-h-screen" data-testid="page-dashboard">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

        {/* Page header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-serif font-bold tracking-tight text-primary" data-testid="dashboard-heading">
              Workspace
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Acme Corp — Accessibility Governance</p>
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
            <Button size="sm" variant="outline" data-testid="btn-add-property">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Property
            </Button>
          </div>
        </div>

        {/* Global stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="global-stats">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Properties</p>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-3xl font-serif font-bold text-primary" data-testid="stat-properties">
                {MOCK_PROPERTIES.length}
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
                {totalCritical + 4}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Compliance</p>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className={`text-3xl font-serif font-bold ${scoreColor(avgScore)}`} data-testid="stat-avg-score">
                {avgScore}%
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-600/20">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-green-700 uppercase tracking-wider">Resolved This Month</p>
                <CheckCircle2 className="h-4 w-4 text-green-700" />
              </div>
              <p className="text-3xl font-serif font-bold text-green-700" data-testid="stat-resolved">
                8
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Properties table */}
          <Card className="lg:col-span-2" data-testid="card-properties">
            <CardHeader className="pb-3">
              <CardTitle className="font-serif text-base">Properties</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead className="hidden sm:table-cell">Last Scan</TableHead>
                    <TableHead className="text-center">Critical</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_PROPERTIES.map((p) => (
                    <TableRow key={p.id} data-testid={`property-row-${p.id}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm flex items-center gap-1.5">
                            {p.name}
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </p>
                          <p className="text-xs text-muted-foreground">{p.type}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className={`text-sm font-bold font-serif ${scoreColor(p.score)}`}>{p.score}%</p>
                          <Progress value={p.score} className="h-1 w-16" />
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {p.lastScan}
                      </TableCell>
                      <TableCell className="text-center">
                        {p.criticalIssues > 0 ? (
                          <span className="text-destructive font-bold text-sm">{p.criticalIssues}</span>
                        ) : (
                          <span className="text-green-700 font-bold text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {statusBadge(p.status)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recent activity feed */}
          <Card data-testid="card-activity">
            <CardHeader className="pb-3">
              <CardTitle className="font-serif text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ACTIVITY_FEED.map((item) => (
                <div key={item.id} className="flex items-start gap-3" data-testid={`activity-${item.id}`}>
                  <div className={`mt-0.5 flex-shrink-0 ${item.color}`}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug">{item.event}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
