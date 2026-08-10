import { createHash, randomInt } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { verifyCustomerToken } from "@/lib/customerAuth";
import { prisma } from "@/lib/prisma";

type PaythorProcessResponse = {
  status?: string;
  data?: {
    transaction?: {
      status?: string;
    };
    process?: {
      payment_token?: string;
      process_status?: string;
      status?: string;
      amount?: string | number;
    };
    result?: {
      status?: string;
      code?: string | number;
    };
  };
};

const normalizeMoney = (value: unknown) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : null;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const merchantReference =
      typeof body.merchantReference === "string"
        ? body.merchantReference.trim()
        : "";

    const processId =
      typeof body.processId === "string" ? body.processId.trim() : "";

    if (!merchantReference) {
      return NextResponse.json(
        {
          status: "error",
          message: "Sipariş referansı bulunamadı.",
        },
        { status: 400 },
      );
    }

    const token = request.cookies.get("customerToken")?.value;
    const session = await verifyCustomerToken(token);

    if (!session) {
      return NextResponse.json(
        {
          status: "error",
          message: "Siparişi güncellemek için giriş yapmalısınız.",
        },
        { status: 401 },
      );
    }

    const existingOrder = await prisma.order.findUnique({
      where: {
        merchantReference,
      },
      include: {
        items: true,
      },
    });

    if (!existingOrder) {
      return NextResponse.json(
        {
          status: "error",
          message: "Sipariş bulunamadı.",
        },
        { status: 404 },
      );
    }

    if (existingOrder.customerId !== session.customerId) {
      return NextResponse.json(
        {
          status: "error",
          message: "Bu siparişi güncelleme yetkiniz yok.",
        },
        { status: 403 },
      );
    }

    // Aynı postMessage veya yönlendirme tekrar gelirse stok ikinci kez azaltılmaz.
    if (existingOrder.status === "paid") {
      return NextResponse.json({
        status: "success",
        message: "Sipariş zaten ödendi olarak işaretlenmiş.",
        order: {
          id: existingOrder.id,
          merchantReference: existingOrder.merchantReference,
        },
      });
    }

    const lookupToken = processId || existingOrder.paymentToken || "";

    if (!lookupToken) {
      return NextResponse.json(
        {
          status: "error",
          message: "Paythor token bilgisi bulunamadı.",
        },
        { status: 400 },
      );
    }

    const publicKey = process.env.PAYTHOR_PUBLIC_KEY;
    const secretKey = process.env.PAYTHOR_SECRET_KEY;

    if (!publicKey || !secretKey) {
      return NextResponse.json(
        {
          status: "error",
          message: "Paythor API anahtarları bulunamadı.",
        },
        { status: 500 },
      );
    }

    const timestamp = (Date.now() / 1000).toFixed(6);
    const nonce = randomInt(1000000, 10000000).toString();
    const hashValue = createHash("sha256")
      .update(`${publicKey}${secretKey}${timestamp}${nonce}`)
      .digest("hex");

    const paythorResponse = await fetch(
      `https://api.paythor.com/process/getbytoken/${encodeURIComponent(lookupToken)}`,
      {
        method: "GET",
        headers: {
          Authorization: `ApiKeys ${publicKey}:${hashValue}`,
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
        {
          status: "error",
          message: "Paythor ödeme doğrulamasında geçersiz cevap döndürdü.",
        },
        { status: 502 },
      );
    }

    if (!paythorResponse.ok) {
      console.warn("Paythor process sorgusu başarısız:", {
        httpStatus: paythorResponse.status,
        responseStatus: paythorData.status,
      });

      return NextResponse.json(
        {
          status: "error",
          message: "Paythor ödeme bilgisi doğrulanamadı.",
        },
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

    console.log("Customer Paythor status response:", {
      ok: paythorResponse.ok,
      topStatus,
      transactionStatus,
      processStatus,
      resultStatus,
      resultCode,
      fullResponse: paythorData,
    });

    const isPaythorSuccess =
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

    if (!isPaythorSuccess) {
      console.warn("Paythor ödeme durumu başarılı değil:", {
        responseStatus: paythorData.status,
        transactionStatus,
        processStatus,
        resultStatus,
        resultCode,
      });

      return NextResponse.json(
        {
          status: "error",
          message: "Paythor ödemeyi başarılı olarak doğrulamadı.",
        },
        { status: 400 },
      );
    }

    const verifiedPaymentToken =
      paythorData.data?.process?.payment_token?.trim() ?? "";
    const orderPaymentToken = existingOrder.paymentToken?.trim() ?? "";

    if (
      orderPaymentToken &&
      verifiedPaymentToken &&
      verifiedPaymentToken !== orderPaymentToken
    ) {
      console.warn("Paythor payment token uyarısı (farklı token):", {
        orderPaymentToken,
        verifiedPaymentToken,
      });
    }

    const paythorAmount = normalizeMoney(paythorData.data?.process?.amount);
    const orderAmount = normalizeMoney(existingOrder.amount.toString());

    if (!paythorAmount || !orderAmount || paythorAmount !== orderAmount) {
      return NextResponse.json(
        {
          status: "error",
          message: "Paythor ödeme tutarı sipariş tutarıyla eşleşmiyor.",
        },
        { status: 400 },
      );
    }

    await prisma.$transaction(async (tx) => {
      for (const item of existingOrder.items) {
        if (!item.variantId) {
          continue;
        }

        const updatedVariant = await tx.productVariant.updateMany({
          where: {
            id: item.variantId,
            stock: {
              gte: item.quantity,
            },
          },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });

        if (updatedVariant.count !== 1) {
          throw new Error(`${item.title} ürünü için yeterli stok bulunmuyor.`);
        }
      }

      await tx.order.update({
        where: {
          id: existingOrder.id,
        },
        data: {
          status: "paid",
        },
      });
    });

    return NextResponse.json({
      status: "success",
      message: "Sipariş ödendi olarak güncellendi ve stoklar azaltıldı.",
      order: {
        id: existingOrder.id,
        merchantReference: existingOrder.merchantReference,
      },
    });
  } catch (error) {
    console.error("Sipariş durumu veya stok güncelleme hatası:", error);

    const message =
      error instanceof Error ? error.message : "Sipariş durumu güncellenemedi.";

    return NextResponse.json(
      {
        status: "error",
        message,
      },
      { status: 500 },
    );
  }
}
