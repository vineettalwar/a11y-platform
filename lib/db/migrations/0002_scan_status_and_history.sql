ALTER TABLE "scan_results" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'open';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scan_history" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "repo_full_name" text NOT NULL,
  "scan_id" text NOT NULL,
  "scanned_at" timestamp with time zone DEFAULT now() NOT NULL,
  "compliance_score" integer NOT NULL,
  "total_issues" integer NOT NULL,
  "critical_count" integer DEFAULT 0 NOT NULL,
  "serious_count" integer DEFAULT 0 NOT NULL,
  "moderate_count" integer DEFAULT 0 NOT NULL,
  "minor_count" integer DEFAULT 0 NOT NULL
);
