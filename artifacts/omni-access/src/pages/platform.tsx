import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Platform() {
  const complianceScore = 74;

  const issues = [
    { id: "ISS-01", severity: "critical", criterion: "1.1.1 Non-text Content", element: "<img src='hero.jpg'>", page: "/checkout", status: "open" },
    { id: "ISS-02", severity: "critical", criterion: "2.1.1 Keyboard", element: "<div onClick={submit}>", page: "/cart", status: "open" },
    { id: "ISS-03", severity: "critical", criterion: "1.4.3 Contrast (Minimum)", element: "<span class='text-gray-400'>", page: "/login", status: "in-progress" },
    { id: "ISS-04", severity: "serious", criterion: "4.1.2 Name, Role, Value", element: "<button class='btn'>", page: "/profile", status: "open" },
    { id: "ISS-05", severity: "serious", criterion: "1.3.1 Info and Relationships", element: "<table> (no th)", page: "/dashboard", status: "in-progress" },
    { id: "ISS-06", severity: "serious", criterion: "2.4.7 Focus Visible", element: "input:focus { outline: none }", page: "Global", status: "resolved" },
    { id: "ISS-07", severity: "moderate", criterion: "2.4.4 Link Purpose", element: "<a href='/#'>Click here</a>", page: "/blog", status: "open" },
    { id: "ISS-08", severity: "minor", criterion: "1.4.4 Resize text", element: "meta viewport maximum-scale=1", page: "Global", status: "resolved" },
  ];

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical": return <Badge variant="destructive" className="flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Critical</Badge>;
      case "serious": return <Badge className="bg-orange-500 hover:bg-orange-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Serious</Badge>;
      case "moderate": return <Badge variant="secondary" className="flex items-center gap-1"><Info className="w-3 h-3"/> Moderate</Badge>;
      case "minor": return <Badge variant="outline" className="flex items-center gap-1">Minor</Badge>;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open": return <Badge variant="outline" className="text-destructive border-destructive/50 bg-destructive/10">Open</Badge>;
      case "in-progress": return <Badge variant="outline" className="text-orange-600 border-orange-500/50 bg-orange-500/10">In Progress</Badge>;
      case "resolved": return <Badge variant="outline" className="text-green-700 border-green-600/50 bg-green-600/10 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Resolved</Badge>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4" data-testid="page-platform">
      <div className="container mx-auto max-w-7xl space-y-8">
        
        <Alert className="bg-primary/5 border-primary/20" data-testid="alert-preview-notice">
          <Info className="h-5 w-5 text-primary" />
          <AlertTitle className="text-primary font-bold">Platform Preview</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            This is a static preview of the OmniAccess Governance Platform dashboard. Data shown is simulated.
          </AlertDescription>
        </Alert>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold tracking-tight text-primary">Governance Dashboard</h1>
            <p className="text-muted-foreground">Acme Corp Product Suite</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="px-3 py-1 font-medium bg-background text-sm">Last Scan: Today 08:00 AM</Badge>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="stats-grid">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground mb-1">Total Issues</p>
              <h3 className="text-3xl font-bold font-serif text-primary" data-testid="stat-total">47</h3>
            </CardContent>
          </Card>
          <Card className="border-destructive/20">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-destructive mb-1">Critical</p>
              <h3 className="text-3xl font-bold font-serif text-destructive" data-testid="stat-critical">8</h3>
            </CardContent>
          </Card>
          <Card className="border-orange-500/20">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-orange-600 mb-1">In Progress</p>
              <h3 className="text-3xl font-bold font-serif text-orange-600" data-testid="stat-progress">12</h3>
            </CardContent>
          </Card>
          <Card className="border-green-600/20">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-green-700 mb-1">Resolved</p>
              <h3 className="text-3xl font-bold font-serif text-green-700" data-testid="stat-resolved">6</h3>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Compliance Gauge */}
          <Card className="lg:col-span-1 flex flex-col" data-testid="card-compliance-score">
            <CardHeader>
              <CardTitle className="font-serif">Compliance Score</CardTitle>
              <CardDescription>Overall WCAG 2.2 AA adherence</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center">
              <div className="relative w-full" style={{ aspectRatio: "1 / 1" }}>
                <svg width="100%" height="100%" viewBox="0 0 200 200">
                  {/* Background ring (non-compliant) */}
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="20"
                  />
                  {/* Foreground arc (compliant) */}
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
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">Perceivable</span>
                    <span className="text-muted-foreground">82%</span>
                  </div>
                  <Progress value={82} className="h-1.5" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">Operable</span>
                    <span className="text-muted-foreground">68%</span>
                  </div>
                  <Progress value={68} className="h-1.5" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">Understandable</span>
                    <span className="text-muted-foreground">79%</span>
                  </div>
                  <Progress value={79} className="h-1.5" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">Robust</span>
                    <span className="text-muted-foreground">71%</span>
                  </div>
                  <Progress value={71} className="h-1.5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Remediation Roadmap */}
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
                  <span className="font-bold text-primary">40%</span>
                </div>
                <Progress value={40} className="h-2.5" />
                <p className="text-xs text-muted-foreground">Focusing on 1.1.1, 2.1.1, and 4.1.2 violations across high-traffic flows.</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">2</div>
                    <h4 className="font-medium text-base">Serious Issues</h4>
                  </div>
                  <span className="font-bold text-muted-foreground">15%</span>
                </div>
                <Progress value={15} className="h-2.5 bg-muted/50" />
                <p className="text-xs text-muted-foreground">Addressing complex focus management and custom component ARIA states.</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">3</div>
                    <h4 className="font-medium text-base">Full AA Compliance</h4>
                  </div>
                  <span className="font-bold text-muted-foreground">0%</span>
                </div>
                <Progress value={0} className="h-2.5 bg-muted/40" />
                <p className="text-xs text-muted-foreground">Final sweep of minor contrast and semantic structural issues.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Issue Tracker Table */}
        <Card data-testid="card-issue-tracker">
          <CardHeader>
            <CardTitle className="font-serif">Active Issue Backlog</CardTitle>
            <CardDescription>Prioritized list of identified WCAG violations requiring engineering remediation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Severity</TableHead>
                    <TableHead>WCAG Criterion</TableHead>
                    <TableHead className="hidden md:table-cell">Affected Element</TableHead>
                    <TableHead>Page</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issues.map((issue) => (
                    <TableRow key={issue.id} data-testid={`issue-row-${issue.id}`}>
                      <TableCell className="font-medium">
                        {getSeverityBadge(issue.severity)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {issue.criterion}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs font-mono bg-muted/30 p-1 rounded">
                        {issue.element}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {issue.page}
                      </TableCell>
                      <TableCell className="text-right">
                        {getStatusBadge(issue.status)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
