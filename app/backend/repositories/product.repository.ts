import { prisma } from "@/lib/prisma";
import {
  createVariantInputs,
  productCatalogInclude,
} from "@/lib/productCatalog";

export async function validateCatalogFromDb(
  categoryId: number | null,
  sizeIds: number[],
  colorIds: number[],
) {
  const [category, sizeCount, colorCount] = await Promise.all([
    categoryId
      ? prisma.category.findFirst({
          where: { id: categoryId, isActive: true },
          select: { id: true },
        })
      : Promise.resolve(null),
    prisma.size.count({
      where: { id: { in: sizeIds }, isActive: true },
    }),
    prisma.color.count({
      where: { id: { in: colorIds }, isActive: true },
    }),
  ]);

  if (categoryId && !category) return "Seçilen kategori bulunamadı veya pasif.";
  if (sizeCount !== sizeIds.length) return "Seçilen bedenlerden biri geçersiz.";
  if (colorCount !== colorIds.length)
    return "Seçilen renklerden biri geçersiz.";

  return null;
}

export async function findProductsFromDb(isAdmin: boolean = false) {
  return await prisma.product.findMany({
    where: isAdmin ? undefined : { isActive: true },
    include: productCatalogInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function findProductByIdFromDb(id: number) {
  return await prisma.product.findUnique({
    where: { id },
    select: { id: true, isActive: true },
  });
}

export async function findProductFullByIdFromDb(id: number) {
  return await prisma.product.findUnique({
    where: { id },
    include: productCatalogInclude,
  });
}

export async function findProductByBarcodeFromDb(barcode: string) {
  return await prisma.product.findUnique({
    where: { barcode },
    include: productCatalogInclude,
  });
}

export async function findVariantByBarcodeFromDb(barcode: string) {
  return await prisma.productVariant.findFirst({
    where: {
      OR: [{ sku: barcode }, { product: { barcode } }],
    },
    include: {
      product: true,
      size: true,
      color: true,
    },
  });
}

export async function createProductInDb(input: {
  barcode: string | null;
  title: string;
  description: string | null;
  price: number;
  image: string;
  categoryId: number | null;
  sizeIds: number[];
  colorIds: number[];
  stock: number;
}) {
  return await prisma.product.create({
    data: {
      barcode: input.barcode,
      title: input.title,
      description: input.description,
      price: input.price,
      image: input.image,
      categoryId: input.categoryId,
      isActive: true,
      variants: {
        create: createVariantInputs(input.sizeIds, input.colorIds, input.stock),
      },
    },
    include: productCatalogInclude,
  });
}

export async function updateProductInDb(
  id: number,
  input: {
    barcode: string | null;
    title: string;
    description: string | null;
    price: number;
    image: string;
    categoryId: number | null;
    sizeIds: number[];
    colorIds: number[];
    stock: number;
  },
  existingIsActive: boolean,
  bodyIsActive?: boolean,
) {
  return await prisma.product.update({
    where: { id },
    data: {
      barcode: input.barcode,
      title: input.title,
      description: input.description,
      price: input.price,
      image: input.image,
      categoryId: input.categoryId,
      isActive:
        typeof bodyIsActive === "boolean" ? bodyIsActive : existingIsActive,
      variants: {
        deleteMany: {},
        create: createVariantInputs(input.sizeIds, input.colorIds, input.stock),
      },
    },
    include: productCatalogInclude,
  });
}

export async function updateProductStatusInDb(id: number, isActive: boolean) {
  return await prisma.product.update({
    where: { id },
    data: { isActive },
    include: productCatalogInclude,
  });
}

export async function deleteProductFromDb(id: number) {
  return await prisma.product.delete({ where: { id } });
}
