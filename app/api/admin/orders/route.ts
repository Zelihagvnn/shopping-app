import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/adminAuth";
import { getAdminById } from "@/services/adminService";
import { getAllOrdersAdmin } from "@/services/orderService";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("adminToken")?.value;
    const session = await verifyAdminToken(token);

    if (!session) {
      return NextResponse.json(
        {
          status: "error",
          message: "Siparişleri görüntülemek için admin girişi yapmalısınız.",
        },
        { status: 401 },
      );
    }

    const admin = await getAdminById(session.adminId);

    if (!admin || !admin.isActive) {
      return NextResponse.json(
        { status: "error", message: "Admin hesabı bulunamadı veya aktif değil." },
        { status: 403 },
      );
    }

    const statusParam = request.nextUrl.searchParams.get("status") || undefined;
    const orders = await getAllOrdersAdmin(statusParam);

    return NextResponse.json({
      status: "success",
      orders,
    });
  } catch (error) {
    console.error("Admin sipariş listeleme hatası:", error);
    return NextResponse.json(
      { status: "error", message: "Siparişler alınırken bir hata oluştu." },
      { status: 500 },
    );
  }
}