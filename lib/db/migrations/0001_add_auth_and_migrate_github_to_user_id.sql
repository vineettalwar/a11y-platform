CREATE TABLE IF NOT EXISTS "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" ("expire");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar UNIQUE,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "github_connections" ADD COLUMN IF NOT EXISTS "user_id" text;
--> statement-breakpoint
UPDATE "github_connections" SET "user_id" = 'migrated_' || "id"::text WHERE "user_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "github_connections" ALTER COLUMN "user_id" SET NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "github_connections" ADD CONSTRAINT "github_connections_user_id_unique" UNIQUE("user_id");
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "github_connections" DROP COLUMN IF EXISTS "session_id";
--> statement-breakpoint
ALTER TABLE "connected_repos" ADD COLUMN IF NOT EXISTS "user_id" text;
--> statement-breakpoint
UPDATE "connected_repos" SET "user_id" = 'migrated_' || "id"::text WHERE "user_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "connected_repos" ALTER COLUMN "user_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "connected_repos" DROP COLUMN IF EXISTS "session_id";
--> statement-breakpoint
ALTER TABLE "scan_results" ADD COLUMN IF NOT EXISTS "user_id" text;
--> statement-breakpoint
UPDATE "scan_results" SET "user_id" = 'migrated_' || "id"::text WHERE "user_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "scan_results" ALTER COLUMN "user_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "scan_results" DROP COLUMN IF EXISTS "session_id";
