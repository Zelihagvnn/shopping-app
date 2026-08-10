import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/adminAuth";
import { getAdminById } from "@/services/adminService";
import { getOrderById, updateOrderStatusAdmin } from "@/services/orderService";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = request.cookies.get("adminToken")?.value;
    const session = await verifyAdminToken(token);

    if (!session) {
      return NextResponse.json(
        { status: "error", message: "Bu işlem için admin girişi yapmalısınız." },
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

    const { id } = await context.params;
    const orderId = Number(id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json(
        { status: "error", message: "Geçerli bir sipariş kimliği gönderilmelidir." },
        { status: 400 },
      );
    }

    const order = await getOrderById(orderId);

    if (!order) {
      return NextResponse.json(
        { status: "error", message: "Sipariş bulunamadı." },
        { status: 404 },
      );
    }

    return NextResponse.json({ status: "success", order });
  } catch (error) {
    console.error("Admin sipariş detay hatası:", error);
    return NextResponse.json(
      { status: "error", message: "Sipariş detayı alınamadı." },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const token = request.cookies.get("adminToken")?.value;
    const session = await verifyAdminToken(token);

    if (!session) {
      return NextResponse.json(
        { status: "error", message: "Bu işlem için admin girişi yapmalısınız." },
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

    const { id } = await context.params;
    const orderId = Number(id);
    const body = await request.json();
    const status = typeof body.status === "string" ? body.status.trim() : "";

    if (!status) {
      return NextResponse.json(
        { status: "error", message: "Sipariş durumu zorunludur." },
        { status: 400 },
      );
    }

    const updatedOrder = await updateOrderStatusAdmin(orderId, status);

    return NextResponse.json({
      status: "success",
      message: "Sipariş durumu başarıyla güncellendi.",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Admin sipariş durum güncelleme hatası:", error);
    return NextResponse.json(
      { status: "error", message: "Sipariş durumu güncellenemedi." },
      { status: 500 },
    );
  }
}