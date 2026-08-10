import { Prisma } from "@prisma/client";

export const productCatalogInclude =
  Prisma.validator<Prisma.ProductInclude>()({
    category: true,
    variants: {
      where: { isActive: true },
      include: { size: true, color: true },
      orderBy: { id: "asc" },
    },
  });

export type ProductWithCatalog = Prisma.ProductGetPayload<{
  include: typeof productCatalogInclude;
}>;

const standardSizeOrder = [
  "XXS",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "3XL",
  "4XL",
];

function compareSizeNames(first: string, second: string) {
  const firstIndex = standardSizeOrder.indexOf(first.toUpperCase());
  const secondIndex = standardSizeOrder.indexOf(second.toUpperCase());

  if (firstIndex >= 0 || secondIndex >= 0) {
    return (
      (firstIndex >= 0 ? firstIndex : Number.MAX_SAFE_INTEGER) -
      (secondIndex >= 0 ? secondIndex : Number.MAX_SAFE_INTEGER)
    );
  }

  return first.localeCompare(second, "tr-TR", { numeric: true });
}

export function formatProduct(product: ProductWithCatalog) {
  const { variants, category, ...baseProduct } = product;
  const sizes = Array.from(
    new Map(
      variants
        .filter((variant) => variant.size)
        .map((variant) => [variant.sizeId, variant.size!]),
    ).values(),
  ).sort((first, second) => compareSizeNames(first.name, second.name));
  const colors = Array.from(
    new Map(
      variants
        .filter((variant) => variant.color)
        .map((variant) => [variant.colorId, variant.color!]),
    ).values(),
  ).sort((first, second) =>
    first.name.localeCompare(second.name, "tr-TR"),
  );

  return {
    ...baseProduct,
    price: Number(product.price),
    stock: variants.reduce((total, variant) => total + variant.stock, 0),
    categoryId: product.categoryId,
    category: category?.name ?? null,
    sizeIds: sizes.map((size) => size.id),
    sizes: sizes.map((size) => size.name),
    colorIds: colors.map((color) => color.id),
    colors: colors.map((color) => color.name),
    variants: variants.map((variant) => ({
      id: variant.id,
      sizeId: variant.sizeId,
      size: variant.size?.name ?? null,
      colorId: variant.colorId,
      color: variant.color?.name ?? null,
      stock: variant.stock,
      isActive: variant.isActive,
    })),
  };
}

export function normalizeIds(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0),
    ),
  );
}

export function createVariantInputs(
  sizeIds: number[],
  colorIds: number[],
  totalStock: number,
) {
  const sizes = sizeIds.length > 0 ? sizeIds : [null];
  const colors = colorIds.length > 0 ? colorIds : [null];
  const combinations = sizes.flatMap((sizeId) =>
    colors.map((colorId) => ({ sizeId, colorId })),
  );

  return combinations.map((combination, index) => ({
    ...combination,
    stock:
      Math.floor(totalStock / combinations.length) +
      (index < totalStock % combinations.length ? 1 : 0),
  }));
}
