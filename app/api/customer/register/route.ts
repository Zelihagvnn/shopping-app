import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

interface RegisterBody {
  fullName?: string;
  email?: string;
  password?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
}

export async function POST(request: Request) {
  try {
    const body: RegisterBody = await request.json();

    const fullName = body.fullName?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password;
    const phone = body.phone?.trim() || null;
    const address = body.address?.trim() || null;
    const city = body.city?.trim() || null;
    const postalCode = body.postalCode?.trim() || null;

    if (!fullName || !email || !password) {
      return NextResponse.json(
        {
          status: "error",
          message: "Ad soyad, e-posta ve şifre zorunludur.",
        },
        { status: 400 }
      );
    }

    if (!email.includes("@")) {
      return NextResponse.json(
        {
          status: "error",
          message: "Geçerli bir e-posta adresi giriniz.",
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          status: "error",
          message: "Şifre en az 6 karakter olmalıdır.",
        },
        { status: 400 }
      );
    }

    const existingCustomer =
      await prisma.customer.findUnique({
        where: {
          email,
        },
      });

    if (existingCustomer) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "Bu e-posta adresiyle daha önce kayıt olunmuş.",
        },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(
      password,
      12
    );

    const customer = await prisma.customer.create({
      data: {
        fullName,
        email,
        passwordHash,
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
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        status: "success",
        message:
          "Müşteri kaydı başarıyla oluşturuldu.",
        customer,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Müşteri kayıt hatası:", error);

    return NextResponse.json(
      {
        status: "error",
        message:
          "Müşteri kaydı sırasında bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}