import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createVariantInputs,
  formatProduct,
  normalizeIds,
  productCatalogInclude,
} from "@/lib/productCatalog";

export async function validateCatalog(
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
  if (colorCount !== colorIds.length) return "Seçilen renklerden biri geçersiz.";

  return null;
}

export function parseProductBody(body: Record<string, unknown>) {
  const barcode = typeof body.barcode === "string" ? body.barcode.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const image = typeof body.image === "string" ? body.image.trim() : "";
  const price = Number(body.price);
  const stock = Number(body.stock);
  const rawCategoryId =
    body.categoryId === "" || body.categoryId == null
      ? null
      : Number(body.categoryId);
  const categoryId =
    rawCategoryId === null ||
    (Number.isInteger(rawCategoryId) && rawCategoryId > 0)
      ? rawCategoryId
      : Number.NaN;

  return {
    barcode: barcode || null,
    title,
    description: description || null,
    image,
    price,
    stock,
    categoryId,
    sizeIds: normalizeIds(body.sizeIds),
    colorIds: normalizeIds(body.colorIds),
  };
}

export function validateProductInput(input: ReturnType<typeof parseProductBody>) {
  if (input.barcode && !/^[A-Za-z0-9._-]{4,64}$/.test(input.barcode))
    return "Barkod 4-64 karakter olmalı; yalnızca harf, rakam, nokta, tire veya alt çizgi içermelidir.";
  if (!input.title) return "Ürün adı zorunludur.";
  if (!Number.isFinite(input.price) || input.price <= 0)
    return "Geçerli bir ürün fiyatı giriniz.";
  if (!input.image) return "Ürün resmi zorunludur.";
  if (!Number.isInteger(input.stock) || input.stock < 0)
    return "Stok miktarı geçerli bir tam sayı olmalıdır.";
  if (Number.isNaN(input.categoryId)) return "Geçerli bir kategori seçiniz.";

  return null;
}

export async function getAllProducts(isAdmin: boolean = false) {
  const products = await prisma.product.findMany({
    where: isAdmin ? undefined : { isActive: true },
    include: productCatalogInclude,
    orderBy: { createdAt: "desc" },
  });

  return products.map(formatProduct);
}

export async function createProduct(input: ReturnType<typeof parseProductBody>) {
  const product = await prisma.product.create({
    data: {
      barcode: input.barcode,
      title: input.title,
      description: input.description,
      price: input.price,
      image: input.image,
      categoryId: input.categoryId,
      isActive: true,
      variants: {
        create: createVariantInputs(
          input.sizeIds,
          input.colorIds,
          input.stock,
        ),
      },
    },
    include: productCatalogInclude,
  });

  return formatProduct(product);
}

export async function findProductById(id: number) {
  return await prisma.product.findUnique({
    where: { id },
    select: { id: true, isActive: true },
  });
}

export async function updateProductStatus(id: number, isActive: boolean) {
  const product = await prisma.product.update({
    where: { id },
    data: { isActive },
    include: productCatalogInclude,
  });

  return formatProduct(product);
}

export async function updateProduct(
  id: number,
  input: ReturnType<typeof parseProductBody>,
  existingIsActive: boolean,
  bodyIsActive?: boolean,
) {
  const product = await prisma.product.update({
    where: { id },
    data: {
      barcode: input.barcode,
      title: input.title,
      description: input.description,
      price: input.price,
      image: input.image,
      categoryId: input.categoryId,
      isActive: typeof bodyIsActive === "boolean" ? bodyIsActive : existingIsActive,
      variants: {
        deleteMany: {},
        create: createVariantInputs(
          input.sizeIds,
          input.colorIds,
          input.stock,
        ),
      },
    },
    include: productCatalogInclude,
  });

  return formatProduct(product);
}

export async function deleteProduct(id: number) {
  return await prisma.product.delete({ where: { id } });
}
