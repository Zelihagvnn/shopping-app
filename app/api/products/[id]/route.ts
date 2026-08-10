import { NextRequest, NextResponse } from "next/server";
import { getProductById } from "@/services/productService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const productId = Number(id);

    if (!Number.isInteger(productId) || productId <= 0) {
      return NextResponse.json(
        { status: "error", message: "Geçersiz ürün ID." },
        { status: 400 },
      );
    }

    const product = await getProductById(productId);

    if (!product) {
      return NextResponse.json(
        { status: "error", message: "Ürün bulunamadı." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      status: "success",
      product,
    });
  } catch (error) {
    console.error("Ürün detayı alma hatası:", error);
    return NextResponse.json(
      { status: "error", message: "Ürün detayları alınamadı." },
      { status: 500 },
    );
  }
}
