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
import { parseProductBody, validateProductInput } from "@/validators/productValidator";

export { parseProductBody, validateProductInput };

export async function validateCatalog(
  categoryId: number | null,
  sizeIds: number[],
  colorIds: number[],
) {
  return await validateCatalogFromDb(categoryId, sizeIds, colorIds);
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
