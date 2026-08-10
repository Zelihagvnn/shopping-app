// services/orderService.ts
import { prisma } from "@/lib/prisma";

export async function getCustomerOrders(customerId: number) {
  const orders = await prisma.order.findMany({
    where: { customerId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return orders.map((order) => ({
    ...order,
    amount: Number(order.amount),
    items: order.items.map((item) => ({
      ...item,
      price: Number(item.price),
    })),
  }));
}
