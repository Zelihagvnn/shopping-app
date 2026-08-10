// repositories/orderRepository.ts
import { prisma } from "@/lib/prisma";

export async function findOrdersByCustomerIdFromDb(customerId: number) {
  return await prisma.order.findMany({
    where: { customerId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
}
