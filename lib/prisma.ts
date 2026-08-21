import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/dummy";

const adapter = new PrismaPg({
  connectionString,
});

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
