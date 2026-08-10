import { prisma } from "@/lib/prisma";

const paidStatuses = ["paid", "success", "completed"];
const pendingStatuses = ["created", "active", "pending"];

export async function getDashboardStatsAdmin() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [
    productCount,
    customerCount,
    orderCount,
    todayOrderCount,
    pendingOrderCount,
    paidOrders,
    recentOrders,
  ] = await Promise.all([
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

  const totalRevenue = paidOrders.reduce(
    (total, order) => total + Number(order.amount),
    0,
  );

  const formattedRecentOrders = recentOrders.map((order) => ({
    id: order.id,
    merchantReference: order.merchantReference,
    customerName:
      order.customer?.fullName || order.customerName || "Bilinmeyen Müşteri",
    customerEmail:
      order.customer?.email || order.customerEmail || "E-posta bulunmuyor",
    amount: Number(order.amount),
    status: order.status,
    createdAt: order.createdAt.toISOString(),
  }));

  return {
    stats: {
      productCount,
      customerCount,
      orderCount,
      todayOrderCount,
      pendingOrderCount,
      totalRevenue,
    },
    recentOrders: formattedRecentOrders,
  };
}

export async function getCatalogOptionsAdmin() {
  const [categories, sizes, colors] = await Promise.all([
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

  return { categories, sizes, colors };
}
