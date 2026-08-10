import { createHash, randomInt } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/adminAuth";
import { confirmOrderPaid, getOrderByMerchantRef } from "@/services/orderService";

interface PaythorProcessResponse {
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
    let paythorData: PaythorProcessResponse;

    try {
      paythorData = JSON.parse(responseText) as PaythorProcessResponse;
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
}
