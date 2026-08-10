import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  formatProduct,
  productCatalogInclude,
} from "@/lib/productCatalog";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const productId = Number(id);

    if (!Number.isInteger(productId) || productId <= 0) {
      return NextResponse.json(
        { status: "error", message: "Geçersiz ürün ID." },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: productCatalogInclude,
    });

    if (!product || !product.isActive) {
      return NextResponse.json(
        { status: "error", message: "Ürün bulunamadı." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: "success",
      product: formatProduct(product),
    });
  } catch (error) {
    console.error("Ürün detayı alma hatası:", error);
    return NextResponse.json(
      { status: "error", message: "Ürün detayları alınamadı." },
      { status: 500 }
    );
  }
}
