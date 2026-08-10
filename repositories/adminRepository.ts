// repositories/adminRepository.ts
import { prisma } from "@/lib/prisma";

const paidStatuses = ["paid", "success", "completed"];
const pendingStatuses = ["created", "active", "pending"];

export async function findAdminByIdFromDb(id: number) {
  return await prisma.admin.findUnique({
    where: { id },
    select: { id: true, email: true, fullName: true, isActive: true },
  });
}

export async function findAdminByEmailFromDb(email: string) {
  return await prisma.admin.findUnique({
    where: { email },
  });
}

export async function findDashboardStatsFromDb() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  return await Promise.all([
    prisma.product.count(),
    prisma.customer.count(),
    prisma.order.count(),
    prisma.order.count({
      where: {
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    }),
    prisma.order.count({
      where: {
        status: { in: pendingStatuses },
      },
    }),
    prisma.order.findMany({
      where: {
        status: { in: paidStatuses },
      },
      select: { amount: true },
    }),
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        customer: {
          select: {
            fullName: true,
            email: true,
          },
        },
      },
    }),
  ]);
}

export async function findCatalogOptionsFromDb() {
  return await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.size.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.color.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
}
