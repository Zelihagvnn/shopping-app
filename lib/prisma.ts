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
const isCloudDb =
  connectionString.includes("supabase.co") ||
  connectionString.includes("supabase.com") ||
  connectionString.includes("neon.tech") ||
  connectionString.includes("sslmode=require");

const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 1000,
  connectionTimeoutMillis: 5000,
  ...(isCloudDb ? { ssl: { rejectUnauthorized: false } } : {}),
});

const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
