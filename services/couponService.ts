import { prisma } from "@/lib/prisma";

export async function getActivePublicCoupons() {
  const now = new Date();
  return await prisma.coupon.findMany({
    where: {
      isActive: true,
      OR: [
        { expirationDate: null },
        { expirationDate: { gte: now } },
      ],
    },
    select: {
      id: true,
      code: true,
      discount: true,
      expirationDate: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function validateCouponCode(code: string) {
  const coupon = await prisma.coupon.findUnique({
    where: { code },
  });

  if (!coupon || !coupon.isActive) {
    return { valid: false, message: "Geçersiz kupon kodu." };
  }

  if (coupon.expirationDate && new Date(coupon.expirationDate) < new Date()) {
    return { valid: false, message: "Bu kuponun süresi dolmuş." };
  }

  return { valid: true, coupon };
}

export async function getAllCouponsAdmin() {
  return await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function createCouponAdmin(data: {
  code: string;
  discount: number;
  expirationDate: Date | null;
}) {
  const existing = await prisma.coupon.findUnique({
    where: { code: data.code },
  });

  if (existing) {
    throw new Error("Bu kupon kodu zaten mevcut.");
  }

  return await prisma.coupon.create({
    data: {
      code: data.code,
      discount: data.discount,
      expirationDate: data.expirationDate,
      isActive: true,
    },
  });
}

export async function updateCouponStatusAdmin(id: number, isActive: boolean) {
  return await prisma.coupon.update({
    where: { id },
    data: { isActive },
  });
}

export async function deleteCouponAdmin(id: number) {
  return await prisma.coupon.delete({
    where: { id },
  });
}
