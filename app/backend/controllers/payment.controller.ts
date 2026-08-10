import { createHash, randomInt, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/adminAuth";
import { verifyCustomerToken } from "@/lib/customerAuth";
import { PaymentBodyDto } from "../dtos/payment.dto";
import { PaythorResponseEntity } from "../entities/payment.entity";
import {
  confirmOrderPaid,
  createPosPaythorOrderRecord,
  getOrderByMerchantRef,
  processPosPaythorPreparation,
} from "../services/order.service";
import { callPaythorApi, processOrderFromPayment } from "../services/payment.service";

interface PosPaythorProcessResponse {
  status?: string;
  data?: {
    transaction?: { status?: string };
    process?: {
      payment_token?: string;
      process_status?: string;
      amount?: string | number;
    };
    result?: { status?: string; code?: string | number };
  };
}

const money = (value: unknown) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : "";
};

export const paymentController = {
  createCustomerPayment: async (request: NextRequest) => {
    try {
      const token = request.cookies.get("customerToken")?.value;
      const session = await verifyCustomerToken(token);

      if (!session) {
        return NextResponse.json(
          { status: "error", message: "Ödeme yapabilmek için giriş yapmalısınız." },
          { status: 401 },
        );
      }

      const body: PaymentBodyDto = await request.json();
      const host = request.headers.get("host") || "localhost:3000";
      const protocol = request.headers.get("x-forwarded-proto") || "http";
      const origin = request.headers.get("origin") || `${protocol}://${host}`;

      const { status, ok, paymentData } = await callPaythorApi(body, origin);

      if (!ok || paymentData.status !== "success" || !paymentData.data?.payment_link) {
        return NextResponse.json(paymentData, { status });
      }

      const order = await processOrderFromPayment(body, paymentData, session);

      return NextResponse.json({
        status: "success",
        data: {
          payment_link: paymentData.data.payment_link,
          merchant_reference: order.merchantReference,
          order_id: order.id,
        },
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Ödeme işlemi sırasında bir hata oluştu.";
      return NextResponse.json({ status: "error", message }, { status: 400 });
    }
  },

  createPosPayment: async (request: NextRequest) => {
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
      const rawItems = Array.isArray(body.items) ? body.items : [];

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
      let paymentData: PaythorResponseEntity;

      try {
        paymentData = JSON.parse(responseText) as PaythorResponseEntity;
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
  },

  verifyPosPaymentStatus: async (request: NextRequest) => {
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
      const merchantReference =
        typeof body.merchantReference === "string"
          ? body.merchantReference.trim()
          : "";

      if (!merchantReference) {
        return NextResponse.json(
          { status: "error", message: "merchantReference zorunludur." },
          { status: 400 },
        );
      }

      const order = await getOrderByMerchantRef(merchantReference);

      if (!order) {
        return NextResponse.json(
          { status: "error", message: "POS siparişi bulunamadı." },
          { status: 404 },
        );
      }

      if (order.status === "paid") {
        return NextResponse.json({
          status: "success",
          message: "Sipariş zaten ödendi.",
          order: {
            id: order.id,
            merchantReference: order.merchantReference,
            amount: Number(order.amount),
          },
        });
      }

      const publicKey = process.env.PAYTHOR_PUBLIC_KEY;
      const secretKey = process.env.PAYTHOR_SECRET_KEY;

      if (!publicKey || !secretKey) {
        return NextResponse.json(
          { status: "error", message: "Paythor API anahtarları eksik." },
          { status: 500 },
        );
      }

      const timestamp = (Date.now() / 1000).toFixed(6);
      const nonce = randomInt(1000000, 10000000).toString();
      const hash = createHash("sha256")
        .update(`${publicKey}${secretKey}${timestamp}${nonce}`)
        .digest("hex");
      const paythorResponse = await fetch("https://api.paythor.com/payment/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `ApiKeys ${publicKey}:${hash}`,
          "X-Timestamp": timestamp,
          "X-Nonce": nonce,
        },
        body: JSON.stringify({ payment: { merchant_reference: merchantReference } }),
        cache: "no-store",
      });

      const responseText = await paythorResponse.text();
      let paythorData: PosPaythorProcessResponse;

      try {
        paythorData = JSON.parse(responseText) as PosPaythorProcessResponse;
      } catch {
        return NextResponse.json(
          { status: "error", message: "Paythor doğrulama cevabı geçersiz." },
          { status: 502 },
        );
      }

      const transactionStatus = paythorData.data?.transaction?.status?.toLowerCase();
      const processStatus = (
        paythorData.data?.process?.process_status ||
        (paythorData.data?.process as { status?: string; process_status?: string })?.status
      )?.toLowerCase();
      const resultStatus = paythorData.data?.result?.status?.toLowerCase();
      const resultCode = String(paythorData.data?.result?.code ?? "").trim();
      const topStatus = paythorData.status?.toLowerCase();

      const isSuccess =
        paythorResponse.ok &&
        (topStatus === "success" || topStatus === "completed" || topStatus === "approved") &&
        (
          transactionStatus === "completed" ||
          transactionStatus === "approved" ||
          processStatus === "completed" ||
          processStatus === "approved" ||
          resultStatus === "completed" ||
          resultCode === "1" ||
          resultCode === "00" ||
          resultCode === "0"
        );

      if (!isSuccess) {
        return NextResponse.json(
          { status: "error", message: "Paythor ödemesi henüz onaylanmadı." },
          { status: 400 },
        );
      }

      if (money(paythorData.data?.process?.amount) !== money(order.amount)) {
        return NextResponse.json(
          { status: "error", message: "Ödeme tutarı siparişle eşleşmiyor." },
          { status: 400 },
        );
      }

      const completedOrder = await confirmOrderPaid(order.id, order.items);

      return NextResponse.json({
        status: "success",
        message: "Paythor ödemesi doğrulandı ve satış tamamlandı.",
        order: {
          id: completedOrder.id,
          merchantReference: completedOrder.merchantReference,
          amount: Number(completedOrder.amount),
        },
      });
    } catch (error) {
      console.error("POS Paythor doğrulama hatası:", error);
      return NextResponse.json(
        {
          status: "error",
          message: error instanceof Error ? error.message : "Ödeme doğrulanamadı.",
        },
        { status: 500 },
      );
    }
  },
};
