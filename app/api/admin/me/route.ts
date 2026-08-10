import {
  NextRequest,
  NextResponse,
} from "next/server";

import { prisma } from "@/lib/prisma";
import { verifyAdminToken } from "@/lib/adminAuth";

export async function GET(
  request: NextRequest
) {
  try {
    const token =
      request.cookies.get("adminToken")?.value;

    const session =
      await verifyAdminToken(token);

    if (!session) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "Admin oturumu bulunamadı.",
        },
        { status: 401 }
      );
    }

    const admin =
      await prisma.admin.findUnique({
        where: {
          id: session.adminId,
        },

        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

    if (!admin || !admin.isActive) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "Admin hesabı bulunamadı veya aktif değil.",
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      status: "success",
      admin,
    });
  } catch (error) {
    console.error(
      "Admin oturum kontrolü hatası:",
      error
    );

    return NextResponse.json(
      {
        status: "error",
        message:
          "Admin bilgileri alınırken bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}