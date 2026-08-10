import { NextResponse } from "next/server";
import { getActivePublicCoupons } from "@/services/couponService";

export async function GET() {
  try {
    const coupons = await getActivePublicCoupons();
    return NextResponse.json({
      status: "success",
      coupons,
    });
  } catch (error) {
    console.error("Kupon listeleme hatası:", error);
    return NextResponse.json(
      { status: "error", message: "Kuponlar listelenemedi." },
      { status: 500 },
    );
  }
}
