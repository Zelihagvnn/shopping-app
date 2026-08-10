import { createHash, randomInt } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { verifyCustomerToken } from "@/lib/customerAuth";

interface PaymentCartItem {
  id: string;
  name: string;
  type: "product" | "discount" | "shipping" | "tax";
  price: string;
  quantity: number;
}

interface PaythorPaymentData {
  merchant_reference?: string;
  amount?: string | number;
  currency?: string;
  status?: string;
  payment_token?: string;
  payment_link?: string;
}

interface PaythorResponse {
  status?: string;
  message?: string;
  data?: PaythorPaymentData;
}

export async function POST(request: NextRequest) {
  try {
    /*
      Ödeme yalnızca giriş yapan müşteriler
      tarafından oluşturulabilir.
    */
    const token = request.cookies.get("customerToken")?.value;

    //Token varsa doğrula ve oturum/kullanıcı bilgilerini çıkar
    const session = await verifyCustomerToken(token);

    //Giriş yapılmamışsa isteği reddet
    if (!session) {
      return NextResponse.json(
        {
          status: "error",
          message: "Ödeme yapabilmek için giriş yapmalısınız.",
        },
        { status: 401 },
      );
    }

    const paymentBody = await request.json();

    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const requestOrigin =
      request.headers.get("origin") ||
      request.headers.get("referer")?.split("/checkout")[0] ||
      `${protocol}://${host}`;

    if (paymentBody?.payment) {
      if (!paymentBody.payment.return_url) {
        const ref = paymentBody.payment.merchant_reference || "";
        paymentBody.payment.return_url = `${requestOrigin}/checkout/success?merchantReference=${encodeURIComponent(ref)}`;
      }
    }

    const publicKey = process.env.PAYTHOR_PUBLIC_KEY;

    const secretKey = process.env.PAYTHOR_SECRET_KEY;

    if (!publicKey || !secretKey) {
      return NextResponse.json(
        {
          status: "error",
          message: "PAYTHOR_PUBLIC_KEY veya PAYTHOR_SECRET_KEY bulunamadı.",
        },
        { status: 500 },
      );
    }

    const timestamp = (Date.now() / 1000).toFixed(6);

    const nonce = randomInt(1000000, 10000000).toString();

    const hashValue = createHash("sha256")
      .update(`${publicKey}${secretKey}${timestamp}${nonce}`)
      .digest("hex");

    const authorization = `ApiKeys ${publicKey}:${hashValue}`;

    const paymentResponse = await fetch(
      "https://api.paythor.com/payment/create",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: authorization,
          "X-Timestamp": timestamp,
          "X-Nonce": nonce,
        },

        body: JSON.stringify(paymentBody),

        cache: "no-store",
      },
    );

    const responseText = await paymentResponse.text();

    let paymentData: PaythorResponse;

    try {
      paymentData = JSON.parse(responseText);
    } catch {
      paymentData = {
        status: "error",
        message: responseText || "Paythor geçersiz bir cevap döndürdü.",
      };
    }

    console.log("Paythor durum kodu:", paymentResponse.status);

    console.log("Paythor cevabı:", paymentData);

    const paymentCreated =
      paymentResponse.ok &&
      paymentData.status === "success" &&
      paymentData.data;

    if (!paymentCreated || !paymentData.data) {
      return NextResponse.json(paymentData, {
        status: paymentResponse.status,
      });
    }

    const payer = paymentBody.payer;
    const address = payer?.address;

    const allCartItems: PaymentCartItem[] = Array.isArray(
      paymentBody.order?.cart,
    )
      ? paymentBody.order.cart
      : [];

    const productItems = allCartItems.filter((item) => item.type === "product");

    if (productItems.length === 0) {
      return NextResponse.json(
        {
          status: "error",
          message: "Sipariş sepetinde ürün bulunamadı.",
        },
        { status: 400 },
      );
    }

    const productIds = productItems
      .map((item) => Number(item.id))
      .filter((id) => Number.isInteger(id) && id > 0);

    const databaseProducts = await prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },

      select: {
        id: true,
        image: true,
      },
    });

    const productImageMap = new Map(
      databaseProducts.map((product) => [product.id, product.image]),
    );

    const merchantReference =
      paymentData.data.merchant_reference ??
      paymentBody.payment?.merchant_reference;

    if (!merchantReference) {
      return NextResponse.json(
        {
          status: "error",
          message: "Sipariş referansı bulunamadı.",
        },
        { status: 400 },
      );
    }

    /*
      Aynı sipariş referansının ikinci kez
      kaydedilmesini engeller.
    */
    const existingOrder = await prisma.order.findUnique({
      where: {
        merchantReference,
      },
    });

    if (!existingOrder) {
      const firstName =
        typeof payer?.first_name === "string" ? payer.first_name.trim() : "";

      const rawLastName =
        typeof payer?.last_name === "string" ? payer.last_name.trim() : "";

      /*
        Eski checkout kodundan "Belirtilmedi"
        değeri gelirse sipariş adına eklenmez.
      */
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

      const newOrder = await prisma.order.create({
        data: {
          merchantReference,

          amount: paymentData.data.amount ?? paymentBody.payment?.amount,

          currency:
            paymentData.data.currency ?? paymentBody.payment?.currency ?? "TRY",

          status: paymentData.data.status ?? "active",

          customerId: session.customerId,

          /*
              Buradaki isim siparişteki teslimat
              sahibidir. Customer.fullName alanını
              değiştirmez.
            */
          customerName: deliveryName,

          customerEmail,
          customerPhone,
          customerAddress,

          paymentToken: paymentData.data.payment_token ?? null,

          paymentLink: paymentData.data.payment_link ?? null,

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
                  Number.isInteger(productId) && productId > 0
                    ? productId
                    : null,

                title: item.name,

                image: productImageMap.get(productId) ?? null,

                price: price.toFixed(2),

                quantity: safeQuantity,
              };
            }),
          },
        },

        include: {
          items: true,
        },
      });

      console.log("Sipariş müşteriye bağlanarak kaydedildi:", newOrder);

      /*
        Checkout sırasında girilen teslimat
        bilgileri müşteri profiline kaydedilir.

        fullName burada özellikle güncellenmez.
      */
      await prisma.customer.update({
        where: {
          id: session.customerId,
        },

        data: {
          phone: customerPhone || undefined,

          address: addressLine || undefined,

          city: addressCity || undefined,

          postalCode: postalCode || undefined,
        },
      });
    } else {
      console.log("Sipariş daha önce kaydedilmiş:", merchantReference);
    }

    return NextResponse.json(paymentData, {
      status: paymentResponse.status,
    });
  } catch (error) {
    console.error("Paythor veya PostgreSQL hatası:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "Ödeme oluşturulurken veya sipariş kaydedilirken hata oluştu.",
      },
      { status: 500 },
    );
  }
}
