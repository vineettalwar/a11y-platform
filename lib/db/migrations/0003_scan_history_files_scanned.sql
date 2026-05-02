ALTER TABLE "scan_history" ADD COLUMN IF NOT EXISTS "files_scanned" integer NOT NULL DEFAULT 0;
