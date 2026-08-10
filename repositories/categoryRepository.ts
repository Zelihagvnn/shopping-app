// repositories/categoryRepository.ts
import { prisma } from "@/lib/prisma";

export async function findActiveCategoriesFromDb() {
  return await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}
