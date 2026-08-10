import {
  deleteCouponFromDb,
  findActivePublicCouponsFromDb,
  findAllCouponsFromDb,
  findCouponByCodeFromDb,
  insertCouponToDb,
  updateCouponStatusInDb,
} from "../repositories/coupon.repository";

export async function getActivePublicCoupons() {
  return await findActivePublicCouponsFromDb();
}

export async function validateCouponCode(code: string) {
  const coupon = await findCouponByCodeFromDb(code);

  if (!coupon || !coupon.isActive) {
    return { valid: false, message: "Geçersiz kupon kodu." };
  }

  if (coupon.expirationDate && new Date(coupon.expirationDate) < new Date()) {
    return { valid: false, message: "Bu kuponun süresi dolmuş." };
  }

  return { valid: true, coupon };
}

export async function getAllCouponsAdmin() {
  return await findAllCouponsFromDb();
}

export async function createCouponAdmin(data: {
  code: string;
  discount: number;
  expirationDate: Date | null;
}) {
  const existing = await findCouponByCodeFromDb(data.code);
  if (existing) {
    throw new Error("Bu kupon kodu zaten mevcut.");
  }

  return await insertCouponToDb(data);
}

export async function updateCouponStatusAdmin(id: number, isActive: boolean) {
  return await updateCouponStatusInDb(id, isActive);
}

export async function deleteCouponAdmin(id: number) {
  return await deleteCouponFromDb(id);
}
