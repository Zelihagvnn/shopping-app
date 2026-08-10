import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { prisma } from "@/lib/prisma";

interface LoginBody {
  email?: string;
  password?: string;
}

export async function POST(request: Request) {
  try {
    const body: LoginBody = await request.json();

    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json(
        {
          status: "error",
          message: "E-posta ve şifre zorunludur.",
        },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: {
        email,
      },
    });

    if (!customer) {
      return NextResponse.json(
        {
          status: "error",
          message: "E-posta veya şifre hatalı.",
        },
        { status: 401 }
      );
    }

    const passwordMatches = await bcrypt.compare(
      password,
      customer.passwordHash
    );

    if (!passwordMatches) {
      return NextResponse.json(
        {
          status: "error",
          message: "E-posta veya şifre hatalı.",
        },
        { status: 401 }
      );
    }

    const jwtSecret = process.env.CUSTOMER_JWT_SECRET;

    if (!jwtSecret) {
      throw new Error("CUSTOMER_JWT_SECRET bulunamadı.");
    }

    const secret = new TextEncoder().encode(jwtSecret);

    const token = await new SignJWT({
      customerId: customer.id,
      email: customer.email,
      fullName: customer.fullName,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);

    const response = NextResponse.json({
      status: "success",
      message: "Giriş başarılı.",
      customer: {
        id: customer.id,
        fullName: customer.fullName,
        email: customer.email,
      },
    });

    response.cookies.set({
      name: "customerToken",
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Müşteri giriş hatası:", error);

    return NextResponse.json(
      {
        status: "error",
        message: "Giriş sırasında bir hata oluştu.",
      },
      { status: 500 }
    );
  }
}