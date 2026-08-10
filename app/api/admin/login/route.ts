import bcrypt from "bcryptjs";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import { prisma } from "@/lib/prisma";
import { createAdminToken } from "@/lib/adminAuth";

export async function POST(
  request: NextRequest
) {
  try {
    const body = await request.json();

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (!email || !password) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "E-posta ve şifre zorunludur.",
        },
        { status: 400 }
      );
    }

    const admin =
      await prisma.admin.findUnique({
        where: {
          email,
        },
      });

    if (!admin) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "E-posta veya şifre hatalı.",
        },
        { status: 401 }
      );
    }

    if (!admin.isActive) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "Admin hesabınız aktif değil.",
        },
        { status: 403 }
      );
    }

    const passwordMatches =
      await bcrypt.compare(
        password,
        admin.passwordHash
      );

    if (!passwordMatches) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "E-posta veya şifre hatalı.",
        },
        { status: 401 }
      );
    }

    const adminToken =
      await createAdminToken({
        adminId: admin.id,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role,
      });

    const response =
      NextResponse.json({
        status: "success",
        message:
          "Admin girişi başarılı.",

        admin: {
          id: admin.id,
          fullName: admin.fullName,
          email: admin.email,
          role: admin.role,
        },
      });

    response.cookies.set(
      "adminToken",
      adminToken,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
      }
    );

    return response;
  } catch (error) {
    console.error(
      "Admin giriş hatası:",
      error
    );

    return NextResponse.json(
      {
        status: "error",
        message:
          "Admin girişi sırasında bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}