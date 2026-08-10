// app/backend/entities/category.entity.ts

export interface CategoryEntity {
  id: number;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  _count?: {
    products: number;
  };
}
