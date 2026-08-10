import { NextRequest, NextResponse } from "next/server";
import { verifyCustomerToken } from "@/lib/customerAuth";
import { callPaythorApi, processOrderFromPayment } from "@/services/paymentService";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("customerToken")?.value;
    const session = await verifyCustomerToken(token);

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

    const { status, ok, paymentData } = await callPaythorApi(
      paymentBody,
      requestOrigin,
    );

    const paymentCreated = ok && paymentData.status === "success" && paymentData.data;

    if (!paymentCreated || !paymentData.data) {
      return NextResponse.json(paymentData, { status });
    }

    await processOrderFromPayment(paymentBody, paymentData, session);

    return NextResponse.json(paymentData, { status });
  } catch (error) {
    console.error("Paythor veya PostgreSQL hatası:", error);
    const errMessage =
      error instanceof Error
        ? error.message
        : "Ödeme oluşturulurken veya sipariş kaydedilirken hata oluştu.";

    return NextResponse.json(
      {
        status: "error",
        message: errMessage,
      },
      { status: 500 },
    );
  }
}
