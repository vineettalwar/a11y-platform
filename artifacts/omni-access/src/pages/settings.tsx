import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Github, CheckCircle2, RefreshCw, UserCircle2, Shield } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const MOCK_MEMBERS = [
  { id: 1, name: "Jordan Kim", email: "j.kim@acme.com", role: "Admin", avatar: "JK" },
  { id: 2, name: "Sarah Jenkins", email: "s.jenkins@acme.com", role: "Editor", avatar: "SJ" },
  { id: 3, name: "Marcus Chen", email: "m.chen@acme.com", role: "Viewer", avatar: "MC" },
];

function roleBadge(role: string) {
  switch (role) {
    case "Admin":
      return <Badge className="text-xs bg-primary/90 hover:bg-primary">{role}</Badge>;
    case "Editor":
      return <Badge variant="secondary" className="text-xs">{role}</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{role}</Badge>;
  }
}

export default function Settings() {
  const { toast } = useToast();
  const [notifs, setNotifs] = useState({
    scanComplete: true,
    newCritical: true,
    weeklyReport: false,
    issueResolved: false,
  });

  const handleSaveNotifs = () => {
    toast({ title: "Preferences saved", description: "Your notification settings have been updated." });
  };

  return (
    <div className="bg-muted/20 min-h-screen" data-testid="page-settings">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-serif font-bold tracking-tight text-primary">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage integrations, preferences, and team access.</p>
        </div>

        {/* Connected Repositories */}
        <Card data-testid="card-repos">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Github className="h-5 w-5 text-primary" />
              <CardTitle className="font-serif text-base">Connected Repositories</CardTitle>
            </div>
            <CardDescription>Repositories linked to your workspace for automated scanning.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-4 p-3 border rounded-lg bg-card" data-testid="repo-row-1">
              <div className="flex items-center gap-3 min-w-0">
                <Github className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">acme-corp/main-site</p>
                  <p className="text-xs text-muted-foreground">Last scanned Apr 29, 2026</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="outline" className="text-xs text-green-700 border-green-600/40 bg-green-600/10 gap-1 flex items-center">
                  <CheckCircle2 className="h-3 w-3" /> Connected
                </Badge>
                <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" data-testid="btn-rescan">
                  <RefreshCw className="h-3 w-3" /> Rescan
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 p-3 border rounded-lg bg-card" data-testid="repo-row-2">
              <div className="flex items-center gap-3 min-w-0">
                <Github className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">acme-corp/portal</p>
                  <p className="text-xs text-muted-foreground">Last scanned Apr 25, 2026</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="outline" className="text-xs text-green-700 border-green-600/40 bg-green-600/10 gap-1 flex items-center">
                  <CheckCircle2 className="h-3 w-3" /> Connected
                </Badge>
                <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" data-testid="btn-rescan-2">
                  <RefreshCw className="h-3 w-3" /> Rescan
                </Button>
              </div>
            </div>

            <Button variant="outline" size="sm" className="gap-1.5" data-testid="btn-add-repo">
              <Github className="h-3.5 w-3.5" /> Add Repository
            </Button>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card data-testid="card-notifications">
          <CardHeader>
            <CardTitle className="font-serif text-base">Notification Preferences</CardTitle>
            <CardDescription>Choose which events trigger notifications for your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {[
              { key: "scanComplete", label: "Scan completed", desc: "Notify when a repository scan finishes" },
              { key: "newCritical", label: "New critical issue found", desc: "Alert on any new critical severity violation" },
              { key: "weeklyReport", label: "Weekly compliance report", desc: "Receive a summary every Monday" },
              { key: "issueResolved", label: "Issue resolved", desc: "Notify when a tracked issue is marked resolved" },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between gap-4" data-testid={`toggle-${key}`}>
                <div className="space-y-0.5">
                  <Label htmlFor={`notif-${key}`} className="text-sm font-medium cursor-pointer">{label}</Label>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <Switch
                  id={`notif-${key}`}
                  checked={notifs[key as keyof typeof notifs]}
                  onCheckedChange={(val) => setNotifs((prev) => ({ ...prev, [key]: val }))}
                />
              </div>
            ))}
            <div className="pt-2">
              <Button size="sm" onClick={handleSaveNotifs} data-testid="btn-save-notifs">Save Preferences</Button>
            </div>
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card data-testid="card-team">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="font-serif text-base">Team Members</CardTitle>
                <CardDescription className="mt-1">People with access to this workspace.</CardDescription>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5 flex-shrink-0" data-testid="btn-invite">
                <UserCircle2 className="h-3.5 w-3.5" /> Invite
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {MOCK_MEMBERS.map((member) => (
              <div key={member.id} className="flex items-center justify-between gap-4" data-testid={`member-row-${member.id}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {member.avatar}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{member.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                </div>
                {roleBadge(member.role)}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Workspace Info */}
        <Card data-testid="card-workspace-info">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="font-serif text-base">Workspace</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Organization</span>
              <span className="font-medium">Acme Corp</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Plan</span>
              <Badge className="text-xs">Professional</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Properties</span>
              <span className="font-medium">4 / 10</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Scans this month</span>
              <span className="font-medium">12 / 50</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
