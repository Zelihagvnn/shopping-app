import { prisma } from "@/lib/prisma";

export async function findProductsForPaymentFromDb(productIds: number[]) {
  return await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, image: true },
  });
}

export async function findOrderByMerchantReferenceFromDb(
  merchantReference: string,
) {
  return await prisma.order.findUnique({
    where: { merchantReference },
  });
}

export async function createOrderFromPaymentInDb(data: {
  merchantReference: string;
  amount: string | number;
  currency: string;
  status: string;
  customerId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  paymentToken: string | null;
  paymentLink: string | null;
  items: Array<{
    productId: number | null;
    title: string;
    image: string | null;
    price: string;
    quantity: number;
  }>;
}) {
  return await prisma.order.create({
    data: {
      merchantReference: data.merchantReference,
      amount: data.amount,
      currency: data.currency,
      status: data.status,
      customerId: data.customerId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      customerAddress: data.customerAddress,
      paymentToken: data.paymentToken,
      paymentLink: data.paymentLink,
      items: {
        create: data.items,
      },
    },
    include: { items: true },
  });
}

export async function updateCustomerAddressFromPaymentInDb(
  customerId: number,
  data: {
    phone?: string;
    address?: string;
    city?: string;
    postalCode?: string;
  },
) {
  return await prisma.customer.update({
    where: { id: customerId },
    data,
  });
}
