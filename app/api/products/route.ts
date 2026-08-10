// app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken } from "@/lib/adminAuth";
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  updateProduct,
} from "@/services/productService";

async function checkAdmin(request: NextRequest) {
  const token = request.cookies.get("adminToken")?.value;
  return token ? await verifyAdminToken(token) : null;
}

function unauthorized() {
  return NextResponse.json(
    { status: "error", message: "Bu işlem için admin girişi yapmalısınız." },
    { status: 401 },
  );
}

export async function GET(request: NextRequest) {
  try {
    const isAdminRequest = request.nextUrl.searchParams.get("admin") === "true";
    if (isAdminRequest && !(await checkAdmin(request))) return unauthorized();

    const products = await getAllProducts(isAdminRequest);
    return NextResponse.json(products);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Ürünler getirilemedi.";
    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await checkAdmin(request))) return unauthorized();

    const body = await request.json();
    const product = await createProduct(body);

    return NextResponse.json(
      { status: "success", message: "Ürün başarıyla eklendi.", data: product },
      { status: 201 },
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Ürün eklenirken hata oluştu.";
    return NextResponse.json({ status: "error", message }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!(await checkAdmin(request))) return unauthorized();

    const body = await request.json();
    const productId = Number(body.id);

    if (!Number.isInteger(productId) || productId <= 0) {
      return NextResponse.json(
        {
          status: "error",
          message: "Geçerli bir ürün kimliği gönderilmelidir.",
        },
        { status: 400 },
      );
    }

    const product = await updateProduct(productId, body);

    return NextResponse.json({
      status: "success",
      message: "Ürün başarıyla güncellendi.",
      data: product,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Ürün güncellenirken hata oluştu.";
    return NextResponse.json({ status: "error", message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!(await checkAdmin(request))) return unauthorized();

    const productId = Number(request.nextUrl.searchParams.get("id"));

    if (!Number.isInteger(productId) || productId <= 0) {
      return NextResponse.json(
        {
          status: "error",
          message: "Geçerli bir ürün kimliği gönderilmelidir.",
        },
        { status: 400 },
      );
    }

    await deleteProduct(productId);

    return NextResponse.json({
      status: "success",
      message: "Ürün başarıyla silindi.",
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Ürün silinirken hata oluştu.";
    return NextResponse.json({ status: "error", message }, { status: 400 });
  }
}
