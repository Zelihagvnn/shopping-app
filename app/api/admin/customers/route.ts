import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/adminAuth";
import { getAdminById } from "@/services/adminService";
import { getAllCustomersAdmin } from "@/services/customerService";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("adminToken")?.value;
    const session = await verifyAdminToken(token);

    if (!session) {
      return NextResponse.json(
        {
          status: "error",
          message: "Müşterileri görüntülemek için admin girişi yapmalısınız.",
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

    const customers = await getAllCustomersAdmin();

    const formattedCustomers = customers.map((customer) => ({
      id: customer.id,
      fullName: customer.fullName,
      email: customer.email,
      phone: customer.phone,
      city: customer.city,
      createdAt: customer.createdAt.toISOString(),
      orderCount: customer._count.orders,
    }));

    return NextResponse.json({
      status: "success",
      customers: formattedCustomers,
    });
  } catch (error) {
    console.error("Admin müşteri listeleme hatası:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Müşteriler alınırken bir hata oluştu.",
      },
      { status: 500 },
    );
  }
}