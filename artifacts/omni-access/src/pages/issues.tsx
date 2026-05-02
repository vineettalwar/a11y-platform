import { IssuesTab } from "./platform";

export default function Issues() {
  return (
    <div className="bg-muted/20 min-h-screen" data-testid="page-issues">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-bold tracking-tight text-primary">Issues</h1>
          <p className="text-sm text-muted-foreground mt-0.5">All accessibility violations across your connected repositories.</p>
        </div>
        <IssuesTab repoFullName={null} />
      </div>
    </div>
  );
}
