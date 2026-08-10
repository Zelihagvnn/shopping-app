import { createHash, randomInt, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/adminAuth";
import {
  createPosPaythorOrderRecord,
  processPosPaythorPreparation,
} from "@/services/orderService";

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

    const { variants, quantities, total } =
      await processPosPaythorPreparation(rawItems);

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

    const order = await createPosPaythorOrderRecord({
      merchantReference: returnedReference,
      amount,
      email: session.email,
      paymentToken: paymentData.data.payment_token,
      paymentLink: paymentData.data.payment_link,
      items: variants.map((variant) => ({
        productId: variant.productId,
        variantId: variant.id,
        selectedSize: variant.size?.name ?? null,
        selectedColor: variant.color?.name ?? null,
        title: variant.product.title,
        image: variant.product.image,
        price: Number(variant.product.price),
        quantity: quantities.get(variant.id)!,
      })),
    });

    return NextResponse.json({
      status: "success",
      data: {
        payment_link: paymentData.data.payment_link,
        merchant_reference: returnedReference,
        order_id: order.id,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Paythor ödemesi oluşturulamadı.";
    const status = message.includes("stok") || message.includes("açık değil") ? 409 : 400;
    return NextResponse.json({ status: "error", message }, { status });
  }
}
