import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";
import { fileURLToPath } from "url";
import app from "./app";
import { logger } from "./lib/logger";
import { db, pool } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const _dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(_dirname, "../../../lib/db/migrations");

async function main() {
  logger.info({ migrationsFolder }, "Running database migrations...");
  await migrate(db, { migrationsFolder });
  logger.info("Database migrations complete");

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

main().catch((err) => {
  logger.error({ err }, "Failed to start server");
  pool.end();
  process.exit(1);
});
