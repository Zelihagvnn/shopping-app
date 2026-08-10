import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();

    const coupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        OR: [
          { expirationDate: null },
          { expirationDate: { gte: now } },
        ],
      },
      select: {
        id: true,
        code: true,
        discount: true,
        expirationDate: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      status: "success",
      coupons,
    });
  } catch (error) {
    console.error("Kupon listeleme hatası:", error);
    return NextResponse.json(
      { status: "error", message: "Kuponlar listelenemedi." },
      { status: 500 }
    );
  }
}
