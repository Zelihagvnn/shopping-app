import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

interface CustomerTokenPayload {
  customerId: number;
  email: string;
  fullName: string;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("customerToken")?.value;

    if (!token) {
      return NextResponse.json(
        {
          authenticated: false,
          customer: null,
        },
        { status: 401 }
      );
    }

    const jwtSecret = process.env.CUSTOMER_JWT_SECRET;

    if (!jwtSecret) {
      throw new Error("CUSTOMER_JWT_SECRET bulunamadı.");
    }

    const secret = new TextEncoder().encode(jwtSecret);

    const { payload } = await jwtVerify(token, secret);

    const customerId = Number(
      (payload as unknown as CustomerTokenPayload).customerId
    );

    if (!customerId) {
      return NextResponse.json(
        {
          authenticated: false,
          customer: null,
        },
        { status: 401 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: {
        id: customerId,
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

    if (!customer) {
      return NextResponse.json(
        {
          authenticated: false,
          customer: null,
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      customer,
    });
  } catch (error) {
    console.error("Müşteri oturum kontrolü hatası:", error);

    return NextResponse.json(
      {
        authenticated: false,
        customer: null,
      },
      { status: 401 }
    );
  }
}