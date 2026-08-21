import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSchemaVersion?: number;
};

const PRISMA_SCHEMA_VERSION = 2;

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
    globalForPrisma.prisma = new PrismaClient();
    globalForPrisma.prismaSchemaVersion = PRISMA_SCHEMA_VERSION;
  }

  return globalForPrisma.prisma!;
})();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
