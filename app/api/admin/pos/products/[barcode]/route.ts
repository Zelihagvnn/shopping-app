import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/adminAuth";
import { getVariantByBarcode } from "@/services/productService";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ barcode: string }> },
) {
  try {
    const session = await verifyAdminToken(
      request.cookies.get("adminToken")?.value,
    );

    if (!session) {
      return NextResponse.json(
        { status: "error", message: "Bu işlem için admin girişi yapmalısınız." },
        { status: 401 },
      );
    }

    const { barcode: rawBarcode } = await context.params;
    const barcode = decodeURIComponent(rawBarcode).trim();

    if (!barcode) {
      return NextResponse.json(
        { status: "error", message: "Geçerli bir barkod okutun." },
        { status: 400 },
      );
    }

    const variant = await getVariantByBarcode(barcode);

    if (!variant || !variant.isActive || !variant.product.isActive) {
      return NextResponse.json(
        { status: "error", message: "Barkoda ait aktif ürün bulunamadı." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      status: "success",
      variant: {
        id: variant.id,
        productId: variant.product.id,
        title: variant.product.title,
        image: variant.product.image,
        price: Number(variant.product.price),
        stock: variant.stock,
        barcode: variant.product.barcode || variant.sku || "",
        size: variant.size?.name ?? "",
        color: variant.color?.name ?? "",
      },
    });
  } catch (error) {
    console.error("POS barkod ile ürün getirme hatası:", error);
    return NextResponse.json(
      { status: "error", message: "Ürün bilgisi alınamadı." },
      { status: 500 },
    );
  }
}
