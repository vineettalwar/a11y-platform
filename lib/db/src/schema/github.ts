import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const githubConnections = pgTable("github_connections", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  githubLogin: text("github_login").notNull(),
  githubUserId: text("github_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const connectedRepos = pgTable("connected_repos", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  repoOwner: text("repo_owner").notNull(),
  repoName: text("repo_name").notNull(),
  repoFullName: text("repo_full_name").notNull(),
  lastScannedAt: timestamp("last_scanned_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const scanResults = pgTable("scan_results", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  repoFullName: text("repo_full_name").notNull(),
  scanId: text("scan_id").notNull(),
  filePath: text("file_path").notNull(),
  lineNumber: integer("line_number"),
  ruleId: text("rule_id").notNull(),
  severity: text("severity").notNull(),
  description: text("description").notNull(),
  element: text("element"),
  wcagCriterion: text("wcag_criterion"),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const scanHistory = pgTable("scan_history", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  repoFullName: text("repo_full_name").notNull(),
  scanId: text("scan_id").notNull(),
  scannedAt: timestamp("scanned_at", { withTimezone: true }).defaultNow().notNull(),
  complianceScore: integer("compliance_score").notNull(),
  totalIssues: integer("total_issues").notNull(),
  criticalCount: integer("critical_count").notNull().default(0),
  seriousCount: integer("serious_count").notNull().default(0),
  moderateCount: integer("moderate_count").notNull().default(0),
  minorCount: integer("minor_count").notNull().default(0),
});

export const insertGithubConnectionSchema = createInsertSchema(githubConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertGithubConnection = z.infer<typeof insertGithubConnectionSchema>;
export type GithubConnection = typeof githubConnections.$inferSelect;

export const insertConnectedRepoSchema = createInsertSchema(connectedRepos).omit({
  id: true,
  createdAt: true,
});
export type InsertConnectedRepo = z.infer<typeof insertConnectedRepoSchema>;
export type ConnectedRepo = typeof connectedRepos.$inferSelect;

export const insertScanResultSchema = createInsertSchema(scanResults).omit({
  id: true,
  createdAt: true,
});
export type InsertScanResult = z.infer<typeof insertScanResultSchema>;
export type ScanResult = typeof scanResults.$inferSelect;

export const insertScanHistorySchema = createInsertSchema(scanHistory).omit({
  id: true,
});
export type InsertScanHistory = z.infer<typeof insertScanHistorySchema>;
export type ScanHistoryEntry = typeof scanHistory.$inferSelect;
