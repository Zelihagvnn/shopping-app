import { NextResponse } from "next/server";

export async function GET() {
  try {
    const dbUrl = process.env.DATABASE_URL;

    if (!dbUrl) {
      return NextResponse.json({
        success: false,
        reason: "process.env.DATABASE_URL is UNDEFINED in Vercel environment!",
        envKeys: Object.keys(process.env).filter(
          (k) => !k.startsWith("npm_") && !k.startsWith("NODE_"),
        ),
      });
    }

    const { prisma } = await import("@/lib/prisma");
    const productCount = await prisma.product.count();
    const activeProductCount = await prisma.product.count({
      where: { isActive: true },
    });

    return NextResponse.json({
      success: true,
      databaseUrlPresent: true,
      productCount,
      activeProductCount,
    });
  } catch (err: unknown) {
    return NextResponse.json({
      success: false,
      errorName: err instanceof Error ? err.name : "Error",
      errorMessage: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  }
}
