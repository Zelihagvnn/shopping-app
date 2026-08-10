import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCustomerToken } from "@/lib/customerAuth";

interface ProfileUpdateBody {
  fullName?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get("customerToken")?.value;
    const session = await verifyCustomerToken(token);

    if (!session) {
      return NextResponse.json(
        {
          status: "error",
          message: "Profilinizi güncellemek için giriş yapmalısınız.",
        },
        { status: 401 }
      );
    }

    const body: ProfileUpdateBody = await request.json();

    const fullName = body.fullName?.trim();
    const phone = body.phone?.trim() || null;
    const address = body.address?.trim() || null;
    const city = body.city?.trim() || null;
    const postalCode = body.postalCode?.trim() || null;

    if (!fullName) {
      return NextResponse.json(
        {
          status: "error",
          message: "Ad soyad alanı zorunludur.",
        },
        { status: 400 }
      );
    }

    const updatedCustomer = await prisma.customer.update({
      where: {
        id: session.customerId,
      },
      data: {
        fullName,
        phone,
        address,
        city,
        postalCode,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        postalCode: true,
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Profil bilgileriniz başarıyla güncellendi.",
      customer: updatedCustomer,
    });
  } catch (error) {
    console.error("Müşteri profil güncelleme hatası:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "Profil güncellenirken bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}
