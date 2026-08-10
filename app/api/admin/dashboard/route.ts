import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/adminAuth";
import { getAdminById, getDashboardStatsAdmin } from "@/services/adminService";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("adminToken")?.value;
    const session = await verifyAdminToken(token);

    if (!session) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "Dashboard verilerini görüntülemek için admin girişi yapmalısınız.",
        },
        { status: 401 },
      );
    }

    const admin = await getAdminById(session.adminId);

    if (!admin || !admin.isActive) {
      return NextResponse.json(
        {
          status: "error",
          message: "Admin hesabı bulunamadı veya aktif değil.",
        },
        { status: 403 },
      );
    }

    const data = await getDashboardStatsAdmin();

    return NextResponse.json({
      status: "success",
      ...data,
    });
  } catch (error) {
    console.error("Admin dashboard hatası:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Dashboard verileri alınırken bir hata oluştu.",
      },
      { status: 500 },
    );
  }
}
