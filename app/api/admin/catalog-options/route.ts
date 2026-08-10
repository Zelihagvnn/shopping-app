import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/adminAuth";
import { getCatalogOptionsAdmin } from "@/services/adminService";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("adminToken")?.value;

    if (!token || !(await verifyAdminToken(token))) {
      return NextResponse.json(
        { status: "error", message: "Yetkisiz erişim." },
        { status: 401 },
      );
    }

    const { categories, sizes, colors } = await getCatalogOptionsAdmin();

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
