import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken } from "@/lib/adminAuth";
import { formatProduct, productCatalogInclude } from "@/lib/productCatalog";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ barcode: string }> },
) {
  const token = request.cookies.get("adminToken")?.value;

  if (!token) {
    return NextResponse.json(
      { status: "error", message: "Bu işlem için admin girişi yapmalısınız." },
      { status: 401 },
    );
  }

  const session = await verifyAdminToken(token);

  if (!session) {
    return NextResponse.json(
      { status: "error", message: "Oturumunuz geçersiz veya süresi dolmuş." },
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

  if (!product) {
    return NextResponse.json(
      { status: "error", message: "Bu barkoda ait ürün bulunamadı." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    status: "success",
    product: formatProduct(product),
  });
}
