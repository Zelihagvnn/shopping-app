import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = body.code?.trim().toUpperCase();

    if (!code) {
      return NextResponse.json(
        { status: "error", message: "Lütfen bir kupon kodu giriniz." },
        { status: 400 }
      );
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code },
    });

    if (!coupon || !coupon.isActive) {
      return NextResponse.json(
        { status: "error", message: "Geçersiz kupon kodu." },
        { status: 404 }
      );
    }

    if (coupon.expirationDate && new Date(coupon.expirationDate) < new Date()) {
      return NextResponse.json(
        { status: "error", message: "Bu kuponun süresi dolmuş." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      status: "success",
      message: `${coupon.code} kuponu uygulandı`,
      coupon: {
        code: coupon.code,
        discount: coupon.discount,
      },
    });
  } catch (error) {
    console.error("Kupon doğrulama hatası:", error);
    return NextResponse.json(
      { status: "error", message: "Kupon doğrulanırken hata oluştu." },
      { status: 500 }
    );
  }
}
