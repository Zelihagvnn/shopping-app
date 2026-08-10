import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("adminToken")?.value;
    const session = await verifyAdminToken(token);

    if (!session) {
      return NextResponse.json(
        { status: "error", message: "Yetkisiz erişim." },
        { status: 401 }
      );
    }

    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      status: "success",
      coupons,
    });
  } catch (error) {
    console.error("Admin kupon listeleme hatası:", error);
    return NextResponse.json(
      { status: "error", message: "Kuponlar alınamadı." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("adminToken")?.value;
    const session = await verifyAdminToken(token);

    if (!session) {
      return NextResponse.json(
        { status: "error", message: "Yetkisiz erişim." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const code = body.code?.trim().toUpperCase();
    const discount = Number(body.discount);
    
    let expirationDate: Date | null = null;
    if (body.expirationDate && typeof body.expirationDate === "string" && body.expirationDate.trim() !== "") {
      const parsedDate = new Date(body.expirationDate);
      if (!isNaN(parsedDate.getTime())) {
        expirationDate = parsedDate;
      }
    }

    if (!code) {
      return NextResponse.json(
        { status: "error", message: "Kupon kodu zorunludur." },
        { status: 400 }
      );
    }

    if (!discount || discount <= 0 || discount > 100) {
      return NextResponse.json(
        { status: "error", message: "İndirim oranı 1 ile 100 arasında olmalıdır." },
        { status: 400 }
      );
    }

    const existing = await prisma.coupon.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json(
        { status: "error", message: "Bu kupon kodu zaten mevcut." },
        { status: 400 }
      );
    }

    const coupon = await prisma.coupon.create({
      data: {
        code,
        discount,
        expirationDate,
        isActive: true,
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Kupon başarıyla oluşturuldu.",
      coupon,
    });
  } catch (error) {
    console.error("Admin kupon oluşturma hatası:", error);
    const errMessage = error instanceof Error ? error.message : "Kupon oluşturulamadı.";
    return NextResponse.json(
      { status: "error", message: errMessage },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get("adminToken")?.value;
    const session = await verifyAdminToken(token);

    if (!session) {
      return NextResponse.json(
        { status: "error", message: "Yetkisiz erişim." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const id = Number(body.id);
    const isActive = Boolean(body.isActive);

    if (!id) {
      return NextResponse.json(
        { status: "error", message: "Geçersiz kupon ID." },
        { status: 400 }
      );
    }

    const coupon = await prisma.coupon.update({
      where: { id },
      data: { isActive },
    });

    return NextResponse.json({
      status: "success",
      message: "Kupon durumu güncellendi.",
      coupon,
    });
  } catch (error) {
    console.error("Admin kupon güncelleme hatası:", error);
    return NextResponse.json(
      { status: "error", message: "Kupon güncellenemedi." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get("adminToken")?.value;
    const session = await verifyAdminToken(token);

    if (!session) {
      return NextResponse.json(
        { status: "error", message: "Yetkisiz erişim." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));

    if (!id) {
      return NextResponse.json(
        { status: "error", message: "Geçersiz kupon ID." },
        { status: 400 }
      );
    }

    await prisma.coupon.delete({
      where: { id },
    });

    return NextResponse.json({
      status: "success",
      message: "Kupon başarıyla silindi.",
    });
  } catch (error) {
    console.error("Admin kupon silme hatası:", error);
    return NextResponse.json(
      { status: "error", message: "Kupon silinemedi." },
      { status: 500 }
    );
  }
}
