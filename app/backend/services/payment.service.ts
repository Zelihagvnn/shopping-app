// app/backend/services/payment.service.ts
import { createHash, randomInt } from "crypto";
import { PaymentBodyDto } from "../dtos/payment.dto";
import { PaymentCartItemEntity, PaythorResponseEntity } from "../entities/payment.entity";
import {
  createOrderFromPaymentInDb,
  findOrderByMerchantReferenceFromDb,
  findProductsForPaymentFromDb,
  updateCustomerAddressFromPaymentInDb,
} from "../repositories/payment.repository";

export async function callPaythorApi(
  paymentBody: PaymentBodyDto,
  requestOrigin: string,
) {
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
  let paymentData: PaythorResponseEntity;

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
  paymentBody: PaymentBodyDto,
  paymentData: PaythorResponseEntity,
  session: { customerId: number; fullName: string; email: string },
) {
  const payer = paymentBody.payer;
  const address = payer?.address;
  const allCartItems: PaymentCartItemEntity[] = Array.isArray(paymentBody.order?.cart)
    ? paymentBody.order.cart
    : [];

  const productItems = allCartItems.filter((item) => item.type === "product");
  if (productItems.length === 0) {
    throw new Error("Sipariş sepetinde ürün bulunamadı.");
  }

  const productIds = productItems
    .map((item) => Number(item.id))
    .filter((id) => Number.isInteger(id) && id > 0);

  const databaseProducts = await findProductsForPaymentFromDb(productIds);

  const productImageMap = new Map(
    databaseProducts.map((product) => [product.id, product.image]),
  );

  const merchantReference =
    paymentData.data?.merchant_reference ??
    paymentBody.payment?.merchant_reference;

  if (!merchantReference) {
    throw new Error("Sipariş referansı bulunamadı.");
  }

  const existingOrder =
    await findOrderByMerchantReferenceFromDb(merchantReference);

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
      typeof address?.postal_code === "string"
        ? address.postal_code.trim()
        : "";
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

    const itemsData = productItems.map((item) => {
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
    });

    const newOrder = await createOrderFromPaymentInDb({
      merchantReference,
      amount: paymentData.data?.amount ?? paymentBody.payment?.amount ?? 0,
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
      items: itemsData,
    });

    await updateCustomerAddressFromPaymentInDb(session.customerId, {
      phone: customerPhone || undefined,
      address: addressLine || undefined,
      city: addressCity || undefined,
      postalCode: postalCode || undefined,
    });

    return newOrder;
  }

  return existingOrder;
}
