// app/backend/repositories/coupon.repository.ts
import { prisma } from "@/lib/prisma";

export async function findActivePublicCouponsFromDb() {
  const now = new Date();
  return await prisma.coupon.findMany({
    where: {
      isActive: true,
      OR: [{ expirationDate: null }, { expirationDate: { gte: now } }],
    },
    select: {
      id: true,
      code: true,
      discount: true,
      expirationDate: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function findCouponByCodeFromDb(code: string) {
  return await prisma.coupon.findUnique({
    where: { code },
  });
}

export async function findAllCouponsFromDb() {
  return await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function insertCouponToDb(data: {
  code: string;
  discount: number;
  expirationDate: Date | null;
}) {
  return await prisma.coupon.create({
    data: {
      code: data.code,
      discount: data.discount,
      expirationDate: data.expirationDate,
      isActive: true,
    },
  });
}

export async function updateCouponStatusInDb(id: number, isActive: boolean) {
  return await prisma.coupon.update({
    where: { id },
    data: { isActive },
  });
}

export async function deleteCouponFromDb(id: number) {
  return await prisma.coupon.delete({ where: { id } });
}
