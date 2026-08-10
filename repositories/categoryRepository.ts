// repositories/categoryRepository.ts
import { prisma } from "@/lib/prisma";

export async function findActiveCategoriesFromDb() {
  return await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function findAllCategoriesFromDb() {
  return await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });
}

export async function findCategoryByNameOrSlugFromDb(name: string, slug: string) {
  return await prisma.category.findFirst({
    where: { OR: [{ name: { equals: name, mode: "insensitive" } }, { slug }] },
  });
}

export async function createCategoryInDb(name: string, slug: string) {
  return await prisma.category.create({
    data: { name, slug, isActive: true },
  });
}

export async function updateCategoryStatusInDb(id: number, isActive: boolean) {
  return await prisma.category.update({
    where: { id },
    data: { isActive },
  });
}

export async function countProductsByCategoryIdFromDb(id: number) {
  return await prisma.product.count({
    where: { categoryId: id },
  });
}

export async function deleteCategoryFromDb(id: number) {
  return await prisma.category.delete({ where: { id } });
}
