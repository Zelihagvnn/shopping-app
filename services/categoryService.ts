import { prisma } from "@/lib/prisma";

export async function getActiveCategories() {
  return await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}
