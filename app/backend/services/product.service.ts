import { formatProduct } from "@/lib/productCatalog";
import { parseProductBody, validateProductInput } from "../dtos/product.dto";
import {
  createProductInDb,
  deleteProductFromDb,
  findProductByBarcodeFromDb,
  findProductByIdFromDb,
  findProductFullByIdFromDb,
  findProductsFromDb,
  findVariantByBarcodeFromDb,
  updateProductInDb,
  updateProductStatusInDb,
  validateCatalogFromDb,
} from "../repositories/product.repository";

export async function getAllProducts(isAdmin: boolean = false) {
  const products = await findProductsFromDb(isAdmin);
  return products.map(formatProduct);
}

export async function getProductById(id: number) {
  const product = await findProductFullByIdFromDb(id);
  if (!product || !product.isActive) return null;
  return formatProduct(product);
}

export async function getProductByBarcode(barcode: string) {
  const product = await findProductByBarcodeFromDb(barcode);
  if (!product || !product.isActive) return null;
  return formatProduct(product);
}

export async function getVariantByBarcode(barcode: string) {
  return await findVariantByBarcodeFromDb(barcode);
}

export async function createProduct(body: Record<string, unknown>) {
  const input = parseProductBody(body);
  const inputError = validateProductInput(input);
  if (inputError) throw new Error(inputError);

  const catalogError = await validateCatalogFromDb(
    input.categoryId,
    input.sizeIds,
    input.colorIds,
  );
  if (catalogError) throw new Error(catalogError);

  const product = await createProductInDb(input);
  return formatProduct(product);
}

export async function updateProduct(id: number, body: Record<string, unknown>) {
  const existingProduct = await findProductByIdFromDb(id);
  if (!existingProduct) throw new Error("Güncellenecek ürün bulunamadı.");

  if (body.statusOnly === true && typeof body.isActive === "boolean") {
    const updatedStatus = await updateProductStatusInDb(id, body.isActive);
    return formatProduct(updatedStatus);
  }

  const input = parseProductBody(body);
  const inputError = validateProductInput(input);
  if (inputError) throw new Error(inputError);

  const catalogError = await validateCatalogFromDb(
    input.categoryId,
    input.sizeIds,
    input.colorIds,
  );
  if (catalogError) throw new Error(catalogError);

  const isActive =
    typeof body.isActive === "boolean"
      ? body.isActive
      : existingProduct.isActive;

  const updatedProduct = await updateProductInDb(
    id,
    input,
    existingProduct.isActive,
    isActive,
  );
  return formatProduct(updatedProduct);
}

export async function deleteProduct(id: number) {
  const existingProduct = await findProductByIdFromDb(id);
  if (!existingProduct) throw new Error("Silinecek ürün bulunamadı.");

  return await deleteProductFromDb(id);
}
