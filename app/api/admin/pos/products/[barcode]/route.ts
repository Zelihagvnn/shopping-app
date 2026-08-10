import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import {
  formatProduct,
  productCatalogInclude,
} from "@/lib/productCatalog";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ barcode: string }> },
) {
  const session = await verifyAdminToken(
    request.cookies.get("adminToken")?.value,
  );

  if (!session) {
    return NextResponse.json(
      { status: "error", message: "Bu işlem için admin girişi yapmalısınız." },
      { status: 401 },
    );
  }

  const { barcode: rawBarcode } = await params;
  const barcode = decodeURIComponent(rawBarcode).trim();

  if (!barcode) {
    return NextResponse.json(
      { status: "error", message: "Geçerli bir barkod gönderilmelidir." },
      { status: 400 },
    );
  }

  const product = await prisma.product.findUnique({
    where: { barcode },
    include: productCatalogInclude,
  });

  if (!product || !product.isActive) {
    return NextResponse.json(
      { status: "error", message: "Aktif bir ürün bulunamadı." },
      { status: 404 },
    );
  }

  const formattedProduct = formatProduct(product);

  if (
    formattedProduct.stock <= 0 ||
    formattedProduct.variants.every((variant) => variant.stock <= 0)
  ) {
    return NextResponse.json(
      { status: "error", message: "Bu ürün stokta bulunmuyor." },
      { status: 409 },
    );
  }

  return NextResponse.json({
    status: "success",
    product: formattedProduct,
  });
}
