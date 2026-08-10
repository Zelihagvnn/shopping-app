// app/api/customer/login/route.ts
import { NextResponse } from "next/server";
import {
  findCustomerByEmail,
  generateCustomerToken,
  verifyPassword,
} from "@/services/authService";

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
        { status: "error", message: "E-posta ve şifre zorunludur." },
        { status: 400 },
      );
    }

    const customer = await findCustomerByEmail(email);

    if (!customer || !(await verifyPassword(password, customer.passwordHash))) {
      return NextResponse.json(
        { status: "error", message: "E-posta veya şifre hatalı." },
        { status: 401 },
      );
    }

    const token = await generateCustomerToken(customer);

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
      { status: "error", message: "Giriş sırasında bir hata oluştu." },
      { status: 500 },
    );
  }
}
