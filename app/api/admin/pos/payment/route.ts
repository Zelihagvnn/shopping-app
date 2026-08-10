import { createHash, randomInt, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

interface PaymentItem {
  variantId: number;
  quantity: number;
}

interface PaythorResponse {
  status?: string;
  message?: string;
  data?: {
    merchant_reference?: string;
    amount?: string | number;
    currency?: string;
    status?: string;
    payment_token?: string;
    payment_link?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyAdminToken(
      request.cookies.get("adminToken")?.value,
    );

    if (!session) {
      return NextResponse.json(
        { status: "error", message: "Admin oturumu bulunamadı." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const rawItems: PaymentItem[] = Array.isArray(body.items) ? body.items : [];
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
        return NextResponse.json(
          { status: "error", message: "Sepette geçersiz bir ürün var." },
          { status: 400 },
        );
      }

      quantities.set(variantId, (quantities.get(variantId) ?? 0) + quantity);
    }

    if (quantities.size === 0) {
      return NextResponse.json(
        { status: "error", message: "Satış sepeti boş." },
        { status: 400 },
      );
    }

    const variants = await prisma.productVariant.findMany({
      where: { id: { in: [...quantities.keys()] } },
      include: { product: true, size: true, color: true },
    });

    if (variants.length !== quantities.size) {
      return NextResponse.json(
        { status: "error", message: "Sepetteki ürünlerden biri bulunamadı." },
        { status: 400 },
      );
    }

    let total = 0;

    for (const variant of variants) {
      const quantity = quantities.get(variant.id)!;

      if (!variant.isActive || !variant.product.isActive) {
        return NextResponse.json(
          { status: "error", message: `${variant.product.title} satışa açık değil.` },
          { status: 409 },
        );
      }

      if (variant.stock < quantity) {
        return NextResponse.json(
          { status: "error", message: `${variant.product.title} için yeterli stok yok.` },
          { status: 409 },
        );
      }

      total += Number(variant.product.price) * quantity;
    }

    const publicKey = process.env.PAYTHOR_PUBLIC_KEY;
    const secretKey = process.env.PAYTHOR_SECRET_KEY;

    if (!publicKey || !secretKey) {
      return NextResponse.json(
        { status: "error", message: "Paythor API anahtarları bulunamadı." },
        { status: 500 },
      );
    }

    const amount = total.toFixed(2);
    const merchantReference = `POS-PAYTHOR-${randomUUID()}`;
    const referenceTime = Date.now();
    const host = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const origin = request.headers.get("origin") || `${protocol}://${host}`;

    const paymentBody = {
      payment: {
        amount,
        currency: "TRY",
        buyer_fee: "0",
        method: "creditcard",
        merchant_reference: merchantReference,
        return_url: `${origin}/admin/pos/success?reference=${encodeURIComponent(merchantReference)}`,
      },
      payer: {
        first_name: "Mağaza",
        last_name: "Müşterisi",
        email: session.email,
        phone: "5555555555",
        address: {
          line_1: "Mağazadan teslim",
          city: "İstanbul",
          state: "İstanbul",
          postal_code: "34000",
          country: "TR",
        },
        ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1",
      },
      order: {
        cart: variants.map((variant) => ({
          id: String(variant.productId),
          name: [
            variant.product.title,
            variant.size?.name,
            variant.color?.name,
          ]
            .filter(Boolean)
            .join(" / "),
          type: "product",
          price: Number(variant.product.price).toFixed(2),
          quantity: quantities.get(variant.id)!,
        })),
        shipping: {
          first_name: "Mağaza",
          last_name: "Müşterisi",
          phone: "5555555555",
          email: session.email,
          address: {
            line_1: "Mağazadan teslim",
            city: "İstanbul",
            state: "İstanbul",
            postal_code: "34000",
            country: "TR",
          },
        },
        invoice: {
          id: `POS-INV-${referenceTime}`,
          first_name: "Mağaza",
          last_name: "Müşterisi",
          price: amount,
          quantity: 1,
        },
      },
    };

    const timestamp = (Date.now() / 1000).toFixed(6);
    const nonce = randomInt(1000000, 10000000).toString();
    const hash = createHash("sha256")
      .update(`${publicKey}${secretKey}${timestamp}${nonce}`)
      .digest("hex");
    const paymentResponse = await fetch("https://api.paythor.com/payment/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `ApiKeys ${publicKey}:${hash}`,
        "X-Timestamp": timestamp,
        "X-Nonce": nonce,
      },
      body: JSON.stringify(paymentBody),
      cache: "no-store",
    });
    const responseText = await paymentResponse.text();
    let paymentData: PaythorResponse;

    try {
      paymentData = JSON.parse(responseText) as PaythorResponse;
    } catch {
      paymentData = { status: "error", message: responseText || "Paythor geçersiz cevap döndürdü." };
    }

    if (
      !paymentResponse.ok ||
      paymentData.status !== "success" ||
      !paymentData.data?.payment_link ||
      !paymentData.data.payment_token
    ) {
      return NextResponse.json(paymentData, { status: paymentResponse.status });
    }

    const returnedReference =
      paymentData.data.merchant_reference || merchantReference;
    const order = await prisma.order.create({
      data: {
        merchantReference: returnedReference,
        amount,
        currency: "TRY",
        status: "pending",
        customerName: "Mağaza Müşterisi",
        customerEmail: session.email,
        customerPhone: "-",
        customerAddress: "Mağazadan teslim",
        paymentToken: paymentData.data.payment_token,
        paymentLink: paymentData.data.payment_link,
        items: {
          create: variants.map((variant) => ({
            productId: variant.productId,
            variantId: variant.id,
            selectedSize: variant.size?.name ?? null,
            selectedColor: variant.color?.name ?? null,
            title: variant.product.title,
            image: variant.product.image,
            price: variant.product.price,
            quantity: quantities.get(variant.id)!,
          })),
        },
      },
    });

    return NextResponse.json({
      status: "success",
      data: {
        payment_link: paymentData.data.payment_link,
        merchant_reference: returnedReference,
        order_id: order.id,
      },
    });
  } catch (error) {
    console.error("POS Paythor ödeme oluşturma hatası:", error);
    return NextResponse.json(
      { status: "error", message: "Paythor ödemesi oluşturulamadı." },
      { status: 500 },
    );
  }
}
