// services/orderService.ts
import { findOrdersByCustomerIdFromDb } from "@/repositories/orderRepository";

export async function getCustomerOrders(customerId: number) {
  const orders = await findOrdersByCustomerIdFromDb(customerId);

  return orders.map((order) => ({
    ...order,
    amount: Number(order.amount),
    items: order.items.map((item) => ({
      ...item,
      price: Number(item.price),
    })),
  }));
}
