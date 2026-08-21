import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

function getConnectionString() {
  let url =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/dummy";
  if (
    (url.includes("supabase.co") ||
      url.includes("supabase.com") ||
      url.includes("neon.tech")) &&
    !url.includes("sslmode=")
  ) {
    url += url.includes("?") ? "&sslmode=require" : "?sslmode=require";
  }
  return url;
}

const connectionString = getConnectionString();

const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 1000,
  connectionTimeoutMillis: 5000,
  ssl: connectionString.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSchemaVersion?: number;
};

const PRISMA_SCHEMA_VERSION = 2;

const createPrismaClient = () =>
  new PrismaClient({
    adapter,
  });

export const prisma = (() => {
  const currentClient = globalForPrisma.prisma as
    | (PrismaClient & {
        size?: unknown;
        color?: unknown;
        productVariant?: unknown;
      })
    | undefined;

  if (
    !currentClient ||
    globalForPrisma.prismaSchemaVersion !== PRISMA_SCHEMA_VERSION ||
    !currentClient.size ||
    !currentClient.color ||
    !currentClient.productVariant
  ) {
    globalForPrisma.prisma = createPrismaClient();
    globalForPrisma.prismaSchemaVersion = PRISMA_SCHEMA_VERSION;
  }

  return globalForPrisma.prisma!;
})();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
