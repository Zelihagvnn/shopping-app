import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ status: "success", categories });
  } catch (error) {
    console.error("Kategorileri alma hatası:", error);
    return NextResponse.json(
      { status: "error", message: "Kategoriler alınamadı." },
      { status: 500 },
    );
  }
}
