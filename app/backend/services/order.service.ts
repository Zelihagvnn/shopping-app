import { randomUUID } from "crypto";
import {
  createPosOrderTransactionInDb,
  createPosPaythorOrderInDb,
  findAllOrdersAdminFromDb,
  findOrderByIdFromDb,
  findOrderByMerchantRefFromDb,
  findOrdersByCustomerIdFromDb,
  findVariantsForPosFromDb,
  processOrderPaidTransactionInDb,
  updateOrderStatusByMerchantReferenceInDb,
  updateOrderStatusInDb,
} from "../repositories/order.repository";

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

export async function getOrderById(id: number, customerId?: number) {
  const order = await findOrderByIdFromDb(id);

  if (!order) return null;
  if (customerId && order.customerId !== customerId) return null;

  return {
    ...order,
    amount: Number(order.amount),
    items: order.items.map((item) => ({
      ...item,
      price: Number(item.price),
    })),
  };
}

export async function getOrderByMerchantRef(merchantReference: string) {
  return await findOrderByMerchantRefFromDb(merchantReference);
}

export async function confirmOrderPaid(
  orderId: number,
  items: Array<{ variantId: number | null; quantity: number }>,
) {
  return await processOrderPaidTransactionInDb(orderId, items);
}

export async function getAllOrdersAdmin(statusFilter?: string) {
  const orders = await findAllOrdersAdminFromDb(statusFilter);

  return orders.map((order) => ({
    ...order,
    amount: Number(order.amount),
    items: order.items.map((item) => ({
      ...item,
      price: Number(item.price),
    })),
  }));
}

export async function updateOrderStatusAdmin(id: number, status: string) {
  return await updateOrderStatusInDb(id, status);
}

export async function updateOrderStatusByMerchantRef(
  merchantReference: string,
  status: string,
) {
  return await updateOrderStatusByMerchantReferenceInDb(merchantReference, status);
}

export async function processPosCheckout(
  adminId: number,
  paymentMethod: "cash" | "card",
  rawItems: Array<{ variantId: number; quantity: number }>,
) {
  const quantitiesByVariant = new Map<number, number>();

  for (const item of rawItems) {
    const variantId = Number(item.variantId);
    const quantity = Number(item.quantity);

    if (
      !Number.isInteger(variantId) ||
      variantId <= 0 ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      throw new Error("Sepette geçersiz bir ürün var.");
    }

    quantitiesByVariant.set(
      variantId,
      (quantitiesByVariant.get(variantId) || 0) + quantity,
    );
  }

  if (quantitiesByVariant.size === 0) {
    throw new Error("Sepet boş.");
  }

  const variantIds = Array.from(quantitiesByVariant.keys());
  const variants = await findVariantsForPosFromDb(variantIds);

  if (variants.length !== variantIds.length) {
    throw new Error("Sepetteki bazı ürün varyantları veritabanında bulunamadı.");
  }

  let totalAmount = 0;
  const itemsToCreate = variants.map((variant) => {
    const quantity = quantitiesByVariant.get(variant.id) || 0;

    if (!variant.product || !variant.product.isActive) {
      throw new Error(`${variant.product?.title || "Bir ürün"} pasif durumda.`);
    }

    const sizeName = variant.size?.name ?? "";
    const colorName = variant.color?.name ?? "";

    if (variant.stock < quantity) {
      throw new Error(
        `${variant.product.title} (${sizeName} - ${colorName}) için stok yetersiz. Mevcut: ${variant.stock}, İstenen: ${quantity}`,
      );
    }

    const priceNum = Number(variant.product.price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      throw new Error(`${variant.product.title} ürünü için fiyat geçersiz.`);
    }

    totalAmount += priceNum * quantity;

    const optionDetails = [sizeName, colorName]
      .filter(Boolean)
      .join(" - ");

    return {
      productId: variant.product.id,
      variantId: variant.id,
      title: `${variant.product.title}${optionDetails ? ` (${optionDetails})` : ""}`,
      image: variant.product.image,
      price: priceNum.toFixed(2),
      quantity,
    };
  });

  const merchantReference = `POS-${Date.now()}-${randomUUID().slice(0, 8)}`;

  return await createPosOrderTransactionInDb({
    merchantReference,
    amount: Number(totalAmount.toFixed(2)),
    paymentMethod,
    adminId,
    items: itemsToCreate,
  });
}

export async function processPosPaythorPreparation(
  rawItems: Array<{ variantId: number; quantity: number }>,
) {
  const quantities = new Map<number, number>();

  for (const item of rawItems) {
    const variantId = Number(item.variantId);
    const quantity = Number(item.quantity);

    if (
      !Number.isInteger(variantId) ||
      variantId <= 0 ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      throw new Error("Sepette geçersiz bir ürün var.");
    }

    quantities.set(variantId, (quantities.get(variantId) ?? 0) + quantity);
  }

  if (quantities.size === 0) {
    throw new Error("Satış sepeti boş.");
  }

  const variants = await findVariantsForPosFromDb([...quantities.keys()]);

  if (variants.length !== quantities.size) {
    throw new Error("Sepetteki ürünlerden biri bulunamadı.");
  }

  let total = 0;

  for (const variant of variants) {
    const quantity = quantities.get(variant.id)!;

    if (!variant.isActive || !variant.product.isActive) {
      throw new Error(`${variant.product.title} satışa açık değil.`);
    }

    if (variant.stock < quantity) {
      throw new Error(`${variant.product.title} için yeterli stok yok.`);
    }

    total += Number(variant.product.price) * quantity;
  }

  return { variants, quantities, total };
}

export async function createPosPaythorOrderRecord(data: {
  merchantReference: string;
  amount: string;
  email: string;
  paymentToken: string;
  paymentLink: string;
  items: Array<{
    productId: number;
    variantId: number;
    title: string;
    image: string | null;
    price: number;
    quantity: number;
    selectedSize: string | null;
    selectedColor: string | null;
  }>;
}) {
  return await createPosPaythorOrderInDb(data);
}
