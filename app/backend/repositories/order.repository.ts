import { prisma } from "@/lib/prisma";

export async function findOrdersByCustomerIdFromDb(customerId: number) {
  return await prisma.order.findMany({
    where: { customerId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function findAllOrdersAdminFromDb(statusFilter?: string) {
  return await prisma.order.findMany({
    where: statusFilter ? { status: statusFilter } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      items: true,
      customer: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });
}

export async function findOrderByIdFromDb(id: number) {
  return await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      customer: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
        },
      },
    },
  });
}

export async function findOrderByMerchantRefFromDb(merchantReference: string) {
  return await prisma.order.findUnique({
    where: { merchantReference },
    include: { items: true },
  });
}

export async function updateOrderStatusInDb(id: number, status: string) {
  return await prisma.order.update({
    where: { id },
    data: { status },
    include: { items: true },
  });
}

export async function updateOrderStatusByMerchantReferenceInDb(
  merchantReference: string,
  status: string,
) {
  return await prisma.order.updateMany({
    where: { merchantReference },
    data: { status },
  });
}

export async function processOrderPaidTransactionInDb(
  orderId: number,
  items: Array<{ variantId: number | null; quantity: number }>,
) {
  return await prisma.$transaction(async (tx) => {
    for (const item of items) {
      if (!item.variantId) continue;

      const updatedVariant = await tx.productVariant.updateMany({
        where: {
          id: item.variantId,
          stock: { gte: item.quantity },
        },
        data: {
          stock: { decrement: item.quantity },
        },
      });

      if (updatedVariant.count === 0) {
        throw new Error("Yetersiz stok.");
      }
    }

    return await tx.order.update({
      where: { id: orderId },
      data: { status: "paid" },
      include: { items: true },
    });
  });
}

export async function findVariantsForPosFromDb(variantIds: number[]) {
  return await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    include: {
      product: true,
      size: true,
      color: true,
    },
  });
}

export async function createPosOrderTransactionInDb(data: {
  merchantReference: string;
  amount: number;
  paymentMethod: "cash" | "card";
  adminId: number;
  items: Array<{
    productId: number;
    title: string;
    image: string | null;
    price: string;
    quantity: number;
    variantId: number;
  }>;
}) {
  return await prisma.$transaction(async (tx) => {
    for (const item of data.items) {
      const updatedVariant = await tx.productVariant.updateMany({
        where: {
          id: item.variantId,
          stock: { gte: item.quantity },
        },
        data: {
          stock: { decrement: item.quantity },
        },
      });

      if (updatedVariant.count === 0) {
        throw new Error(`${item.title} ürünü için stok yetersiz.`);
      }
    }

    return await tx.order.create({
      data: {
        merchantReference: data.merchantReference,
        amount: data.amount,
        currency: "TRY",
        status: data.paymentMethod === "cash" ? "paid" : "pending_payment",
        customerName: `POS Satış (${data.paymentMethod === "cash" ? "Nakit" : "Kart"})`,
        customerEmail: `pos-admin-${data.adminId}@store.local`,
        customerPhone: "-",
        customerAddress: "POS Mağaza Satışı",
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            title: item.title,
            image: item.image,
            price: item.price,
            quantity: item.quantity,
          })),
        },
      },
      include: { items: true },
    });
  });
}

export async function createPosPaythorOrderInDb(data: {
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
  return await prisma.order.create({
    data: {
      merchantReference: data.merchantReference,
      amount: data.amount,
      currency: "TRY",
      status: "pending",
      customerName: "Mağaza Müşterisi",
      customerEmail: data.email,
      customerPhone: "-",
      customerAddress: "Mağazadan teslim",
      paymentToken: data.paymentToken,
      paymentLink: data.paymentLink,
      items: {
        create: data.items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          selectedSize: item.selectedSize,
          selectedColor: item.selectedColor,
          title: item.title,
          image: item.image,
          price: item.price,
          quantity: item.quantity,
        })),
      },
    },
  });
}
