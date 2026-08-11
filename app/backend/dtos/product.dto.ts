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
