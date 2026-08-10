import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("adminToken")?.value;

    if (!token || !(await verifyAdminToken(token))) {
      return NextResponse.json(
        { status: "error", message: "Yetkisiz erişim." },
        { status: 401 },
      );
    }

    const [categories, sizes, colors] = await Promise.all([
      prisma.category.findMany({ orderBy: { name: "asc" } }),
      prisma.size.findMany({ orderBy: { name: "asc" } }),
      prisma.color.findMany({ orderBy: { name: "asc" } }),
    ]);

    return NextResponse.json({
      status: "success",
      categories,
      sizes,
      colors,
    });
  } catch (error) {
    console.error("Ürün seçenekleri alınamadı:", error);
    return NextResponse.json(
      { status: "error", message: "Ürün seçenekleri alınamadı." },
      { status: 500 },
    );
  }
}
