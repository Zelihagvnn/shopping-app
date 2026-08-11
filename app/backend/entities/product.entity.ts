export interface ProductVariantEntity {
  id: number;
  productId: number;
  sizeId?: number | null;
  colorId?: number | null;
  sku?: string | null;
  stock: number;
  isActive: boolean;
  size?: { id: number; name: string } | null;
  color?: { id: number; name: string } | null;
}

export interface ProductEntity {
  id: number;
  title: string;
  description?: string | null;
  price: number | string;
  image: string;
  isActive: boolean;
  categoryId?: number | null;
  barcode?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  category?: { id: number; name: string; slug: string } | null;
  variants?: ProductVariantEntity[];
}
