// app/backend/entities/coupon.entity.ts

export interface CouponEntity {
  id: number;
  code: string;
  discount: number;
  expirationDate?: Date | string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}
