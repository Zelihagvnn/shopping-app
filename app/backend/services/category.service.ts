import {
  countProductsByCategoryIdFromDb,
  createCategoryInDb,
  deleteCategoryFromDb,
  findActiveCategoriesFromDb,
  findAllCategoriesFromDb,
  findCategoryByNameOrSlugFromDb,
  updateCategoryStatusInDb,
} from "../repositories/category.repository";

function createSlug(name: string) {
  return name
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function getActiveCategories() {
  return await findActiveCategoriesFromDb();
}

export async function getAllCategoriesAdmin() {
  return await findAllCategoriesFromDb();
}

export async function createCategoryAdmin(name: string) {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("Kategori adı zorunludur.");

  const slug = createSlug(trimmedName);
  if (!slug) throw new Error("Geçerli bir kategori adı giriniz.");

  const existing = await findCategoryByNameOrSlugFromDb(trimmedName, slug);
  if (existing) throw new Error("Bu kategori zaten mevcut.");

  return await createCategoryInDb(trimmedName, slug);
}

export async function updateCategoryStatusAdmin(id: number, isActive: boolean) {
  return await updateCategoryStatusInDb(id, isActive);
}

export async function deleteCategoryAdmin(id: number) {
  const productCount = await countProductsByCategoryIdFromDb(id);
  if (productCount > 0) {
    throw new Error(
      "Bu kategori ürünlerde kullanılıyor. Önce ürünlerin kategorisini değiştirin.",
    );
  }

  return await deleteCategoryFromDb(id);
}
