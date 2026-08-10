import { createHash, randomInt } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

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
  return Number.isFinite(amount) ? amount.toFixed(2) : null;
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
    const processId =
      typeof body.processId === "string" ? body.processId.trim() : "";

    if (!merchantReference) {
      return NextResponse.json(
        { status: "error", message: "Ödeme referansı eksik." },
        { status: 400 },
      );
    }

    if (!merchantReference.startsWith("POS-PAYTHOR-")) {
      return NextResponse.json(
        { status: "error", message: "Bu ödeme POS işlemine ait değil." },
        { status: 403 },
      );
    }

    const order = await prisma.order.findUnique({
      where: { merchantReference },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json(
        { status: "error", message: "POS siparişi bulunamadı." },
        { status: 404 },
      );
    }

    if (order.status === "paid") {
      return NextResponse.json({
        status: "success",
        order: {
          id: order.id,
          merchantReference: order.merchantReference,
          amount: Number(order.amount),
        },
      });
    }

    const lookupToken = processId || order.paymentToken;

    if (!lookupToken) {
      return NextResponse.json(
        { status: "error", message: "Paythor ödeme tokenı bulunamadı." },
        { status: 400 },
      );
    }

    const publicKey = process.env.PAYTHOR_PUBLIC_KEY;
    const secretKey = process.env.PAYTHOR_SECRET_KEY;

    if (!publicKey || !secretKey) {
      return NextResponse.json(
        { status: "error", message: "Paythor API anahtarları bulunamadı." },
        { status: 500 },
      );
    }

    const timestamp = (Date.now() / 1000).toFixed(6);
    const nonce = randomInt(1000000, 10000000).toString();
    const hash = createHash("sha256")
      .update(`${publicKey}${secretKey}${timestamp}${nonce}`)
      .digest("hex");
    const paythorResponse = await fetch(
      `https://api.paythor.com/process/getbytoken/${encodeURIComponent(lookupToken)}`,
      {
        headers: {
          Authorization: `ApiKeys ${publicKey}:${hash}`,
          "X-Timestamp": timestamp,
          "X-Nonce": nonce,
        },
        cache: "no-store",
      },
    );
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

    console.log("POS Paythor status response:", {
      ok: paythorResponse.ok,
      topStatus,
      transactionStatus,
      processStatus,
      resultStatus,
      resultCode,
      fullResponse: paythorData,
    });

    const isPaid =
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

    if (!isPaid) {
      return NextResponse.json(
        { status: "pending", message: "Ödeme henüz Paythor tarafından onaylanmadı." },
        { status: 202 },
      );
    }

    if (
      order.paymentToken &&
      paythorData.data?.process?.payment_token &&
      paythorData.data.process.payment_token !== order.paymentToken
    ) {
      console.warn("POS payment token uyarısı (farklı token):", {
        orderToken: order.paymentToken,
        processToken: paythorData.data.process.payment_token,
      });
    }

    if (money(paythorData.data?.process?.amount) !== money(order.amount)) {
      return NextResponse.json(
        { status: "error", message: "Ödeme tutarı siparişle eşleşmiyor." },
        { status: 400 },
      );
    }

    const completedOrder = await prisma.$transaction(async (tx) => {
      const currentOrder = await tx.order.findUnique({
        where: { id: order.id },
        include: { items: true },
      });

      if (!currentOrder) throw new Error("POS siparişi bulunamadı.");
      if (currentOrder.status === "paid") return currentOrder;

      for (const item of currentOrder.items) {
        if (!item.variantId) throw new Error(`${item.title} varyantı bulunamadı.`);

        const updated = await tx.productVariant.updateMany({
          where: { id: item.variantId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });

        if (updated.count !== 1) {
          throw new Error(`${item.title} için yeterli stok yok.`);
        }
      }

      return tx.order.update({
        where: { id: currentOrder.id },
        data: { status: "paid" },
        include: { items: true },
      });
    });

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
