import { createHash, randomInt } from "crypto";
import { prisma } from "@/lib/prisma";

export interface PaymentCartItem {
  id: string;
  name: string;
  type: "product" | "discount" | "shipping" | "tax";
  price: string;
  quantity: number;
}

export interface PaythorPaymentData {
  merchant_reference?: string;
  amount?: string | number;
  currency?: string;
  status?: string;
  payment_token?: string;
  payment_link?: string;
}

export interface PaythorResponse {
  status?: string;
  message?: string;
  data?: PaythorPaymentData;
}

export interface PaymentBody {
  payment?: {
    return_url?: string;
    merchant_reference?: string;
    amount?: string | number;
    currency?: string;
  };
  payer?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    address?: {
      line_1?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    };
  };
  order?: {
    cart?: PaymentCartItem[];
  };
  [key: string]: unknown;
}

export async function callPaythorApi(paymentBody: PaymentBody, requestOrigin: string) {
  if (paymentBody?.payment) {
    if (!paymentBody.payment.return_url) {
      const ref = paymentBody.payment.merchant_reference || "";
      paymentBody.payment.return_url = `${requestOrigin}/checkout/success?merchantReference=${encodeURIComponent(ref)}`;
    }
  }

  const publicKey = process.env.PAYTHOR_PUBLIC_KEY;
  const secretKey = process.env.PAYTHOR_SECRET_KEY;

  if (!publicKey || !secretKey) {
    throw new Error("PAYTHOR_PUBLIC_KEY veya PAYTHOR_SECRET_KEY bulunamadı.");
  }

  const timestamp = (Date.now() / 1000).toFixed(6);
  const nonce = randomInt(1000000, 10000000).toString();
  const hashValue = createHash("sha256")
    .update(`${publicKey}${secretKey}${timestamp}${nonce}`)
    .digest("hex");

  const authorization = `ApiKeys ${publicKey}:${hashValue}`;

  const response = await fetch("https://api.paythor.com/payment/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authorization,
      "X-Timestamp": timestamp,
      "X-Nonce": nonce,
    },
    body: JSON.stringify(paymentBody),
    cache: "no-store",
  });

  const responseText = await response.text();
  let paymentData: PaythorResponse;

  try {
    paymentData = JSON.parse(responseText);
  } catch {
    paymentData = {
      status: "error",
      message: responseText || "Paythor geçersiz bir cevap döndürdü.",
    };
  }

  return {
    status: response.status,
    ok: response.ok,
    paymentData,
  };
}

export async function processOrderFromPayment(
  paymentBody: PaymentBody,
  paymentData: PaythorResponse,
  session: { customerId: number; fullName: string; email: string },
) {
  const payer = paymentBody.payer;
  const address = payer?.address;
  const allCartItems: PaymentCartItem[] = Array.isArray(paymentBody.order?.cart)
    ? paymentBody.order.cart
    : [];

  const productItems = allCartItems.filter((item) => item.type === "product");
  if (productItems.length === 0) {
    throw new Error("Sipariş sepetinde ürün bulunamadı.");
  }

  const productIds = productItems
    .map((item) => Number(item.id))
    .filter((id) => Number.isInteger(id) && id > 0);

  const databaseProducts = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, image: true },
  });

  const productImageMap = new Map(
    databaseProducts.map((product) => [product.id, product.image]),
  );

  const merchantReference =
    paymentData.data?.merchant_reference ??
    paymentBody.payment?.merchant_reference;

  if (!merchantReference) {
    throw new Error("Sipariş referansı bulunamadı.");
  }

  const existingOrder = await prisma.order.findUnique({
    where: { merchantReference },
  });

  if (!existingOrder) {
    const firstName =
      typeof payer?.first_name === "string" ? payer.first_name.trim() : "";
    const rawLastName =
      typeof payer?.last_name === "string" ? payer.last_name.trim() : "";
    const safeLastName =
      rawLastName.toLocaleLowerCase("tr-TR") === "belirtilmedi"
        ? ""
        : rawLastName;

    const deliveryName =
      [firstName, safeLastName].filter(Boolean).join(" ").trim() ||
      session.fullName;

    const customerEmail =
      typeof payer?.email === "string" && payer.email.trim()
        ? payer.email.trim().toLowerCase()
        : session.email;

    const customerPhone =
      typeof payer?.phone === "string" ? payer.phone.trim() : "";

    const addressLine =
      typeof address?.line_1 === "string" ? address.line_1.trim() : "";
    const addressCity =
      typeof address?.city === "string" ? address.city.trim() : "";
    const addressState =
      typeof address?.state === "string" ? address.state.trim() : "";
    const postalCode =
      typeof address?.postal_code === "string" ? address.postal_code.trim() : "";
    const country =
      typeof address?.country === "string" ? address.country.trim() : "";

    const customerAddress = [
      addressLine,
      addressCity,
      addressState,
      postalCode,
      country,
    ]
      .filter(Boolean)
      .join(", ");

    const newOrder = await prisma.order.create({
      data: {
        merchantReference,
        amount: paymentData.data?.amount ?? paymentBody.payment?.amount,
        currency:
          paymentData.data?.currency ?? paymentBody.payment?.currency ?? "TRY",
        status: paymentData.data?.status ?? "active",
        customerId: session.customerId,
        customerName: deliveryName,
        customerEmail,
        customerPhone,
        customerAddress,
        paymentToken: paymentData.data?.payment_token ?? null,
        paymentLink: paymentData.data?.payment_link ?? null,
        items: {
          create: productItems.map((item) => {
            const productId = Number(item.id);
            const quantity = Number(item.quantity);
            const safeQuantity =
              Number.isInteger(quantity) && quantity > 0 ? quantity : 1;
            const price = Number(item.price);

            if (!Number.isFinite(price) || price < 0) {
              throw new Error(`${item.name} ürünü için geçersiz fiyat.`);
            }

            return {
              productId:
                Number.isInteger(productId) && productId > 0 ? productId : null,
              title: item.name,
              image: productImageMap.get(productId) ?? null,
              price: price.toFixed(2),
              quantity: safeQuantity,
            };
          }),
        },
      },
      include: { items: true },
    });

    await prisma.customer.update({
      where: { id: session.customerId },
      data: {
        phone: customerPhone || undefined,
        address: addressLine || undefined,
        city: addressCity || undefined,
        postalCode: postalCode || undefined,
      },
    });

    return newOrder;
  }

  return existingOrder;
}
