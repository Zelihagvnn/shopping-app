import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const rawUrl = process.env.DATABASE_URL || "BOS (NOT SET)";
    const maskedUrl = rawUrl.replace(/:[^:@]+@/, ":****@");

    const productCount = await prisma.product.count();
    const activeProductCount = await prisma.product.count({
      where: { isActive: true },
    });
    const sampleProducts = await prisma.product.findMany({
      take: 3,
      select: { id: true, title: true, isActive: true },
    });

    return NextResponse.json({
      success: true,
      databaseUrlStatus: rawUrl.startsWith("BOS") ? "MISSING" : "SET",
      maskedUrl,
      productCount,
      activeProductCount,
      sampleProducts,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        databaseUrlStatus: process.env.DATABASE_URL ? "SET" : "MISSING",
      },
      { status: 500 },
    );
  }
}
