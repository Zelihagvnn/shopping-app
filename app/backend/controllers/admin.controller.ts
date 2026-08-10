// app/backend/controllers/admin.controller.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminToken, verifyAdminToken } from "@/lib/adminAuth";
import {
  getAdminById,
  getCatalogOptionsAdmin,
  getDashboardStatsAdmin,
  loginAdmin,
} from "../services/admin.service";

export const adminController = {
  login: async (request: NextRequest) => {
    try {
      const body = await request.json();
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const password = typeof body.password === "string" ? body.password : "";

      if (!email || !password) {
        return NextResponse.json(
          { status: "error", message: "E-posta ve şifre zorunludur." },
          { status: 400 },
        );
      }

      const { admin } = await loginAdmin(email, password);

      const adminToken = await createAdminToken({
        adminId: admin.id,
        fullName: admin.fullName,
        email: admin.email,
        role: "admin",
      });

      const response = NextResponse.json({
        status: "success",
        message: "Admin girişi başarılı.",
        admin,
      });

      response.cookies.set("adminToken", adminToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
      });

      return response;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Admin girişi sırasında hata oluştu.";
      const status = message.includes("zorunludur") ? 400 : 401;
      return NextResponse.json({ status: "error", message }, { status });
    }
  },

  getMe: async (request: NextRequest) => {
    try {
      const token = request.cookies.get("adminToken")?.value;
      const session = await verifyAdminToken(token);

      if (!session) {
        return NextResponse.json(
          { status: "error", message: "Admin oturumu bulunamadı." },
          { status: 401 },
        );
      }

      const admin = await getAdminById(session.adminId);

      if (!admin || !admin.isActive) {
        return NextResponse.json(
          { status: "error", message: "Admin hesabı bulunamadı veya aktif değil." },
          { status: 401 },
        );
      }

      return NextResponse.json({
        status: "success",
        admin,
      });
    } catch (error) {
      console.error("Admin oturum kontrolü hatası:", error);
      return NextResponse.json(
        { status: "error", message: "Admin bilgileri alınırken bir hata oluştu." },
        { status: 500 },
      );
    }
  },

  getDashboard: async (request: NextRequest) => {
    try {
      const token = request.cookies.get("adminToken")?.value;
      const session = await verifyAdminToken(token);

      if (!session) {
        return NextResponse.json(
          { status: "error", message: "Dashboard verilerini görüntülemek için admin girişi yapmalısınız." },
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

      const data = await getDashboardStatsAdmin();

      return NextResponse.json({
        status: "success",
        ...data,
      });
    } catch (error) {
      console.error("Admin dashboard hatası:", error);
      return NextResponse.json(
        { status: "error", message: "Dashboard verileri alınırken bir hata oluştu." },
        { status: 500 },
      );
    }
  },

  getCatalogOptions: async (request: NextRequest) => {
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
  },
};
