// services/productService.ts
import { formatProduct } from "@/lib/productCatalog";
import {
  createProductInDb,
  deleteProductFromDb,
  findProductByIdFromDb,
  findProductsFromDb,
  updateProductInDb,
  updateProductStatusInDb,
  validateCatalogFromDb,
} from "@/repositories/productRepository";

export async function validateCatalog(
  categoryId: number | null,
  sizeIds: number[],
  colorIds: number[],
) {
  return await validateCatalogFromDb(categoryId, sizeIds, colorIds);
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
    sizeIds: Array.isArray(body.sizeIds)
      ? body.sizeIds.map(Number).filter((id) => Number.isInteger(id) && id > 0)
      : [],
    colorIds: Array.isArray(body.colorIds)
      ? body.colorIds.map(Number).filter((id) => Number.isInteger(id) && id > 0)
      : [],
  };
}

export function validateProductInput(
  input: ReturnType<typeof parseProductBody>,
) {
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
  const products = await findProductsFromDb(isAdmin);
  return products.map(formatProduct);
}

export async function createProduct(
  input: ReturnType<typeof parseProductBody>,
) {
  const product = await createProductInDb(input);
  return formatProduct(product);
}

export async function findProductById(id: number) {
  return await findProductByIdFromDb(id);
}

export async function updateProductStatus(id: number, isActive: boolean) {
  const product = await updateProductStatusInDb(id, isActive);
  return formatProduct(product);
}

export async function updateProduct(
  id: number,
  input: ReturnType<typeof parseProductBody>,
  existingIsActive: boolean,
  bodyIsActive?: boolean,
) {
  const product = await updateProductInDb(
    id,
    input,
    existingIsActive,
    bodyIsActive,
  );
  return formatProduct(product);
}

export async function deleteProduct(id: number) {
  return await deleteProductFromDb(id);
}
