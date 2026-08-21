import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

function getConnectionString() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "CRITICAL: Vercel paneline DATABASE_URL eklenmemiş veya Production kutucuğu işaretlenmemiş!"
    );
  }
  let formattedUrl = url;
  if (
    (formattedUrl.includes("supabase.co") ||
      formattedUrl.includes("supabase.com") ||
      formattedUrl.includes("neon.tech")) &&
    !formattedUrl.includes("sslmode=")
  ) {
    formattedUrl += formattedUrl.includes("?")
      ? "&sslmode=require"
      : "?sslmode=require";
  }
  return formattedUrl;
}

const connectionString = getConnectionString();
const isCloudDb =
  connectionString.includes("supabase.co") ||
  connectionString.includes("supabase.com") ||
  connectionString.includes("neon.tech") ||
  connectionString.includes("sslmode=require");

const pool = new Pool({
  connectionString,
  max: 2,
  idleTimeoutMillis: 500,
  connectionTimeoutMillis: 3000,
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
