import { ReportsTab } from "./platform";

export default function Reports() {
  return (
    <div className="bg-muted/20 min-h-screen" data-testid="page-reports">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-bold tracking-tight text-primary">Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Generate and export compliance reports for your organization.</p>
        </div>
        <ReportsTab />
      </div>
    </div>
  );
}
