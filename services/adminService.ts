// services/adminService.ts
import {
  findCatalogOptionsFromDb,
  findDashboardStatsFromDb,
} from "@/repositories/adminRepository";

export async function getDashboardStatsAdmin() {
  const [
    productCount,
    customerCount,
    orderCount,
    todayOrderCount,
    pendingOrderCount,
    paidOrders,
    recentOrders,
  ] = await findDashboardStatsFromDb();

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
  const [categories, sizes, colors] = await findCatalogOptionsFromDb();
  return { categories, sizes, colors };
}
