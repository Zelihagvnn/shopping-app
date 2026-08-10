import { NextRequest, NextResponse } from "next/server";
import { createAdminToken } from "@/lib/adminAuth";
import { loginAdmin } from "@/services/adminService";

export async function POST(request: NextRequest) {
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
}