import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifyCustomerToken } from "@/lib/customerAuth";
import { confirmOrderPaid, getOrderByMerchantRef } from "@/services/orderService";

interface PaythorProcessData {
  merchant_reference?: string;
  amount?: string | number;
  currency?: string;
  status?: string;
  transaction?: {
    status?: string;
  };
  process?: {
    process_status?: string;
    status?: string;
    payment_token?: string;
    amount?: string | number;
  };
  result?: {
    status?: string;
    code?: string | number;
  };
}

interface PaythorProcessResponse {
  status?: string;
  message?: string;
  data?: PaythorProcessData;
}

function normalizeMoney(val: unknown): string {
  if (val === null || val === undefined) return "";
  const num = Number(val);
  if (!Number.isFinite(num)) return "";
  return num.toFixed(2);
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("customerToken")?.value;
    const session = await verifyCustomerToken(token);

    if (!session) {
      return NextResponse.json(
        { status: "error", message: "Oturum açmanız gerekmektedir." },
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
        { status: "error", message: "merchantReference alanı zorunludur." },
        { status: 400 },
      );
    }

    const existingOrder = await getOrderByMerchantRef(merchantReference);

    if (!existingOrder) {
      return NextResponse.json(
        { status: "error", message: "Sipariş bulunamadı." },
        { status: 404 },
      );
    }

    if (existingOrder.customerId !== session.customerId) {
      return NextResponse.json(
        { status: "error", message: "Bu sipariş için yetkiniz yok." },
        { status: 403 },
      );
    }

    if (existingOrder.status === "paid") {
      return NextResponse.json({
        status: "success",
        message: "Sipariş zaten ödenmiş olarak kayıtlı.",
        order: {
          id: existingOrder.id,
          merchantReference: existingOrder.merchantReference,
          status: existingOrder.status,
        },
      });
    }

    const publicKey = process.env.PAYTHOR_PUBLIC_KEY;
    const secretKey = process.env.PAYTHOR_SECRET_KEY;

    if (!publicKey || !secretKey) {
      throw new Error("PAYTHOR_PUBLIC_KEY veya PAYTHOR_SECRET_KEY eksik.");
    }

    const nonce = String(Math.floor(100000 + Math.random() * 900000));
    const timestamp = (Date.now() / 1000).toFixed(6);
    const signatureRaw = `${publicKey}${secretKey}${timestamp}${nonce}`;
    const hash = createHash("sha256").update(signatureRaw).digest("hex");
    const authorizationHeader = `ApiKeys ${publicKey}:${hash}`;

    const lookupBody = processId
      ? { process: { process_id: processId } }
      : { payment: { merchant_reference: merchantReference } };

    const paythorResponse = await fetch(
      "https://api.paythor.com/payment/process",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authorizationHeader,
          "X-Timestamp": timestamp,
          "X-Nonce": nonce,
        },
        body: JSON.stringify(lookupBody),
        cache: "no-store",
      },
    );

    const responseText = await paythorResponse.text();
    let paythorData: PaythorProcessResponse;

    try {
      paythorData = JSON.parse(responseText) as PaythorProcessResponse;
    } catch {
      return NextResponse.json(
        { status: "error", message: "Paythor ödeme bilgisi doğrulanamadı." },
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
      return NextResponse.json(
        {
          status: "error",
          message: "Paythor ödemeyi başarılı olarak doğrulamadı.",
        },
        { status: 400 },
      );
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

    const updatedOrder = await confirmOrderPaid(existingOrder.id, existingOrder.items);

    return NextResponse.json({
      status: "success",
      message: "Sipariş durumu ödenmiş olarak güncellendi.",
      order: {
        id: updatedOrder.id,
        merchantReference: updatedOrder.merchantReference,
        status: updatedOrder.status,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Sipariş durumu güncellenirken hata oluştu.";
    const status = message.includes("stok") ? 409 : 500;
    return NextResponse.json({ status: "error", message }, { status });
  }
}
