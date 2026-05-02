CREATE TABLE IF NOT EXISTS "leads" (
        "id" serial PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "email" text NOT NULL,
        "company" text,
        "message" text,
        "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversations" (
        "id" serial PRIMARY KEY NOT NULL,
        "title" text NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
        "id" serial PRIMARY KEY NOT NULL,
        "conversation_id" integer NOT NULL,
        "role" text NOT NULL,
        "content" text NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "connected_repos" (
        "id" serial PRIMARY KEY NOT NULL,
        "session_id" text NOT NULL,
        "repo_owner" text NOT NULL,
        "repo_name" text NOT NULL,
        "repo_full_name" text NOT NULL,
        "last_scanned_at" timestamp with time zone,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "github_connections" (
        "id" serial PRIMARY KEY NOT NULL,
        "session_id" text NOT NULL,
        "access_token" text NOT NULL,
        "github_login" text NOT NULL,
        "github_user_id" text NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT "github_connections_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scan_results" (
        "id" serial PRIMARY KEY NOT NULL,
        "session_id" text NOT NULL,
        "repo_full_name" text NOT NULL,
        "scan_id" text NOT NULL,
        "file_path" text NOT NULL,
        "line_number" integer,
        "rule_id" text NOT NULL,
        "severity" text NOT NULL,
        "description" text NOT NULL,
        "element" text,
        "wcag_criterion" text,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;