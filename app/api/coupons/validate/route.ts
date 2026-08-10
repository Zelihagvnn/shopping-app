import { NextRequest, NextResponse } from "next/server";
import { validateCouponCode } from "@/services/couponService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = body.code?.trim().toUpperCase();

    if (!code) {
      return NextResponse.json(
        { status: "error", message: "Lütfen bir kupon kodu giriniz." },
        { status: 400 },
      );
    }

    const result = await validateCouponCode(code);

    if (!result.valid || !result.coupon) {
      return NextResponse.json(
        { status: "error", message: result.message },
        { status: result.message === "Geçersiz kupon kodu." ? 404 : 400 },
      );
    }

    return NextResponse.json({
      status: "success",
      message: `${result.coupon.code} kuponu uygulandı`,
      coupon: {
        code: result.coupon.code,
        discount: result.coupon.discount,
      },
    });
  } catch (error) {
    console.error("Kupon doğrulama hatası:", error);
    return NextResponse.json(
      { status: "error", message: "Kupon doğrulanırken hata oluştu." },
      { status: 500 },
    );
  }
}
