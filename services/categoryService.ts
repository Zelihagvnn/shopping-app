import { findActiveCategoriesFromDb } from "@/repositories/categoryRepository";

export async function getActiveCategories() {
  // Servis katmanı veritabanını bilmez, sadece Repository'yi çağırır
  return await findActiveCategoriesFromDb();
}
